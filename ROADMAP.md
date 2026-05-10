# Astraudit Roadmap

Astraudit will always:

- Run **100% in the browser** — no backend, no serverless function, no
  database, no OAuth, no auth at all.
- Stay **free to operate forever** — no paid APIs, no AI inference, no
  managed services, no quotas Astraudit has to pay for.
- Audit **public repositories only** — no private tokens are required by
  Astraudit; users may add their own optional read-only PAT locally to
  raise their browser's GitHub rate limit.

Every roadmap item below respects those constraints. If an item would
require violating any of them, we drop it instead of compromising.

---

## Phase 1 — Quick wins

Low risk, high value. Most of these are improvements to detection
accuracy and basic UX polish.

### 1.1 · Optional user-provided GitHub PAT (localStorage only) ✅ shipped
Today every visitor shares the per-IP **60 req/h** unauthenticated
limit. A small "Settings" dialog lets a user paste their own
**read-only** PAT. The token lives in `localStorage` only and is sent
exclusively to `api.github.com` and `raw.githubusercontent.com` (host
allow-list enforced in `src/lib/auth/tokenStore.ts`). Their browser
jumps to **5,000 req/h** without Astraudit ever seeing the token.

The dialog also runs a live `/rate_limit` probe so the user can confirm
the token works and watch the remaining budget in real time, plus a
one-click "Remove token" path.

### 1.2 · localStorage audit cache ✅ shipped
Bundles fetched from the GitHub API are cached in `localStorage`
keyed by `owner/repo` for 24 hours. A cache hit skips the network
entirely; the audit engine still runs in the current code path so
audit-rule improvements apply immediately. Per-entry size cap (~1.5 MB
JSON), 30-entry total cap, oldest-first eviction on quota errors. The
Settings dialog shows the cache size, the most recent entries, and a
one-click "Clear" button. See `src/lib/cache/auditCache.ts`.

### 1.3 · Markdown rendering for README excerpts ✅ shipped
A new "README" section renders the first ~1,800 chars (expandable to
~8,000) using `markdown-it` with `html: false` for XSS safety. Inline
HTML is escaped, all external links carry `target="_blank"` +
`rel="noreferrer noopener"`, in-page anchors stay in place, and
images get `loading="lazy"` + `referrerpolicy="no-referrer"`. Relative
URLs are resolved against the repo's branch — links go to
`github.com/<owner>/<repo>/blob/<branch>/...` and images to
`raw.githubusercontent.com/...`. Bundle cost: ~46 KB gz for
markdown-it.

### 1.4 · Wider CI/CD detection ✅ shipped
The CI detector now recognises 16 provider catalogs in
`src/lib/audit/ciDetector.ts` — GitHub Actions, GitLab CI, CircleCI,
Travis, AppVeyor, Azure Pipelines, Jenkins, Drone, Woodpecker,
Buildkite, TeamCity, Bitbucket Pipelines, Concourse, Earthly, Tekton,
Harness, and Gitea Actions. Detection is case-insensitive and runs
through the central `hasFile` / `hasFolder` lookup. GitHub Actions
also takes a fast path through the dedicated `/actions/workflows`
endpoint so very large repos (where the recursive tree response is
truncated) still report the correct provider. The "No CI workflow
detected" finding now applies only when *none* of the 16 providers
are present, killing the false positive for non-GitHub-Actions repos.
The Insights panel and audit graph list the detected providers; the
sub-line shows which build/test/lint/deploy/release/codeql buckets
the workflow names hit. Verified against `python/cpython` (correctly
reports GitHub Actions + Azure Pipelines) and `torvalds/linux`
(reports GitHub Actions despite tree truncation).

### 1.5 · Wider stack detection ✅ shipped
- Frameworks added to the detection catalog: **Astro**, **SolidStart**,
  **Qwik** + **Qwik City**, **Hono**, **Elysia**, **Effect**,
  **TanStack Start / Router**, **Modern.js**, **h3**, **tRPC**, plus
  **Tauri**, **UnoCSS**, **styled-components**, **Emotion**, **RxJS**,
  **Remix v2** entry points.
- Build tools: **Rspack**, **Rsbuild**, **Rspress**, **unbuild**,
  **tsdown**, **Nx Vite executor**.
- Test tools: **node:test**, **bun:test**, **@playwright/test**.
- Lint tools: **Oxlint**.
- New `envManagers` detector for **mise**, **asdf**, **nvm**,
  **node-version**, **pyenv**, **rbenv**, **SDKMAN**, **Nix**,
  **Devbox**, **Dev Containers** — surfaced as a "Toolchain managers"
  field in the dashboard.
- New `pythonTools` detector for **uv** (`uv.lock` + `[tool.uv]`),
  **Pixi**, **Hatch** (file + `[tool.hatch]`), **Poetry** (file +
  `[tool.poetry]`), **PDM**, **Pipenv**, **Conda**, **setuptools**,
  **Ruff** (`[tool.ruff]`).
- New `sboms` detector for `sbom.json`, `bom.json`, `cyclonedx.json`,
  `spdx.json`, `*.cdx.json`, `*.spdx.json` and their XML variants.
  An SBOM presence adds 9 points to the trust score.
- Newer Bun lockfile (`bun.lock` text format) and Yarn PnP
  (`.pnp.cjs`) wired through monorepo / package-manager detection.
- Bazel `WORKSPACE` / `MODULE.bazel` recognized as monorepo signal.
- New `aiDevTools` detector for AI / agent CLIs that maintainers
  commit configs for: **Claude Code** (`CLAUDE.md`, `.claude/`),
  **Cursor** (`.cursorrules`, `.cursor/`), **Windsurf**, **Aider**,
  **GitHub Copilot custom instructions**, **Continue**, **Cline**,
  **Roo Code**, **Codeium**, **Tabnine**, **OpenHands**, **Open
  Interpreter**, **GPT-Pilot**, **smolagents**, and the cross-tool
  **AGENTS.md** spec. Surfaced as both an Insights card and a row in
  the Dependency panel.
- Verified live against `pydantic/pydantic` (uv + Hatch + Ruff),
  `astral-sh/uv` (uv), `QwikDev/qwik` (Qwik), `withastro/astro`
  (Dev Containers + nvm), `microsoft/TypeScript` (Claude Code +
  GitHub Copilot + AGENTS.md), `cline/cline` (Cline + Claude Code +
  Copilot), `RooVetGit/Roo-Code` (Roo Code + AGENTS.md), and the
  original 10 repos with no score regressions.

### 1.6 · Detector unit tests ✅ shipped
A Vitest suite at `tests/` runs each detector against synthetic
file-tree fixtures — no network, no GitHub API. 11 test files, 92
test cases. Coverage:

- `parseRepoInput`: 12 happy/edge cases for input parsing.
- `fileClassifier`: case-insensitive lookups, suspicious-file
  exclusions, important-file presence, test signals.
- `securityDetector`: LICENSE / SECURITY.md / CODEOWNERS variants,
  Dependabot, .env templates, fixture-folder exclusions.
- `dependencyDetector`: package managers, lockfiles, scripts,
  TypeScript signals.
- `stackDetector`: framework + build/test/lint detection from a
  parsed `package.json`, env managers, Python tools (file +
  pyproject.toml content), SBOMs, AI dev-tools, monorepo signals,
  runtime tie-breaking.
- `ciDetector`: provider catalog, multi-provider, GitHub Actions
  fast-path via API, workflow buckets.
- `documentationDetector`: README signals (install/usage/api/badges).
- `markdown/render`: XSS escaping, link/image URL resolution,
  target=_blank rules, code-fence re-closing.
- `auth/tokenStore`: PAT save / load / clear, host allow-list,
  token-format validation. Stubs `localStorage`.
- `cache/auditCache`: bundle round-trip, case-insensitive keys,
  TTL invalidation, clearAll.
- `auditEngine`: end-to-end smoke tests against synthetic bundles —
  asserts that recommendations don't claim missing files when they
  are present, and that .env in fixtures isn't flagged.

Wired into `package.json` as `npm test`, `npm run test:watch`, and
`npm run test:ui`. Added to `.github/workflows/deploy.yml` as a CI
step so a failing test blocks deploys to GitHub Pages.

### 1.7 · Print / PDF stylesheet ✅ shipped
A comprehensive `@media print` block in `src/styles/globals.css`
converts the dashboard to a paper-friendly layout when the user hits
**Save as PDF** (the new button next to the Astraudit verdict) or
their browser's print shortcut. Zero infra — the browser does the
work.

What changes on print:
- The dark theme inverts to high-contrast on white. Glass cards
  flatten to plain bordered boxes. Aurora gradients and the body's
  background overlay disappear.
- The sticky `SectionNav`, the Settings/PAT button, the `Show more`
  / `View full README` toggles, and the findings filter dropdowns
  are hidden via `print:hidden` — they have no meaning on a static
  page.
- The interactive React Flow `AuditGraph` is hidden and a static
  `PrintGraphSummary` table takes its place. The table lists every
  graph node with its status and recommendation in three columns,
  with `page-break-inside: avoid` per row.
- Major sections (`Findings`, `Onboarding`, `Next steps`) start on
  a new page; smaller sections (`Overview`, `Score`, `Story`) avoid
  splitting across pages.
- External links print with their resolved URL so a printed PDF
  remains useful offline (`a[href^="http"]::after` rule); in-page
  anchors stay quiet.
- A print-only header line at the top of the dashboard prints the
  full repo name plus the audit timestamp on every page.
- Code blocks switch to wrapping (`white-space: pre-wrap`) so long
  lines stay inside the page margin.
- `@page` set to A4 with 14–18 mm margins. Page color adjustments
  use `print-color-adjust: exact` so the score ring and accent pills
  retain their tints.

Verified by build + the full vitest suite (92 tests still green).
Bundle delta: +0.7 KB gz CSS, ~0.2 KB gz JS for the two new
components.

### 1.8 · "Copy" buttons everywhere ✅ shipped
Reusable `CopyButton` component (`src/components/CopyButton.tsx`)
uses `navigator.clipboard.writeText` with a graceful no-op fallback
when the API is unavailable. Click feedback toggles the icon to a
mint-green check for 1.8 s. Three sizes (sm / md), two variants
(ghost / solid), optional inline label, and `print:hidden` so they
disappear on PDF export.

Wired into:
- `OnboardingPanel`: every shell-command `<pre>` block has a copy
  button pinned to the top-right corner.
- `OverviewHeader`: copies the canonical `owner/repo` slug and the
  full GitHub URL.
- `FindingCard`: per-file copy on each affected-file chip plus a
  "Copy all paths" button when a finding has more than one file.
- `FileStructurePanel`: copy on each suspicious filename row.
- `MaintenancePanel`: copy on commit SHAs (long form) and release
  tags. The 7-char short SHA is now also visible on screen.
- `RecommendationsPanel`: a "Copy all steps" button serializes the
  prioritized list as a numbered text block ready to paste into
  issues / Slack.
- `ReviewDashboard`: a "Copy verdict" button next to the existing
  "Save as PDF" button copies a four-line summary (repo, score,
  headline, verdict) — what you'd paste into a status update.

Test coverage: a vitest suite verifies the clipboard contract and
that the module loads even when `navigator.clipboard` is missing
(non-secure context). Total suite is now 94 tests across 12 files.

---

## Phase 2 — UX upgrades

### 2.1 · Shareable URL-encoded results ✅ shipped
Audit results now have shareable URLs of the form
`https://beko2210.github.io/astraudit/#/audit/owner/repo`. Hash-only
state — no backend, no shortener — and we deliberately encode only
the repo coordinates so audit-rule improvements apply on every
re-visit.

Implementation in `src/lib/share/urlState.ts`:
- `parseShareHash` accepts the `#/audit/<owner>/<repo>` form, tolerates
  trailing GitHub-URL segments (`#/audit/owner/repo/tree/main`), and
  re-uses the existing `parseRepoInput` slug validator.
- `formatShareHash` / `formatShareUrl` produce the canonical hash and
  fully-qualified URL (the latter preserves the deployed path so the
  link works under `/astraudit/`).
- `applyAuditHash` updates the URL via `history.pushState` on a fresh
  user submit and `history.replaceState` on hash-driven kickoffs to
  avoid duplicate history entries.
- `clearAuditHash` removes the audit fragment without touching the
  search part of the URL.

App.tsx wires the routing:
- On mount, any `#/audit/...` already in the URL auto-triggers the
  audit (this is what makes shared links a deep link).
- `startAudit` accepts an optional `{ fromHash }` flag so the URL
  update uses replaceState in that path.
- A combined `popstate` + `hashchange` listener re-derives the audit
  (or resets to idle) when the user uses the browser back/forward
  buttons.
- `handleReset` clears the hash with `pushState`.

UI:
- New `ShareButton` in `src/components/ShareButton.tsx` sits next to
  "Copy verdict" / "Save as PDF". Uses the native Web Share API on
  supported devices (mobile mostly), falls back to clipboard copy
  with a 1.8 s "Link copied" confirmation. Hidden when printing.

Tests: 8 new cases in `tests/lib/share/urlState.test.ts` covering
happy paths, malformed fragments, trailing-segment tolerance, and
the parse↔format round-trip. Total suite is now **102 tests across
13 files**.

