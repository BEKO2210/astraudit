<!--
Thanks for opening a PR! A few seconds spent here saves the
maintainer five minutes of follow-up. The full contributor guide
is in CONTRIBUTING.md.
-->

## What this PR does

<!-- One sentence. The "why" goes below. -->

## Why

<!-- Link the issue / roadmap item this addresses. If there isn't
     one, justify the change. -->

Closes #

## How to verify

<!-- Bullet list of manual or scripted checks a reviewer can run
     to convince themselves the change works. Example:

     - npx vitest run tests/lib/audit/foo.test.ts
     - Open the dashboard, audit `expressjs/express`, click the
       SECURITY card and confirm it now says "inherited from
       expressjs/.github". -->

## Constraint check (matches the four operating constraints)

- [ ] **Browser-only** — no backend / serverless / database added.
- [ ] **Free forever** — no paid API / vendor introduced.
- [ ] **Public repos only** — no OAuth / private-repo path.
- [ ] **Rule-based** — no AI / LLM inference added to detectors.

If any box stays unchecked, this PR likely needs to be redesigned.
The anti-roadmap in `ROADMAP.md` lists what is permanently out
of scope.

## CI gates

- [ ] `npx tsc -b --noEmit` — clean.
- [ ] `npx vitest run` — all tests pass.
- [ ] `npx playwright test` — visual + a11y specs pass (or
      baseline updated and reviewed).
- [ ] If a detector changed, fixture tests cover the new branches.
- [ ] If user-visible copy changed, the rule book
      (`docs/RULES.md`) is updated.

## Screenshots / before-and-after

<!-- For UI changes. Mobile + desktop, light + dark, if relevant.
     The repo's own screenshots live in docs/readme/. -->
