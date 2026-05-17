# M2.3 · Publish `astraudit` to npm — release runbook

> **Audience.** The maintainer, manually publishing v1.0.0 (or any
> subsequent tag). Deliberately not automated — see
> [`ROADMAP.md` Phase 6.50](../ROADMAP.md) for why the npm token
> never lives in CI secrets.
>
> **Time to complete.** ~5 min on a machine with Node 20+ and npm
> 10+; ~10 min in a fresh Codespace (the extra time is the
> Codespace boot).
>
> **What you publish.** The package name on npm is **`astraudit`**.
> The runnable command consumers get after `npm install -g
> astraudit` is **`astraudit-mcp`** (defined under `package.json`
> → `bin`). The roadmap shorthand "publish astraudit-mcp@1.0.0"
> refers to that binary.

---

## 0 · Decide where you run it

| Option | Setup | Browser‑only? |
|---|---|---|
| **Your local machine** | Node 20+, npm login already done | No |
| **GitHub Codespaces** | Open the repo in a Codespace from the web UI | Yes |
| **Termux / iSH on a phone** | Possible but painful — npm + 2FA OTP on the same device | Mostly |

The runbook below assumes either of the first two. They use the
exact same commands.

---

## 1 · One‑time prerequisites

```bash
node -v              # → v20.x or newer
npm  -v              # → 10.x or newer

# If not logged in yet (opens a browser tab for OAuth + 2FA prompt):
npm login

# Verify you're the right user
npm whoami           # → BEKO2210 (or whichever account owns the name)
```

**2FA must be enabled** on the npm account (`Settings → Account
→ Two‑factor authentication`). The publish step prompts for an
OTP — that's the security gate Phase 6.50 deliberately keeps in
the human's hand instead of in a CI secret.

---

## 2 · Pre‑flight on a clean tree

```bash
git checkout main
git pull origin main
git status           # must be clean — npm publish refuses on dirty trees
npm ci               # honours package-lock.json exactly
npm run typecheck    # must pass
npm test             # must pass (909 tests, ~6 s)
npm run build:bin    # produces dist-bin/mcp-server.js
ls -lh dist-bin/     # confirm the bundle exists + is reasonably sized
```

If any step fails, **stop**. A published version is permanent — you
can `npm unpublish` within 72 h but only with friction.

---

## 3 · Dry‑run pack — see exactly what would ship

```bash
npm pack --dry-run
```

This prints the tarball contents without uploading. Verify:

- The `package size` line matches roughly what you expect (~50–150 KB).
- `dist-bin/mcp-server.js` is present.
- `src/lib/audit/`, `src/lib/github/`, `src/lib/export/`, `src/types/` are present.
- `README.md`, `LICENSE`, `docs/mcp.md`, `docs/RULES.md` are present.
- **Nothing else.** No `node_modules/`, no `dist/`, no `tests/`, no `public/press/screenshots/`.
- No secrets, env files, or `*.local` files.

The `files` allowlist in `package.json` is what filters; if anything
unexpected appears, fix the allowlist before publishing.

---

## 4 · Verify the version + tag match

```bash
# What version does package.json claim?
node -e "console.log(require('./package.json').version)"

# Latest git tag on main:
git describe --tags --abbrev=0

# Has this version already been published?
npm view astraudit version       # may print "404" — that's fine for the very first publish
```

If `package.json` version differs from the tag you intend to release,
**stop and fix it first** — either bump `package.json` + commit + tag,
or check out the right tag.

---

## 5 · Publish

```bash
npm publish --access public
# → prompts for your 2FA OTP. Enter the 6-digit code from your authenticator.
# → uploads the tarball, registry confirms with a JSON summary.
```

`--access public` is required because the package name has no scope
(it's `astraudit`, not `@beko2210/astraudit`). Without the flag, npm
would refuse on safety grounds for any first publish.

If you see `EOTP` / `OTP required`, paste the code. If you see
`E403 Forbidden`, the package name is taken by someone else; rename
in `package.json` before retrying.

---

## 6 · Verify the publish landed

```bash
npm view astraudit version       # → 1.0.0
npm view astraudit dist-tags     # → { latest: '1.0.0' }
npm view astraudit               # full manifest as the registry sees it

# A 15-second smoke test from an unrelated directory:
cd /tmp
npx astraudit-mcp --help 2>&1 | head -20
```

If the smoke test prints help text, the binary is wired correctly.

---

## 7 · Tag the release on GitHub

```bash
# Only if you haven't already pushed the tag:
git tag -a v1.0.0 -m "v1.0.0 — initial public npm release"
git push origin v1.0.0
```

This triggers `release.yml` which builds + attaches `astraudit-dist.zip`
to the GitHub Release page (separate artifact from the npm tarball).

---

## 8 · Post‑publish housekeeping

- [ ] Tweet / Bluesky / Mastodon: "Astraudit MCP server is live on
      npm — `npx astraudit-mcp` runs the same audit engine the
      website does."
- [ ] Update `docs/mcp.md` if any usage examples changed.
- [ ] Update the README badge row to include `npm version` (optional;
      ships via shields.io).
- [ ] Cross‑link the npm page from `CHANGELOG.md` for this version.
- [ ] Codespace user: **delete the codespace** when done — it cached
      your npm credentials.

---

## 9 · If something goes wrong

**Wrong version published.** You have 72 h to `npm unpublish
astraudit@<version>`. After that, the version is immutable — bump to
the next patch and publish again. The npm registry intentionally
makes published versions hard to retract; it's a feature, not a bug.

**Wrong tarball contents.** Same: unpublish if within 72 h, otherwise
publish a patch with the fix and deprecate the bad version:
`npm deprecate astraudit@<version> "incorrect contents — use <next>"`.

**Hostile takedown / typosquatting.** Open a `support@npmjs.com`
ticket. Rare; not a v1.0.0 concern.

---

## 10 · Quick‑reference command list

```bash
# Pre-flight
git checkout main && git pull
git status
npm ci
npm run typecheck
npm test
npm run build:bin
npm pack --dry-run

# Publish
npm whoami
npm publish --access public

# Verify
npm view astraudit version
npx astraudit-mcp --help

# Tag
git tag -a v1.0.0 -m "v1.0.0 — initial public npm release"
git push origin v1.0.0
```