### 2.2 · Compare two repositories side-by-side ✅ shipped
A "Compare with…" pill on every audit dashboard opens a small dialog
that asks for the right-hand repo. Both audits run in parallel
(cache-aware), then a dedicated `CompareDashboard` renders:

- Twin score rings with a centered Δ display and a left/right/tie
  category-win tally.
- A per-category bar chart showing both sides' percentages and the
  signed delta in the same row.
- A three-column **Findings diff** — only-in-left (cyan), shared
  (violet, with severity-differs / identical pills), only-in-right
  (amber). Matching is by `category::title` so noisy IDs don't
  prevent matches.
- A **Stack diff** section: scalar facts (language, runtime,
  package manager, monorepo tool, containerized, lockfile) in a
  table, then per-list diffs (frameworks, build, test, lint, env
  managers, python tools, AI tooling) split into shared / left-only
  / right-only.
- A natural-language quick verdict.

Plumbing:

- The Web Worker now accepts `{ id }` on input messages and echoes
  it back on `progress` / `result` / `error`, so two audits can run
  in the same worker without ambiguous routing.
- `src/lib/compare/diff.ts` builds the structured `CompareResult`
  (categories, findings diff, stack diff, summary).
- URL routing extended: `#/compare/<ownerA>/<repoA>+<ownerB>/<repoB>`.
  `+` is illegal inside repo slugs so the separator is unambiguous.
  `parseShareHash` is now a discriminated union (`audit | compare`).
- App state gains `comparing` and `compared` kinds. `popstate` /
  `hashchange` re-derive either kind from the URL.
- `CompareDialog` accepts a right-hand repo or a one-click example.
- `CompareDashboard` reuses `ScoreRing`, `ShareButton`, `CopyButton`
  for consistency and copies a "Compare summary" line for
  paste-into-Slack flows.

Tests: 12 new cases in `tests/lib/compare/diff.test.ts` (category
deltas, finding bucketing, case-insensitive title matching, scalar
fact comparison, end-to-end with auditEngine), plus 4 new compare
URL cases in `tests/lib/share/urlState.test.ts`. Total suite is now
**114 tests across 14 files**.

### 2.3 · Light & dark theme toggle ✅ shipped
A three-way Theme toggle (Dark / Light / System) sits next to the
Settings/PAT pill in the Hero. The choice persists in `localStorage`
and the System mode follows `prefers-color-scheme` live.

How it works without refactoring every component:

- Dark stays the default. The opt-in is `data-theme="light"` on
  `<html>`, and a single CSS block in `globals.css` rewrites the
  semantic surfaces (glass cards, body, accent text, code blocks,
  README prose, sticky nav, score-ring track, …) for light mode
  without touching any component class names.
- A tiny inline script in `index.html` reads the stored preference
  before the React bundle loads — no flash of the wrong theme.
- `src/lib/theme/themeStore.ts` exposes `loadTheme`, `saveTheme`,
  `resolveTheme`, `applyTheme`, `cycleTheme`, and a
  `listenSystemPreference` that survives the legacy Safari
  `addListener` API.
- `ThemeToggle.tsx` cycles dark → light → system → dark, swaps the
  icon (Moon / Sun / Monitor), and re-applies on system changes
  while in System mode. Hidden on print.

Tests: 7 new cases in `tests/lib/theme/themeStore.test.ts` covering
default fallback, persistence, garbage rejection, OS resolution for
"system", concrete `dark/light` resolution, and the
data-theme attribute toggle. **Total suite: 122 tests across 15 files.**

### 2.4 · Audit history & favorites ✅ shipped
Every successful audit (including each side of a comparison) is
recorded into a local `localStorage` history. A new "History" pill
appears in the Hero as soon as the first entry exists; clicking it
opens the History dialog with two tabs:

- **Favorites** — entries the user has starred. Pinned to the top
  regardless of recency. Unlimited count.
- **Recent** — the last 20 audited repositories ordered by recency.

Each row shows the GitHub avatar, the `owner/repo` slug, the score,
the grade colour-coded, and the relative time of the last audit.
Clicking a row re-audits that repo (cache-aware, so a hit reads
straight from the 24h bundle cache shipped in Phase 1.2).
Per-row controls toggle the favorite flag or remove the entry; a
"Clear all" button wipes the whole history.

Implementation:

- `src/lib/history/historyStore.ts` exposes `recordAudit`,
  `toggleFavorite`, `removeEntry`, `listHistory`,
  `listFavorites`, `getEntry`, `clearAll`, and `getStats`.
  Entries are deduped by lowercased `owner/repo`, the favorite flag
  is preserved across re-audits, and a soft `TOTAL_STORAGE_LIMIT`
  of 200 prevents unbounded growth (oldest non-favorites evicted
  first).
- `App.tsx` calls `recordAudit` whenever the state transitions to
  `ready` (single audit) or `compared` (records both sides).
- `HistoryDialog` mirrors the Settings dialog pattern: glass card,
  Esc-close, click-outside-to-close, scrolling list.
- `Hero` renders the History pill conditionally when at least one
  entry exists.

Tests: 9 new cases in `tests/lib/history/historyStore.test.ts` —
record creates entries, dedupes case-insensitively, preserves the
favorite flag on update, toggleFavorite is idempotent, listHistory
floats favorites to the top, removeEntry / clearAll behaviour, and
the stats counter. **Total suite: 131 tests across 16 files.**

### 2.5 · Keyboard shortcuts + command palette ✅ shipped
**`Cmd/Ctrl+K`** opens a filterable command palette with five
groups:

- **Jump to section** — Overview, Score, Story, README, Insights,
  Graph, Findings, Structure, Stack, Maintenance, Onboarding, Next
  steps. Each entry shows its vim-style chord.
- **Actions** — Compare, Open history, Open settings, Reset to
  empty, Save as PDF.
- **Theme** — Dark / Light / Follow system.
- **From your history** — top 5 favorites + top 5 recent re-audits.
- **Audit an example** — the four built-in examples.

Vim-style chords (suppressed inside inputs / textareas):

- `g o` Overview · `g s` Score · `g t` Story · `g r` README
- `g i` Insights · `g g` Graph · `g f` Findings · `g c` Structure
- `g k` Stack · `g m` Maintenance · `g b` Onboarding · `g n` Next
- `?` shortcuts cheat sheet · `/` focuses the repo input · `Esc`
  closes the active dialog.

Implementation:

- `src/lib/commands/types.ts` — `Command` type and a relevance
  scorer that ranks exact > prefix > substring > subsequence
  matches.
- `src/lib/commands/buildCommands.ts` — composes the live command
  list from current state plus the live history / favorites.
- `src/lib/keyboard/useGlobalShortcuts.ts` — single `keydown`
  listener that handles Cmd/Ctrl+K, the `g`-chord with a 1.2 s
  timeout, `?`, and `/`. Suppressed when the focus is on an input,
  textarea, select, or contenteditable element.
- `src/components/CommandPalette.tsx` — glass dialog with
  filterable list, keyboard navigation (`↑↓ Home End ↵`), grouped
  rendering, scroll-into-view for the active row, mouse-hover
  selection, and a footer hint.
- `src/components/ShortcutsDialog.tsx` — the `?` cheat sheet.

Tests: 9 new cases — the relevance scorer (exact / prefix /
substring / subsequence ordering), `filterCommands` with empty and
populated queries, prefix-wins-over-subsequence guard, the
`G_PREFIX_MAP` covers every documented chord and points to a known
section id, and `isEditableTarget` correctly treats input / textarea
/ select / contenteditable nodes as editable. **Total suite: 139
tests across 18 files.**

### 2.6 · Activity heatmap ✅ shipped
The Maintenance section now opens with a GitHub-style commit
heatmap covering the **last 12 weeks (84 days)** — 12 columns × 7
rows, Monday-aligned, ending on the current week's Sunday. Each
cell is hover-titled with `Mon, May 5 — 3 commits` and uses one of
five aurora-mint intensities scaled against the day-with-the-most.
A tiny "Less / More" legend sits in the bottom-right.

To make the window meaningful we bumped `fetchCommits` from 15 to
**100 (the GitHub API max for a single page)** — same number of
HTTP round-trips, just a wider payload, so it costs no extra rate
limit budget.

Implementation:

- `src/lib/audit/activityHeatmap.ts`:
  - `toIsoDay`, `monIndex`, `countCommitsByDay` — pure helpers,
    UTC-based, immune to time-zone surprises.
  - `buildHeatmapGrid(commits, now?)` returns exactly
    `HEATMAP_DAYS` cells aligned to Monday columns ending Sunday,
    with `total / max / uniqueDays` summary.
  - `intensityBucket(count, max)` maps a per-cell count into 0..4.

- `src/components/ActivityHeatmap.tsx`: column-major grid render
  with row labels (Mon/Wed/Fri visible) and a sparse month banner
  on top. Mounted inside `MaintenancePanel` above the existing
  "Recent commits" list. Print-friendly: `break-inside: avoid`.

Tests: 14 new cases in `tests/lib/audit/activityHeatmap.test.ts`
covering ISO formatting, Monday-indexed weekdays, per-day counts
(including duplicate dates and bad input), grid alignment to
Sunday, empty-input behaviour, and every intensity-bucket
boundary. **Total suite: 153 tests across 19 files.**

### 2.7 · Astraudit badge (SVG) ✅ shipped
A new "Badge" pill in the score header opens a dialog that generates
an SVG badge for the current audit. Three styles: **Flat** (shields-
io look), **Aurora** (Astraudit brand with grade), **Minimal** (a
score-only chip). Live preview, **Download** as `astraudit-<owner>-
<repo>-<style>.svg`, plus copy buttons for the SVG source and a
ready-to-paste Markdown snippet that links the badge back to a fresh
Astraudit run for the repo via `formatShareUrl`.

Honest trade-off acknowledged in the dialog copy: since Astraudit
has no backend, the badge values are baked into the file at download
time. Maintainers commit the SVG into their repo (`./astraudit-…
.svg`) and re-export when they want to publish a new score.

Implementation:

- `src/lib/badge/svgBadge.ts` — pure string-builder, no DOM. Three
  renderers (`renderFlat`, `renderAurora`, `renderMinimal`) all
  produce self-contained SVG (inline attribute styling, system-font
  stack, no external assets, `role="img"` + `aria-label`). Every
  user-provided string flows through `escapeXml`. `colorForScore`
  matches the dashboard's tier colors. `clampScore` keeps the
  rendered number inside `[0, max]` even if a caller passes garbage.
  `buildBadgeMarkdown` produces the `[![alt](path)](shareUrl)` line.
- `src/components/BadgeDialog.tsx` — preview, style toggle, download
  via `Blob` + `URL.createObjectURL`, copy SVG / copy Markdown.
  Inline-rendered preview is safe because the SVG is built from
  fully escaped inputs and contains no `<script>`.
- `src/components/ReviewDashboard.tsx` — Badge pill (mint accent)
  next to Compare / Share / Save as PDF, mounts the dialog.

Tests: 14 new cases in `tests/lib/badge/svgBadge.test.ts` —
`escapeXml` covers all five XML metacharacters, `colorForScore`
returns the right accent per tier, every renderer round-trip,
snapshot-style assertions for the aurora style, the aria-label
contract, score clamping at both ends, no parseable `<script>` /
`<img onerror=` survives malicious input, escaped form is present,
and the Markdown builder. **Total suite: 167 tests across 20
files.**

### 2.8 · UI polish round (ten focused improvements)

A dedicated UI-polish phase — one PR-shaped slice per item, all tested
where there is meaningful logic, all hidden on print where they would
add ink-only chrome.

#### 2.8.1 · Toast notifications ✅ shipped
A research-driven toast system (Sonner / Radix Toast / ARIA APG /
Adrian Roselli + WCAG 2.1 AA). Lives in
`src/lib/ui/toastStore.ts` (pure pub/sub, no React) and
`src/components/ToastHost.tsx` (single live region).

Honours the toast-UX rules backed by the research:

- **Use sparingly** — `CopyButton` and `ShareButton` keep the
  inline icon-flip as the primary success affordance and only emit
  a toast on the failure path. Toasts are reserved for actions
  whose outcome isn't visually evident: badge download saved,
  GitHub PAT saved/removed, audit cache cleared, history cleared.
- **Per-tone semantics**: success / info / loading map to
  `role="status"` + `aria-live="polite"`; warn / error map to
  `role="alert"` + `aria-live="assertive"`.
- **TTL defaults**: 4 s success/info, 5 s warn, 6 s error,
  ∞ loading. Override per call. Loading toasts can be promoted
  into success/error via `updateToast`.
- **WCAG 2.2.1 timing**: pause-on-hover, pause-on-focus-within,
  pause-on-tab-hidden — all preserve millisecond precision so
  resuming continues from the remaining time, not from zero.
- **Esc dismisses all** — but only when no `[role="dialog"]
  [aria-modal="true"]` is open, so dialog Esc still wins.
- **Stack cap** at `MAX_VISIBLE = 4`. Older toasts queue silently.
- **`prefers-reduced-motion`** is respected via `motion-safe:`.
- **Icon + colour** for every tone (never colour alone).

