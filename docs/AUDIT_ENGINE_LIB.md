# Astraudit audit engine — library use

> **Audience.** Consumers building on top of the audit engine —
> the upcoming browser extension (M3.2+), the bookmarklet (M3.6),
> third‑party tooling, or your own scripts.
>
> **Source of truth.** [`src/audit-engine.ts`](../src/audit-engine.ts)
> declares the entire public surface. Build with
> `npm run build:audit-lib` (Roadmap M3.1) — output lives in
> `dist-audit-lib/`.

---

## Quick start

```bash
npm run build:audit-lib
# → dist-audit-lib/audit-engine.js   (~183 KB unminified ESM)
# → dist-audit-lib/audit-engine.d.ts (~2 KB type surface)
```

Import in any bundler that speaks ESM:

```ts
import {
  loadRepoBundle,
  runAudit,
  parseRepoInput,
  RateLimitError,
  type AuditResult,
} from "./path/to/dist-audit-lib/audit-engine.js";

const parsed = parseRepoInput("https://github.com/facebook/react");
if (!parsed.ok || !parsed.coords) {
  throw new Error("Not a valid owner/repo input");
}

try {
  const bundle = await loadRepoBundle(parsed.coords, {
    token: process.env.GITHUB_TOKEN, // optional
  });
  const result: AuditResult = runAudit(bundle);
  console.log(`Score: ${result.totalScore}/${result.maxScore} — ${result.grade}`);
  for (const finding of result.findings.slice(0, 5)) {
    console.log(`  ${finding.severity.toUpperCase()}  ${finding.title}`);
  }
} catch (err) {
  if (err instanceof RateLimitError) {
    console.warn(`Rate-limited, resets at ${err.resetAtSeconds}`);
  } else {
    throw err;
  }
}
```

---

## The 4 functions you need

| Function | Purpose |
|---|---|
| `parseRepoInput(text)` | Normalises `"owner/repo"`, full URLs, and `git@…` forms into a typed `RepoCoordinates`. |
| `loadRepoBundle(coords, options?)` | Fetches metadata + tree + readme + key configs + commits + releases + org‑health + branch‑protection from GitHub's public REST API. |
| `runAudit(bundle, emit?)` | Runs ~70 rule‑based detectors against the bundle and returns a typed `AuditResult`. |
| `progressFor(step)` | Maps a `AuditProgressStep` to a human label + index (for progress UIs). |

## The 5 error classes you'll branch on

```ts
import {
  GithubError,         // base class, all GitHub-API errors extend
  RateLimitError,      // 403 + x-ratelimit-remaining: 0
  NotFoundError,       // 404 (repo missing or private)
  InvalidTokenError,   // 401 (bad / expired PAT)
  TooLargeError,       // 413 (repo too large for browser audit)
} from "./dist-audit-lib/audit-engine.js";
```

## Where types live

Every type appears in the same module exports. The `.d.ts` flattens
them so a consumer never has to reach into `src/types/*`. The
canonical groupings:

- **Engine result:** `AuditResult`, `CategoryScore`, `Grade`,
  `Recommendation`, `StackSignals`, `FileStructureSummary`,
  `RepoStorySection`.
- **Findings:** `Finding`, `Severity`, `Confidence`,
  `FindingCategory`.
- **Bundle shape:** `RepoBundle`, `RepoMetadata`, `RepoTree`,
  `TreeEntry`, `ImportantFile`, `CommitInfo`, `ReleaseInfo`,
  `WorkflowInfo`, `LanguagesMap`, `RepoIssuesSnapshot`,
  `OrgHealthSnapshot`, `BranchProtectionSignals`.
- **Progress + input:** `AuditProgress`, `AuditProgressStep`,
  `ProgressEmitter`, `LoadOptions`, `LoadProgressKey`,
  `RepoCoordinates`.

---

## Surface‑contract rules

1. **Only what `src/audit-engine.ts` re‑exports is public.**
   Anything reachable through `src/lib/audit/*` or `src/lib/github/*`
   directly is internal — touching it from outside binds you to
   minor‑version drift. The barrel changes minor; the internals
   change patch.
2. **`zod` stays external.** The bundle marks it as such so
   consumer apps de‑duplicate against their own copy. Install
   `zod@^3` in the consumer.
3. **No DOM, no Node‑specific APIs.** The bundle calls `fetch` and
   nothing else. It runs unchanged in browsers, service workers,
   Node 20+, and Deno.
4. **Token handling.** `loadRepoBundle({ token })` accepts an
   optional PAT scoped to the single call. In browsers without a
   token, GitHub caps reads at 60/h; with a fine‑grained read‑only
   PAT, ~1000/h. The token never persists between calls — the
   consumer owns its lifetime.

## Bundle facts

| Metric | Value |
|---|---:|
| Unminified ESM | ~183 KB |
| Sourcemap | included |
| Type surface | ~2 KB `.d.ts` |
| Runtime deps | `zod` (peer, consumer installs) |
| Target | `es2022` |
| Platform | neutral (browser + Node + worker) |

After consumer‑side minification + gzip, expect ~40–50 KB transfer
size — comparable to a mid‑weight UI library.

---

## Versioning

The library version tracks the parent package's version 1:1 (both
ship from this repo). Breaking changes to `src/audit-engine.ts`'s
surface are major‑version bumps and announced in `CHANGELOG.md`.
Detector additions (new findings appearing in `AuditResult.findings`)
are minor — they're additive, but a consumer pinning on exact
finding IDs should expect them.

## Re‑build cadence

Re‑run `npm run build:audit-lib` whenever:

- You bump a detector and want extension/bookmarklet consumers to
  see the new behaviour locally.
- A new release tag goes out (the audit‑lib bundle should
  conceptually match what `dist/` ships to GitHub Pages).

The output is gitignored — consumers either build from source or
fetch the artifact attached to a release (future M3.x roadmap
item if extension distribution warrants it).
