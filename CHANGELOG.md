# Changelog

All notable changes to Astraudit are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The full per-phase build log lives in [`ROADMAP.md`](./ROADMAP.md).

## [Unreleased]

### Added

- LICENSE (MIT), SECURITY.md, CODE_OF_CONDUCT.md, CHANGELOG.md,
  CODEOWNERS, Dependabot config, CodeQL workflow, GitHub issue +
  PR templates — closes the meta-files gap that Astraudit's own
  detectors flagged when audited against itself.

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
