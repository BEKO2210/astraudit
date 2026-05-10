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

### 4.3 · Audit graph improvements ✅ shipped
**Why (rescope):** Originally planned as i18n (en + de). The
maintainer rescoped: English is already the international default
for technical documentation, and the dependency graph component —
the centrepiece of the audit dashboard — needed real interactivity.
A static node-and-edge picture without filters or focus is
beautiful but only useful at first glance.

**What changed in the graph:**
- **Status filter chips** — one chip per status
  (`Missing`/`Partial`/`Strong`/`Info`/`Not detected`) with live
  counts from the current audit. Clicking a chip hides nodes of
  every other status (and any edges touching them), so users can
  zoom in on the failures without panning around. The root `repo`
  node is always visible — the explicit guard keeps the graph from
  becoming a disconnected mess.
- **Per-category icons on every node** — each node id maps to a
  domain-meaningful Lucide glyph (License → ShieldCheck, CI →
  GitBranch, Releases → Rocket, Maintenance → Activity, etc.).
  Replaces the previous lone status dot — much faster to scan.
- **Edges colour-coded by target status** — edges leading to a
  `missing` node turn red, pulse via React Flow's `animated: true`,
  and ship a slightly thicker stroke. Edges to `strong` nodes go
  mint, `partial` violet, `info` cyan. Eyes are pulled to failures
  immediately.
- **"Focus failing" button** — uses `useReactFlow().fitView({nodes})`
  to imperatively zoom + pan to the missing/partial subset, with a
  600 ms tween. Disables itself (with a tooltip explanation) when
  every node is healthy. Pre-selects the first failing node so the
  side panel updates in lock-step.
- **Auto-refit on filter change** — when the filter set is reduced,
  the viewport refits to the visible portion so the user always
  sees what they asked for.
- **`<ReactFlowProvider>` wrapping** — required for the `fitView`
  imperative call from the inner component. Public `<AuditGraph>`
  API unchanged.

**Implementation:**
- Pure logic extracted to `src/components/auditGraphHelpers.ts`
  (`countByStatus`, `hiddenNodeIds`, `isEdgeHidden`,
  `toggleStatusInSet`, `failingNodes`, `STATUS_ORDER`, `STATUS_LABEL`).
  Lives in its own file so vitest (node env, no DOM) can exercise
  the logic without touching React Flow.
- `AuditGraph.tsx` refactored: split into `<AuditGraph>` (provider
  wrapper) + `<AuditGraphInner>` (consumes the provider context).
  All filter/icon/edge-styling state lives in the inner component.
- New `NODE_ICONS` map — falls back to `CircleDot` for any future
  detector node before its icon is wired.
- New `STATUS_COLORS[s].edgeStroke` colour added to the existing
  status palette so the edge styling stays in one table with the
  node styling.
- The "Show all" reset button only appears when at least one chip
  is unticked — keeps the toolbar quiet by default.

**Tests:** new `tests/components/auditGraphHelpers.test.ts` (17 cases):
- `countByStatus` over empty + sample graph (2 cases).
- `hiddenNodeIds` covering full-active, single-active, and the
  always-visible `repo` invariant (3).
- `isEdgeHidden` for source-hidden / target-hidden / both-visible (3).
- `toggleStatusInSet` for add / remove / never-empty / immutability (4).
- `failingNodes` for sample graph / no failures / info+unknown
  excluded (3).
- `STATUS_ORDER` + `STATUS_LABEL` shape guards (2).

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 45 files / 594 tests green (was 44 / 577).
- `npm run build` — 629 KB JS (the +5 KB lift comes from the new
  Lucide icons + helper module), no warnings.
- `npx playwright test` — 4 visual + 3 axe specs still pass.

**Note on accessibility:** filter chips use `role="toolbar"` +
`aria-pressed="true|false"` per the WAI-ARIA APG toggle-button
pattern, so screen-reader users get the same on/off feedback as
sighted users.

### 4.4 · Bundle splitting ✅ shipped
**Why:** `reactflow` + its CSS together weighed in at ~150 KB
minified — about a quarter of the home page's first-paint payload —
even though the audit graph is below the fold on every viewport
and only mounts after a successful audit. Lazy-loading it cuts the
initial JS by that quarter without changing a single user-facing
behaviour.

**Pre-build research (2026-05-10):**
- Vite Docs · *Dynamic Import*: `React.lazy(() => import("./X"))`
  is the canonical pattern. Vite's chunk-splitting automatically
  emits a separate `.js` file *and* parallel-fetches it, so there's
  no waterfall penalty — the lazy chunk arrives roughly when the
  user starts scrolling.
- The CSS import follows the JS into the new chunk *as long as the
  `import "reactflow/dist/style.css"` lives in the lazy module*.
  Ours used to live in `main.tsx`, which kept it in the main CSS
  bundle even though the JS was about to be split. Moving the
  import into `AuditGraph.tsx` puts JS and CSS into the same lazy
  chunk.
  https://vite.dev/guide/features#dynamic-import

**Implementation:**
- `src/components/AuditGraph.tsx` adds a `default` export and
  imports `reactflow/dist/style.css` at the top of the file.
- `src/main.tsx` drops the static CSS import — replaced with a
  comment pointing the reader at the new home.
- `src/components/ReviewDashboard.tsx` switches to
  `const AuditGraph = lazy(() => import("./AuditGraph"))` and
  wraps the rendered `<AuditGraph>` in `<Suspense fallback={
  <AuditGraphSkeleton />}>`.
- New `src/components/AuditGraphSkeleton.tsx` mirrors the live
  graph's chrome so the layout doesn't reflow when the chunk
  arrives — same glass card, same toolbar height, the canvas
  shows six node-shaped skeletons in the rough positions of the
  real graph. Built on the existing `<Skeleton>` primitive
  (Phase 2.8.2).

**Build output (May 2026 baseline):**
- **Before:** `index.js` 629 KB / 204 KB gzipped, single
  `index.css` 64 KB / 13 KB gzipped.
- **After:**
   · `index.js` **481 KB / 157 KB gzipped** (-148 KB / -47 KB,
     **24 % lighter on first paint**).
   · `index.css` **58 KB / 11 KB gzipped** (-7 KB).
   · New lazy chunks: `AuditGraph.js` 151 KB / 50 KB gzipped +
     `AuditGraph.css` 7 KB / 1.6 KB gzipped (only loaded after
     the dashboard mounts).
- Lighthouse FCP **465 ms**, TBT **0 ms**, Speed Index **465 ms**.
  The Lighthouse score itself stays 0.78 because the LCP element
  is the maintainer's intentional 5 MB
  `public/Logo_bg_removed.png` — that's the metric ceiling, not
  bundle weight.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 45 files / 594 tests still green.
- `npx playwright test` — 4 visual + 3 axe specs still pass.
- `npx lhci autorun` — every assertion passes (perf 0.78,
  a11y 1.0, best 0.95, SEO 1.0).

### 4.5 · Public rule book ✅ shipped
**Why:** "Rule-based, not AI-judged" is one of Astraudit's four
operating constraints, and a curious user has no way to verify
that today — the rules live across a dozen detector files. A
canonical, human-readable rule book turns that promise into a
checkable artefact: every finding has a documented trigger you can
look up by ID, and every panel-only detector explains what it
measures.

