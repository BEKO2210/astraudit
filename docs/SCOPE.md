# What Astraudit checks (and what it doesn't)

Astraudit is a 100% browser-only auditor. It scans public files +
public GitHub metadata, runs ~70 deterministic rule-based checks,
and reports a 100-point readiness score. This page is the
authoritative description of what's inside that envelope — and what
is deliberately outside it.

If your audit feels noisy or wrong, this page is the first place to
look. Astraudit deliberately produces **honest verdicts within its
scope** rather than confident-sounding guesses outside it.

---

## What Astraudit checks

### Declared dependencies + lockfile presence

Per supported manifest:

- **npm / pnpm / yarn / bun** — `package.json` + a lockfile
  (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`).
- **Cargo (Rust)** — `Cargo.toml` + `Cargo.lock`.
- **Poetry / PDM / uv (Python)** — `pyproject.toml` + a lockfile
  (`poetry.lock`, `pdm.lock`, `uv.lock`).
- **Pipenv (Python)** — `Pipfile` + `Pipfile.lock`.
- **Go modules** — `go.mod` + `go.sum`.
- **Bundler (Ruby)** — `Gemfile` + `Gemfile.lock`.
- **Composer (PHP)** — `composer.json` + `composer.lock`.
- **Swift Package Manager** — `Package.swift` + `Package.resolved`.

The audit reports *presence + parseability*, not version-by-version
CVE coverage. See "what we don't check" below.

### Static, rule-based signals from public files

Astraudit reads + parses these files when present:

- **README** (any case, any extension — the rule book lists the
  patterns).
- **LICENSE / COPYING / COPYRIGHT** (any case).
- **SECURITY.md / CODE_OF_CONDUCT.md / CONTRIBUTING.md** — including
  the GitHub community-health fallback at `{owner}/.github`. A repo
  that inherits these from its org gets credit for them.
- **CHANGELOG.md / History.md / Changes / Releases.md** — and other
  recognised release-log filenames.
- **`.github/workflows/`** — CI configs (any provider GitHub
  recognises).
- **`.github/dependabot.yml` / Renovate config** — dependency
  automation.
- **CODEOWNERS** (in `/CODEOWNERS`, `.github/CODEOWNERS`, or
  `docs/CODEOWNERS`).
- **Issue + PR templates**, **`.editorconfig`**, **language-specific
  config files** (`tsconfig.json`, `pyproject.toml`'s `[tool.*]`,
  `clippy.toml`, …).

### Repository metadata (via GitHub's public API)

Astraudit reads the public REST endpoints unauthenticated by
default (`api.github.com`, `raw.githubusercontent.com`) — same
endpoints anyone can curl. An optional Personal Access Token
bumps the rate limit from 60/hour to 5,000/hour and stays in your
browser's `localStorage`; Astraudit never transmits it to anyone
but GitHub.

Metadata consumed:

- Stars, forks, watcher count, open issue count, open PR count.
- Last-push date, default branch, license SPDX id, primary language.
- Topics, archived flag, fork flag, `has_wiki` flag, license object.
- Topic-detected ecosystem hints (`react`, `cli`, `typescript`, …).

### Optional public-registry metadata

When the repo's manifest declares top-level dependencies, Astraudit
optionally enriches the audit by calling the **free, unauthenticated,
read-only** endpoints of:

- `registry.npmjs.org` (npm)
- `pypi.org` (PyPI)
- `crates.io` (Cargo)

Up to 12 npm + 10 PyPI + 10 crates lookups per audit, cached in
your browser for 24 hours. Documented in the Datenschutzerklärung
§4a. No data is sent to a backend — these are direct browser
fetches to the registries.

### Cross-repo comparison + local history

- Compare two public repos side-by-side; both audits run in your
  browser.
- The last ~30 audits live in your `localStorage` (with timestamps
  + favourites). Audits never leave your machine. Clear them via
  the Settings dialog or your browser's site-data controls.

---

## What Astraudit does NOT check

These are deliberately out of scope. Each carve-out has a clear
reason — usually it's either anti-roadmap (would require a backend),
unobservable from public data (private to repo admins), or better
served by an existing dedicated tool.

### Transitive dependency CVE scanning

Astraudit reads **declared** dependencies + lockfile presence. It
does **not** walk transitive dependencies, query CVE databases, or
report known vulnerabilities by package version.

Run the right tool for that:

| Stack | Command |
| --- | --- |
| npm / pnpm / yarn | `npm audit` |
| Python | `pip-audit` |
| Rust | `cargo audit` |
| Ruby | `bundler audit` |
| Go | `govulncheck ./...` |
| PHP | `composer audit` |

These tools talk to their ecosystem's official vulnerability
database (npm Advisory DB, PyPI Advisory, RustSec, etc.). They're
the right answer; Astraudit isn't.

### Authenticated logic / auth-model review

What an authenticated user is allowed to do, vs what they should
be allowed to do, is the highest-value security review a team can
do before launch — and the one Astraudit is **least able** to do.
The audit reads public files; auth scopes, role checks, signed-URL
expiration, and the per-route permission matrix all live inside
the running application, not in the repo's surface.

For that depth, hire a human reviewer or use a dedicated
authenticated-logic review service.

### Branch protection / required reviews / merge queue

GitHub's `/repos/{owner}/{repo}/branches/{branch}/protection`
endpoint is gated to repo admin tokens. Astraudit runs
unauthenticated (or with the visitor's optional PAT, which usually
isn't an admin scope), so this data is **not observable** from our
position.

When the public surface lacks the data, the audit shows
"**Unknown**" — never a guess. Phase 7.0.3 will surface a
maintainer-facing nudge ("Check Settings → Branches in your repo's
GitHub UI") rather than emit a false-positive "no required reviews"
finding from absence-of-evidence.

### Runtime / dynamic analysis

Astraudit is rule-based and **static** only. It does not:

- Run the repo's tests.
- Execute scripts (lint, build, test).
- Pull docker images, install dependencies, or boot processes.
- Make HTTP requests as the application would.
- Profile bundle sizes (only inspects metadata).

This is by design — the audit must work entirely client-side in
your browser tab, with zero install footprint, in 30 seconds.

### Private repositories

Astraudit is browser-only and the anti-roadmap permanently rules
out private-repo support: it would require server-side token storage,
encrypted secrets, a backend round-trip, and an auth flow — all four
violate the constraint contract.

If your repo is private, install your stack's dedicated tools
locally (`npm audit`, `cargo audit`, …) and run them in CI. That
gives you a deeper audit than Astraudit anyway.

### Wiki / external docs content

Astraudit detects whether the **wiki is enabled** (via
`repo.has_wiki`) and recognises links to known external docs
hosts (Read the Docs, Mintlify, GitBook, docs.rs, pkg.go.dev,
godoc.org, RubyDoc.info, HexDocs, Vercel/Netlify `/docs` paths,
Deno's manual, dedicated `docs.*` subdomains).

What we **don't** do: fetch wiki content (lives in a separate git
repo at `github.com/owner/repo.wiki.git`) or scrape external docs
sites. So when you read "External docs detected at Read the Docs",
that's a **presence** signal — not a quality assessment of the docs
themselves.

### LLM / AI inference

Astraudit is **rule-based**. Every finding maps to a documented
detector in the [rule book](/#/rules). Same input, same output —
every run. No LLM API in the loop, no inferred-by-vibes verdicts,
no hallucinated "industry standard" claims.

This is the constraint that lets us promise the audit is
**reproducible**.

### Per-visitor telemetry

We deliberately ship blind to user counts. No tracking pixels, no
fingerprinting, no analytics SDK. The Datenschutzerklärung §6
codifies this and is not allowed to drift.

---

## If you found a bug

If the audit said something is missing when it isn't, or scored
your repo against the wrong stack's expectations, that's a real
bug we want to fix.

Open an issue against
[BEKO2210/astraudit](https://github.com/BEKO2210/astraudit/issues)
with the repo URL + a quote of the wrong copy. Phase 7's Track 0
exists specifically to close this kind of gap.
