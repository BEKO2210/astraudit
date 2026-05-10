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

#### 2.8.10 · Mobile bottom-sheet dialogs
The existing dialogs (Settings, History, Compare, Badge, Shortcuts,
Command palette) become true **bottom-sheets** on phones — anchored
to the bottom edge, rounded only on top, swipe-friendly height,
better one-handed reach. Auto-resolves to centred modal on `sm:`+.

---

## Phase 3 — Smarter detection (still no AI)

### 3.1 · README readability score
Compute Flesch-Kincaid Grade Level on README content. Lets us say
*"reads at a 12th-grade level"* — a real signal, useful for adopters.

### 3.2 · Parse Dependabot config
Today we just check if `.github/dependabot.yml` exists. Parse it to list
ecosystems covered (npm, github-actions, docker, pip, …) and report
weekly/daily cadence.

### 3.3 · Parse CODEOWNERS for ownership density
Distinct owners count and the % of paths covered. Surface when only a
handful of paths are owned.

### 3.4 · Parse SECURITY.md for a contact channel
Detect whether the policy gives a real reporting target (email,
HackerOne, GitHub Security Advisories). Existence isn't enough.

### 3.5 · Parse `package.json` engines / peerDependencies
Surface declared Node versions; warn when missing. Detect framework
peer-dep mismatches with detected dependencies.

### 3.6 · Parse CHANGELOG release pace
Mean delta between Markdown release headings → adds a real cadence
metric independent of GitHub Releases.

### 3.7 · Topic-driven contextual rules
If repo topic is `cli`, expect a `bin` entry in `package.json`. If
`react-component`, expect a peer dependency. Topics already give us a
huge hint — use it.

### 3.8 · Free public registry lookups
For Node packages, hit the **public** `https://registry.npmjs.org/{name}`
(no auth, no quota): surface latest version, last publish date, weekly
download trend. Same idea for **PyPI** (`https://pypi.org/pypi/{name}/json`)
and **crates.io** if relevant. All free, all unauthenticated, all
public.

### 3.9 · License-aware tone in dependency stories
Categorize the licenses of detected top-level dependencies (best-effort
from public registry data) and warn about copyleft-in-permissive
mixes. No installer ever runs.

---

## Phase 4 — Polish & long-term sustainability

### 4.1 · Visual regression tests
Playwright + a free GitHub Actions workflow that screenshots a known
audit (e.g. our own repo) on each PR. Differences flagged for review.

### 4.2 · Lighthouse + axe gates
CI fails if Lighthouse score drops below 90 or axe reports new
violations. Free OSS-tier integrations.

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