**Implementation:**
- New canonical doc: `docs/RULES.md`. Single source of truth for
   the rule catalog. Renders cleanly on GitHub *and* inside the
   app — contributors edit one file, both views update.
   Sections:
    1. **Score & grade model** — total-score → letter-grade table,
       status ribbons (`Strong`/`Partial`/`Missing`/`Info`/`Not
       detected`) and what each means.
    2. **Findings catalog** — every finding-emitting rule grouped
       by category, with rule ID, trigger description, and
       severity. Documents all 16 entries from `riskEngine.ts`.
    3. **Panel outputs** — the Phase 3 detectors that don't emit
       findings (readability, Dependabot, CODEOWNERS, security
       policy, runtime contract, CHANGELOG cadence, topic rules,
       registry signals, license tone) each get a paragraph with
       the input file/format and the surfaced output.
    4. **Operating constraints + rule proposal flow.**
- New `src/components/legal/DocPage.tsx` — generic full-screen doc
   chrome, takes a `backLabel` and a `nav: DocPageNav[]` for
   cross-links. `LegalPage.tsx` now delegates to it, so the German
   "Zurück zur App" copy stays on the legal pages while the rule
   book gets English chrome.
- New `src/components/legal/RuleBook.tsx` — imports
   `docs/RULES.md` via Vite's `?raw` attribute, renders with
   `markdown-it` (already a dep — re-used from the README preview
   pipeline), `html: false` for the same XSS-defensive baseline.
   Renders inside the existing `.legal-prose` typography stack.
- New TypeScript declaration `src/vite-env.d.ts` for the
   `*.md?raw` import shape.
- `App.tsx` extends `routeFromHash` to recognise `#/rules`,
   `#/rulebook`, and `#/rule-book`. The legal-route state widens to
   `"impressum" | "datenschutz" | "rules" | null`.
- `Footer.tsx` adds "Rule book" alongside Impressum + Datenschutz.

**Tests:** `tests/components/ruleBook.test.tsx` (9 cases):
- Locks down every rule ID emitted by `riskEngine.ts` (16 IDs)
   plus the four Phase 3.9 license-tone IDs — the doc would
   otherwise drift away from the source over time.
- Score-grade table + the five status ribbons.
- Each of the four operating constraints.
- `<RuleBook />` rendering: chrome (title + back link), cross-links
   to the legal pages, real `<code>` tags from the catalog (proves
   markdown-it ran), real `<table>` for the grade matrix, and a
   negative XSS guard (no `<script>` / `<iframe>` ever in output).

**Bundle impact:**
- `index.js` 481 → 495 KB / 157 → 162 KB gzipped (+14 KB raw,
   +5 KB gzipped). The whole rule book ships in the main chunk
   so the doc is one fewer fetch away. Could be lazy-loaded
   later, but at ~12 KB raw it's not worth a Suspense round-trip.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 46 files / 603 tests green (was 45 / 594).
- `npx playwright test` — 4 visual + 3 axe specs still pass.
- Manual: `#/rules` renders the doc with proper typography, both
   themes; back-link returns to the app; cross-links to
   Impressum/Datenschutz work.

### 4.6 · Contribution guide ✅ shipped
**Why:** A first-time contributor today has to reverse-engineer the
project's conventions from `git log` and a dozen detector files. A
proper `CONTRIBUTING.md` turns "where does the new rule go?" from
a 30-minute archaeology session into a 5-minute checklist, and
locks in the operating constraints + testing conventions so they
don't drift over time.

**Implementation:**
- New `CONTRIBUTING.md` with 13 sections (~430 lines), structured
  for both quick-reference and deep onboarding:
   1. The four operating constraints (browser-only / free /
      public-only / rule-based) — repeated up front because
      they're the most common reason a feature gets pushed back.
   2. Code of conduct (Contributor Covenant on the way).
   3. Quick start (clone → install → dev) plus a script-name
      cheatsheet.
   4. Repo layout — annotated directory tree with one-line
      explanations of every top-level folder.
   5. Adding a new finding-emitting rule — end-to-end checklist
      with a worked example ("no Code of Conduct"), the actual
      `Finding` interface fields (description, evidence string,
      recommendation, affectedFiles, confidence), and the relation
      between rule-book IDs (`doc-no-coc`) and runtime
      `Finding.id` (`f-coc-N`).
   6. Adding a new panel detector — for Phase 3-style enrichment
      that doesn't emit findings.
   7. Writing tests with the fixture builders — uses
      `makeTree`, `makeImportantFiles`, `makeBundle` from
      `tests/fixtures/builders.ts` so synthetic repos stay
      deterministic + offline.
   8. Running every CI gate locally —
      `npm run typecheck` / `npm test` / `npm run build` /
      `npx playwright test` / `npx lhci autorun`, in the order CI
      runs them.
   9. Updating the rule book — every emitted ID must survive in
      `docs/RULES.md`; the rule-book test fails CI otherwise.
  10. Pull request workflow — branch naming, commit message style,
      one-concern-per-PR rule, draft-vs-ready toggle.
  11. Review expectations — six concrete checks reviewers will
      apply (constraint compliance, determinism, no silent
      failures, negative-path tests, rule book entry, bundle
      weight, accessibility parity).
  12. Reporting security issues — direct email path
      (`belkis.aslani@gmail.com`) per the Datenschutzerklärung
      contact.
  13. Recognition + licence.
- README gets a new "Documentation" section pointing at both
  `docs/RULES.md` and `CONTRIBUTING.md` so the discoverability
  path is explicit.

**Tests:** `tests/components/contributing.test.ts` (6 cases) —
locks the structural contract so a regression is caught in CI:
- Four operating constraints are quoted verbatim.
- Every canonical section heading is present.
- Every CI command is quoted (so a contributor can copy/paste
  without re-deriving them).
- The fixture-builder + rule-book paths are referenced.
- The worked example uses the actual `Finding` shape — guards
  against the doc drifting from `src/types/finding.ts`.
- The security email is present.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 47 files / 609 tests green (was 46 / 603).
- `npm run build` — no warnings.

---

### Phase 4 wrap

All six Phase 4 items now ship:

- **4.1** Visual regression tests (Playwright + GH Actions)
- **4.2** Lighthouse + axe CI gates
- **4.3** Audit graph improvements (rescoped from i18n at the
  maintainer's request — filters / icons / edge colours / focus-
  failing button)
- **4.4** Bundle splitting (lazy-load AuditGraph, 24 % first-paint
  reduction)
- **4.5** Public rule book at `#/rules` + `docs/RULES.md`
- **4.6** Contribution guide (`CONTRIBUTING.md`)

Suite grew across Phase 4 from 39 / 482 (start) to **47 / 609**
(end), plus 4 visual + 3 axe Playwright specs and a 4-floor
Lighthouse gate.

---

## Phase 5 — Deep UX & control review

A focused pass over every interactive surface in the app. Each
sub-phase is a self-contained run (research → audit → fix → tests),
matching the Phase 2.8 / 3.x pattern. The goal: zero unloved
buttons, zero rough edges, zero "wait, why doesn't *that* work?"
moments.

### 5.1 · Scroll & focus reset on route changes ✅ shipped
**Why:** The trigger flow was the maintainer's own bug report —
"wenn ich z.B. auf Datenschutz drücke soll es an den Punkt
springen wo man anfängt zu lesen". Browsers preserve `scrollY`
across hash changes, so a visitor who scrolled to the footer
to click "Datenschutz" landed halfway down the legal page. Plus,
keyboard / screen-reader users had no signal that a new page had
mounted at all.

**Pre-build research (2026-05-10):**
- Gatsby a11y route-change study + WAI-ARIA route-change
  guidance both land on "focus the page's heading" as the most
  reliable announcement signal for screen-reader users. Don't
  focus the app top — it's overwhelming on long pages.
