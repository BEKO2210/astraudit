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

### 1.8 · "Copy" buttons everywhere
Every command block, every URL, every finding ID gets a one-click copy
button. Mobile-friendly.

---

## Phase 2 — UX upgrades

### 2.1 · Shareable URL-encoded results
Encode the repo coordinate (and optionally a content hash) into the URL
hash so a link reproduces the same view: `#/audit/owner/repo`. Pure
client-side. No URL shortener, no backend.

### 2.2 · Compare two repositories side-by-side
A second "Compare against…" input. Two score rings, two stories, a diff
of findings ("only in A", "only in B", "shared"). Useful for evaluating
alternatives.

### 2.3 · Light & dark theme toggle
Currently dark only. Add a high-contrast light theme; remember the
choice in `localStorage`.

### 2.4 · Audit history & favorites
Sidebar: last 20 audits, plus favorites. Stored in `localStorage`.
Click a favorite to re-audit immediately (cache-aware).

### 2.5 · Keyboard shortcuts + command palette
`Cmd/Ctrl+K` opens a palette to jump to any section, switch repo, or
toggle theme. Vim-style `g s`, `g f`, `g i` jumps for power users.

### 2.6 · Activity heatmap
Visualize the recent commit dates as a small calendar heatmap. We
already fetch the data — we just don't show it.

### 2.7 · Astraudit badge (SVG)
A maintainer can embed a generated SVG badge in their own README:

```
[![Astraudit](https://beko2210.github.io/astraudit/badge.svg?owner=foo&repo=bar&score=78&grade=Strong)](https://...)
```

Trade-off honest: since we have no backend, the badge values come from
URL parameters. Maintainers regenerate the badge whenever they want to
publish a new score. Fully free, fully static, never lies because the
maintainer signs off on every value.

### 2.8 · Mobile polish round 2
- Bottom-anchored "jump to next section" FAB on small screens.
- Swipeable score / story / findings cards on phones.
- Better one-handed reach: keep primary actions in the bottom 2/3 of the
  viewport.

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
