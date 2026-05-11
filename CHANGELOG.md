# Changelog

All notable changes to Astraudit are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The full per-phase build log lives in [`ROADMAP.md`](./ROADMAP.md).

---

## Astraudit at a glance (v1.0 release notes preview · Phase 6.41)

**What it is.** A 100% browser-only auditor for public GitHub repositories.
You paste a URL, Astraudit fetches the public metadata + file tree, runs
~70 deterministic rule-based checks, and renders a 100-point readiness
score across eight categories along with prioritised findings, an
onboarding path, and a printable report.

**What's in scope.** Public repositories. Static analysis of the file
tree, metadata, README/CHANGELOG/LICENSE/CODE-OF-CONDUCT/SECURITY/CI
configs, lockfiles, and optional public-registry lookups (npm / PyPI /
crates.io). Markdown + curated-HTML README preview. Cross-repo
comparison. Local audit history with favourites. JSON / Markdown /
AsciiDoc / PDF export. MCP server for AI clients.

**What's out of scope.** Private repositories. OAuth or any flow that
needs a backend round-trip. Hosted analytics or telemetry. LLM-based
inference — every score is rule-based and reproducible. See the
[anti-roadmap](./ROADMAP.md#anti-roadmap--things-astraudit-will-never-do)
for the full list.

**Four operating constraints (the unchangeable ones).**

1. **Browser-only.** No server-side component. The audit runs entirely
   on the user's machine, hitting the GitHub public API directly.
2. **Free forever.** Hosted via GitHub Pages, distributed via npm; no
   metered services anywhere on the runtime path.
3. **Public repos only.** No PAT scopes beyond `public_repo`. Private
   repositories are deliberately not supported.
4. **Rule-based.** Every finding maps to a documented detector in
   [`docs/RULES.md`](./docs/RULES.md). No AI inference, no surprises.

**Score model (short version).** Eight scored categories (Documentation,
Structure, Code Quality, Security, Maintenance, Developer Experience,
Ecosystem, CI/CD), each with its own `max` weight summing to 100.
Letter grades: **A** 90–100 (adopt with confidence), **B** 75–89,
**C** 60–74, **D** 45–59, **F** below 45. Findings carry an explicit
severity (`critical` / `high` / `medium` / `low` / `info`) and a
category. Same input, same output — every run.

**Use it in 30 seconds.**

```bash
# Browser
open https://beko2210.github.io/astraudit/

# AI client (MCP) — adds astraudit-mcp to Claude Desktop / Cursor / Zed
npx -y astraudit-mcp        # see docs/mcp.md for the per-client config
```

---

## [1.0.0] — 2026-05-11

<div align="center">
  <img src="https://beko2210.github.io/astraudit/Logo_bg_removed.png" alt="Astraudit" width="120" />
  <h3>The first stable release.</h3>
  <p><strong>Map, score, and understand any public GitHub repository — entirely in your browser.</strong></p>
</div>

### What's in v1.0.0

This is the first release where every box in the
[Phase 6 release-readiness roadmap](./ROADMAP.md#phase-6--release-readiness-hardening)
is either ticked or carries an explicit *won't-fix-here's-why* comment.
53 / 53 items closed across nine tracks (visual polish, accessibility,
performance, cross-browser, error paths, security, documentation,
code quality, release engineering).

- **Browser-only audit.** Paste any `github.com/owner/repo` URL → 100-point
  score across 8 categories, prioritised findings, an onboarding path, an
  interactive audit graph, and a printable PDF report. No backend, no
  login, no PAT required (an optional one bumps the GitHub rate limit
  from 60/h to 5,000/h and stays in localStorage).
- **MCP server** (`astraudit-mcp`). Native Model Context Protocol tool
  so Claude Desktop / Cursor / Zed / VS Code AI can call the audit
  engine. One tool, `audit_repo(owner, repo, token?)`, returns the
  curated, versioned JSON (`schema: "astraudit.audit"`,
  `schemaVersion: "1"`). Runs entirely on the user's machine.
- **Strict CSP** locked by hash, **self-hosted fonts** (no third-party
  origins), **0 production-dep vulnerabilities** at high or critical,
  **PAT scope guard** so the Authorization header rides only to
  `api.github.com` / `raw.githubusercontent.com`.
- **WCAG 2.1 AA** locked by CI: 6×3 popover edge-containment cases,
  full Tab-trace name + visibility on every focus stop, 200% zoom
  Reflow at 640×400, single `<main>` landmark, axe-core gate on
  serious/critical, forced-colours snapshot, motion-safe gating on
  every animation.
- **Cross-browser smoke** on Firefox, WebKit, and mobile Chromium
  via Playwright in CI (the snapshot baselines stay Chromium-only).
- **Performance**: 484 KB main chunk (10% smaller than v0.4 / 1.4.0
  thanks to lazy-loading the BadgeDialog, CompareDashboard,
  CommandPalette and the three legal routes); bundle-size budget
  hard-gated in CI; LCP / a11y / best-practices Lighthouse floors
  enforced per build.
- **Comprehensive test suite** — 835 vitest cases across 68 files,
  73 Playwright cases (chromium full + cross-browser smoke).

### Install

```bash
# Browser — nothing to install, just visit:
open https://beko2210.github.io/astraudit/

# AI client (MCP server) — Claude Desktop / Cursor / Zed / VS Code:
npx -y astraudit-mcp     # see docs/mcp.md for the per-client config
```

### Verify

Every release attaches `astraudit-dist.zip` (the built static site) and
`og-card.png` (the social-preview image) to the GitHub Release page.
The maintainer-facing rollback steps are in
[`docs/RUNBOOK.md`](./docs/RUNBOOK.md); the constraint contract is in
[`ROADMAP.md`'s anti-roadmap](./ROADMAP.md#anti-roadmap--things-astraudit-will-never-do).

### Acknowledgements

Astraudit is built and maintained by **Belkis Aslani**. v1.0.0 closes
a multi-phase build documented in [`ROADMAP.md`](./ROADMAP.md). The
per-PR build log lives below under `[Unreleased]` and prior milestone
sections.

---

## [Unreleased]

### Added

- **MCP server** (`bin/mcp-server.ts`, `dist-bin/mcp-server.js`).
  Astraudit now ships a Model Context Protocol server so any
  MCP-compatible AI client (Claude Desktop, Cursor, Zed, VS Code
  AI, Continue, …) can call the audit engine as a native tool.
  One tool — `audit_repo(owner, repo, token?)` — returns the
  curated, versioned JSON the dashboard's "Export → JSON" button
  emits. Runs on the user's own machine; Astraudit hosts no
  infrastructure (the engine still hits the GitHub public API
  directly). New `docs/mcp.md` carries the per-client install
  walkthrough (Claude Desktop / Cursor / Zed / VS Code) plus
  troubleshooting. New `npm run mcp` / `npm run build:bin`
  scripts. New `@modelcontextprotocol/sdk` + `zod` runtime deps;
  `esbuild` devDep for the bundle step. 6 vitest cases cover the
  happy path, NotFoundError + RateLimitError mappings, and the
  token-routing precedence (tool arg overrides
  `process.env.GITHUB_TOKEN`).
- `src/lib/github/index.ts` → `loadRepoBundle(coords, { token })`
  threads a per-call GitHub PAT through `process.env.GITHUB_TOKEN`
  with proper save/restore so concurrent audits stay isolated.
  Browser path unchanged.
- `src/lib/auth/tokenStore.ts` → `loadToken()` now reads
  `process.env.GITHUB_TOKEN` / `GH_TOKEN` when called outside a
  browser. Caching disabled in Node so the MCP server can scope
  a fresh token per request.
- Hero gains a small "AI-ready · MCP" pill linking out to the
  walkthrough. Footer gains a "Use from your AI" link.
- LICENSE (MIT), SECURITY.md, CODE_OF_CONDUCT.md, CHANGELOG.md,
  CODEOWNERS, Dependabot config, CodeQL workflow, GitHub issue +
  PR templates — closes the meta-files gap that Astraudit's own
  detectors flagged when audited against itself.
- Animated `docs/readme/pipeline.svg` — replaces the ASCII data-flow
  diagram in the README with a brand-aligned animated SVG (aurora
  gradients, SMIL particles flowing along the spine, rotating
  worker cog, glowing AuditResult). 720×820 viewBox so it scales
  cleanly to mobile GitHub renders.
- **Phase 6 — release-readiness hardening roadmap** (53 tracked
  items across nine independent tracks: visual polish, a11y,
  performance, cross-browser, error paths, security, docs,
  code-quality, release engineering). No new features — only
  polish, debug, and verification of the surface we already have.

### Fixed

- BadgeDialog invisible on click (`5973619`). Two interacting
  bugs: the Phase 5.x iOS body-lock used `position: fixed` on
  body which made it a Chromium containing block for the
  dialog's `position: fixed` overlay, AND the
  `motion-safe:animate-view-enter` keyframe ended on
  `transform: translateY(0)` (identity matrix, but Chromium
  treats *any* non-`none` transform as a containing block).
  Result: the overlay sized to dashboard-height (~7,000 px)
  and pushed the card thousands of pixels off-screen.
  Fixed both: body lock now uses `overflow: hidden` on
  `<html>` + `<body>` + `touch-action: none` (no
  position-fixed); the view-enter keyframe drops its trailing
  transform and switches `animation-fill-mode: both` →
  `backwards` so the wrapper returns to `transform: none`
  after the 220 ms.
- Tooltip / popup overflow on viewport edges (`ffd7c69`).
  Tooltips now measure their bubble's bounding rect on
  `pointerenter` / `focusin`, set `data-tt-align` on the
  wrapper, and CSS pins the bubble to the closer edge instead
  of overflowing.
- Score-area action-cluster wrap (`ffd7c69`). `justify-end` so
  wrapped second-row buttons (Copy verdict / Export / Print)
  right-align consistently with the first row, instead of
  flowing flush-left at the start of the right-aligned block.
- White-on-accent buttons unreadable in light mode
  (`2770103`). Light-theme `.text-white` remap is now scoped
  with `:not([class*="bg-gradient"]):not([class*="bg-aurora-"])
  :not([class*="bg-risk-"])` so accent buttons keep their
  white text. Hero / card heading contrast unchanged.
- Badge dialog popup unscrollable + background scrolls
  (`8329224`). iOS Safari overflow-hidden bypass: `[role="dialog"]
  { overscroll-behavior: contain }` plus
  `.bottom-sheet-card { overscroll-behavior: contain }` plus
  the new html+body double-overflow-hidden lock.
- SpeedDialFAB drift + light-mode contrast (`9b7d537`). FAB
  now portals to `document.body` so no ancestor can hijack
  its containing block; `.fab-main-text` + `.fab-mini-default`
  tokens win specificity over the broad theme remap.
- Re-baselined Playwright home snapshots (`9875b0a`) for the
  new logo + hero copy + score-breakdown methodology panel
  + simple-mode toggle button + FAB tokens.

### Closed (Dependabot triage)

- `#36` vite 5.4 → 8.0 — closed pending a planned vite
  major-upgrade pass (3 majors is too big for blind merge).
- `#37` `@vitejs/plugin-react` 4 → 6 — paired with #36.
- `#35` typescript 5.9 → 6.0 — closed pending a planned TS
  major-upgrade pass.

## [1.4.0] — 2026-05-10

### Added

- **Phase 5.12 — SEO + social-media cards.** Open Graph + Twitter
  Card tags, JSON-LD `WebApplication` structured data, a 1200×630
  PNG OG image, `robots.txt`, `sitemap.xml`, and 30 contract tests.
- **Phase 5.10 — audit graph mobile gesture fix.** New
  `useMediaQuery` / `useIsNarrowViewport` hooks; React Flow's
  `panOnDrag` / `zoomOnScroll` / `preventScrolling` are disabled
  below the `md` breakpoint so vertical scroll passes through to
  the page. `touch-action: pan-y` belt-and-suspenders.
- **Phase 5.8 — multi-format export.** Markdown / JSON / AsciiDoc
  serializers + `<ExportMenu />` in the dashboard header.
- **Phase 5.7 — print stylesheet v2.** Page-break hints for the
  Phase 3+ panels, per-card `data-print-card` opt-in, dialog
  hide-rule, ActivityHeatmap grayscale ramp.
- **Phase 5.6 — error & rate-limit messaging.** Centralized
  `mapAuditError(err)` returning a structured `AuditErrorView`;
  rate-limit banner now carries a live "resets in N min"
  countdown plus a context-aware **Open Settings** CTA.
- **Phase 5.5 — empty / loading / error state pass.** New
  `<EmptyPanelState />` primitive; RegistryPanel global error
  banner with retry; OnboardingPanel no longer silently
  `return null`s.
- **Phase 5.5.x — org `.github` community-health fallback.**
  Astraudit now mirrors GitHub's UI by inheriting SECURITY.md /
  CODE_OF_CONDUCT.md / CONTRIBUTING.md from `{owner}/.github`.
  Live-validated against 53 popular repositories — 14/53 (26%)
  were being mis-classified before the fix (express, eslint,
  webpack, next.js, flask, pandas, numpy, rust, spring-boot,
  elasticsearch, vscode, homebrew, sveltejs, actix).

### Fixed

- Light-mode ghost-text in seven panels (Repo Story, CategoryPanel,
  SecurityPanel, ReviewDashboard, CompareDashboard, ScoreBreakdown,
  PrintGraphSummary): the broad `text-slate-200/<alpha>` token
  was missing a light-theme override.
- SpeedDialFAB light-mode contrast: the `+` icon and the
  default-fallback mini buttons were rendering near-black on dark
  backgrounds. New `.fab-main-text` + `.fab-mini-default` tokens
  win specificity over the broad theme remap.
- SpeedDialFAB sticky positioning: the FAB drifted with the
  content because an ancestor's `transform` / `backdrop-filter`
  was creating a new containing block for `position: fixed`.
  Portaled to `document.body` via `createPortal`.
- Playwright CI webServer timeout (`Timed out waiting 120000ms`):
  build is now its own CI step; the webServer command only spins
  up `vite preview`, with `stdout: "pipe"` so future timeouts are
  diagnosable.

## [1.3.0] — 2026-05-09

### Added

- **Phase 5.4 — Activity heatmap overhaul.** WAI-ARIA grid
  pattern, single-tab-stop with arrow / Home / End / PageUp /
  PageDown navigation, day labels on every viewport, 5-bucket
  legend, polite live region.
- **Phase 5.11 — sticky section-nav light-theme surface fix.**
  Theme-aware `--section-nav-fade` variable; conditional
  edge-fade rendering based on real scroll overflow.
- **Phase 5.9 — aurora badge layout fix.** SVG badge generator
  now accounts for the `/max` suffix width when positioning the
  grade letter.

## [1.2.0] — 2026-05-08

### Added

- **Phase 5.3 — dialog, popup & overlay hardening.** Focus trap,
  focus restore, body-scroll lock, Esc dismissal, stacked-dialog
  open-count.
- **Phase 5.2 — interactive control audit.** WCAG 2.5.8 24px
  target-size review across the whole interactive surface.
- **Phase 5.1 — scroll & focus reset on route changes.**

## [1.1.0] — 2026-05-07

### Added

- **Phase 4.1 — visual regression tests** (Playwright + GH
  Actions, snapshot baselines under `tests/visual/__snapshots__/`).
- **Phase 4.2 — Lighthouse + axe-core CI gates.**
- **Phase 4.3 — audit graph improvements** (status filter chips,
  per-status counts, Focus-failing button, edge styling driven
  by target node status).
- **Phase 4.4 — bundle splitting**, lazy-load React Flow.
- **Phase 4.5 — public rule book** (`docs/RULES.md` + in-app
  `#/rules` route).
- **Phase 4.6 — contribution guide** (`CONTRIBUTING.md`).

## [1.0.0] — 2026-05-06

Initial public release.

- Eight scored categories (Documentation, Structure, Code Quality
  Signals, Security & Trust, Maintenance, Developer Experience,
  Ecosystem & Dependencies, CI/CD & Automation), 100-point total.
- ~70 rule-based detectors across the eight categories.
- Interactive React Flow audit graph.
- Repository story (rule-based, no AI inference).
- Findings panel with severity / category filters.
- Onboarding recipe.
- Local-storage 24h cache; share + compare URL hashes.
- Dark + light themes; printable PDF.
- 100% browser-only; deployed to GitHub Pages at
  <https://beko2210.github.io/astraudit/>.

---

[Unreleased]: https://github.com/BEKO2210/astraudit/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/BEKO2210/astraudit/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/BEKO2210/astraudit/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/BEKO2210/astraudit/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/BEKO2210/astraudit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/BEKO2210/astraudit/releases/tag/v1.0.0