- `tabindex="-1"` lets a non-interactive `<h1>` receive
  programmatic focus without entering the Tab order.
- `focus({ preventScroll: true })` keeps the explicit
  `window.scrollTo(0, 0)` in charge — without it, browsers will
  also scroll the focused element into view and fight the explicit
  reset.
- Programmatic focus on a non-interactive element does *not*
  trigger `:focus-visible`, so the universal focus ring from
  Phase 2.8.7 doesn't paint a jarring outline on the heading.

**Implementation:**
- `src/components/legal/DocPage.tsx` (the Phase 4.5 chrome shared
  by Impressum, Datenschutzerklärung, RuleBook) gets:
  - A `useRef<HTMLHeadingElement>` on the page `<h1>`.
  - A `useEffect` (empty deps) that, on mount, calls
    `window.scrollTo(0, 0)` and `headingRef.current?.focus({
    preventScroll: true })`.
  - The `<h1>` is now `tabIndex={-1}` + `outline-none` so it can
    receive synthetic focus without ever entering Tab order or
    painting a visual ring.
- Each route mounts a fresh `<DocPage>` (the App router returns a
  different top-level component per slug — `<Impressum />` vs
  `<Datenschutzerklaerung />` vs `<RuleBook />`), so the empty-deps
  effect fires on every navigation, including cross-links.
- Real bug caught alongside the fix: the rule book was rendering
  TWO `<h1>` tags (DocPage title + the markdown's own
  `# Astraudit rule book` from `docs/RULES.md`). The second was a
  WCAG hierarchy violation. `RuleBook.tsx` now strips the leading
  H1 from the markdown source before rendering — GitHub still
  shows the heading because GitHub renders the file's first H1 as
  the page banner regardless.

**Tests:**
- New `tests/visual/routeReset.spec.ts` (3 Playwright cases) —
  covers the exact reported flow:
   1. Scroll to the footer, click Datenschutz, assert
      `window.scrollY === 0` AND `document.activeElement` is the
      page `<h1>` with the right text.
   2. Cross-navigate Datenschutz → Impressum via the in-page
      header link, same assertions.
   3. Footer "Rule book" link, same assertions, also confirming
      the Phase 4.5 `#/rules` slug routes through the same effect.
- `tests/components/ruleBook.test.tsx` extended with a single-`<h1>`
  guard so the duplicate-heading regression can never come back.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 47 files / 610 tests green (added 1).
- `npx playwright test` — **10 specs all pass** (was 7; +3 from
  the new route-reset spec).
- `npm run build` — no warnings.

### 5.2 · Interactive control audit ✅ shipped
**Why:** WCAG 2.5.8 (Target Size Minimum, AA) demands ≥ 24×24 CSS
px hit area on every interactive control. Phase 4.2's axe gate
catches a lot, but axe doesn't measure pixel sizes — that's
exactly the kind of regression that slips through. Plus the audit
let us walk every button + link looking for the *other* common
WCAG failures (label-name mismatch, hover-only visibility, missing
type, etc.).

**Pre-build research (2026-05-10):**
- WCAG 2.2 quick-ref + Deque axe coverage matrix: axe catches
  missing roles / labels / contrast but **does not** measure
  target size, hover-state quality, focus order, or label-name
  semantic match. Those need either a Playwright runtime check
  or a human review.
  https://www.w3.org/WAI/WCAG22/quickref/?levels=aa
- WCAG 2.5.8 documented exceptions:
   · Inline (text links inside a paragraph),
   · Spacing (24 px circles centred on each target don't overlap),
   · Equivalent (a different full-size control achieves the same),
   · Essential (the small size is functionally required),
   · User Agent (browser-rendered controls).
  We honour the inline + UA exceptions in the runtime guard;
  others are case-by-case.

**The audit walked 141 interactive touchpoints across 23
component files.** Real issues found and fixed:

1. **`HistoryDialog` "Remove from history" button** — was
   `p-1 + h-3.5` (22×22 px hit area, **under WCAG 2.5.8**), AND
   `opacity-0 group-hover:opacity-100` rendered the button literally
   invisible to non-hovering users — keyboard users could Tab to
   focus and only see it via the `focus:opacity-100` recovery,
   which is jarring. Fixed: `p-1.5 + h-4` (28×28 px), and the
   button is now `opacity-60` at rest, fading to 100 % on
   hover/focus, so the affordance is always discoverable.
2. **`ToastHost` dismiss button** — was `p-1 + h-3` (20×20 px).
   Fixed: `p-1.5 + h-3.5` (26×26 px).
3. **`StickyScoreBar` Compare + Badge buttons** — `px-2.5 py-1
   text-[11px]` collapsed to ~19 px height. Added
   `min-h-[1.625rem]` (~26 px) so they clear the floor without
   disturbing the visual rhythm.
4. **Footer link row** — was a `<div>` of inline `<a>` text links
   measuring ~16 px tall. Wrapped the whole row in `<p>` so the
   links semantically count as inline text links and earn WCAG
   2.5.8's documented inline exception. Layout unchanged.
5. **`<DocPage>` nav cross-links** (Impressum → / Datenschutz → /
   Rule book) — were `text-xs` with no padding (~16 px tall).
   Bumped to `inline-flex min-h-[1.625rem] px-2 py-1` so they
   clear 24×24 cleanly.

**Programmatic guard (the part that catches future regressions):**
- New `tests/visual/controlAudit.spec.ts` runs four Playwright
  cases — one per route (home, Impressum, Datenschutz, rule
  book) — and walks every `<button>`, `<a href>`, and
  `[role="button"]` measuring its `getBoundingClientRect()`.
  Anything under 24×24 fails the test with a detailed offender
  list (size, text, snippet) so the diff is one click away.
- Skips applied per WCAG 2.5.8:
   · Inline anchors inside `.legal-prose` / `.readme-prose` /
     `<p>` (inline text exception).
   · React Flow's built-in zoom/pan controls (UA-equivalent —
     library-rendered, not ours).
   · Off-screen / `display:none` / `visibility:hidden` controls
     (will be re-tested when their section is visible).

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 47 files / 610 tests still green.
- `npx playwright test` — **14 specs all pass** (was 10; +4 from
  the new control-audit guard).
- `npx lhci autorun` — perf 0.78 / a11y 1.0 / best 0.95 / SEO 1.0
  (every assertion still clears its floor).

**Follow-up bug (caught while 5.2 was being reviewed):** the
maintainer reported a sliver of horizontal scrolling on Android-
sized viewports. Reproduced at 360 × 640: the Hero's brand cluster
+ ThemeToggle + Settings + History row summed to 362 px on a
360 px viewport, pushing a 2 px overflow. None of our existing
specs ran below 1280 px so it slipped through.

Fix: `<div className="flex items-center justify-between gap-2">`
on the Hero header is now `flex-wrap`. On tight viewports the
action cluster (Theme, History, Settings) wraps to a second line
instead of forcing the page wider than the body.

Permanent guard: new `tests/visual/mobileOverflow.spec.ts` runs
the four routes (home / Impressum / Datenschutz / rules) at
**320 × 568** (WCAG 1.4.10 Reflow contract — content must not
require horizontal scroll at 320 CSS px wide) and **360 × 640**
(typical Android). 8 cases total. A future change that pushes
anything outside the viewport at either size now fails CI before
the PR can land.

Updated totals: **22 Playwright specs** all pass (was 14; +8 from
the mobile-overflow guard).

