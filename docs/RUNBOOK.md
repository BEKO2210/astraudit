# Astraudit operations runbook

Procedures the maintainer needs to know how to do on a bad day.

Astraudit has no backend, no databases, no per-user state on a server.
The blast radius of any incident is therefore narrow: it's either a
broken deploy on GitHub Pages, a broken npm publish of
`astraudit-mcp`, or a stuck CI run. Everything in this runbook is a
60-second-to-five-minute action.

## 1. Roll back a broken deploy

GitHub Pages serves whatever was on `main` at the last successful
`deploy.yml` run. To revert to a known-good state:

1. **Pick the previous good tag.** `gh release list -L 5` shows the
   recent releases. The most recent green one is your target.
2. **Reset main to that tag.** Two safe options, in order of
   preference:

   **Option A — revert commit (preferred).** Keeps history honest.
   ```sh
   git fetch origin
   git checkout main
   git pull origin main
   # Walk back to the bad commit, revert it.
   git revert --no-edit <bad-sha>
   git push origin main
   ```
   The `deploy.yml` workflow re-runs on the push and the site is
   restored in 3–4 minutes.

   **Option B — re-deploy a previous tag.** Use the
   [`Actions → Build and Deploy to GitHub Pages → Run workflow`](https://github.com/BEKO2210/astraudit/actions/workflows/deploy.yml)
   button. In the dialog, set the *Ref* dropdown to the previous
   good tag (e.g. `v1.0.2`) and run. Pages serves that tag's
   `dist/` directly. This bypasses the bad commit on `main`
   without rewriting history.

3. **Verify the rollback.** Hit https://beko2210.github.io/astraudit/
   in a private window. The header should match the previous tag's
   build chunk hash (visible in DevTools → Network → `index-*.js`).
4. **Cut a follow-up tag.** If you used Option A, the new revert
   commit is now `HEAD` of `main`. Tag it as `vX.Y.Z+1` so the
   release page reflects reality and the rollback isn't a mystery
   six months from now.

> If `main` is so broken that `npm test` fails locally, **don't**
> push another commit until the test gate clears. The bad-deploy
> stays live ~10 extra minutes; that's better than a worse one.

## 2. Roll back a broken npm publish (`astraudit-mcp`)

The MCP server ships as a separate npm package. npm publishes are
immutable: you can't overwrite a published version. The recovery
path is to publish the next patch with the fix.

1. Bump `version` in `package.json` (`1.0.3 → 1.0.4`).
2. Land the fix on `main` + tag `vX.Y.Z`.
3. `npm publish` from the maintainer's machine (the GitHub Actions
   release workflow does not currently auto-publish to npm — that's
   a deliberate guard so a CI compromise can't push a malicious
   version).
4. If the bad version was actively dangerous (PAT exfil, malware),
   also run `npm deprecate astraudit-mcp@<bad> "use >= <new>"` so
   downstream installers see a warning.

## 3. CI is stuck / wedged

`.github/workflows/playwright.yml` has the highest historical flake
rate because Playwright spins up Chromium / Firefox / WebKit.
Diagnosis:

- **Browser install timeout.** The workflow caches
  `~/.cache/ms-playwright` keyed on `package-lock.json + -fx6.21`.
  If the cache is stale, the first run after a Playwright bump
  takes 4–6 min instead of 30 s. Wait it out; subsequent runs
  use the cache.
- **`vite preview` didn't bind.** The webServer probe timeout is
  60 s. If the build is slow (rare; usually <8 s), the preview
  step itself may not get its full 60-s window. Re-run from the
  GitHub Actions UI.
- **WebKit segfaulted.** Re-run. Once. If it segfaults twice in
  a row on the same SHA, file an upstream Playwright issue.

If a workflow run won't cancel from the UI:
```sh
gh run cancel <run-id>
gh run rerun  <run-id>     # or --failed to retry only failed jobs
```

## 4. CSP regression bricks the site

The `index.html` Content-Security-Policy is enforced strictly. If a
new inline `<script>` lands without its SHA-256 in the
`script-src` allow-list, the browser blocks it and the page renders
blank.

1. Open DevTools → Console on the broken deploy. You'll see a
   `Refused to execute inline script because …` error with the
   required hash printed.
2. Update `index.html`'s CSP `script-src` to add the new hash.
3. The hash-drift unit test in
   `tests/lib/security/csp.test.ts` will start passing once the
   meta tag matches the actual script body.
4. Push, wait for `deploy.yml`, verify with hard refresh.

## 5. Bundle-size budget blew up

If `npm run check:bundle-size` fails, either:

- **Lazy-load the offender.** Wrap the new heavy component in
  `React.lazy(() => import(...))` + `<Suspense>`. See
  `src/App.tsx` for the existing `CompareDashboard` /
  `CommandPalette` / legal page pattern.
- **Raise the ceiling.** Edit `scripts/check-bundle-size.ts` and
  bump the budget. Leave a comment explaining why; the bump is
  reviewable in the same PR as the offending code.

## 6. Audit a repo from the CLI (no browser)

`scripts/test-audit.ts` runs `loadRepoBundle` + `runAudit` against
a list of well-known public repos and writes the JSON exports
to `dist-audits/`. Use it to sanity-check that the engine still
runs outside the browser before publishing the MCP server:

```sh
npx tsx scripts/test-audit.ts
ls dist-audits/
```

If this command errors but the dashboard works, the bug is in the
Node-side compatibility shim (`tokenStore.loadToken()`, the
`process.env.GITHUB_TOKEN` plumbing in `loadRepoBundle`), not in
the audit engine itself.
