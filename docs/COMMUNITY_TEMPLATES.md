# Astraudit · community-post templates

Boilerplate posts the maintainer can pull when introducing
Astraudit (or a major new milestone) to communities outside the
GitHub‑native surface. Each section is a paste‑ready template
plus the etiquette quirks of the platform.

> **Tone contract for everything below.** No hype words ("awesome",
> "amazing", "blazing‑fast"). One paragraph of plain English about
> what the tool does. Constraint contract (browser‑only, free,
> public‑repo‑only, rule‑based) up front so reviewers don't have
> to guess. Always link the live site, never just the repo —
> people install before they read.

---

## Universal etiquette

1. **Stagger by 24 h between platforms.** The same audience often
   lives on multiple subreddits + Discords; landing in their feed
   twice in an hour reads as spam.
2. **Don't self‑promote in your own thread.** Reply to questions,
   never bump.
3. **Disclose maintainer status in the FIRST comment** on Reddit /
   HN / Discord — modtools sniff `OP` flair anyway.
4. **Wait at least 7 days between repeat posts** to the same
   community. Major version bumps reset the clock; cosmetic
   updates don't.
5. **When a mod removes a post**, accept it. Ask in modmail
   politely whether a different framing fits. Do not repost
   the same body verbatim.

---

## Reddit

Subreddits ordered by audience fit. Pick **at most three** for any
single announcement — a wider net dilutes attention and burns
the calendar for the next release.

### r/programming (~6.1M)

- **Title:** `Astraudit – browser-only auditor for public GitHub repositories (rule-based, no AI, MIT)`
- **Flair:** `Project` if available; otherwise none.
- **Body:**

```md
I built a static analyser that runs entirely in your tab. Paste any
`github.com/owner/repo` URL and it produces a 100-point score across
eight categories (docs, security, maintenance, CI, structure, DX,
ecosystem, code quality) plus an interactive audit graph and a
prioritised "next steps" list.

Constraints I committed to up front:

- Browser-only. No backend, no serverless functions, no managed
  databases. The detector pipeline runs in a Web Worker on your
  machine.
- Free, forever. No paid APIs, no metered services.
- Public repositories only. Optional GitHub PAT (stored in your
  `localStorage`) lifts the 60 req/h rate limit.
- Rule-based. Every finding is a deterministic rule you can read
  in `docs/RULES.md` and reproduce yourself. No LLM in the loop.

Live site: https://beko2210.github.io/astraudit/
Repo: https://github.com/BEKO2210/astraudit
Rule book: https://github.com/BEKO2210/astraudit/blob/main/docs/RULES.md

There's also an MCP server (`npx astraudit-mcp`) so AI clients
can call the audit programmatically.

Happy to answer detector / scoring questions.
```

### r/javascript (~2.7M)

- **Title:** `Astraudit – a 100-point browser-only auditor for public GitHub repos`
- **Body:** same as r/programming, with this opener replacing the
  first paragraph:

```md
Built with Vite + React 19 + a Web Worker pipeline that does all
the rule evaluation off the main thread. Source is TypeScript
with strict mode + the modern extras (noUncheckedIndexedAccess,
exactOptionalPropertyTypes).
```

### r/typescript (~250k)

- **Title:** `Astraudit – TypeScript-strict browser auditor for public GitHub repos`
- **Lead with the `?rules=ts` pack:**

```md
[…] Astraudit ships an opt-in `?rules=ts` pack that reads any
target repo's `tsconfig.json` (JSONC tolerant) and grades its
strictness posture — `strict: true` vs. partial, the modern
extras (noUncheckedIndexedAccess, noImplicitOverride,
exactOptionalPropertyTypes), and whether the project has a
tsconfig at all when it ships `.ts` files.

Try it on `microsoft/typescript` with `?rules=ts` enabled.
```

### r/rust (~340k)

- **Body opener:**

```md
[…] Audits `Cargo.toml` repos too — manifest + lockfile presence,
license classification, security policy + dependabot config,
release cadence from the GitHub Releases timeline. Not Rust-
specific, but the detector list covers the ecosystem.
```

### r/opensource (~150k)

- **Title:** `Astraudit – open-source maintainer self-check (browser-only, MIT)`
- **Lead with the maintainer angle:**

```md
[…] If you maintain an OSS project, point it at your own repo —
the report surfaces missing `CONTRIBUTING.md`, `CODEOWNERS`,
`SECURITY.md`, the dependabot config, branch-protection signals
(when the API surfaces them), and ~30 other onboarding gaps in
one place.
```

### r/SideProject (~210k)

- **Title:** `Astraudit – I shipped a browser-only auditor for any public GitHub repo`
- **Add a "lessons" paragraph** at the end. Reddit's
  side-project audience wants the journey:

```md
[…] Spent 6 months refining the rule book — the hardest part wasn't
detecting things, it was avoiding false-confident copy when the
public API can't actually answer a question (branch protection is
admin-gated; we surface "unknown" instead of guessing). Detector
contract: `docs/RULES.md`.
```

### r/webdev (~2.3M)

- Same body as r/programming. r/webdev tends to reward
  screenshots; attach the promo card PNG generated from the
  sticky bar's **Promo card → Download PNG** menu.

---

## Hacker News (Show HN)

- **Title (≤ 80 chars including "Show HN: "):**
  `Show HN: Astraudit – browser-only auditor for any public GitHub repo`
- **URL field:** live site (`https://beko2210.github.io/astraudit/`),
  not the repo. HN auto-renders the repo link from the page itself.