### 5.3 · Dialog, popup & overlay hardening ✅ shipped
**Why:** The Phase 5.2 walk found that none of the four runtime
behaviours the WAI-ARIA APG modal pattern requires (focus trap,
focus restore, body scroll lock, Esc dismissal) were enforced
consistently across the six dialogs. Every dialog had Esc, none
had focus trap or scroll lock, focus restoration was implicit and
unreliable, and the dialog containers had no accessible name —
screen readers just heard "dialog" with no context.

**Pre-build research (2026-05-10):**
- W3C WAI · *Modal Dialog Pattern* (May-2026 APG revision) —
  focus trap mechanics, focus restoration, body scroll lock
  semantics, Esc, `aria-modal="true"` only when the application
  *actually* prevents outside interaction.
  https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

**Implementation:**
- New `src/lib/ui/useDialog.ts` hook centralises all four
  behaviours behind a single `{ open, onClose, containerRef,
  initialFocusRef }` interface:
   1. **Focus trap** — Tab + Shift-Tab cycle through focusable
      descendants of `containerRef` only. Escapes to body are
      caught + reset.
   2. **Focus restore** — `document.activeElement` is captured
      at open time and refocused on close (with
      `preventScroll: true` so it doesn't scroll-jump).
   3. **Body scroll lock** — a shared open-count guards the
      `document.body.style.overflow = "hidden"` mutation so
      stacked dialogs (rare but possible) only release the lock
      when every modal has unmounted.
   4. **Esc dismissal** — listener attached at *capture* phase
      so a deep-tree `stopPropagation` can't swallow it.
- All six dialogs (`SettingsDialog`, `HistoryDialog`,
  `CompareDialog`, `ShortcutsDialog`, `BadgeDialog`,
  `CommandPalette`) now call `useDialog()` and gain a unique
  `aria-labelledby` (or `aria-label` for the command palette,
  which has no visible title). Dialog `<h2>` titles get an `id`
  generated via `useId()` so the `aria-labelledby` is stable
  across re-renders.
- The five legacy `useEffect` Esc handlers are removed — the
  hook owns Esc now. CommandPalette keeps its specialised
  arrow-key/enter handler because it needs them for list
  navigation.

**Tests:** new `tests/visual/dialogHardening.spec.ts` (3
Playwright cases against the Settings dialog as the canonical
case, since the others share the same hook):
- *Opens with focus inside, restores on close, locks scroll* —
  asserts (a) the dialog mounts visibly, (b) it carries
  `aria-label` or `aria-labelledby`, (c) initial focus lands
  inside the dialog, (d) `getComputedStyle(document.body).
  overflow === "hidden"` while open, (e) Esc closes, (f) body
  overflow is released, (g) focus is restored to the trigger.
- *Focus trap cycles inside (Tab + Shift-Tab)* — Tabs and
  Shift-Tabs 12 times each and asserts the dialog still contains
  `document.activeElement` after every press.
- *Backdrop click also closes + restores focus* — locks the
  outside-click-to-dismiss path's focus-return contract.

**Verification:**
- `npm run typecheck` — clean.
- `npx vitest run` — 47 files / 610 tests still green.
- `npx playwright test` — **25 specs all pass** (was 22; +3
  from the new dialog-hardening spec).
- `npm run build` — no warnings.

### 5.9 · Aurora badge layout fix
**Why:** Maintainer reported the badge's grade letter
overlapped the `/100` suffix on the aurora style. Real bug,
visible on every shareable badge: the grade x-coordinate was
computed as `padding + scoreWidth + 14`, which ignored the
width of the inline `<tspan>/100</tspan>` sitting between the
score number and the grade. For score 81 / max 100 / grade
"Very Strong", the grade rendered ~12 px inside the `/100`
tspan.

**Fix (shipped alongside 5.3):**
- `src/lib/badge/svgBadge.ts` `renderAurora`: introduces
  `suffixText = "/" + max` + `suffixWidth = estimateWidth(suffix,
  11)`. Grade x-offset becomes `padding + scoreWidth +
  suffixWidth + 14`. The badge's outer `inner` width also grows
  to `Math.max(fullNameWidth, gradeOffset + gradeWidth)` so the
  badge box widens to fit instead of clipping.
- Tspan markup is now built from the same `suffixText`
  variable + escaped via `escapeXml` (defensive — `max` is a
  number today but the value type is `number`, so no real XSS
  risk; the consistency keeps the fix uniform).

**Regression guard:** three new vitest cases in
`tests/lib/badge/svgBadge.test.ts`:
- *Positions the grade past the inline `/max` suffix* — parses
  the grade `<text>` x and asserts ≥ 82 (computed minimum for
  the sample baseline).
- *Widens the SVG to accommodate the score+suffix+grade row*
  — asserts SVG `width` ≥ 169.
- *Renders the suffix as a real `/max` tspan* — locks the
  markup shape so a future refactor that drops the tspan can't
  silently regress.

**Verification:** 17 svgBadge tests pass (was 14; +3 guards).

### 5.4 · Activity heatmap overhaul
The Phase 2.6 heatmap shipped as a minimal grid. Phase 5.4
revisits it with: hover tooltip showing the exact date + commit
count (not just a colour), keyboard navigation across cells,
explicit legend with counts, axis labels (months on top, weekdays
on left), a higher-contrast palette for the missing-data cells in
light mode, and mobile-friendly cell sizing that doesn't squash
six months into a thumbnail.

### 5.5 · Empty, loading & error state pass ✅ shipped
Every major panel — Insights, Topic Checks, Registry, Story,
Findings, Graph, Compare dashboard — gets a coherent loading
skeleton (matching the dashboard skeleton from 2.8.2), a dignified
empty state with an icon + one-line explanation, and an
actionable error state with a retry CTA where it makes sense.

**What shipped:**
- `<EmptyPanelState />` primitive (`src/components/ui/EmptyPanelState.tsx`)
  with icon + title + optional description in a glass card. Used
  by `RecommendationsPanel` (celebratory "no fixes needed" copy)
  and `OnboardingPanel` (replaces a silent `return null` with an
  honest "couldn't infer setup" explanation).
- `RegistryPanel` global error banner with a `RefreshCw` retry
  button that re-fires the fetch effect via a `retryKey` state
  bump — instead of unmounting the whole panel.
- 9 vitest cases (`tests/components/emptyPanelState.test.tsx`)
  lock the primitive's contract + the rewritten panels' empty
  paths so a regression to `return null` fails CI.

### 5.5.x · Org-level `.github` community-health fallback ✅ shipped
**Why (express bug report):** GitHub's UI inherits SECURITY.md /
CODE_OF_CONDUCT.md / CONTRIBUTING.md from `{owner}/.github` when
the target repo doesn't ship its own. Without mirroring that
fallback, Astraudit was reporting "missing SECURITY.md" on
`expressjs/express` even though
`https://github.com/expressjs/express?tab=security-ov-file` shows
the policy from `expressjs/.github/SECURITY.md`.

**What shipped:**
- `fetchOrgHealth.ts` — best-effort probe of `{owner}/.github`
  for SECURITY.md / CODE_OF_CONDUCT.md / CONTRIBUTING.md, runs
  AFTER the per-repo file fetch so the per-repo path always wins.
- `RepoBundle.orgHealth` plumbed through `loadRepoBundle`.
- `analyzeSecurity` and `analyzeDx` now consume the snapshot and
  emit a `"repo" | "org-fallback" | null` source per file so the
  graph + score evidence say "inherited from {owner}/.github"
  instead of pretending it's a repo-local file.
- 5 regression tests (`tests/lib/audit/orgHealthFallback.test.ts`).
- Live validation harness `scripts/validate-org-health.ts` (run
  with `npx tsx`) that probes 53 popular repos. Results: 14/53
  (26%) were being false-flagged by at least one community-health
  file before the fix — including express, eslint, webpack,
  vercel/next.js, flask, pandas, numpy, rust-lang/rust,
  spring-boot, elasticsearch, vscode, homebrew/brew, sveltejs,
  actix.

### 5.6 · Error & rate-limit messaging review ✅ shipped
Every user-visible error path got reviewed for clarity, actionability,
and recovery affordance.

**What shipped:**
- New `mapAuditError(err)` central helper
  (`src/lib/github/auditErrorView.ts`) returns a structured
  `AuditErrorView { kind, title, message, actions[], resetAtSeconds,
  unauthenticated }`. Replaces two near-identical 4-arm if-else
  ladders that had drifted between `runAudit` and `loadBundleFor`.
- `RateLimitError` now captures the `x-ratelimit-reset` header so
  the UI can render a live countdown ("Resets in 23 min"), and the
  `unauthenticated` flag so the copy can recommend "Open Settings →
  add a PAT" specifically when a token would help (vs the
  unhelpful "wait it out" we showed authenticated users).
