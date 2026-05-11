# Releasing Astraudit

One-page maintainer walkthrough. Cutting a release is three commands
plus a CHANGELOG polish; the workflow does the rest. Don't have a PC
handy? Jump to ["Cutting a release from your phone"](#cutting-a-release-from-your-phone)
— same outcome via the GitHub mobile app or any browser.

## TL;DR (cutting v1.0.0 from a terminal)

```sh
# 1. Make sure main is green and you're on it.
git checkout main
git pull origin main

# 2. The 1.0.0 CHANGELOG section is already curated. Just verify
#    `package.json` is at 1.0.0:
grep '"version"' package.json     # → "version": "1.0.0",

# 3. Tag + push. That's it.
git tag v1.0.0
git push origin v1.0.0
```

## Cutting a release from your phone

You don't need a terminal — the GitHub web UI / mobile app can do
everything. The trick: GitHub's "Draft a new release" page creates
the tag for you, which fires the same `release.yml` workflow as a
`git push origin v1.0.0`.

1. Open
   **[github.com/BEKO2210/astraudit/releases/new](https://github.com/BEKO2210/astraudit/releases/new)**
   in your phone's browser, or in the GitHub mobile app tap your
   repo → **Releases** → **Draft a new release**.
2. In the **"Choose a tag"** dropdown, type `v1.0.0`. GitHub will
   offer **"Create new tag: v1.0.0 on publish"** — tap it.
3. Leave the **Title** field blank (it'll default to `v1.0.0`), and
   the **Description** field empty too — `release.yml` will fill the
   body in automatically with the curated CHANGELOG section once it
   runs. (You can type a one-word placeholder like `building…` so the
   page isn't blank during the ~5 min build window.)
4. Tap **Publish release** at the bottom.

That's it. GitHub creates the tag, the `release.yml` workflow fires,
and ~5 minutes later the release page shows the curated body
(logo + highlights + install + verification footer) with
`astraudit-dist.zip` and `og-card.png` attached.

> If you want to confirm the workflow is running, open the **Actions**
> tab on the repo. You should see a `Release (Phase 6.50)` run in
> progress against the new tag.

The tag push fires `.github/workflows/release.yml`:

1. Re-runs typecheck, vitest, build, `check:bundle-size`, `check:audit`.
2. Builds `dist/`, zips it to `astraudit-dist.zip`.
3. Computes `astraudit-dist.zip` SHA-256 and embeds it in the body.
4. Extracts the curated `## [1.0.0]` section from `CHANGELOG.md` and
   uses it as the GitHub Release body (with a verification footer
   appended automatically).
5. Creates the release page with `astraudit-dist.zip` and
   `og-card.png` attached.

After the workflow finishes (~5 min), the release is live at
[releases/v1.0.0](https://github.com/BEKO2210/astraudit/releases/tag/v1.0.0).

---

## Subsequent releases (1.0.1, 1.1.0, …)

For releases after v1.0.0, the prep script handles the boring parts:

```sh
# 1. From a clean main, bump + roll the CHANGELOG.
npm run release:prep -- 1.0.1
#   • bumps package.json + package-lock.json
#   • renames `## [Unreleased]` → `## [1.0.1] — <today>`
#   • prepends a new empty `## [Unreleased]` block above it

# 2. Polish the new section's body (the prep script leaves it
#    near-empty — write a paragraph or two of release notes).
$EDITOR CHANGELOG.md

# 3. Commit, tag, push.
git add package.json package-lock.json CHANGELOG.md
git commit -m "Release v1.0.1"
git tag v1.0.1
git push origin main v1.0.1
```

For a **dry run** (preview the changes without writing anything):

```sh
npm run release:prep -- 1.0.1 --dry-run
```

---

## What the release body looks like

The GitHub Release body is whatever the curated `## [VERSION]` section
in `CHANGELOG.md` says, plus an auto-appended **Verification** footer:

```markdown
### Verification

- `astraudit-dist.zip` SHA-256: `<computed-at-build-time>`
- Built by [`release.yml` @ run #1234](https://…)
- Constraint contract: [ROADMAP.md → anti-roadmap](https://…)
```

If you forget to curate a section for the tag, the workflow falls
back to auto-generated bullets from merged PR titles since the
previous tag. That works for patch releases; for major / minor
ones, write the section.

---

## Post-release maintainer checklist

After the release page is up, run these one-time settings tweaks
(Phase 6.42 — not automated because they need repo admin):

```sh
gh repo edit BEKO2210/astraudit \
  --description "Map, score, and understand any public GitHub repository — entirely in your browser." \
  --homepage    "https://beko2210.github.io/astraudit/" \
  --add-topic   audit \
  --add-topic   github \
  --add-topic   static-analysis \
  --add-topic   browser-only \
  --add-topic   react \
  --add-topic   vite \
  --add-topic   typescript
```

Then in the GitHub UI:

1. **Settings → General → Social preview** — upload
   `public/og-card.png`.
2. **Issues → New** — open a "Feedback welcome" issue + pin it.
3. **Insights → Community Standards** — verify the checklist is
   green (README, LICENSE, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY,
   issue + PR templates).

---

## Publishing `astraudit-mcp` to npm

The MCP server is a separate package. The `release.yml` workflow
deliberately does NOT publish to npm — a CI compromise should not
be able to push a malicious version. The maintainer publishes from
a trusted machine after the GitHub release is up:

```sh
# Build the bin/ entry point first.
npm run build:bin

# Publish.
npm publish --access public
```

For prereleases (`1.0.0-rc.1`, etc.), use `--tag next` so users on
`npm install astraudit-mcp` keep getting the stable release until
the rc is promoted.

---

## Rolling back

See [`RUNBOOK.md`](./RUNBOOK.md) for incident response — broken
deploys, broken npm publishes, CSP regressions, stuck CI runs.