- **Text field:** empty. HN's "Show HN" convention is to put the
  pitch in the FIRST comment as the maintainer (see below) so
  the post itself stays a clean "look, a thing".

### First-comment template (post immediately after submitting)

```md
Maintainer here. Astraudit is a static analyser that runs entirely
in your tab — no backend, no LLM, no signup. Paste any
github.com/owner/repo URL and it produces a 100-point score across
eight categories plus a graph, prioritised next steps, and Markdown
/ JSON / AsciiDoc / PDF exports.

Constraints I locked in early:

- Browser-only. Audit + render in a Web Worker on your machine.
- Free, forever. No paid APIs.
- Public repos only. Optional PAT lifts the GitHub rate limit
  (stays in your localStorage).
- Rule-based. Every finding is a deterministic rule in
  docs/RULES.md.

There's an MCP server too (npx astraudit-mcp) so AI clients can
call the audit as tools.

Stack notes for anyone curious: Vite + React 19 + TypeScript
strict + a Web Worker pipeline. The detector lives in
`src/lib/audit/*` if you want to add a rule.

Happy to answer scoring / detector / constraint-contract
questions.
```

### What to expect

- Top of /show within ~30 min if the title is honest +
  the link works. Drops off quickly.
- The dominant comment patterns: "Did you compare to <tool>?",
  "Why no AI?", "Can it audit private repos?". Have one-paragraph
  answers ready in a scratch buffer.

---

## Discord

Short, single‑message snippets sized for chat channels (no
markdown body, link in‑line). Most communities cap pasted text at
~2000 chars; these stay well under.

### MCP Discord (Anthropic + community servers)

```text
🛠 Astraudit – browser-only static auditor for public GitHub repos,
also exposed as an MCP server.

`npx astraudit-mcp` spawns a stdio MCP server with the
`get_repo_audit` tool — your AI client calls it like any other
tool, no PAT needed for public repos.

Web app + docs: https://beko2210.github.io/astraudit/
Repo: https://github.com/BEKO2210/astraudit · MIT.
```

### Reactiflux / Vue Land / The Programmer's Hangout

```text
Built Astraudit — a browser-only auditor for any public GitHub
repo. Paste a URL, get a 100-point score across 8 categories
(docs, security, maintenance, CI, structure, DX, ecosystem,
quality) + a navigation graph + prioritised next steps. Vite +
React + a Web Worker pipeline. Rule-based, MIT.

https://beko2210.github.io/astraudit/
```

### TypeScript Discord

```text
Astraudit has an opt-in TypeScript-strictness pack — point it at
any public TS repo with `?rules=ts` in the URL and it reads the
tsconfig (JSONC tolerant), surfaces strict vs. partial vs. off,
and nudges about the modern extras
(`noUncheckedIndexedAccess`, `noImplicitOverride`,
`exactOptionalPropertyTypes`).

Try it: https://beko2210.github.io/astraudit/?rules=ts#/audit/microsoft/typescript
```

---

## Dev.to / Hashnode article outline

For longer-form posts when Astraudit hits a milestone (v1.0,
new rule pack, leaderboard launch). Each section header is the
suggested H2; the bullets are the paragraph beats.

```md
# I built a browser-only auditor for any public GitHub repo

## Why

- The "I just want to know if this OSS dep is healthy" gap.
- Why backend-less: trust + auditability + zero opex.
- Why rule-based instead of LLM-based: deterministic findings,
  reproducible, no token cost, no hallucinations on filenames.

## What it scores

- Eight categories + their weights (table or screenshot).
- One sentence per category with what the engine looks for.

## How it works under the hood

- Vite + React 19 + a Web Worker that owns the rule engine.
- File classifier → stack detector → per-category detectors →
  score engine → graph + recommendations.
- Where the public GitHub API can't answer ("unknown" status
  for admin-gated endpoints), we surface that honestly.

## Opt-in rule packs

- `?rules=a11y` · `?rules=i18n` · `?rules=ts` · `?rules=monorepo`.
- One-paragraph summary per pack + a "trigger example" repo URL.

## What's intentionally out of scope

- Private repos / paid analysis / cross-org reporting.
- "Why no AI?" paragraph linking the constraint contract.

## Try it / contribute

- Live site link.
- Repo link + `docs/RULES.md` for rule contributors.
```

---

## Lifecycle expectations

| Channel | Half‑life of attention | Best follow‑up |
|---|---|---|
| Hacker News /show | ~24 h | Reply to top 3 threads within 4 h of posting |
| Reddit /programming | ~36 h | Pin a "FAQ" comment 6 h after posting |
| Reddit /typescript, /rust, /opensource | ~48 h | Quote a finding from a popular repo in the audience |
| Discord drops | 30 min in chat | Pin in #showcase if the server has one |
| Dev.to article | 7–14 days organic | Cross-post to Hashnode 5 days later |

When a milestone post lands well (top 3 of its subreddit / front
page of /show), record it in `docs/launch/RUN_LOG.md` (if the
file exists) or `CHANGELOG.md` with the URL — future posts
benefit from knowing what framing worked.

---

## What this doc is **not**

- Not a press kit (that lives in `docs/press/`).
- Not the awesome‑list submission kit (that's
  `docs/AWESOME_LIST_PRS.md` + `scripts/awesome-list-entries.ts`).
- Not the per‑audit social post (those are generated client‑side
  by the M8.3 sticky‑bar **Share post** menu).