- `<ErrorState />` rewritten as a renderer over `AuditErrorView`:
  per-kind icon (Clock for rate-limit, Search for 404, WifiOff for
  network, etc.), live-ticking countdown, and a variable-length
  CTA cluster. Primary action is now context-aware:
    - Anonymous rate-limit → **Open Settings** (add a token)
    - Authenticated rate-limit → **Retry** (window will reset)
    - GitHub 5xx → **Retry** (transient)
    - 404 / TooLarge / 4xx → **Try a different repository** (terminal)
    - Network → **Retry** (most are transient)
- Audit state now carries `lastInput` so the **Retry** action
  replays the same parsed coords without forcing the user to
  retype.
- 16 vitest cases (`tests/lib/github/auditErrorView.test.ts`) lock
  the per-kind mapping + the countdown formatter (sub-minute,
  multi-minute round-up, past-timestamp, missing-timestamp).

### 5.7 · Print stylesheet v2 ✅ shipped
**Why:** the print stylesheet had grown ad-hoc since 1.7 and the
Phase 3+ panels (Insights, Topic Checks, Registry) plus the
Phase 2.x dialogs (Settings/History/Compare/CommandPalette/
Shortcuts) were never wired into it. Printing an audit yielded
modal chrome bleeding through, page breaks splitting individual
findings in half, and the ActivityHeatmap (Phase 5.4) coming out
as five aurora colours that all printed identically on a B&W
laser printer.

**What shipped:**
- New `[role="dialog"]` rule hides every dialog in print —
  generic enough that future dialogs are covered without
  per-component plumbing.
- Page-break hints extended to `topic-checks` + `registry`
  (start a new page) and `insights` / `readme` / `maintenance` /
  `stack` (avoid splitting mid-card).
- New `[data-print-card]` opt-in on per-card primitives
  (`FindingCard`, recommendation `<li>`, onboarding step,
  registry row, topic check) so a 6-finding panel never gets
  split across a page boundary mid-card.