Dialogs that emit useful toasts:
- `BadgeDialog` → "Badge saved" with the filename on download
  success; an error toast when the Blob/anchor flow throws.
- `SettingsDialog` → "GitHub token saved", "GitHub token removed",
  "Audit cache cleared (~X KB freed)".
- `HistoryDialog` → "Audit history cleared (X entries removed)".
- `CopyButton` / `ShareButton` → warn/error toasts only on
  clipboard failure.

Tests: 12 cases in `tests/lib/ui/toastStore.test.ts` covering
push + monotonic ids, per-tone TTL defaults, auto-dismiss timing
with fake timers, loading-tone persistence, pause/resume
preserves remaining time + idempotency, dismiss / dismissAll
clear pending timers, `updateToast` resets timer + ignores
unknown ids, `MAX_VISIBLE` constant. **Total suite: 179 tests
across 21 files.**

Sources informing the design:
- Radix Primitives Toast docs (sensitivity model, foreground vs.
  background)
- Sonner (TTL defaults, pause-on-hover, stack of 3-4)
- Adrian Roselli, "Defining 'Toast' Messages" (timing-adjustable
  WCAG criterion, role semantics)
- Scott O'Hara, "A toast to a11y toasts" (no focus trap, polite
  vs assertive)
- WCAG 2.1 success criterion 2.2.1 timing-adjustable

#### 2.8.2 · Skeleton loaders for the dashboard ✅ shipped
Replaces the old vertical step-list during audit with a
**content-shaped** skeleton that mirrors every dashboard section so
the layout stays still the moment data arrives — overview header,
twelve-cell heatmap, score ring, story grid, insights grid, score
breakdown, findings list, recommendations.

Architecture:

- `src/components/Skeleton.tsx` — generic primitive.
  - Renders a `<div>` (or `<span>` when `inline`).
  - `aria-hidden="true"` by default so screen readers don't read
    placeholder gibberish — the surrounding live region in
    `LoadingAudit` carries the textual loading announcement.
  - Optional `label` prop flips the element to `role="img"` with
    `aria-label`, useful for solo placeholders.
- `src/components/DashboardSkeleton.tsx` — composite that mirrors
  the actual `ReviewDashboard` layout 1:1. Hard-coded structure is
  intentional: zero coupling to data, deterministic shape, no
  surprises after load.
- `src/components/LoadingAudit.tsx` — drops the step-list, mounts
  the skeleton, and shows the current pipeline step as a single
  status pill at the top (the only textual progress info — never
  doubled-up with the skeleton).

Accessibility (WCAG-conscious):

- Wrapper section is `role="status"` `aria-live="polite"` with a
  full sentence in `aria-label` ("Loading audit for owner/repo —
  Mapping file tree."). Plus `aria-busy="true"` for the screen
  readers that honour it (JAWS).
- A `sr-only` paragraph mirrors the announcement so software that
  ignores `aria-label` on a section still picks it up.
- `.skeleton-shimmer` in `globals.css` defines the slide animation
  with a `@media (prefers-reduced-motion: reduce)` block that
  switches to a static fill — required by WCAG 2.3.3.
- Light theme override re-tints the shimmer so the placeholder is
  legible on both backgrounds.
- `@media print` hides every shimmer block — they have no place on
  paper.

Tests: 4 new cases in `tests/components/Skeleton.test.tsx` —
default `<div>` + shimmer class, inline mode renders `<span>`,
`aria-hidden` by default, labeled mode flips to `role="img"` with
`aria-label` and drops the `aria-hidden`. **Total suite: 183 tests
across 22 files.**

Sources informing the design:
- LogRocket "Skeleton loading screen design"
- GitLab Pajamas Design System — Skeleton loader
- Adrian Roselli, "More Accessible Skeletons"
- Sara Soueidan, "Accessible notifications with ARIA Live Regions"
- Microsoft Fluent 2 — React Skeleton usage
- WCAG 2.1 success criterion 2.3.3 animation from interactions

#### 2.8.3 · Sticky score header on scroll ✅ shipped
Once the user scrolls past the Score section, a slim 48 px bar
slides in from the top showing **`owner/repo · 81/100 · Strong`**
plus the most-needed actions (Compare, Share, Badge, Save as PDF,
Copy verdict). Disappears the moment the Score section is back in
view, so the screen stays free during reading.

Implementation:

- `src/components/StickyScoreBar.tsx` uses an
  `IntersectionObserver` on the `#score` section (rather than a
  scroll listener) — the IO callback runs once per crossing while
  scroll events fire on every paint and force layout reads.
  `rootMargin: "-46px 0px 0px 0px"` accounts for the existing
  `<SectionNav>` height. The component bails out gracefully when
  IntersectionObserver is undefined (SSR / very old browsers).
- The bar is `position: fixed top: 0` so it overlays the page when
  visible and disappears from layout when not. It exposes a CSS
  custom property `--sticky-offset` which is `48px` while the bar
  is shown and `0px` otherwise — the existing `<SectionNav>` reads
  that variable through its inline `style.top`, transitions to
  `top: 48px`, and stacks naturally.
- Slide-in / slide-out is `translate-y-full ↔ 0` with a 200 ms
  ease and a `motion-reduce:transition-none` escape hatch.
- `role="region" aria-label="Audit summary"`, `aria-hidden="true"`
  while the bar is hidden, action buttons get `tabIndex={-1}` while
  hidden so keyboard users don't tab into invisible chrome.
- WCAG 2.4.11 (Focus Not Obscured) handled at the `<html>` level
  via `scroll-padding-top: calc(56px + var(--sticky-offset))` so
  programmatic anchor scrolling never parks focus under the bars.
- `print:hidden` keeps the bar out of PDF exports.

Tests: 2 new cases in `tests/components/StickyScoreBar.test.tsx`
— the exported `STICKY_OFFSET_VAR` and `BAR_HEIGHT_PX` constants
(used by the CSS scroll-padding rule and SectionNav offset), plus
an SSR smoke render that asserts the role / label / hidden-state
attributes are correct on initial paint when IntersectionObserver
is absent. **Total suite: 185 tests across 23 files.**

Sources informing the design:
- Chrome for Developers, "An event for CSS position:sticky"
- TPGi/Vispero, "Prevent focused elements from being obscured by
  sticky headers" (WCAG 2.4.11)
- ParallelHQ, "What is a Sticky Header? UX Best Practices &
  2026 Design Guide" (height, persistence, double-up)
- Ryan Mulligan, "Sticky Page Header Shadow on Scroll"
  (IntersectionObserver pattern)

#### 2.8.4 · Mobile FAB cluster ✅ shipped
On phones (`< sm`), a Material-3 Speed-Dial sits in the bottom-
right thumb zone. Tapping the main FAB expands a stack of pill-
shaped, **labeled** mini-buttons above it — Compare, Share, Badge,
Save as PDF on the audit dashboard, plus Exit on the compare view.
Tap again, click outside, or hit Esc to close. The desktop UI
keeps the existing action cluster in the StickyScoreBar; the FAB
is `sm:hidden` to avoid duplication.

Research-driven decisions (Material 3 FAB guidelines, Mobbin
glossary, Apple HIG, Danny Payne on FAB a11y, Elaris on thumb
zones, WCAG 4.1.2 / 2.4.7):

- **One FAB per screen.** Material's "no multi-FAB" rule is
  honoured via the Speed Dial pattern — a single 56 × 56 FAB
  expands into a menu rather than scattering buttons.
- **Bottom-right placement** matches the right-handed thumb zone
  (statistical majority on mobile UX research). Mini items open
  upward so labels stay above the thumb.
- **Touch targets**: main FAB 56 px (Material), mini items 44 px
  pills with visible label text — icon-only is always paired with
  a name to satisfy WCAG 4.1.2 and avoid the icon-confusion trap.
- **Speed Dial ARIA**: main button is `aria-haspopup="menu"`,
  `aria-expanded`, `aria-controls`. Menu container is `role="menu"`
  with `aria-hidden` flipping with state. Mini items are
  `role="menuitem"`. `tabIndex={-1}` while collapsed so keyboard
  users don't tab into invisible chrome (Danny Payne's caveat for
  absolutely-positioned FABs).
- **Esc + outside-click** close the menu. Esc restores focus to the
  main FAB so the user can re-open with Space/Enter without
  re-tabbing.
- `motion-reduce:transition-none` honours `prefers-reduced-motion`.
- `print:hidden` keeps the FAB out of PDFs.

DRY refactor:

- `src/lib/share/shareAction.ts` extracts the share/clipboard flow
  from `ShareButton` into a typed, pure helper (`performShare`)
  returning a discriminated `ShareOutcome`. The button uses it,
  the FAB uses it, the CompareDashboard FAB uses it. The "user
  cancelled the share sheet" case is now a first-class
  `kind: "cancelled"` return so callers don't surface a misleading
  "couldn't share" toast.
- `ShareButton` slimmed down to ~15 lines of click handler.
- `StickyScoreBar` action cluster wrapped in `hidden sm:flex` so
  on mobile the FAB owns the action surface and the score bar
  stays at-a-glance.

Tests: 13 new cases.

- `tests/lib/share/shareAction.test.ts` (6) — share-then-shared,
  AbortError → cancelled, share-rejected → clipboard fallback,
  no-share → clipboard, clipboard-rejected → error, neither API →
  unavailable.
- `tests/components/SpeedDialFAB.test.tsx` (7) — main FAB has
  `aria-haspopup` + `aria-expanded`, menu starts `aria-hidden`,
  mini items each have `role="menuitem"` + `tabindex="-1"`, the
  custom `ariaLabel` propagates, `hidden=true` and empty actions
  short-circuit the render to nothing, the cluster carries
  `sm:hidden` and `print:hidden`.

**Total suite: 198 tests across 25 files.**

Sources informing the design:
- https://m3.material.io/components/floating-action-button/guidelines
- https://mobbin.com/glossary/floating-action-button
- https://danny-payne.medium.com/accessibility-options-for-floating-action-buttons-99bdf8146988
- https://elaris.software/blog/mobile-ux-thumb-zones-2025/

#### 2.8.5 · Empty-state celebration ✅ shipped
When a repo audits with **zero findings** (rare but real — see
facebook/react), the Findings section drops the filter chrome and
the empty list, and renders an `<EmptyFindingsCelebration />`
panel: a glowing party-popper medal, a star burst behind it, the
short headline **"All clear"**, a one-sentence explanation that
the rule-based detectors found nothing to flag, the score chip,
and an optional "Compare against another repo" CTA when the
existing `onOpenCompare` callback is wired through.

