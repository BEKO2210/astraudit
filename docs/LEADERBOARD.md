# Astraudit leaderboard

The leaderboard runs Astraudit's standard audit across the top‑N
starred public repositories for a given filter and ranks the
results by score. It lives at `#/leaderboard` and is fully
client‑side — there's no backend that aggregates scores across
visitors.

> A leaderboard run takes 5–15 seconds per repository. Auditing
> 100 repos cold without a GitHub PAT will exhaust the
> unauthenticated 60 req/h budget after ~5 audits. Adding a PAT
> in Settings is the practical minimum for anything > 10 rows.

---

## Filter syntax

The filter is read from the URL query string so a leaderboard
configuration is shareable. Every field is optional.

| Param | Example | Effect |
|---|---|---|
| `lang` | `?lang=typescript` | Restrict to repos whose primary GitHub‑detected language matches. Multi‑word names work too: `?lang=common%20lisp`. |
| `topic` | `?topic=cli` | Restrict to repos that declare the given GitHub topic. |
| `minStars` | `?minStars=5000` | Lower star threshold. Defaults to `1000` when omitted. |
| `limit` | `?limit=20` | Number of repos to audit. Clamped to `[5, 100]`. Defaults to `20`. |
| `q` | `?q=good-first-issues:%3E5` | Raw GitHub‑search passthrough appended verbatim to the constructed `q=`. Power‑user escape hatch — caller is responsible for URL‑encoding. |

The Settings dialog (M5.5) doesn't toggle leaderboard packs
specifically; the global `?rules=` flag from M5 applies to the
batch the same as it does to single audits.

Example: a TypeScript CLI leaderboard with the i18n rule pack
enabled:

```
https://beko2210.github.io/astraudit/?rules=i18n&lang=typescript&topic=cli&limit=15#/leaderboard
```

---

## Snapshot persistence

Successful (non‑aborted, non‑rate‑limited) batches are persisted
to `localStorage` so a return visit shows the table immediately
without consuming API budget.

- **Key shape**: `astraudit:leaderboard:v1`. The stored value is
  a single JSON blob holding every snapshot — flat array, not
  per‑filter buckets.
- **Per‑snapshot payload**: only the columns the table renders
  (`fullName`, `htmlUrl`, `stars`, `pushedAt`, `totalScore`,
  `grade`, `description`). The full `AuditResult` is **not**
  cached — re‑opening a row goes through the single‑repo audit
  path at `#/audit/<owner>/<repo>` for fresh detail.
- **Fingerprint**: every snapshot is keyed by the canonical
  serialised filter (`lang=ts&topic=cli&minStars=5000`). Two
  equivalent filters always produce the same fingerprint
  regardless of field‑order in the URL.
- **TTL**: 7 days. Older snapshots are purged on every read.
- **History caps**: at most 5 snapshots kept per fingerprint;
  global cap of 40 snapshots so a power‑user iterating filters
  can't fill local storage.
- **Failure tolerance**: `SecurityError` (private‑mode browsers)
  and `QuotaExceededError` are swallowed silently — snapshots
  are a UX nicety, never load‑bearing.

The "Showing cached snapshot from `<time>`" badge above the
table tells the visitor when the rows came from storage rather
than a fresh run.

---

## Trend arrows

When a second snapshot exists for the current filter the
leaderboard renders a **Trend** column comparing the latest run
to the previous one.

| State | Visual | When it fires |
|---|---|---|
| Score improved | ↑ +5 (green) | Latest score > previous |
| Score regressed | ↓ −3 (red) | Latest score < previous |
| Score unchanged | → (slate) | Latest score = previous |
| New entry | "New" pill (cyan) | Repo appeared in the latest snapshot, absent from the previous |
| Dropped | "Dropped" pill (slate) | Repo was in the previous snapshot, missing from the latest |
| No baseline | em‑dash | First run for this filter — no comparison possible |

Trends are computed against the second‑to‑last snapshot, so the
displayed diff is "this run vs. the one immediately before it",
not "this run vs. all of history". Drop or rename a snapshot via
clearing `localStorage` if you want to reset the baseline.

---

## Rate‑limit strategy

The batch orchestrator (M6.2) is single‑flight and rate‑limit
aware:

1. **Pre‑flight**: a single `/rate_limit` probe runs before the
   first audit. If `remaining < requestsPerAudit × hits.length`
   the leaderboard surfaces an amber warning before any audit
   fires.
2. **Mid‑batch**: a thrown `RateLimitError` stops the loop and
   surfaces the **"GitHub rate limit hit mid‑batch"** banner.
   We do **not** auto‑resume — waiting an hour silently for the
   budget to reset would surprise the visitor.
3. **Per‑audit unknown failures** (a 404, a malformed bundle,
   …) become error rows and the loop continues. One bad repo
   never kills a 100‑repo refresh.

Adding a PAT in Settings lifts the budget from 60 req/h → 5000
req/h, which comfortably covers `limit=100` runs.

---

## What a leaderboard run is not

- **Not a competition.** Scores reflect Astraudit's rule‑book —
  a docs‑focused repo will rank lower than a docs‑first
  competitor of the same maturity. The numbers are useful for
  spotting outliers, not for crowning winners.
- **Not authoritative across time.** GitHub stars, topics, and
  primary‑language detection change. A leaderboard from last
  week may include repos that no longer fit the filter today.
- **Not stored remotely.** Every snapshot lives in the
  visitor's `localStorage` only. Astraudit has no backend, no
  telemetry, and no shared "global" leaderboard.

---

## How to extend

The leaderboard is a thin shell over four small modules — each
landed in a separate slice of Monat 6 and is unit‑tested in
isolation:

| Module | Responsibility |
|---|---|
| `src/lib/leaderboard/searchRepos.ts` | GitHub `/search/repositories` wrapper + pagination |
| `src/lib/leaderboard/parseFilter.ts` | URL ↔ filter object |
| `src/lib/leaderboard/batchAudit.ts` | Single‑flight queue + rate‑limit + abort |
| `src/lib/leaderboard/snapshotStore.ts` | Persistence + TTL + history |
| `src/lib/leaderboard/trends.ts` | Per‑repo Δ‑score diff |

Adding a new filter token is a one‑file change in
`parseFilter.ts` + `searchRepos.ts`. Adding a new column means
extending `SnapshotRow` (and writing a migration if the new
field needs to survive old snapshots — until then keep it
optional and tolerate missing values).