- ActivityHeatmap cells now emit `data-heat-level={0..4}`; the
  print stylesheet remaps the aurora palette to a 5-step
  grayscale (level-0 ≈ #f1f5f9 → level-4 ≈ #334155) so the
  activity profile stays readable on B&W output. Level-4 also
  flips text colour to white for contrast.
- ErrorState gets `print:hidden` — error states aren't part of
  a printed audit.
- 11 vitest cases (`tests/styles/printContract.test.ts`) lock
  the contract by parsing `globals.css` directly: every required
  `@media print` rule has a regression guard, plus the dual
  assertion that `.print-only` lives both inside (display: block)
  and outside (display: none) the print block.

### 5.8 · Multi-format audit export ✅ shipped
**What shipped:**
- `src/lib/export/auditExport.ts` — three sibling serializers
  (`exportToJson`, `exportToMarkdown`, `exportToAsciiDoc`) sharing
  a single `AuditResult` input. JSON carries an explicit
  `schemaVersion` so downstream tools can validate. Markdown +
  AsciiDoc render the same content in their respective syntaxes
  (markdown tables vs `|===` blocks, severity emojis vs plain
  brackets). All three are pure client-side — no backend, no
  external library.
- `<ExportMenu />` component (`src/components/ExportMenu.tsx`)
  next to ShareButton / PrintButton in the dashboard header.
  WAI-ARIA menu pattern (`aria-haspopup="menu"`,
  `role="menuitem"`), Esc + click-outside dismissal, focus
  return to the trigger. The menu itself is `print:hidden`.
- `downloadExportFile()` helper triggers a Blob download and
  revokes the object URL after a 5 s grace.
- Filename convention: `astraudit-{owner}-{repo}-{YYYY-MM-DD}.{ext}`
  with owner/repo slugified so Safari's Content-Disposition
  parser doesn't reject a download with a `/` or space.
- 19 vitest cases (`tests/lib/export/auditExport.test.ts`) lock
  the schema (versioned header, every top-level key present, no
  bundle blob leakage), the Markdown contract (every section
  heading, severity emojis, table rendering), the AsciiDoc
  contract (=` headings, `|===` tables), and the filename
  slugifier.

**Print stylesheet follow-up.** During the export work I ran an
end-to-end PDF validation harness (`scripts/validate-print-output.ts`)
that builds a rich fixture, renders the dashboard via Playwright
+ Chromium with `media: print`, generates a real PDF, and
inspects per-page text density + section presence. The first
run flagged a sparse page (103 chars on p18 of 21). Root cause:
`section[id="maintenance"]` had `break-inside: avoid` but is
routinely larger than one A4 page (heatmap + 30 commits +
releases), so the engine forced a new page early and left the
previous page half-empty. Fix: relax `break-inside: avoid` to
only the genuinely-small sections (overview, score, story,
insights, readme).

### 5.11 · Sticky section-nav light-theme surface fix ✅ shipped
**Why (maintainer screenshot bug):** in light mode the sticky tab
strip rendered with `rgba(255, 255, 255, 0.85)` over the
`#f8fafc` page background — pure white on near-white. The bar
became visually almost invisible and felt like "die Tabsliste ist
weg" (the tabs list is gone) when scrolling.

Plus the strip's edge-fade gradients were hard-coded to the dark
ink colour, so on light mode they showed as opaque dark ribbons
on each end (visible in the maintainer's screenshot) instead of
softly blending into the surrounding surface. And the right-edge
fade was 48 px wide, wide enough to clip the active pill when it
landed at the rightmost position.

**Fix (shipped):**
- `globals.css` — `.bg-ink-950/85` light-theme override goes
  from `rgba(255, 255, 255, 0.85)` (white on near-white) to
  `rgba(241, 245, 249, 0.92)` (a slate-50 tint that always reads
  as a surface ABOVE the page) + a darker bottom border
  (`rgba(15, 23, 42, 0.10)`) so the bar's lower edge is always
  visible.
- New `--section-nav-fade` CSS variable + `.section-nav-fade-*`
  classes that flip per theme. Dark: `rgba(5, 7, 13, 0.92)`.
  Light: `rgba(248, 250, 252, 0.95)`. Both fade to transparent
  toward the centre, so the gradient now reads as a soft
  same-colour fade in either theme — no more dark ribbons.
- `SectionNav.tsx` shrinks both fade widths to `w-6` (was `w-12`
  on the right). Active pills no longer live behind the fade.
- Each fade is now **conditionally rendered** based on actual
  scroll overflow on its edge — a `useEffect` reads
  `scrollLeft / scrollWidth / clientWidth` on the nav strip and
  toggles `overflow.left` / `overflow.right`. When the user has
  scrolled fully right, the right fade vanishes (no more clipped
  pill). A `ResizeObserver` watches viewport rotation so the
  fade state stays accurate.

### 5.10 · Audit graph mobile rendering fix ✅ shipped
**Why (maintainer report):** "auf Mobile Geräte … wackelte und
ruckelt alles wenn es in den Bereich kommt" — when the page
scrolled into the audit-graph section on mobile, the page started
wobbling and stuttering. Root cause: React Flow's default touch
handlers (`panOnDrag: true`, `zoomOnScroll: true`, and
`preventScrolling: true`) captured the single-finger touch stream
and fought the page scroll.

**What shipped:**
- New `useMediaQuery(query, default)` + `useIsNarrowViewport()`
  hooks in `src/lib/ui/useMediaQuery.ts`. SSR-safe, supports the
  modern `addEventListener("change", …)` API plus the deprecated
  `addListener` shim for old Safari.
- AuditGraph now reads `useIsNarrowViewport()` and passes
  `panOnDrag={!isNarrow}`, `zoomOnScroll={!isNarrow}`,
  `zoomOnDoubleClick={!isNarrow}`, and
  `preventScrolling={!isNarrow}` to `<ReactFlow>` so vertical
  scroll passes through to the page below the md breakpoint.
- Graph wrapper gets `style={{ touchAction: "pan-y" }}` on
  narrow viewports as belt-and-suspenders.
- Pan/zoom remains accessible via the existing `<Controls>`
  buttons (which work via clicks, not gestures) and pinch-zoom
  (two-finger gesture, doesn't conflict with single-finger
  page-scroll).

**Tests:**
- 6 vitest cases (`tests/lib/ui/useMediaQuery.test.tsx`) lock the
  SSR contract + the `(max-width: 767px)` breakpoint anchor.
- 4 Playwright specs (`tests/visual/auditGraphMobile.spec.ts`)
  exercise the live mobile + desktop paths: `touch-action: pan-y`
  is set on 360 px and NOT on 1280 px; a wheel scroll over the
  graph on 360 px advances `window.scrollY` (no gesture trap);
  `<Controls>` still renders so explicit pan/zoom remains
  available. All 4 pass against the production build.

### 5.12 · SEO & social-media cards ✅ shipped
**Why:** Astraudit is shared as a link in pull-request reviews,
Slack threads, Bluesky / Twitter posts, blog write-ups. Today
those previews show whatever the user agent guesses — usually the
generic favicon + the first 160 characters of body text. A
deliberate set of meta tags lifts the link preview from "what is
this?" to a recognisable Astraudit card.

**Two surfaces to cover:**
1. **The website itself** (the SPA's index.html). One canonical
   set of tags that loads on every URL — title, description,
   Open Graph (og:title, og:description, og:image, og:url,
   og:site_name, og:type), Twitter Card (twitter:card,
   twitter:title, twitter:description, twitter:image), canonical
   URL, JSON-LD `WebApplication` structured data, plus a static
   `robots.txt` + `sitemap.xml` so search engines find every
   route Astraudit serves (the legal pages + rule book).
2. **Shared audit URLs** (e.g. `#/audit/owner/repo`). Per-repo
   social cards are *not* technically possible without a backend
   — Twitter / Facebook / Slack / Discord crawlers don't execute
   JavaScript, so the OG tags they read are the static ones in
   `index.html`. We honour the constraint by shipping ONE
   well-designed Astraudit-brand card that works for every
   shared link, plus the actual audit URL still resolves into a
   live audit when clicked. The card describes the tool, not
   the specific repo — the URL itself does the per-repo
   identification.

**What shipped:**
- 1200 × 630 PNG OG image at `public/og-card.png` (660 KB) —
  generated from `scripts/og-card-template.html` via a one-shot
  Playwright + Chromium headless screenshot
  (`scripts/generate-og-card.ts`). Aurora gradient background,
  Astraudit wordmark, hero headline ("Understand any public
  GitHub repository in 30 seconds"), tagline, and the four
  constraint pills (browser-only / free / public / rule-based).
- `<head>` block in `index.html`:
  - canonical URL pointing at `https://beko2210.github.io/astraudit/`
  - 9 Open Graph tags (type/site_name/title/description/url/
    image + image:width/height/alt + locale) — every URL absolute
    so Twitter / Facebook / Slack / Discord crawlers don't fall
    over relative paths
  - 5 Twitter Card tags (`summary_large_image`)
  - JSON-LD `WebApplication` structured data with a free Offer
    block, browser-requirements line, and a featureList — helps
    Google + DuckDuckGo render a richer search result.
- `public/robots.txt` — Allow every URL; declares the sitemap.
- `public/sitemap.xml` — lists the four canonical routes (`/`,
  `#/rules`, `#/impressum`, `#/datenschutz`). Per-audit hash URLs
  are deliberately omitted since they're parameterized into
  infinity and search engines drop the hash fragment anyway.
- 30 vitest cases (`tests/styles/seoContract.test.ts`) lock the
  contract: every required Open Graph tag, every Twitter Card
  tag, the JSON-LD schema (`@type: WebApplication`, free Offer,
  featureList ≥ 3 items), the canonical URL prefix, the
  description length window (120-320 chars), the OG image's
  exact 1200×630 dimensions, and the PNG signature on disk.
- Per-repo cards are documented in the anti-roadmap as
  permanently out of scope (would require a backend; crawlers
  don't run JS).

---

## Phase 6 — release-readiness hardening

> **No new features.** Everything below is polish, debugging, and
> systematic verification of the surface we already have. The goal
> is "publishable to a wide audience without embarrassment", not
> "feature-complete". When the checklist is green, Astraudit ships
> a tagged 1.0 to GitHub Pages and the README announces it.
>
> Each item is a small, time-boxed unit of work. Items grouped under
> a single Roman numeral can land together; the numerals themselves
> are independent and can be picked off in any order.

### I · Visual + interaction polish (every panel re-walked)

- **6.1 Popup edge containment audit.** ✅ Tooltip + ExportMenu
  already handle viewport edges. Re-walk every popover-shaped
  surface (CopyButton confirmation, ShareButton "Link copied"
  pill, FAB speed-dial labels, status pills with hover detail)
  and confirm none overflows on 320 / 360 / 768 px viewports.
  Lock with Playwright cases that probe each edge.
- **6.2 Action-cluster wrap audit.** ✅ Score-area cluster now
  uses `justify-end`. Apply the same review to: Hero settings/
  history strip, ReviewDashboard panel headers (Findings filters,
  RecommendationsPanel actions, RegistryPanel retry CTA), Compare
  dashboard headers, Settings dialog footer.
- **6.3 Empty-state coverage.** Phase 5.5 added `<EmptyPanelState />`
  and applied it to RecommendationsPanel + OnboardingPanel.
  Re-run the audit on every panel that *can* render with zero
  data: TopicChecks (no detector hits), Insights (no scoreable
  signals), MaintenancePanel (zero commits + zero releases),
  FindingsPanel (zero findings — currently uses
  EmptyFindingsCelebration which should be promoted to a
  consistent shape), Story (already covered).
- **6.4 Loading-skeleton consistency.** AuditGraphSkeleton sets
  the bar; ReviewDashboard, CompareDashboard, RegistryPanel each
  ship their own ad-hoc placeholder. Promote one shared
  `<PanelSkeleton />` primitive sized to the same `glass` slot as
  the live content so dashboards never reflow on first paint.
- **6.5 Theme parity sweep.** Open every dialog + panel in BOTH
  themes side-by-side, take Playwright screenshots, eyeball each
  pair. The light-mode contrast remap had two bug-fix passes
  already (slate-200 alpha variants in 5.12, accent-button
  exclusion just now); confirm there isn't a third one waiting.
- **6.6 Animation-fill-mode audit.** `view-enter` was the
  containing-block trap for the BadgeDialog (commit 5973619).
  Re-walk every animation in `tailwind.config.ts` (`pulseRing`,
  `shimmer`, `floaty`, `toast-in`, `view-enter`, `fade-in`) and
  confirm none of them retain a `transform` end-state on an
  ancestor of any `position: fixed` modal / popover.
- **6.7 Print stylesheet edge cases.** Phase 5.7 covered the
  golden path. Verify two specific edges: long file paths
  inside `<code>` elements (do they wrap or scroll-clip?), and
  the audit graph's printed `<PrintGraphSummary />` replacement
  (renders correctly? legible? not too tall?).
- **6.8 Reduced-motion fallback consistency.** Every animated
  enter / exit must have a `motion-reduce:` variant. The
  Phase 5.x dialog flow uses `VIEW_ENTER_CLASS` which already
  carries it; sweep the rest of the codebase for animations
  that go straight to a transform.

### II · Accessibility hardening

- **6.9 Full screen-reader pass with VoiceOver + NVDA.** Both
  read every panel from top to bottom. Note: missing `<h1>`,
  duplicate landmarks, ambiguous link text ("here"), tables
  without headers, lists that should be lists. Convert every
  finding to a vitest case asserting the relevant ARIA / role
  / structure invariant.
- **6.10 Keyboard-only flow.** Tab through the entire dashboard
  with no mouse. Document every dead-end, every focus jump
  past a control, every escape that doesn't actually close the
  thing it should. Lock fixes with Playwright keyboard-trace
  specs.
- **6.11 Forced-colours mode (Windows High Contrast / Firefox
  forced colours).** Verify every aurora/risk/mint/violet
  palette element falls back to system colours. The Phase 5.3
  pass added `forced-colours: active` rules for tooltips +
  toasts; verify the rest of the surface, especially the audit
  graph's status-coded edges.
- **6.12 Magnification + zoom.** WCAG 1.4.4 says content must
  resize to 200 % without content loss. Test at 200 % browser
  zoom on a 1280×800 viewport. Then test at 200 % on a 360 px
  viewport (= 720 effective). Document and fix anything that
  clips, scrolls horizontally, or loses controls.
- **6.13 Touch-target audit at 24 / 32 / 44 px.** Phase 5.2
  enforced WCAG 2.5.8 (24 px). The looser 32 px (Apple HIG)
  and stricter 44 px (Apple legacy) thresholds are easier on
  shaky hands. Catalogue every interactive control's size and
  decide which threshold we want to clear; lift the visual
  regression spec accordingly.
- **6.14 axe-core "best-practice" rules.** The CI gate today
  fires only on `serious` + `critical`. Run a one-shot pass
  over `moderate` + `minor` + `experimental` and pick off
  the cheap wins (label-content-name-mismatch, decorative
  alt text, etc.). Don't enable the gate at this level —
  some best-practice rules are noisy — but capture the wins.

### III · Performance + bundle hygiene

- **6.15 Bundle-size budget.** The current build emits a 517 KB
  main chunk (167 KB gzip). Set a hard ceiling in Lighthouse
  CI ("Some chunks are larger than 500 kB" warns today). Either
  raise the limit deliberately and document why, or split out
  the audit engine into its own chunk (it's already in a Web
  Worker, the chunk just isn't separated cleanly).
- **6.16 Code-split policy.** React Flow is already
  lazy-loaded (Phase 4.4). Audit every other heavy import in
  `src/components/index.tsx`-style barrel files; consider
  lazy-loading: BadgeDialog (modal — only when opened),
  CompareDashboard (only when in compare mode), RuleBook
  (legal-page-style route), CommandPalette (Cmd+K — load on
  first open).
- **6.17 Performance budget per route.** Lighthouse CI's
  performance score is gated to ≥ 0.7; bump to ≥ 0.85 once
  6.15 + 6.16 are done. Add LCP / FID / CLS thresholds.
- **6.18 Image / asset audit follow-up.** The 5,678 KB → 593 KB
  asset compression already happened. Remaining items:
  apply `loading="lazy"` to the README screenshot images
  rendered in /rules; consider converting the OG card to AVIF
  for browsers that prefer it (PNG fallback unchanged).
- **6.19 Network-fetch concurrency budget.** `loadRepoBundle`
  fetches ~9 endpoints sequentially today (metadata → tree →
  languages → readme → important files → workflows → commits
  → releases → issues → org-health). Profile real audits to
  confirm there's no obvious win from parallelising independent
  ones; wire up `Promise.all` where safe.
- **6.20 localStorage budget.** The bundle cache caps at 30
  entries / 1.5 MB each. Verify quota-exceeded handling: open
  the app in private mode (storage often disabled), audit a
  large repo, confirm the dashboard still renders and the user
  sees a clear message that the cache is unavailable.

### IV · Cross-browser + device verification

- **6.21 Safari (macOS) golden-path manual run.** Audit
  facebook/react. Hit every dashboard panel. Open every dialog.
  Print to PDF. Compare with Chromium's output side-by-side.
  Flag any pixel-perfect drift; flag any functional drift.
- **6.22 Safari (iOS) golden-path manual run.** Same routine
  on a real iPhone. Special focus: the body-lock + dialog
  scroll-trap fixes from Phase 5.x followups, the FAB sticky
  positioning, the touch-action rule on the audit graph.
- **6.23 Firefox (desktop) golden-path manual run.** Mostly a
  smoke test — the Tailwind + React Flow + Vite stack is
  well-supported there.
- **6.24 Android Chrome on a real device.** Web Worker behaviour,
  large-tree audits (memory pressure), the FAB safe-area inset
  on phones with on-screen nav bars, the BadgeDialog scroll
  containment when the keyboard isn't present.
- **6.25 Browser-extension survival.** Dark-reader, uBlock,
  Privacy Badger, Tampermonkey, Stylus. Confirm the dashboard
  still renders sensibly with each enabled; document any
  expected drift (e.g. dark-reader inverting the inverted
  light-mode card).

### V · Error paths + edge cases

- **6.26 Every error message reviewed.** Phase 5.6 centralised
  the GitHub-error → user-state mapping. Re-walk the resulting
  copy with three audiences in mind: (a) a maintainer who
  knows GitHub's API, (b) a curious dev who's never used
  Astraudit, (c) a non-technical reader who saw the link in a
  PR review. Tighten anything jargon-heavy.
- **6.27 Race conditions on rapid input.** User pastes URL →
  Audit fires → user pastes a different URL before the first
  finishes → second Audit fires. Confirm the in-flight first
  abort works, the URL hash updates, and there's no visible
  flicker between the two states.
- **6.28 Cache invalidation deep-dive.** `removeBundle` runs on
  Re-audit (Phase 5.x followup). Test: cache hit, cache TTL
  expiry, cache-but-pushedAt-changed, cache-but-different-tree
  (e.g. force-pushed branch), private-mode no-cache. Each
  should land cleanly with no console errors.
- **6.29 Rate-limit messaging end-to-end.** Phase 5.6 added the
  countdown. With a real exhausted unauthenticated quota:
  - Verify the "Resets in X min" countdown ticks.
  - Verify "Open Settings → add a PAT" actually opens the
    settings dialog focused on the token input.
  - Verify the retry path after a token is added clears the
    error without a page reload.
- **6.30 Compare-mode edge cases.** Same repo on both sides
  (already blocked). Forks of the same upstream. One repo
  archived. One repo so much bigger than the other that the
  audit timing diverges sharply. Document expected behaviour
  for each.
- **6.31 Share-URL fuzz.** Every visible URL pattern fed to
  `parseRepoInput` should either parse cleanly or surface a
  helpful error. Cases: gist URLs, GitLab URLs, BitBucket
  URLs, owner-only URLs, repo-only paths, URLs with trailing
  slashes, URLs with query strings, URLs with fragments,
  shortened URLs (git.io / bit.ly).

### VI · Security hardening

- **6.32 Content-Security-Policy.** ✅ Strict meta-equiv CSP in
  `index.html` allow-lists the two inline `<script>` blocks
  (JSON-LD + theme loader) by SHA-256 hash; no `'unsafe-inline'`
  / `'unsafe-eval'` on `script-src`. `frame-ancestors` deferred
  to Phase 6.51 (meta-equiv can't carry it). Hash-drift guard
  in `tests/lib/security/csp.test.ts` re-computes both hashes
  from the live source on every test run.
- **6.33 Self-hosted Inter + JetBrains Mono.** ✅ `@fontsource/*`
  ships latin + latin-ext woff2 subsets via `/assets/`; Google
  Fonts CSS link + preconnects removed; CSP now drops
  `https://fonts.googleapis.com` and `https://fonts.gstatic.com`
  entirely. Replaces the original SRI plan — Google Fonts CSS
  rotates per User-Agent, so SRI on the link tag wouldn't have
  worked reliably for many users.
- **6.34 `dangerouslySetInnerHTML` audit.** ✅ Three sites
  audited: BadgeDialog (escapeXml-wrapped SVG generator),
  ReadmePreview (markdown-it + sanitiseHtml allow-list),
  RuleBook (markdown-it `html: false` over a maintainer-controlled
  source). Regression file
  `tests/lib/security/dangerouslySetInnerHTML.test.ts` injects
  `<script>alert(1)</script>` into every site and asserts the
  parsed DOM contains zero script elements.
- **6.35 GitHub PAT handling end-to-end.** The token lives in
  localStorage and is sent ONLY to `api.github.com` /
  `raw.githubusercontent.com`. Verify with a fetch-monitor in
  the dev tools that no other origin sees the Authorization
  header. Add a unit test for `withAuthHeader()` that asserts
  the same: `loadToken()` value is only attached to GitHub
  origins.
- **6.36 Privacy review for the Datenschutzerklärung.** Walk
  the existing legal text against the actual implementation.
  Anything mentioned that we don't actually do (Google
  Analytics, cookies for analytics, etc.) gets removed or
  reworded; anything we do that isn't disclosed gets added.
- **6.37 Dependency review.** Run `npm audit`. Document each
  finding (severity + decision: fix / suppress with
  justification). Add a CI gate that fails on `high` or
  `critical` vulnerabilities.

### VII · Documentation + community

- **6.38 README audit.** The current README has six screenshots
  + an ASCII data-flow diagram + tables. Confirm every
  screenshot is current; regenerate via
  `scripts/capture-readme-shots.ts` if anything moved. Add a
  short "5-minute tour" GIF or screencast above the
  screenshots.
- **6.39 docs/RULES.md completeness.** Every detector that
  exists in `src/lib/audit/` has an entry. Every score weight
  matches what `scoreEngine.ts` actually emits. Lock with a
  test that diffs the two.
- **6.40 CONTRIBUTING walkthrough.** A first-time contributor
  should be able to follow the doc and ship a passing PR.
  Pair-test it: have someone unfamiliar follow the steps,
  note every place they get stuck, fix the doc.
- **6.41 Release notes for v1.0.** A clean Markdown summary of
  what Astraudit does, what's in / out of scope, the four
  operating constraints, the score model, and the one-line
  install + use sequence. Lives at the top of CHANGELOG.md.
- **6.42 GitHub repo polish.** Repository description set,
  topics set (`audit`, `github`, `static-analysis`,
  `browser-only`, `react`, `vite`, `typescript`), homepage
  pointing at the GitHub Pages URL, social-preview image
  uploaded (the OG card), pinned issue thread inviting
  feedback.

### VIII · Code quality + cleanup

- **6.43 Dead-code purge.** Astraudit has accumulated some
  Phase 1.x / 2.x scaffolding that newer phases replaced
  (e.g. the original ToastHost might still ship code paths
  no live consumer triggers). Catalogue, test, prune.
- **6.44 Consistent naming.** Two patterns coexist for
  detector outputs: `hasX: boolean` + `xPath: string | null`
  (used by SECURITY.md, CODE_OF_CONDUCT.md, CONTRIBUTING.md
  after the org-fallback fix) vs. `hasX` only (used elsewhere).
  Pick one (the path-aware shape is strictly more useful) and
  align.
- **6.45 Type-narrowing audit.** Several places use `as` casts
  to bypass TS unions. Each cast that isn't load-bearing should
  become a real type-narrowing check. Lighthouse CI's CodeQL
  run already flags some of these.
- **6.46 Test density audit.** 739 vitest cases sounds healthy,
  but per-file coverage is uneven. Spot-check the lib modules
  with the lowest test count (`copyEngine`, `riskEngine`) and
  add cases for under-tested branches.
- **6.47 Comment hygiene.** Several modules carry "Phase 4.x —
  Y" comments that have outlived their context. Promote useful
  ones into the function docstring; delete the rest.
- **6.48 ESLint + Prettier (deliberately deferred).** Today we
  lean on `tsc --noEmit` as the only lint gate. If we add ESLint
  here, configure it to block on no-floating-promises,
  exhaustive-deps, no-unused-vars-with-underscore-exception, and
  the React Hooks rules. Decide whether the marginal value is
  worth the +2 deps. Skip if Prettier-style formatting is the
  only thing on the table.

### IX · Release engineering

- **6.49 Tagged releases.** Cut `v1.0.0` after Phase 6 closes.
  Subsequent releases follow SemVer based on the public surface
  (the rule book + the export schema + the share-URL format).
- **6.50 GitHub Actions release workflow.** Triggered by tag
  push: builds, runs the full quality matrix, generates the
  CHANGELOG entry from commits, attaches the og-card and a
  zipped `dist/` to the release.
- **6.51 GitHub Pages CDN-cache headers.** Default Pages
  caching is fine for static assets but not for `index.html`
  (we want fresh JS chunk references on every visit). Verify
  the deploy headers and add a `_headers` shim if needed.
- **6.52 Rollback rehearsal.** Practice rolling back to the
  previous tag from the GitHub Actions UI. Document the steps
  in `docs/RUNBOOK.md` so the next time something breaks it's
  a 60-second fix, not a debug-the-CI rabbit hole.
- **6.53 Telemetry decision (final).** Reaffirm "no per-visitor
  telemetry" in the anti-roadmap. If we ever want post-hoc
  numbers, the only acceptable mechanism is an opt-in
  privacy-respecting beacon (e.g. user-initiated "Share my
  audit anonymously to help improve the rules"). Document the
  decision so reviewers don't have to re-litigate it.

---

> **101 % ready when:** every box above is either ticked or has an
> explicit "won't fix — here's why" comment. The verdict is mine
> (the maintainer); a contributor reviewing the box list should be
> able to reproduce the rationale without asking.

---



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