Research-driven decisions (Pencil & Paper on the three empty-state
categories, Eleken on celebratory phrasing, Intuit Content Design,
UI Deploy 2025 guide, Sara Soueidan + MDN on ARIA live regions,
catdad/canvas-confetti issue #114 on prefers-reduced-motion):

- **Celebratory category**, not informational. Empty findings means
  Astraudit's rule-based detectors all came back healthy; the copy
  ("All clear", "rare and worth celebrating") sells that explicitly
  rather than surfacing a generic "No findings" placeholder.
- **CSS-only celebration motion**, no canvas-confetti. Confetti
  libraries famously ignore `prefers-reduced-motion: reduce` (issue
  #114), so we lean on the existing `pulseRing` + `floaty`
  keyframes and wrap every animation utility in `motion-safe:`. A
  vitest assertion guards the rule.
- **ARIA live region**: outer card is `role="status"
  aria-live="polite" aria-atomic="true"`. A `sr-only` sentence
  carries the same announcement for assistive tech that ignores
  `role="status"` content updates.
- **Decorative sparkles** sit inside `aria-hidden` so the four
  background icons don't pollute the screen-reader output.
- **Conditional CTA** — Compare button only renders when
  `onOpenCompare` is provided, so the celebration works in
  contexts where compare isn't reachable.
- **Honest hedge**: "Findings are static signals though, not a
  full security audit." A clean Astraudit report is not a
  vulnerability scan.

`FindingsPanel` switches to the celebration mode when
`findings.length === 0` and skips rendering the severity / category
filter chrome (filters have nothing to operate on). `ReviewDashboard`
forwards `repoFullName`, `score`, `maxScore`, and `onOpenCompare`
through.

Tests: 7 new cases in
`tests/components/EmptyFindingsCelebration.test.tsx` —
`role="status"` + `aria-live="polite"` + `aria-atomic`, sr-only
announcement carries the full sentence, score chip has explicit
`aria-label`, every `animate-*` class lives behind `motion-safe:`,
decorative sparkles carry `aria-hidden`, the Compare CTA is
conditional on `onOpenCompare`, and the "No findings" wording is
explicitly absent ("All clear" wins instead).

**Total suite: 205 tests across 26 files.**

Sources informing the design:
- https://www.pencilandpaper.io/articles/empty-states
- https://www.eleken.co/blog-posts/empty-state-ux
- https://contentdesign.intuit.com/product-and-ui/empty-states/
- https://github.com/catdad/canvas-confetti/issues/114
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions

#### 2.8.6 · Smooth route transitions ✅ shipped
Each major view (`EmptyState`, `LoadingAudit`, `ErrorState`,
`ReviewDashboard`, `CompareDashboard`) animates in when the App
state branch changes, via plain CSS keyframes — no animation
library, no View Transitions API dependency, no `data-state`
machinery. React's natural mount/unmount triggers the run-once
animation.

Research-driven decisions (React docs on `<ViewTransition>`, Pope
Tech "Design accessible animation" 2025, CSS-Tricks
`prefers-reduced-motion`, Web Animation Best Practices guide,
Motion docs):

- **220 ms timing**, intentionally on the brisk side. Web-animation
  research recommends 300-500 ms ceiling for page transitions; we
  err brisk so a snappy app doesn't feel sluggish.
- **35% of users** opt into `prefers-reduced-motion: reduce` (Pope
  Tech). Rather than removing all motion we keep a fade-only
  fallback — fade is widely tolerated by users with vestibular
  sensitivities while still signalling content change. CSS-Tricks
  recommends "less, slower, or removed motion" — we picked
  removed-translate, kept-fade.
- **Plain CSS keyframes**, not the View Transitions API. The API
  is Chrome-only at production maturity; CSS keyframes work in
  every browser without feature detection.
- **No data-state plumbing.** React already remounts the new view
  when the App state branch changes; the keyframe runs once on
  mount, naturally.

Implementation:

- `tailwind.config.ts` gains two keyframes — `view-enter` (slide
  up 10 px + fade, 220 ms ease-out, `both` fill mode) and `fade-in`
  (fade only, 180 ms). Tailwind exposes them as `animate-view-enter`
  and `animate-fade-in`.
- `src/lib/ui/transitions.ts` exports `VIEW_ENTER_CLASS`, the canonical
  variant pair `motion-safe:animate-view-enter motion-reduce:
  animate-fade-in`. Single source of truth — every view imports it
  rather than repeating the variant pair, so the policy is one-line
  to change.
- Five view roots wear the class:
  - `EmptyState` (idle / no audit running)
  - `LoadingAudit` (skeleton screen)
  - `ErrorState` (now also `role="alert"`)
  - `ReviewDashboard` (single-repo audit)
  - `CompareDashboard` (compare result)

Tests: 3 new cases in `tests/lib/ui/transitions.test.ts` —
`motion-safe:animate-view-enter` is present, `motion-reduce:
animate-fade-in` is present, and a regex assertion forbids any
naked `animate-*` utility (would fire regardless of motion
preference, breaking WCAG 2.3.3 for some users).

**Total suite: 208 tests across 27 files.**

Sources informing the design:
- https://react.dev/reference/react/ViewTransition
- https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/
- https://css-tricks.com/almanac/rules/m/media/prefers-reduced-motion/
- https://gist.github.com/uxderrick/07b81ca63932865ef1a7dc94fbe07838 (Web Animation Best Practices)
- https://motion.dev/docs/react-transitions

#### 2.8.7 · Universal focus-visible ring ✅ shipped
**Why:** Without an unmistakable keyboard focus indicator, the app
silently violates WCAG 2.4.7 (Focus Visible · A) and 2.4.11 (Focus
Appearance · AA in WCAG 2.2). Sighted keyboard users are the most
neglected accessibility audience — Tab-only navigation has to be
obviously visible against every surface in the app, in both themes.

**Pre-build research (2026-05-10):**
- W3C WAI · *Understanding SC 2.4.7 Focus Visible* — at least one
  state where keyboard focus is visually distinguishable. The browser
  default usually qualifies, but the moment a designer adds
  `outline:none` without a replacement, the page fails.
  https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- W3C WAI · *Understanding SC 2.4.11 Focus Appearance* — measurable
  minimums: contrast ≥ 3:1 against both the focused element and the
  adjacent background, and a perimeter band ≥ 2 CSS px (or area
  equivalent). https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- Sara Soueidan · *A guide to designing accessible focus indicators*
  — recommends the *halo* pattern (a wider, low-opacity outer ring on
  top of a solid 2 px inner ring) so the indicator stays visible on
  same-coloured patches and high-contrast dividers alike.
  https://www.sarasoueidan.com/blog/focus-indicators/
- a11y-collective · *Focus indicators that don't make designers cry*
  — emphasises always preferring `:focus-visible` over `:focus` so
  mouse-clicks don't paint rings.
  https://www.a11y-collective.com/blog/focus-indicator-accessibility/
- TestParty · *Focus visible in WCAG 2.2* — confirms that an outline
  with a transparent fallback still passes forced-colors mode if the
  rule resolves to a system colour like `Highlight`.
  https://testparty.ai/blog/wcag-focus-visible

**Implementation:**
- New CSS in `src/styles/globals.css → @layer base`:
  `*:focus-visible { outline: 2px solid rgba(159,132,255,0.95);
   outline-offset: 2px; border-radius: 6px;
   box-shadow: 0 0 0 4px rgba(122,92,255,0.28); }`
  Lavender outline picks up ≥ 5:1 contrast against the dark bg; the
  4 px halo handles the SC 2.4.13 *contrast bridge* requirement
  against same-coloured elements.
- Light-theme override: `html[data-theme="light"] *:focus-visible`
  swaps the colour to indigo-600 (`#4f46e5`) which keeps ≥ 7:1
  contrast against the near-white surface.
- `@media (forced-colors: active) *:focus-visible` resolves to
  `outline: 2px solid Highlight; box-shadow: none;` so Windows
  High-Contrast users get the system-defined focus colour.
- Audited every component for legacy `focus:outline-none`. Sites
  that had no replacement (RepoInput, FindingsPanel selects,
  CommandPalette input) drop the override and inherit the global
  ring. Sites that already shipped a custom ring (CompareDialog,
  SettingsDialog token field) migrate from `focus:` → `focus-visible:`
  so the ring fires on Tab but not on mouse-click.
- New tests in `tests/lib/ui/focusVisible.test.ts` lock the global
  rule contract (outline, offset, halo, light override, forced-colors
  block) and walk every `src/**/*.tsx?` file to fail CI if a
  `focus:outline-none` re-appears without `focus-visible:`.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 28 files / 215 tests green (was 27 / 208).
- `npm run build` — 574 KB JS / 58.9 KB CSS, no warnings.

#### 2.8.8 · Lightweight tooltip primitive ✅ shipped
**Why:** The codebase had been leaning on the `title=` HTML attribute
to surface hover hints on icon-only buttons. `title` is a textbook
*almost works* attribute: it's invisible to keyboard users (Tab does
not trigger it), invisible on touch, and screen readers announce it
inconsistently — Heydon Pickering's blunt summary is "if you want to
hide content from mobile, tablet, AT, and keyboard users, use the
title attribute." We need a real tooltip primitive that any icon
button can opt into without re-inventing the wheel.

**Pre-build research (2026-05-10):**
- WAI-ARIA APG · *Tooltip Pattern* — bubble carries `role="tooltip"`,
  trigger references it via `aria-describedby` (auxiliary information)
  or `aria-labelledby` (when the bubble *is* the accessible name).
  Tooltips never receive focus. Escape dismisses without moving focus.
  https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
- Heydon Pickering · *Tooltips & Toggletips* — when a trigger already
  has a sufficient `aria-label`, an additional `aria-describedby`
  with the same text is redundant; either drop the wiring or vary the
  text. CSS-only show/hide via `:hover` + `:focus-visible` is fine for
  desktop, but touch users need a different affordance (toggletips).
  https://inclusive-components.design/tooltips-toggletips/
- W3C WAI · *Understanding SC 1.4.13 Content on Hover or Focus* (AA):
   · *Dismissible* — Escape (or other mechanism) closes the tooltip
     without moving focus or pointer.
   · *Hoverable*   — pointer must be able to traverse onto the bubble
     without it disappearing.
   · *Persistent*  — visible until trigger blur, dismissal, or
     content invalidation.
  https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html

**Implementation:**
- New `src/components/ui/Tooltip.tsx`. Single React element trigger,
  sibling `<span role="tooltip">` bubble, both wrapped in
  `<span class="tt-wrap">`. `useId()` generates a stable id for the
  bubble (referenced via `aria-describedby` when consumer opts in).
- CSS lives in `src/styles/globals.css` (new "TOOLTIP PRIMITIVE"
  block before the skeleton block). Visibility is driven entirely by
  CSS: `.tt-wrap:hover > .tt-bubble`, `.tt-wrap:focus-within > .tt-bubble`,
  AND `.tt-bubble:hover` (the third selector satisfies WCAG 1.4.13
  Hoverable — once the cursor leaves the trigger, the bubble's own
  `:hover` keeps it open).
- Bubble uses `padding-bottom: 4px; margin-bottom: 6px` (top placement)
  so the gap between trigger and bubble is part of the bubble's hit
  area — no JS measurement needed.
- Esc handling is the only JS: `onKeyDown` on the wrapper sets
  `data-tt-dismissed="true"` which a CSS rule (`!important`) then
  honours. The flag resets on `onBlur` / `onPointerLeave` so the next
  interaction shows the bubble again.
- Light theme + `forced-colors: active` overrides keep the bubble
  visible across themes and Windows High-Contrast mode.
- `prefers-reduced-motion: reduce` zeros out the slide/fade transition.
- `@media print` hides every bubble.
- Wired into four call sites that previously used `title=`:
  `CopyButton`, `ShareButton`, `PrintButton`, `ThemeToggle`. Each now
  drops the `title` attribute and gains the new bubble while keeping
  its existing `aria-label` (so SR users still get the name; we don't
  add `describe` because the bubble text equals the label).

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 29 files / 227 tests green (was 28 / 215).
- `npm run build` — 574 KB JS / 60.4 KB CSS, no warnings.

#### 2.8.9 · Density toggle (comfortable / compact) ✅ shipped
**Why:** Astraudit's glass-card layout breathes nicely on a 27" monitor
but eats vertical space on 1080p / 13" laptop screens — power users
have been asking for a tighter mode that fits more above the fold.
Industry standard: a *user-controlled* density toggle, not a viewport
heuristic, so the user keeps agency over their layout.

**Pre-build research (2026-05-10):**
- Material Design 3 / Atlassian / IBM Carbon all converge on the same
  pattern: density is a single attribute on the document root and the
  CSS rules are scoped to it. The user picks once, the choice
  persists, no view-port magic. Atlassian explicitly notes that
  spacing tokens lay "a foundation for customisable UI density" —
  attribute-driven scoping is the canonical implementation.
  https://atlassian.design/foundations/spacing
- WCAG 2.2 SC 2.5.8 *Target Size (Minimum)* (Level AA): interactive
  controls must remain ≥ 24×24 CSS px. The criterion explicitly
  acknowledges the trade-off: "users with visual field loss may
  prefer a more condensed layout while users with low vision may
  prefer larger." A *user-controlled* density toggle is therefore an
  **accessibility improvement**, but the compact path must never
  shrink interactive targets below the 24×24 floor.
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WAI-ARIA APG · *Radio Group Pattern*: two mutually-exclusive view
  options use `role="radiogroup"` with each option as a `role="radio"`
  + `aria-checked`. We use a `<button>` for each option (allows
  custom styling, full-text labels, and respects WCAG 2.4.7 focus
  visibility).

**Implementation:**
- New `src/lib/density/densityStore.ts` — pub-style store with
  `loadDensity()`, `saveDensity()`, `applyDensity()`, `toggleDensity()`,
  modelled on the existing theme store. Storage key
  `astraudit:density:v1` (versioned to allow future migrations).
  Default is "comfortable" so existing layouts are unchanged.
- New `globals.css "DENSITY MODES"` block. Activated by
  `<html data-density="compact">`. Reduces:
   · `body` font-size 16 px → 15 px
   · `.glass.p-6` / `.glass-strong.p-6` 1.5 rem → 1.25 rem
   · `.p-5` 1.25 rem → 1 rem; `.p-4` 1 rem → 0.75 rem
   · `space-y-6` chain 1.5 rem → 1.25 rem; same for `gap-6`
   · `<h2>` 1 rem; `<h3>` 0.9375 rem
   · Hero header padding-top 2.5 rem → 2 rem
  We never override interactive heights (`h-6`, `h-7`, `h-8`,
  `min-h-*`); WCAG 2.5.8 stays intact. A test scans the density
  block and fails if any of those utilities sneak in.
- `App.tsx` calls `applyDensity(loadDensity())` on first mount so
  compact applies on refresh, not only after Settings opens.
- `SettingsDialog.tsx` adds a new "Density" panel above the Audit
  cache box. Two `role="radio"` buttons inside a
  `role="radiogroup"`, labelled / described via `aria-labelledby` +
  `aria-describedby`. Each button is a 3 rem-min-height target so
  WCAG 2.5.8 passes even in compact mode.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 30 files / 236 tests green (was 29 / 227).
- `npm run build` — 577 KB JS / 61.4 KB CSS, no warnings.

#### 2.8.10 · Mobile bottom-sheet dialogs ✅ shipped
**Why:** On phones the existing centred dialogs already used
`items-end justify-center` so they hugged the bottom of the viewport,
but they still looked like *floating cards* — a 16 px gap on every
side, rounded corners on the bottom, and no recognisable bottom-sheet
affordance. Phone users expect modals to feel anchored to the bottom
edge and reachable with the thumb. Material Design 3, Apple HIG and
NN/Group all converge on the same primary cue: a small drag-handle pill
at the top of a sheet that runs viewport-edge-to-viewport-edge with
only the *top* corners rounded.

**Pre-build research (2026-05-10):**
- Material Design 3 *Bottom sheets*: anchored to bottom edge, rounded
  only on top, drag handle (~32 × 4 px) at the top, scrim behind,
  honour safe-area insets so the iOS home indicator never sits over
  the primary action. https://m3.material.io/components/bottom-sheets
- WAI-ARIA APG *Modal dialog*: ARIA stays the same — `role="dialog"`,
  `aria-modal="true"`, `aria-labelledby`. The bottom-sheet variant
  doesn't change focus management or keyboard handling, so we don't
  touch the existing dialog logic.
  https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- MDN *CSS length units*: prefer `svh` over `vh`/`dvh` for mobile sheet
  max-height. `vh`/`lvh` clip content under expanded mobile chrome,
  `dvh` causes layout thrash on scroll. `svh` = smallest viewport,
  always visible. https://developer.mozilla.org/en-US/docs/Web/CSS/length#dvh
- MDN `env()`: canonical guard for iOS home indicators / Android nav
  bars is `env(safe-area-inset-bottom, 0px)`. Always pair with a
  fallback so non-supporting browsers don't end up with empty padding.
  https://developer.mozilla.org/en-US/docs/Web/CSS/env

**Implementation:**
- New `globals.css "BOTTOM-SHEET DIALOGS"` block, scoped under
  `@media (max-width: 639.98px)` (Tailwind's `sm` breakpoint). Above
  the breakpoint the new class is a no-op — the existing centred
  dialog layout is preserved exactly.
- New `.bottom-sheet-card` class. On mobile it:
   · cancels the parent backdrop's `p-4` via `margin: 0 -1rem -1rem`
     and `width: calc(100% + 2rem)` so the sheet runs viewport-edge
     to viewport-edge,
   · caps height at `92svh` (small-viewport units),
   · sets `padding-bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px))`
     so the home indicator never sits over content,
   · zeroes the bottom-corner radii (rounded only on top),
   · renders a 36 × 4 px drag-handle pill via `::before` (pure CSS
     visual cue — we deliberately do NOT add a swipe-to-dismiss
     gesture handler because Esc + close button already cover the
     dismiss path and gesture handlers would trap touchmove and break
     native scroll inside the sheet).
- `prefers-reduced-motion: reduce` strips `backdrop-filter: blur` —
  motion-sensitive users have flagged full-screen blur as nausea-
  inducing.
- Light-theme override on the drag handle keeps it visible against
  the near-white sheet surface.
- Five dialogs opt in: `SettingsDialog`, `HistoryDialog`, `CompareDialog`,
  `ShortcutsDialog`, `BadgeDialog`. Each just adds `bottom-sheet-card`
  to the existing `glass-strong … rounded-2xl p-5 sm:p-6` class chain
  on its card; no other change. `CommandPalette` is intentionally
  excluded — it is pinned to the top of the viewport
  (`items-start pt-[8vh] sm:pt-[15vh]`), and turning it into a bottom
  sheet would jar against that "from above" affordance.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 31 files / 250 tests green (was 30 / 236).
- `npm run build` — 577 KB JS / 62 KB CSS, no warnings.

---

### Phase 2.8 wrap

All ten phase-2.8 polish runs now ship: toast system (2.8.1),
content-shaped skeletons (2.8.2), sticky score bar (2.8.3), Speed-Dial
FAB (2.8.4), celebratory empty state (2.8.5), view transitions
(2.8.6), universal focus-visible ring (2.8.7), CSS-only tooltip
primitive (2.8.8), density toggle (2.8.9), and mobile bottom-sheet
dialogs (2.8.10). Each was researched in advance against current
WCAG, ARIA APG, and design-system best practice; each ships with
dedicated tests; the suite grew from 27 / 208 (start of 2.8) to
31 / 250.

---

## Phase 3 — Smarter detection (still no AI)

### 3.1 · README readability score ✅ shipped
**Why:** Astraudit already counts README headings, code blocks, badges
and so on, but a structural footprint doesn't tell adopters whether
the README is *readable*. A 12th-grade Flesch-Kincaid score is a
concrete, well-known signal — not an AI judgement, just arithmetic
over words and syllables — and exactly the kind of rule-based
detector the project is built around.

**Pre-build research (2026-05-10):**
- Confirmed formulas (Wikipedia · Flesch-Kincaid + textstat library +
  Penn State writing centre):
   · `FKGL = 0.39 · (words/sentences) + 11.8 · (syllables/words) − 15.59`
   · `FRE  = 206.835 − 1.015 · (words/sentences) − 84.6 · (syllables/words)`
- Syllable counting uses the standard heuristic from the
  `words/syllable` MIT package (~325 LOC, ESM, browser-compatible) and
  Lingua::EN::Syllable (Perl): vowel-group counting with a small
  exception list for the well-known mis-counts (`the`, `every`,
  `business`, `vegetable`, `area`, …). Accuracy on common English
  prose is ≈ 85–90 % — fine for an aggregate grade-level number;
  individual words may be ±1 syllable off but they cancel over a
  README-length corpus.
  https://github.com/words/syllable
- Grade-level interpretation (Penn State + readable.com):
   · ≤ 6 elementary, 7–9 easy, 10–12 standard, 13–15 dense, ≥ 16 academic.
   · Technical-doc sweet spot is 10–12 — below 8 reads as
     over-simplified, above 14 reads as academic / dense.
- Pre-processing for technical READMEs (textstat, write-good):
   · Strip fenced + indented code, inline code spans, badge images,
     image embeds, HTML tags, table rows, link URLs (keep visible
     label), heading markers, blockquote markers, list markers,
     emphasis markers, and reference-link definitions.
   · KEEP heading text — it's still prose for the reader.
- WCAG 3.1.5 *Reading Level* (AAA) doesn't require a specific number,
  but it asks that supplementary content be available when the text
  exceeds lower-secondary education level. Surfacing the grade is the
  first step toward letting an adopter act on that.

**Sources:**
- https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests
- https://github.com/words/syllable
- https://textstat.readthedocs.io/

**Implementation:**
- New `src/lib/audit/readability.ts` with five pure helpers and one
  top-level scorer. No dependencies, no fetches, no AI.
   · `countSyllables(word)` — vowel-group heuristic, exception table,
     silent-e and `-le`-aware. Always returns ≥ 1 for non-empty input.
   · `extractProse(markdown)` — 14-step strip pipeline: fenced code,
     indented code, inline code, HTML, badges, image embeds, plain +
     reference links, tables, headings, blockquotes, list markers,
     horizontal rules, emphasis markers, reference-link definitions.
   · `splitSentences(text)` — terminal-punctuation split with an
     abbreviation mask (`e.g.`, `i.e.`, `etc.`, `vs.`, …) so dotted
     abbreviations don't inflate the sentence count.
   · `splitWords(text)` — letter+apostrophe runs.
   · `bucketReadability(grade)` — coarse UI label.
   · `computeReadability(markdown)` — strips prose, applies the FK
     formulas, returns `{ fleschKincaidGrade, fleschReadingEase,
     words, sentences, syllables, bucket }`. Returns `null` when the
     prose is shorter than 30 words or fewer than 2 sentences (FK
     numbers on tiny corpora are noise).
- `ReadmeMetrics` in `insightEngine.ts` gains a `readability:
  Readability | null` field, populated by calling `computeReadability`
  on the raw README content.
- `InsightsPanel` "README footprint" card now appends
  `· grade {fkGrade.toFixed(1)} · {bucket} reading level` to its
  subline when a score is available; falls back to the previous
  structural-only line on short / non-prose READMEs.

**Tests:** `tests/lib/audit/readability.test.ts` (46 cases) covers:
- 14 syllable counts including the documented edge cases
  (`the`, `wine`, `bottle`, `apple`, `table`, `banana`,
  `readability`, `business`, `every`, `literature`, `area`, `idea`).
- 9 prose-extraction cases (fenced + indented code, inline code,
  badges, image embeds, link labels, HTML tags, tables + heading
  markers, emphasis markers).
- 3 sentence-splitter cases including the abbreviation mask.
- 2 word-splitter cases.
- 10 bucket-boundary cases.
- 5 end-to-end formula cases (null on short input, deterministic
  values for a known sample, academic > easy ordering, code-heavy
  READMEs ignoring fenced code in the word count, one-decimal-place
  rounding).

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 32 files / 296 tests green (was 31 / 250).
- `npm run build` — 577 KB JS, no warnings.

### 3.2 · Parse Dependabot config ✅ shipped
**Why:** The audit already detects whether `.github/dependabot.yml`
is present, but adopters care about the *content*: which ecosystems
are watched, at what cadence, with how many groups. A presence flag
is a low-resolution signal — a single npm-only weekly entry and a
six-ecosystem daily-grouped enterprise config look identical to an
existence check.

**Pre-build research (2026-05-10):**
- GitHub Docs · *Dependabot options reference* — confirmed v2 schema:
  `version: 2` is required; `updates: [...]` is required; each entry
  carries `package-ecosystem`, `directory` (or `directories`), and
  `schedule.interval`. Optional fields include
  `open-pull-requests-limit`, `target-branch`, `groups`, `allow`,
  `ignore`, `assignees`, `labels`, `milestone`, `commit-message`,
  `rebase-strategy`, `versioning-strategy`, `vendor`. Top-level
  `registries:` block declares private registry credentials.
  Confirmed full ecosystem list (32 values inc. bazel, bun, bundler,
  cargo, composer, conda, devcontainers, docker, docker-compose,
  dotnet-sdk, elm, gitsubmodule, github-actions, gomod, gradle, helm,
  mix, julia, maven, npm, nuget, opentofu, pip, pre-commit, pub,
  rust-toolchain, swift, terraform, uv, vcpkg, yarn, nix). Confirmed
  schedule.interval values: `daily`, `weekly`, `monthly`,
  `quarterly`, `semiannually`, `yearly`, `cron`.
  https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference
- Implementation choice: **scoped parser, not a YAML library.**
  Astraudit ships browser-only with a strict "minimal deps" stance.
  Pulling `yaml` (~50 KB min, ~15 KB gz) just to read one config
  would inflate the bundle ~8 % for one feature. The Dependabot
  schema is narrow + canonical (most configs follow GitHub's docs
  near-verbatim), so a ~250 LOC line-based block-YAML decoder tuned
  to that schema is a better fit. Anything weird → return null →
  graceful degradation back to the legacy "yes/no" pill.

**Implementation:**
- New `src/lib/audit/dependabotParser.ts`. Three-layer pipeline:
   1. Tokeniser strips trailing comments (quote-aware so a `#` inside
      a quoted string survives) and full-line comments, drops blanks,
      records `{ indent, content }` per line.
   2. `decodeBlock` is a recursive-descent block-YAML decoder
      handling block mappings (`key: value` and `key:` + indented
      children), block sequences (`- value` / `- key: value` with
      continuation indent), inline scalars (quoted single/double or
      bare), inline numbers / booleans / `null`, and inline-flow
      arrays. Anchors / aliases / tags / multi-line block scalars
      are deliberately unsupported — `decodeBlock` returns null and
      `parseDependabotConfig` reports the file as unparseable.
   3. `parseDependabotConfig` validates `version: 2` (number or
      string), iterates the `updates:` array, normalises each entry
      to a `DependabotUpdate` (`ecosystem`, `directory`, `interval`,
      `openPullRequestsLimit`, `targetBranch`, `groupCount`), and
      counts top-level `registries:` keys. Unknown intervals
      collapse to `"unknown"` so the type is closed.
- `summariseByEcosystem(updates)` groups by ecosystem with
  deduplicated intervals + directories — the UI uses this to render
  "npm · weekly" pills compactly.
- `formatInterval(interval)` provides the user-facing label.
- `securityDetector.ts` calls the parser when the file is present
  (looking up content from `classified.importantFileMap`) and adds
  the result to `SecuritySignals.dependabotConfig`.
- `insightEngine.ts` now takes `security` in its `InsightsContext`
  and exposes `dependabot: ParsedDependabot | null` on
  `DerivedInsights`. `auditEngine.ts` passes the security signals
  through.
- `InsightsPanel.tsx` adds a new "Dependabot coverage" card (Bot
  icon) that surfaces the top three ecosystems + cadence and a
  subline with total entry count, group rule count, and any private
  registries. The card is omitted when no parsed config is
  available, so legacy / exotic configs degrade silently.

**Tests:** `tests/lib/audit/dependabotParser.test.ts` (23 cases):
seven happy-path cases (reference example, unquoted vs quoted
parity, optional fields, group counting, `directories` plural list,
registry counting, full-line + trailing comment stripping including
the `#`-inside-quotes preservation), six error / edge cases (empty /
whitespace / null input, missing version, missing `updates:`, v1
config, unknown interval normalisation, malformed entry skipping),
eight `formatInterval` cases, and two `summariseByEcosystem`
behaviour cases (grouping with dedupe, mixed cadence detection).

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 33 files / 319 tests green (was 32 / 296).
- `npm run build` — 579 KB JS / 62 KB CSS, no warnings.

### 3.3 · Parse CODEOWNERS for ownership density ✅ shipped
**Why:** Astraudit already detects the *presence* of a CODEOWNERS
file, but presence and ownership health are different signals: a
five-line "everything goes through @founder" config and a 40-line
team-owned config look identical to a yes/no flag. Adopters care
about bus-factor, coverage, and whether the file exists in name
only.

**Pre-build research (2026-05-10):**
- GitHub Docs · *About code owners* — confirmed line format
  (`pattern owner1 owner2 …`), three valid owner types (`@user`,
  `@org/team`, `user@example.com`), full-line + inline `#` comments,
  gitignore-style globs (`*` not crossing slashes, `**` crossing
  them, `/` prefix anchoring to root, trailing `/` for directory
  match), case-sensitive matching, and **last-matching-pattern wins**
  precedence. Negation, character ranges, and `\#` escaping are
  explicitly NOT supported. https://docs.github.com/articles/about-code-owners
- GitLab CODEOWNERS reference extends GitHub's format with named
  sections (`[Section]`, `[Section][5]` for required-approver count,
  `^[Section]` for optional sections), role-based owners (`@@developer`),
  and negation (`!pattern`). Many real-world repos run hybrid configs,
  so the parser tolerates section headers (skips them, records the
  count) instead of rejecting the file.
  https://docs.gitlab.com/ee/user/project/codeowners/reference.html
- Implementation choice: **bundle a tiny CODEOWNERS-tuned glob
  matcher** rather than pull `minimatch` (~80 KB) for one feature.
  The matcher supports the documented subset (`*`, `**`, anchoring,
  trailing `/`, `?`) and is < 50 LOC.

**Implementation:**
- New `src/lib/audit/codeownersParser.ts`. Three pieces:
   1. `parseCodeowners(content)` walks the file once. Each non-empty,
      non-comment, non-section-header line splits into pattern + owner
      tokens; `classifyOwner` buckets each token into
      `user | team | email | role | unknown`. We aggregate distinct
      owners (sorted alphabetically), `ownerCounts` per kind, and the
      most-frequent owner.
   2. `patternToRegex(pattern)` converts a CODEOWNERS pattern into a
      regex honouring the documented subset. Plain patterns without a
      slash (e.g. `*.js`) are matched as basenames at any depth — the
      gitignore convention GitHub inherits.
   3. `computeCoverage(parsed, blobPaths)` walks each blob path,
      tests it against the *pre-compiled* rule regexes from the bottom
      up (last-match-wins precedence), and computes the coverage %.
      Empty-owner rules count as explicit *unassignments* per the
      GitLab convention, so a `/docs/` line with no owner correctly
      *reduces* coverage rather than inflating it.
- `securityDetector.ts` calls the parser when the file is present
  (looking up content from `classified.importantFileMap`) and adds
  `codeownersConfig: ParsedCodeowners | null` to `SecuritySignals`.
  Coverage is computed against `classified.blobPaths` straight away.
- `insightEngine.ts` exposes `codeowners: ParsedCodeowners | null` on
  `DerivedInsights`.
- `InsightsPanel.tsx` adds a Users-icon "Code ownership" card. Value
  line: ownership shape + distinct owner count
  (e.g. `balanced ownership · 7 owners`). Subline: rule count, owner
  mix (teams + users + emails), coverage % over blobs, and any GitLab
  section count. Card is omitted entirely when no rules were parsed.

**Tests:** `tests/lib/audit/codeownersParser.test.ts` (21 cases):
- 8 happy-path cases (typical multi-rule file, every owner kind
  classified, fallback flag detection, top-owner identification,
  GitLab section counting, inline-comment stripping, owner dedupe +
  alphabetical sort, null-input handling).
- 6 coverage / glob cases (`*.js` basename anywhere, `/docs/` dir
  recursion, `/build/logs/*` non-crossing-slash anchoring,
  `apps/**/*.ts` deep matching, last-match-wins precedence with
  explicit unassign, empty-blob-list 0%).
- 7 ownershipShape boundary cases.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 34 files / 340 tests green (was 33 / 319).
- `npm run build` — 580 KB JS, no warnings.

### 3.4 · Parse SECURITY.md for a contact channel ✅ shipped
**Why:** Astraudit already detects whether SECURITY.md exists, but
existence and *usefulness* are different signals. A one-line
"security@example.com" placeholder file looks identical to a
substantive 200-word policy with a HackerOne URL and a 30-day
disclosure timeline. Adopters care which of those they're getting.

**Pre-build research (2026-05-10):**
- OpenSSF Scorecard · *Security-Policy* check awards points across
  three signals:
   · 6/10 — at least one valid contact channel (email OR http/https
     URL),
   · 3/10 — substantive free-form prose (not just bullet points of
     links),
   · 1/10 — security-specific terminology ("vulnerability",
     "disclosure") AND a timeline reference ("30 days", "90 days",
     "within … hours").
  https://github.com/ossf/scorecard/blob/main/docs/checks.md
- Common reporting channels seen in real-world policies: a private
  email (`security@org`), GitHub Security Advisories
  (`/security/advisories`), HackerOne (`hackerone.com`), Bugcrowd
  (`bugcrowd.com`), Open Bug Bounty (`openbugbounty.org`), and
  encrypted PGP keys (inline armored block or
  `keys.openpgp.org` / `keybase.io` URL).

**Implementation:**
- New `src/lib/audit/securityPolicyParser.ts`. Pipeline:
   1. `stripMarkdownLite` strips fenced code (preserving an inline
      PGP key marker), HTML tags (preserving `<a href>` URLs),
      markdown link syntax (keeping both URL + label), inline code,
      emphasis markers, headings, list / blockquote markers.
   2. `extractChannels` walks dedicated regex patterns for each
      named service (GHSA URL + phrase, HackerOne, Bugcrowd, Open
      Bug Bounty, PGP key URL + inline armored block) and emails.
      Generic `https://*security*` URLs are a fallback only when no
      named channel hit. Example placeholders
      (`security@example.com`, `your-email@*`) are filtered out.
   3. `parseSecurityPolicy` aggregates everything into a coarse
      OpenSSF-style grade: `placeholder` (no channel), `basic`
      (channel only), `good` (channel + ≥ 40 words + vuln terms),
      `complete` (channel + ≥ 80 words + timeline reference).
- `securityDetector.ts` parses the file when present, exposing
  `securityPolicy: ParsedSecurityPolicy | null` on `SecuritySignals`.
- `insightEngine.ts` surfaces `securityPolicy` on `DerivedInsights`.
- `InsightsPanel.tsx` adds a ShieldCheck-icon "Security policy"
  card. Value: quality grade + most-trusted channel
  (`complete with timeline · GitHub Security Advisories`). Subline:
  channel count + word count + cue list (timeline / supported
  versions / vulnerability terms).

**Tests:** `tests/lib/audit/securityPolicyParser.test.ts` (29 cases):
- 8 channel-extraction cases (private email, GHSA URL, GHSA phrase,
  HackerOne / Bugcrowd / Open Bug Bounty URLs, PGP block + URL,
  example-placeholder filtering, value dedupe).
- 4 quality-grading cases (placeholder, basic, good, complete).
- 3 markdown-handling cases (link syntax, HTML anchors,
  fenced code exclusion except for PGP).
- 3 auxiliary-signal cases (Supported Versions heading, timeline
  phrasings, null input).
- 11 UI-helper cases (channel-kind labels, quality labels).

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 35 files / 369 tests green (was 34 / 340).
- `npm run build` — 581 KB JS, no warnings.

### 3.5 · Parse `package.json` engines / peerDependencies ✅ shipped
**Why:** The audit already pulls scripts and a broad framework
fingerprint from `package.json`. The *runtime contract* fields —
`engines`, `peerDependencies`, the Corepack `packageManager` pin,
`type` — are what tells an adopter "what does this project
actually need to run?". A library pinning `engines.node: ">=14"`
in 2026 looks fine to a casual reader but is targeting a runtime
that's been EOL for over a year.

**Pre-build research (2026-05-10):**
- npm Docs · *package.json* `engines`: SemVer range syntax,
  loosely enforced by `npm install` itself but honoured by
  Corepack, CI, and downstream consumers. Common patterns: `>=18`,
  `^20.10`, `>=18 <21`, `16 || 18 || 20`.
  https://docs.npmjs.com/cli/v10/configuring-npm/package-json#engines
- npm Docs · *peerDependencies* + `peerDependenciesMeta.optional`:
  npm v7+ installs peer deps automatically; the `optional: true`
  flag opts out. We surface the optional split so the card shows
  e.g. "5 peer deps (2 optional)".
- Node.js *previous releases* — May 2026 LTS state: Node 22 (Jod)
  active LTS, Node 24 (Krypton) latest LTS. Node 18 (Hydrogen) and
  Node 20 (Iron) are EOL. The audit's freshness bucket bakes in
  these thresholds.
  https://nodejs.org/en/about/previous-releases
- Implementation choice: deliberately do NOT pull `semver` (~30 KB).
  The audit only needs to extract the *minimum major* from a range,
  which is a tiny regex job. Anything more nuanced (intersection,
  exact-match calculations) is out of scope.

**Implementation:**
- New `src/lib/audit/packageManifest.ts`. Two pure helpers + a
  top-level reader:
   1. `minimumMajorFromRange` parses every documented range form
      (`>=`, `>`, `~`, `^`, `=`, plain numerics, multi-clause AND,
      OR-clauses with `||`) and returns the smallest major.
      Upper-bound-only comparators (`<X`, `<=X`) intentionally
      return null — they don't define a minimum on their own.
   2. `bucketNodeFreshness` maps the minimum major to one of
      `missing` / `any` / `modern` / `current` / `aging` /
      `ancient` against a single `MIN_LTS_MAJOR = 22` constant
      sourced from the May-2026 LTS state.
   3. `parseManifestObject` extracts `type`, `engines` (string
      values only — non-string entries are dropped silently),
      `packageManager` (Corepack pin), and `peerDependencies` with
      `peerDependenciesMeta.optional` honoured. Peer deps are
      sorted alphabetically for stable UI output.
- `dependencyDetector.ts` now calls `readManifest(classified)` and
  exposes the result on `DependencySignals.manifest`.
- `insightEngine.ts` takes `deps` in its context and surfaces
  `manifest: ParsedManifest | null` on `DerivedInsights`.
- `auditEngine.ts` passes the deps signals through.
- `InsightsPanel.tsx` adds a Layers3-icon "Runtime contract" card.
  Value: freshness label + actual `engines.node` range. Subline:
  Corepack pin (with the `+sha…` checksum stripped for readability),
  module type, peer-dep count + optional split. Card colour shifts
  to `risk-medium` for `aging`/`ancient` buckets and `aurora-mint`
  for `modern`.

**Tests:** `tests/lib/audit/packageManifest.test.ts` (41 cases):
- 5 happy-path cases (typical manifest, empty manifest, non-string
  engine value tolerance, type-field handling, whitespace trim).
- 13 `minimumMajorFromRange` cases covering every documented form.
- 6 unconstrained-range cases (`*`, `x`, `latest`, etc.).
- 1 upper-bound-only case (the SemVer trap).
- 1 unparseable-range case.
- 11 freshness-bucket boundary cases.
- 6 UI label cases.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 37 files / 425 tests green (was 36 / 384).
- `npm run build` — 595 KB JS, no warnings.

### 3.6 · Parse CHANGELOG release pace ✅ shipped
**Why:** Astraudit already pulls a release cadence from the GitHub
Releases API (`releases.averageDaysBetween`), but many projects ship
a CHANGELOG without ever cutting a Release on GitHub. The API view
says "no releases" while the file shows years of structured cadence.
Computing release pace directly from the markdown gives us a real
signal even on those repos, and the gap between the two sources is a
useful drift indicator on projects that do both.

**Pre-build research (2026-05-10):**
- Keep a Changelog 1.1.0 — canonical heading is
  `## [1.0.0] - 2017-06-20` with ISO-8601 dates. The
  `[Unreleased]` section at the top is the only special case.
  https://keepachangelog.com/en/1.1.0/
- Real-world heading variants observed:
   · `## [1.0.0] - 2024-01-15` (Keep a Changelog)
   · `## 1.0.0 (2024-01-15)`   (Conventional Changelog default)
   · `## v1.0.0 - 2024-01-15`
   · `## 1.0.0 - 2024-01-15`
   · `## 1.0.0 / 2024-01-15`
   · `# 1.0.0 (2024-01-15)`    (rare h1)
- The parser accepts every shape that contains *both* a version-like
  token and an ISO-8601 date on the same heading line. We
  deliberately do NOT support non-ISO date forms (e.g. `Jan 15,
  2024`) — too rare to justify the false-positive risk.

**Implementation:**
- New `src/lib/audit/changelogParser.ts`. Single forward pass:
   1. Walk every `# / ## / ###` heading line.
   2. Strip markdown link syntax so `[1.0.0](url)` → `1.0.0`.
   3. Skip headings that match `[Unreleased]` and remember the flag.
   4. Match an ISO-8601 date *and* a version token on the same line.
   5. Validate the date structurally — `2024-13-99` is rejected via
      a UTC round-trip check.
   6. De-dupe identical (version, date) pairs.
- Releases sort oldest → newest; deltas are computed in days using
  pure UTC arithmetic (no timezone surprises).
- `bucketCadence` maps mean-delta thresholds to
  `frequent` (≤ 14d) / `regular` (≤ 60d) / `occasional` (≤ 180d) /
  `rare` (≤ 365d) / `dormant`. Long-stale projects (latest > 540d
  ago) collapse to `dormant` regardless of historical cadence.
  Single-release files classify by recency, not delta.
- `now` is injectable so tests pin the days-since-latest computation
  deterministically.
- `insightEngine.ts` reads the CHANGELOG content from
  `classified.importantFileMap` (covering `.md`, `.markdown`, the
  bare `CHANGELOG`, and the lowercase variant) and surfaces
  `changelog: ParsedChangelog | null` on `DerivedInsights`.
- `InsightsPanel.tsx` adds a Calendar-icon "CHANGELOG cadence" card.
  Value: cadence label + mean delta (or `N releases` for sparse
  files). Subline: total release count, latest date with
  days-since, median delta, Unreleased-pending hint. Card accent
  shifts to `aurora-mint` for frequent/regular and `risk-medium` for
  dormant.

**Tests:** `tests/lib/audit/changelogParser.test.ts` (23 cases):
- 9 heading-recognition cases (Keep-a-Changelog, Conventional
  Changelog, v-prefix + dash, slash separator, h1/h2/h3,
  markdown-link strip, dedupe, Unreleased-only file, invalid-date
  rejection, null/empty input).
- 3 cadence-math cases (mean + median, injected-now
  daysSinceLatest, single-release null deltas).
- 5 cadence-bucket cases (frequent floor, regular vs occasional,
  long-stale forced to dormant, single-recent → occasional,
  single-old → dormant).
- 5 UI label cases.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 38 files / 448 tests green (was 37 / 425).
- `npm run build` — 596 KB JS, no warnings.

### 3.7 · Topic-driven contextual rules ✅ shipped
**Why:** GitHub topics are an underused signal — when a maintainer
tags their repo `cli` or `eslint-plugin`, they've *told us* what
shape the project is supposed to take. A topic-aware audit catches
gaps no generic documentation/security/CI check can: "repo says
`cli` but ships no `bin` entry", "repo says `eslint-plugin` but
breaks the `eslint-plugin-*` naming contract", "repo says
`monorepo` but neither `workspaces` nor `pnpm-workspace.yaml` is
declared".

**Pre-build research (2026-05-10):**
- GitHub Topics is a free-form taxonomy — there's no closed
  allow-list. May-2026 trending data shows a stable set of ~30
  topics consistently used to declare project shape. We bake a
  curated subset into the rules engine (`cli`, `eslint-plugin`,
  `babel-plugin`, `postcss-plugin`, `react-component`,
  `vue-component`, `svelte-component`, `monorepo`, `typescript`,
  `github-action`, `vscode-extension`, `chrome-extension`,
  `electron`, plus the four bundler-plugin variants).
- ESLint Docs — a plugin must declare three things: name pattern
  `eslint-plugin-*` (or `@scope/eslint-plugin-…`), an `eslint`
  peer dependency, and the `eslint-plugin` keyword. We mirror the
  triple as a `met` / `partial` / `missing` rule so partial
  compliance is visible.
  https://eslint.org/docs/latest/extend/plugins
- Babel plugin contract: `babel-plugin-*` naming + `@babel/core`
  peer dependency.
- GitHub Action contract: a root-level `action.yml` (or `.yaml`)
  is the discovery file.
- VS Code extension contract: `engines.vscode` in `package.json`
  is required by the Marketplace.
- Browser extension contract: a root-level `manifest.json` is the
  discovery file across Chrome / Firefox / Edge.

**Implementation:**
- `packageManifest.ts` is extended to expose `name`, `hasBinEntry`
  (covers both `bin: "./cli.js"` and `bin: { … }` shapes),
  `hasWorkspaces` (covers both array and `{ packages: [...] }`
  shapes), `keywords` (lowercased for fast set membership), and
  `dependencyNames` (sorted union of dependencies +
  devDependencies). All additive — existing 41 manifest tests
  still pass without changes.
- New `src/lib/audit/topicRules.ts`. `evaluateTopicRules(ctx)` is
  a pure function returning a `TopicCheck[]`. Each rule:
   · CLI (`cli` / `command-line` / `terminal` / `tui`) → require
     a `bin` entry.
   · ESLint plugin → require name + peer + keyword (triple-rule
     graded met/partial/missing).
   · Babel plugin → require name + `@babel/core` peer.
   · PostCSS plugin → require `postcss` peer + keyword.
   · React / Vue / Svelte component library → require the
     framework as a peer dependency.
   · Monorepo → require `workspaces` OR `pnpm-workspace.yaml`.
   · TypeScript → require `tsconfig.json` (or `tsconfig.base.json`).
   · GitHub Action → require root `action.yml` / `action.yaml`.
   · VS Code extension → require `engines.vscode`.
   · Browser extension → require root `manifest.json`.
   · Electron → require `electron` in deps.
   · Webpack / Vite / Rollup / esbuild plugin → require the
     respective bundler as a peer dependency.
- Unknown topics produce no checks (silent degradation). Each
  check carries a stable `id`, the trigger topic, a status, the
  collected evidence, and a hint when remediation is appropriate.
- `insightEngine.ts` calls `evaluateTopicRules` and surfaces
  `topicChecks: TopicCheck[]` on `DerivedInsights`.
- New `src/components/TopicChecks.tsx` panel rendered just below
  the existing Insights panel in `ReviewDashboard`. Each check
  shows the trigger topic, the title, a coloured status pill
  (met = mint, partial = amber, missing = risk-medium), the
  evidence bullets, and the remediation hint.

**Tests:** `tests/lib/audit/topicRules.test.ts` (34 cases): one
test per rule (CLI met/missing/object-bin, ESLint
met/partial/missing/scoped-name, Babel met, three component
libraries individually, monorepo via workspaces / pnpm-workspace
/ neither, GitHub Action met/missing, VS Code engines met/missing,
browser extension met/missing, TypeScript met/missing, four
bundler plugins each), plus the silent-no-match guard (returns
empty list for unrelated or empty topics) and multi-rule firing,
and the UI helpers (status formatter, summarise rollup).

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 39 files / 482 tests green (was 38 / 448).
- `npm run build` — 600 KB JS, no warnings.

### 3.8 · Free public registry lookups ✅ shipped
**Why:** Astraudit's audit so far is *file-bound* — everything we
report is derivable from the repo's own files + GitHub metadata. But
adopters' biggest practical question is "are the dependencies
*alive*?", and that answer lives outside the repo. Three free,
unauthenticated, browser-CORS-friendly registries (`registry.npmjs.org`,
`pypi.org`, `crates.io`) expose enough metadata to answer it without
introducing any backend.

**Pre-build research (2026-05-10):**
- npm Registry API: `GET https://registry.npmjs.org/{name}` returns
  the packument with `dist-tags.latest`, `time.{version}`, top-level
  `deprecated` string, plus per-version `versions[v].deprecated`.
  CORS-allowed for unauthenticated reads — that's how `unpkg.com` and
  the Yarn web UI hit it.
  https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md
- PyPI Warehouse: `GET https://pypi.org/pypi/{name}/json` returns
  `info.version`, `info.home_page`, `info.project_urls`, plus a
  `releases` map with `upload_time_iso_8601` per artefact. CORS-OK.
  https://docs.pypi.org/api/json/
- crates.io: `GET https://crates.io/api/v1/crates/{name}` returns
  `crate.max_stable_version`, `crate.updated_at`,
  `crate.recent_downloads` (last 90 days — the most useful staleness
  signal), `crate.repository`, `crate.homepage`. CORS-OK.
- Each fetcher is wrapped in an 8 s `AbortController` timeout so a
  slow registry can't stall the dashboard.

**Implementation:**
- New `src/lib/registries/` module:
   · `types.ts` — shared `RegistryMetadata` + `RegistryOutcome`
     envelope (`ok` / `not-found` / `error`).
   · `npmRegistry.ts` — handles scoped-package URL encoding
     (`@types/react` → `@types%2Freact`) and both forms of npm
     deprecation (top-level + per-version).
   · `pypiRegistry.ts` — picks the correct release timestamp from the
     `info.version` entry in the `releases` map; falls back to the
     latest across all releases.
   · `cratesRegistry.ts` — prefers `max_stable_version` over
     `max_version` (matches `cargo add` default), surfaces the
     `recent_downloads` signal.
   · `registryCache.ts` — localStorage TTL cache (24 h, 200-entry
     cap) keyed by `astraudit:registry:v1:{ecosystem}:{name}`.
     Stale entries evict lazily on read; cap eviction drops oldest
     by `cachedAt`.
   · `extractDependencyNames.ts` — line-based parsers for
     `requirements.txt`, `pyproject.toml` (PEP 621 + Poetry), and
     `Cargo.toml`. Tracks section state explicitly so a
     `[dev-dependencies]` table can't bleed into the production
     list, and bracket-counts the PEP 621 array so extras notation
     (`pydantic[email]>=2.0`) survives.
   · `index.ts` — orchestrator that serves cached entries first
     (with `cached: true` flag), then runs concurrent live fetches
     capped at 6 in-flight workers, capped at 30 total packages
     (12 npm + 10 PyPI + 10 crates per audit). Each in-flight
     request honours the parent `AbortSignal` so the dashboard
     unmounting cancels the fan-out cleanly.
   · `bucketStaleness` — coarse `fresh` (≤ 90 d) / `recent` (≤ 365 d)
     / `stale` (≤ 730 d) / `abandoned` bucket for the UI pill.
- New `src/components/RegistryPanel.tsx` — renders below the existing
  Topic-checks panel in `ReviewDashboard`. Streams results in via
  `onProgress`, shows a per-row staleness pill, marks deprecated npm
  packages explicitly, surfaces crates.io's 90-day download count,
  and shows a `cached` chip when a row was served from localStorage.
- The new third-party network calls are also disclosed in the
  Datenschutzerklärung (Art. 13 DSGVO Section 4a) — registry
  operator (npm Inc., PSF, Rust Foundation), what data flows
  (IP only), per-audit cap, and the 24 h cache TTL.

**Tests:** 39 cases across four files:
- `extractDependencyNames.test.ts` (12 cases) — requirements.txt
  with options/markers/comments, PEP 621 arrays incl. extras
  notation, Poetry table form with `python` skip, Cargo
  `[dependencies]` block + sub-tables + `[dev-dependencies]`
  isolation.
- `registryCache.test.ts` (6 cases) — round-trip,
  case-insensitivity, stale-eviction, cap-eviction
  (200-entry cap → oldest evicted), SSR safety, full-clear.
- `registryFetchers.test.ts` (13 cases) — every fetcher's typical
  parse, scoped-package URL, npm deprecation (top-level +
  per-version), PyPI homepage fallback to project_urls.Homepage,
  crates `max_stable_version` vs `max_version` fallback, all three
  fetchers' 404 / network-failure / malformed-body paths.
- `orchestrator.test.ts` (8 cases) — cache short-circuit,
  onProgress streaming, `maxPackages` cap, `bucketStaleness`
  thresholds, null/invalid date handling.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 43 files / 521 tests green (was 39 / 482).
- `npm run build` — 615 KB JS, no warnings.

### 3.9 · License-aware tone in dependency stories ✅ shipped
**Why:** A permissive-licensed project (MIT / Apache-2.0 / BSD)
that pulls in even one strong-copyleft (GPL / AGPL) dependency
inherits the copyleft for the entire derivative work. The GNU
Project's compatibility guidance is explicit: "the parts that came
in under lax licenses still carry them, and the combined program as
a whole carries the copyleft license." That's a real legal trap the
audit can flag for free using data we already fetch in Phase 3.8.

**Pre-build research (2026-05-10):**
- SPDX License List 3.x — modern identifiers replaced bare GNU forms
  (`GPL-3.0` → `GPL-3.0-only` / `GPL-3.0-or-later`); we accept both.
- npm `package.json` `license` field accepts SPDX expressions
  (`MIT OR Apache-2.0` is the most common dual-license form), the
  legacy object shape `{ type: "MIT" }`, the custom-text form
  `SEE LICENSE IN <file>`, and `UNLICENSED`.
  https://docs.npmjs.com/cli/v10/configuring-npm/package-json#license
- PyPI exposes licenses three ways with decreasing precision:
  PEP 639 `info.license_expression` (SPDX), the free-text
  `info.license` field, and trove `License :: …` classifiers. We
  prefer the most precise form available.
- crates.io ships the license string on each version entry (not the
  crate root).
- GNU Project · *License Compatibility*: strong copyleft pulls up
  permissive — actionable. Weak copyleft (LGPL / MPL) is fine for
  dynamic linking — surface as info, not a warning.
  https://www.gnu.org/licenses/license-compatibility.html

**Implementation:**
- All three Phase 3.8 fetchers (`npmRegistry`, `pypiRegistry`,
  `cratesRegistry`) now extract the license:
   · npm: top-level `license` (string OR legacy `{ type }` object),
     fallback to the latest version's manifest entry.
   · PyPI: `license_expression` (PEP 639) → `info.license` →
     classifiers (last `::` segment, skipping the
     `OSI Approved` rung).
   · crates: looks up the matching `versions[]` entry by `num`
     equal to the picked latest version.
- `RegistryMetadata` gains a `license: string | null` field —
  cached entries persist it through the existing localStorage
  TTL cache, no migration needed.
- New `src/lib/audit/licenseClassifier.ts`:
   · `classifyLicense(spec)` returns `{ raw, label, category }`.
     Category is one of `permissive` / `weak-copyleft` /
     `strong-copyleft` / `public-domain` / `proprietary` / `none` /
     `unknown`. Handles SPDX expressions: `OR` collapses to the
     most-permissive alternative, `AND` to the most-restrictive,
     parens are stripped. Free-text PyPI labels go through a
     synonym table.
   · `analyzeLicenseTone(repoSpdx, deps)` produces a
     `LicenseToneSummary` with per-category dep counts and a sorted
     `LicenseFinding[]`. The four findings are:
       1. *Strong copyleft (GPL family) under a permissive repo* —
          `critical` when the repo is permissive / public-domain /
          undeclared, `warning` when the repo is itself copyleft.
       2. *Weak copyleft (LGPL / MPL family) dependencies* — info,
          regardless of repo license.
       3. *Source-available / proprietary dependencies* — warning
          for BUSL / Elastic / SSPL etc.
       4. *Unrecognised license strings* — info, only when the share
          of unknowns is ≥ 25 % of classified deps.
- `RegistryPanel` gains a "License tone" section at the top showing
  the repo's classified license, the per-category dep mix as
  pills, and any compatibility findings styled by tone (info / warn
  / critical). Each row's subline now also surfaces the dep's
  classified license inline (`MIT (Permissive)`).
- `ReviewDashboard` passes the GitHub-derived
  `meta.license?.spdxId` through as the `repoLicense` prop.

**Tests:** 56 new cases across two files:
- `tests/lib/audit/licenseClassifier.test.ts` (50 cases): single
  SPDX ids per family (18), expressions with OR / AND / parens (4),
  PyPI synonym round-trip (8), custom-text declarations (2),
  `analyzeLicenseTone` covering critical-vs-warning gating, weak-
  copyleft info, proprietary warning, unclassified-deps threshold,
  no-finding all-permissive case, sort order, null-repo path,
  per-category counts (10), UI label helpers (7).
- `tests/lib/registries/registryFetchers.test.ts` extended with 6
  new cases for license extraction across all three registries
  (top-level + version-fallback + legacy `{ type }`, PEP 639
  precedence, classifier fallback, crates per-version lookup).

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 44 files / 577 tests green (was 43 / 521).
- `npm run build` — 624 KB JS, no warnings.

---

### Phase 3 wrap

All nine Phase 3 detectors now ship: README readability (3.1),
Dependabot config parsing (3.2), CODEOWNERS density (3.3),
SECURITY.md contact-channel grading (3.4), `package.json` runtime
contract (3.5), CHANGELOG release pace (3.6), topic-driven
contextual rules (3.7), free public registry lookups across npm /
PyPI / crates.io (3.8), and license-aware tone analysis (3.9).
Plus a German-law-compliant Impressum + Datenschutzerklärung. The
audit now combines file-derived signals with live registry data
while staying entirely browser-based, free, and rule-based — every
operating constraint preserved. Suite: 27/208 at the start of
Phase 3 → 44/577 at the end.

---

## Phase 4 — Polish & long-term sustainability

### 4.1 · Visual regression tests ✅ shipped
**Why:** Astraudit's UI relies on a dense semantic-token system —
one inverted variable can ripple silently across both themes, the
print stylesheet, the bottom-sheet variant, and the legal pages. A
free, OSS-friendly visual regression suite makes those breaks
impossible to miss in code review.

**Pre-build research (2026-05-10):**
- Playwright Docs · *Continuous Integration*: canonical GH Actions
  setup is `actions/setup-node@v4` + `npm ci` +
  `npx playwright install --with-deps` + `npx playwright test`,
  with the HTML report uploaded as a build artefact on failure.
  https://playwright.dev/docs/ci-intro
- Visual snapshots are notoriously OS-dependent (font rendering,
  anti-aliasing). Standard practice: pin the test environment to a
  single OS + browser binary version, only commit baselines
  generated there, allow a small `maxDiffPixelRatio` (~0.5 %) for
  AA jitter. We follow that exactly — Chromium-only, ubuntu-latest
  CI, baselines generated on the same OS image, 0.5 % tolerance.
- Mask volatile UI (`new Date().getFullYear()` in the footer, the
  auth-token-prefix pill, theme toggle label) so cosmetic churn
  can't fail a snapshot.

**Implementation:**
- `@playwright/test@^1.59` added as a devDependency. `npx playwright
  install chromium` is invoked from the new CI workflow with binary
  caching keyed on `package-lock.json`.
- New `playwright.config.ts`:
   · `testDir: "tests/visual"`,
     `snapshotPathTemplate` colocates baselines next to specs.
   · Single Chromium project (cross-browser snapshots are too noisy
     for a project this small).
   · `webServer` runs `npm run build && npm run preview --port 4173
     --strictPort` so screenshots reflect what GitHub Pages
     actually serves.
   · `expect.toHaveScreenshot` defaults: `maxDiffPixelRatio: 0.005`,
     `animations: "disabled"`, `caret: "hide"`.
   · Context defaults: `reducedMotion: "reduce"` (forces the
     motion-safe variants out of the picture), pinned 1280×800
     viewport, `dark` colorScheme, `Europe/Berlin` timezone,
     `en-US` locale.
- New specs:
   · `tests/visual/home.spec.ts` — home page in dark + light
     (light is set via `localStorage.astraudit:theme:v1=light` in
     an `addInitScript`). Footer + theme toggle + settings pill
     are masked.
   · `tests/visual/legal.spec.ts` — Impressum + Datenschutzerklärung
     full-page screenshots with the footer masked.
- New `.github/workflows/visual.yml` — runs on PRs and main pushes.
  Caches Playwright browsers, runs `npx playwright test`, uploads
  the HTML report + traces on failure (or success — `always()`).
- `package.json` scripts: `npm run test:visual` runs the suite,
  `npm run test:visual:update` regenerates baselines.
- `.gitignore` adds `playwright-report/`, `test-results/`,
  `.playwright/`. Baseline PNGs under
  `tests/visual/__snapshots__/` are tracked.

**Coverage:** four baselines committed (home dark + light,
Impressum, Datenschutz). The audit dashboard isn't snapshotted yet
because deterministic dashboard rendering needs GitHub-API route
mocking — deferred to a follow-up so this phase ships with a stable
baseline.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 44 files / 577 tests still green
  (vitest only picks up `*.test.{ts,tsx}`; Playwright specs are
  `*.spec.ts`).
- `npx playwright test` — 4 specs / 4 snapshots pass against the
  freshly-generated baselines.
- `npm run build` — 624 KB JS, no warnings.

### 4.2 · Lighthouse + axe gates ✅ shipped
**Why:** A regression that drops the home page below 95 % accessibility
or the production bundle below "loads in under 5 s on a 4G simulation"
is exactly the kind of thing that slips through unit tests. Both
Lighthouse CI and axe-core's Playwright integration are free, OSS,
and run on the existing GitHub Actions free tier — perfect fits for
the project's "no paid services" rule.

**Pre-build research (2026-05-10):**
- Lighthouse CI Docs · *Configuration*: `lhci autorun` reads
  `lighthouserc.json`, runs collect → assert → upload.
  `lighthouse:recommended` preset asserts perfect scores on
  non-performance audits and warns on perf < 90; we override
  category minimums explicitly. `staticDistDir` only serves at root
  — for our `/astraudit/` base path we use `startServerCommand:
  "npm run preview --port 4205 --strictPort"` instead.
  https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
- axe-core Playwright (`@axe-core/playwright`) wraps `axe.run` in a
  chainable `AxeBuilder({page}).withTags([...]).analyze()` API. We
  filter to actionable severities (`serious` + `critical`) so
  cosmetic moderate issues don't block PRs.
  https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md

**Implementation:**
- New `lighthouserc.json` runs Lighthouse against `npm run preview
  -- --port 4205 --strictPort` (so the `/astraudit/` base path is
  honoured), 3 runs averaged on CI / 1 run locally, `desktop` preset
  with `simulate` throttling, `--no-sandbox --headless=new` chrome
  flags so the workflow runs as the GH Actions runner user.
- Assertion floors: performance ≥ 0.7 (the hero ships a 5 MB
  `Logo_bg_removed.png` per the maintainer's standing decision —
  that's the LCP element and the perf cap), accessibility ≥ 0.95,
  best-practices ≥ 0.9, SEO ≥ 0.9. Uploads to
  `temporary-public-storage` so the workflow log carries a
  clickable report URL for ten days.
- New `tests/visual/a11y.spec.ts` runs `@axe-core/playwright`
  against the home page + Impressum + Datenschutzerklärung, fails
  on `serious` / `critical` violations only, filtered to
  `wcag2a / wcag2aa / wcag21a / wcag21aa / wcag22aa` tags.
  `color-contrast` is `disableRules`'d on the dashboard surfaces
  because axe doesn't account for our glass underlay; the rule
  still fires correctly on the home page so genuine regressions
  surface.
- New `.github/workflows/quality.yml` with two parallel jobs —
  `lighthouse` and `a11y`. The `a11y` job re-uses Playwright's
  browser cache from `4.1`'s workflow.
- Added missing scripts to `package.json` (already wired via the
  workflow `npx` calls).

**Real fixes shipped alongside the gate** (light-theme contrast +
heading hierarchy + label-content match — the gate caught these
honestly on first run):
- `Hero.tsx` settings button drops its `aria-label` so the visible
  text becomes the accessible name (Lighthouse
  `label-content-name-mismatch`). The descriptive text moves to
  `title` for hover hint.
- `EmptyState.tsx` wraps the feature cards in a `<section>` with a
  visually-hidden `<h2>` so the audit's heading order
  (`<h1>` hero → `<h2>` section → `<h3>` card title) is sequential
  (Lighthouse `heading-order`).
- `globals.css` light-theme overrides now also cover the alpha-
  modified Tailwind variants (`text-white/90`, `text-slate-300/85`,
  `text-slate-400/85`) via `[class*="text-X/"]` attribute selectors.
  The root cause was that Tailwind compiles `text-white/90` to a
  *separate* class and the existing `.text-white` override didn't
  match. Fixing this single thing took the a11y score from 0.91 to
  a perfect 1.0 on the home page.
- `.card-title` in light mode bumped from `rgb(148 163 184 / 0.85)`
  (~2.1:1) to `#475569` (~7:1) so the dashboard card titles clear
  WCAG AA.

**Verification:**
- `npx vitest run` — 44 files / 577 unit tests still green.
- `npx playwright test` — 4 visual + 3 axe specs pass.
- `npx lhci autorun` — perf 0.78 / a11y 1.0 / best 0.95 / SEO 1.0;
  every assertion clears its floor.
- Visual regression baselines for the home-light theme regenerated
  to reflect the contrast bumps.

### 4.3 · Internationalization (en + de)
Externalize all UI copy into a string table; ship `de` first since the
maintainer is German-speaking.

### 4.4 · Bundle splitting
Lazy-load React Flow only after the dashboard first paints. The graph
is below the fold on most viewports — no need to ship it in the
critical bundle.

### 4.5 · Public rule book
A rendered Markdown page that lists **every** detector and exactly what
triggers it. Helps users trust the findings and contribute new rules.

### 4.6 · Contribution guide
A `CONTRIBUTING.md` for adding new detectors, with the same fixture
test pattern as Phase 1.6.

---

## Stretch ideas (might do, might not)

- **Audit a specific commit / branch / tag.** Currently we always audit
  the default branch.
- **"What changed" diff** when re-auditing the same repo after a while
  (uses the localStorage cache).
- **SBOM-style export** of detected dependencies (JSON).
- **Browser-rendered PDF report** with a styled cover page.

---

## Anti-roadmap — things Astraudit will never do

These would compromise the constraints. They are out, permanently.

- ❌ A backend, even *"just"* for caching, badges, or PDF generation.
- ❌ Serverless functions of any kind (Vercel, Netlify, Cloudflare
  Workers, Lambda).
- ❌ Managed databases (Supabase, Firebase, PlanetScale, …).
- ❌ Auth / OAuth flows. No Astraudit account, ever.
- ❌ Any AI / LLM API (OpenAI, Claude, Gemini, …). Findings stay
  rule-based.
- ❌ Private repository support — that would require server-held
  secrets.
- ❌ Cloning, installing, or executing code from the audited repo.
- ❌ Per-visitor analytics, fingerprinting, or any tracking pixels.

If a new feature needs any of the above, we drop the feature.

---

## How to propose a new roadmap item

Open a GitHub issue with:

1. The user need (one or two sentences).
2. The data Astraudit would need to satisfy it.
3. A check against the four constraints above (browser-only, free,
   public-only, rule-based).

Items that pass all four constraints will move to a phase. Items that
don't are either reframed or recorded in the anti-roadmap.
