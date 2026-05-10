# Contributing to Astraudit

Thanks for thinking about contributing — and welcome. This document
walks through everything from getting the dev server running to
shipping a new audit rule. It's deliberately concrete: by the end
you'll know exactly which file to edit, which test to write, and
which CI gate has to clear before your PR can land.

## Table of contents

1. [The four operating constraints](#the-four-operating-constraints)
2. [Code of conduct](#code-of-conduct)
3. [Quick start](#quick-start)
4. [Repo layout](#repo-layout)
5. [Adding a new finding-emitting rule](#adding-a-new-finding-emitting-rule)
6. [Adding a new panel detector](#adding-a-new-panel-detector)
7. [Writing tests with the fixture builders](#writing-tests-with-the-fixture-builders)
8. [Running every CI gate locally](#running-every-ci-gate-locally)
9. [Updating the rule book](#updating-the-rule-book)
10. [Pull request workflow](#pull-request-workflow)
11. [Review expectations](#review-expectations)
12. [Reporting security issues](#reporting-security-issues)
13. [Recognition + licence](#recognition--licence)

---

## The four operating constraints

Every contribution must respect these. They are non-negotiable and
predate every roadmap item:

1. **Browser-only.** No backend, no serverless functions, no
   managed databases. The audit runs in the user's browser tab and
   dies with it.
2. **Free, forever.** No paid APIs, no metered services. Every
   data source is either GitHub's public unauthenticated endpoints
   or a free public registry (npm, PyPI, crates.io).
3. **Public repositories only.** The audit cannot — and will never
   — see anything that requires a private credential. Optional
   user-provided GitHub PATs stay in the user's `localStorage` and
   are sent only to GitHub's own hosts.
4. **Rule-based.** No AI, no LLMs, no inference. Every finding has
   a deterministic trigger that can be read in
   [`docs/RULES.md`](./docs/RULES.md) and reproduced by hand.

If a feature you want needs any of these compromised, please file
an issue describing the *user need* — there's almost always a
re-framing that fits the constraints.

---

## Code of conduct

Be respectful, assume good faith, focus on the contribution rather
than the contributor. Astraudit is a small project and we don't
have a separate `CODE_OF_CONDUCT.md` yet — when one ships it'll be
the [Contributor Covenant](https://www.contributor-covenant.org/).
Until then: kindness over snark, evidence over assertion.

---

## Quick start

```bash
git clone https://github.com/<owner>/astraudit
cd astraudit
npm install
npm run dev          # starts Vite on http://localhost:5173/astraudit/
```

Useful scripts:

| Command                     | What it runs                          |
|-----------------------------|---------------------------------------|
| `npm run dev`               | Vite dev server with HMR              |
| `npm run typecheck`         | TypeScript strict project build (no emit) |
| `npm test`                  | Vitest unit suite (~600 tests)        |
| `npm run test:watch`        | Vitest in watch mode                  |
| `npm run test:visual`       | Playwright visual regression          |
| `npm run test:visual:update`| Regenerate Playwright baselines       |
| `npm run build`             | Production build into `dist/`         |
| `npm run preview`           | Serve `dist/` for inspection          |
| `npx playwright test tests/visual/a11y.spec.ts` | axe-core accessibility gate |
| `npx lhci autorun`          | Lighthouse CI score gate              |

You don't need any environment variables to run the unit suite,
the visual suite, or the dev server.

---

## Repo layout

```
src/
├── App.tsx                      # Top-level router + audit state machine
├── main.tsx                     # Vite entry point
├── workers/audit.worker.ts      # Web Worker that runs the audit engine
├── components/                  # All UI
│   ├── legal/                   # Impressum, Datenschutz, RuleBook
│   └── ui/                      # Reusable primitives (Tooltip, …)
├── lib/
│   ├── audit/                   # Detectors + scoring + graph
│   │   ├── auditEngine.ts       # Top-level orchestrator
│   │   ├── insightEngine.ts     # Derived insights for the dashboard
│   │   ├── riskEngine.ts        # Where findings are produced
│   │   ├── scoreEngine.ts       # 0–100 per category + grade
│   │   ├── graphEngine.ts       # Audit graph nodes + edges
│   │   └── *Detector.ts, *Parser.ts  # Individual detectors
│   ├── github/                  # API + raw-content fetchers
│   ├── registries/              # npm + PyPI + crates.io lookups
│   ├── markdown/                # README rendering
│   ├── theme/, history/, …      # localStorage stores
│   └── ui/                      # toast store, transitions, etc.
├── styles/globals.css           # Tailwind layers + tokens
└── types/                       # Shared TypeScript types

docs/RULES.md                    # Public rule book — source of truth
tests/
├── lib/                         # Vitest unit tests (mirrors src/lib/)
├── components/                  # SSR-rendered component tests
├── visual/                      # Playwright snapshots + axe
├── fixtures/builders.ts         # Synthetic RepoBundle builders
└── ...
.github/workflows/
├── deploy.yml                   # Build + push to GitHub Pages
├── visual.yml                   # Playwright visual regression
└── quality.yml                  # Lighthouse + axe gates
playwright.config.ts             # Playwright + visual + axe config
lighthouserc.json                # Score floors (perf 0.7, a11y 0.95, …)
```

---

## Adding a new finding-emitting rule

A *finding* is one entry in the dashboard's Findings panel. It
maps to one of eight scored categories (`documentation`,
`structure`, `quality`, `security`, `maintenance`, `dx`,
`ecosystem`, `ci`) and one of five severities (`critical`, `high`,
`medium`, `low`, `info`).

End-to-end checklist for a new rule:

1. **Pick a stable rule ID.** Use `kebab-case` and prefix with the
   category (`sec-no-license`, `doc-no-readme`, …). The ID is the
   public contract — once it's in `docs/RULES.md` it's frozen.
2. **Decide where the trigger lives.** Most rules fire from
   `src/lib/audit/riskEngine.ts` against signals already produced
   by an existing `*Detector.ts`. Sometimes you'll need a new
   detector; see the next section.
3. **Add the rule body to `riskEngine.ts`.** Open the file and
   follow the surrounding pattern — `if (some condition) findings.push({ … })`
   with `category`, `severity`, `title`, `evidence`, and
   `recommendation`. Keep the title short, the evidence concrete,
   and the recommendation actionable.
4. **Update the score formula** in
   `src/lib/audit/scoreEngine.ts` if the rule should affect the
   category total. Many findings are informational; only deduct
   points when the rule represents a real adopter risk.
5. **Document the rule** in `docs/RULES.md` — under the right
   category heading, with the rule ID, trigger, and severity.
   The rule book test suite asserts every emitted ID is
   documented (so a missing entry will fail CI before you merge).
6. **Write a fixture-based unit test.** See
   [Writing tests with the fixture builders](#writing-tests-with-the-fixture-builders).

### Note on rule IDs

The rule book uses **stable slug IDs** like `doc-no-coc` —
contractual identifiers humans grep for. The runtime `Finding.id`
is a *throwaway* value (`f-coc-3` etc.) generated at audit time by
`riskEngine.ts`'s `id(slug)` helper, where the slug passed in is
the rule book's stem (`"coc"` → rule ID `doc-no-coc`, family-coded
by the category prefix). Slugs are what tests + the rule book
check for; runtime ids are just for the in-memory Finding list.

### Worked example: "no Code of Conduct"

```ts
// src/lib/audit/riskEngine.ts (somewhere alongside the existing
// documentation rules)
if (!ctx.classified.hasFile("CODE_OF_CONDUCT.md", ".github/CODE_OF_CONDUCT.md")) {
  findings.push({
    id: id("coc"),               // generates `f-coc-N`
    title: "No CODE_OF_CONDUCT detected",
    category: "documentation",
    severity: "low",
    description:
      "A Code of Conduct sets expectations for issue + PR participation. Adopters look for one in repos they're considering depending on.",
    evidence: "No `CODE_OF_CONDUCT.md` at the repo root or in `.github/`.",
    recommendation:
      "Drop in the Contributor Covenant template — one file, one minute, sets the expectations.",
    affectedFiles: [],
    confidence: "high",
  });
}
```

The `Finding` type is in `src/types/finding.ts` — every field above
is required. `evidence` is a single string (not an array), and
`affectedFiles` carries any concrete paths the finding refers to
(empty when the rule fires on absence).

Then in `docs/RULES.md`, under `### Documentation`:

```md
| `doc-no-coc` | The repo ships no `CODE_OF_CONDUCT.md` (or `.github/CODE_OF_CONDUCT.md`). | low |
```

The `tests/components/ruleBook.test.tsx` suite asserts every rule
ID listed in this guide's catalog survives in the doc. Add yours
to the test array in the same PR — that's the contract guard:

```ts
// tests/components/ruleBook.test.tsx
for (const id of [
  // ... existing IDs ...
  "doc-no-coc",
]) {
  expect(RULES_MD).toContain(`\`${id}\``);
}
```

Then write the fixture-driven trigger test alongside the existing
detector tests (see the next section).

---

## Adding a new panel detector

Some detectors don't emit findings — they enrich the Insights /
Topic / Registry / License panels with contextual signals
(readability, runtime contract, registry lookups, …). These follow
a slightly different shape:

1. **Create the parser / detector** under `src/lib/audit/`. Keep
   it pure — no DOM, no fetches, no localStorage. Export a single
   `parseX(content: string): X | null` (or
   `analyzeX(signals): XResult`) entry point.
2. **Wire it into `insightEngine.ts`** — pass it whatever
   `RepoBundle` / `ClassifiedFiles` content it needs and stash the
   result on `DerivedInsights`.
3. **Surface in the right panel.** Most non-finding detectors
   render as an extra `<Card>` in `<InsightsPanel>` or as their
   own dedicated panel below it.
4. **Document in `docs/RULES.md`** under "Panel outputs" — input
   format, what's measured, and which UI element shows the result.
5. **Test the parser exhaustively** — happy path, every edge case
   the input format throws at you, plus null/empty input. Aim for
   ≥ 20 cases for a non-trivial parser; the
   `dependabotParser.test.ts` and `licenseClassifier.test.ts`
   files are good models.

---

## Writing tests with the fixture builders

Every detector test in this repo composes a synthetic
`RepoBundle` from `tests/fixtures/builders.ts`. The builders never
hit the network and never read real repos — they synthesise the
shape the audit engine consumes.

The most-used builder is `makeTree(paths)`, which expands a
list of repo-relative paths into a `RepoTree` that includes every
implied parent directory. A second-most-used builder is
`makeImportantFiles({ name: content })` for any file the audit
will read end-to-end (READMEs, `package.json`, etc.).

Minimal test skeleton:

```ts
import { describe, expect, it } from "vitest";
import { classifyFiles } from "../../../src/lib/audit/fileClassifier";
import { analyzeSecurity } from "../../../src/lib/audit/securityDetector";
import { makeImportantFiles, makeTree } from "../../fixtures/builders";

describe("analyzeSecurity", () => {
  it("flags a missing LICENSE", () => {
    const tree = makeTree(["README.md", "src/index.ts"]);
    const importantFiles = makeImportantFiles({ "README.md": "# Hi" });
    const classified = classifyFiles(tree, importantFiles);
    const out = analyzeSecurity(classified);
    expect(out.hasLicense).toBe(false);
  });

  it("recognises LICENSE.md", () => {
    const tree = makeTree(["LICENSE.md", "README.md"]);
    const importantFiles = makeImportantFiles({
      "LICENSE.md": "MIT",
      "README.md": "# Hi",
    });
    const classified = classifyFiles(tree, importantFiles);
    expect(analyzeSecurity(classified).hasLicense).toBe(true);
  });
});
```

Conventions:

- **Mirror the source layout.** A test for
  `src/lib/audit/X.ts` lives at `tests/lib/audit/X.test.ts`.
- **One `describe()` per exported function.** Keeps failures
  scoped.
- **Name tests after the behaviour, not the implementation.**
  `"flags a missing LICENSE"` is good. `"returns false from
  analyzeSecurity"` is not.
- **Cover the null path.** Almost every detector has a code path
  for "the file is absent" — test it explicitly.
- **Favour `it.each([...])` for table-driven cases.** See
  `licenseClassifier.test.ts` for the canonical pattern.

The full suite must stay green:

```bash
npm test
```

CI also runs typecheck + Playwright visual + axe + Lighthouse;
see the next section.

---

## Running every CI gate locally

The same checks that gate a PR can be run on your laptop. Run
them in this order:

```bash
# Strict TypeScript build (matches CI)
npm run typecheck

# Vitest unit suite (~600 tests, < 5 s)
npm test

# Production build (must be clean — no warnings)
npm run build

# Visual regression (Playwright Chromium)
npx playwright test

# Lighthouse score gate (needs Chrome installed)
npx lhci autorun
```

Notes:

- The Playwright + Lighthouse jobs need
  `npx playwright install chromium` (and on root environments,
  `npx playwright install-deps chromium`) the first time.
- If the visual suite fails after a deliberate UI change, run
  `npm run test:visual:update` to regenerate baselines and commit
  the new PNGs alongside the code change.
- The Lighthouse floors are tuned to the current bundle. If your
  change adds JS, run Lighthouse locally before opening the PR —
  CI won't be sympathetic.

---

## Updating the rule book

`docs/RULES.md` is the source of truth that both the GitHub view
and the in-app `#/rules` page render from. The flow:

1. Add or amend an entry in the appropriate section.
2. Run `npx vitest run tests/components/ruleBook.test.tsx` — the
   rule-book test asserts every emitted finding ID survives in
   the doc, so anything you forgot will surface here.
3. Visit `/#/rules` in the dev server to confirm the rendered
   markdown looks reasonable (tables especially).

---

## Pull request workflow

1. **Branch** off `main`. Use a descriptive slug:
   `feat/add-coc-rule`, `fix/codeowners-glob-edge`, etc.
2. **One concern per PR.** A new rule is one PR. A bug fix is one
   PR. A refactor is one PR. Reviewers can approve focused PRs in
   minutes; sprawling ones sit for days.
3. **Commit message style.** First line is an imperative present-
   tense summary under 70 chars (`Ship X`, `Fix Y`, `Refactor Z`).
   Body explains *why*, references the rule ID or roadmap entry,
   and lists what tests / CI gates were run. See the existing
   `git log` for the canonical tone.
4. **Run every gate before pushing.** See above.
5. **Open as a draft** if it's WIP. Mark "Ready for review" once
   you've self-reviewed your own diff.
6. **Pull-request body** lists:
   - **Summary** — 1-3 bullets of what changed.
   - **Test plan** — exactly what you ran (`npm test`,
     `npx playwright test`, etc.) and what you observed.
   - **Roadmap entry** — the section in `ROADMAP.md` this lands
     under, if any.

---

## Review expectations

A reviewer is looking for:

- **Constraint compliance.** Does the change keep the four
  operating constraints intact?
- **Determinism.** Will the rule fire identically on every audit
  of the same repo? No clocks, no random numbers, no API order
  assumptions.
- **No silent failures.** When a parser hits an unfamiliar shape
  it should return `null` — never throw, never log to console.
  The audit must keep running.
- **Tests covering the negative path.** The rule must NOT fire
  when its condition is absent.
- **Rule book entry.** The doc IS the contract; the test enforces
  it.
- **Bundle weight.** The audit ships entirely to the browser. A
  10 KB-gzipped helper that loads on first paint is more expensive
  than it looks. Lazy-load anything that's only used post-audit.
- **Accessibility parity.** The Phase 2.8.7 / 4.2 work paid the
  WCAG bill — every new control must keep that promise (visible
  focus, keyboard activation, correct ARIA, theme parity).

---

## Reporting security issues

Don't open a public issue for a real security problem. Email
`belkis.aslani@gmail.com` with:

- A clear description of the issue.
- A minimal reproduction (link, steps, expected vs actual).
- Whether you'd like to be credited if a fix ships.

We'll respond within 7 days. The Datenschutzerklärung is at
[`/#/datenschutz`](https://github.com/<owner>/astraudit#datenschutz)
for the legal disclosure path.

For Astraudit-the-tool to detect security issues IN OTHER repos,
see the SECURITY-related rules in [`docs/RULES.md`](./docs/RULES.md#security).

---

## Recognition + licence

Astraudit is currently distributed under the project's repository
license — see `LICENSE` (or its absence as flagged by Astraudit
itself, ironically) for terms. Every contributor is acknowledged
in the git history, and substantive contributors get an explicit
shout-out in the relevant ROADMAP entry.

If your contribution moves the audit forward in a meaningful way
— a new detector, a UX run, a CI gate, a rule-book section — add
yourself to the `Acknowledgements` block in the README in the
same PR. (We don't have one yet — feel free to be the person who
adds it.)

---

Welcome aboard. The fastest way to ship your first contribution
is to pick a rule that *almost* exists and make it slightly
better — `sec-suspicious-file`'s pattern list is a friendly
target. Read [`docs/RULES.md`](./docs/RULES.md), pick one, dig in.
