# Security Policy

Astraudit is a 100% browser-only audit tool for public GitHub
repositories. It deliberately does **not**:

- run a backend, serverless function, or managed database
- accept or transmit user accounts / OAuth tokens
- execute or install any code from the audited repository
- read file *contents* to scan for secret values (it matches
  filenames only)

That dramatically narrows the attack surface, but client-side bugs
can still affect users — for example, an XSS via a manipulated
README, a prototype-pollution vector in a dependency, or a CSV/SVG
formula injection in an exported audit. We take those seriously.

## Supported versions

Astraudit follows trunk development; only the latest commit on
`main` (live at <https://beko2210.github.io/astraudit/>) is
supported. There are no LTS branches.

| Version | Supported          |
| ------- | ------------------ |
| `main` (latest deploy) | ✅ |
| Older deploys / forks  | ❌ |

## Reporting a vulnerability

**Please do NOT open a public GitHub issue for security reports.**

Instead, choose one of:

1. **GitHub Security Advisories** — preferred. Open a [private
   advisory](https://github.com/BEKO2210/astraudit/security/advisories/new).
   GitHub keeps the report private until we publish it.
2. **Email** — write to `security@beko2210.dev` with the subject
   line starting with `[astraudit]`.

Please include:

- A clear description of the issue and the affected surface (UI
  component, lib module, CI workflow, …).
- Reproduction steps — minimal HTML, repo URL, or code snippet
  works best.
- The browser + version you observed it in (we ship for evergreen
  Chromium / Firefox / Safari).
- An estimate of impact (data exposure, defacement, DoS, …) and
  whether you've shared the report elsewhere.
- Optional: a proposed fix or mitigation.

## What to expect

| Step | Time |
| ---- | ---- |
| Acknowledgement | within **48 hours** |
| Triage decision (severity, scope) | within **5 business days** |
| Patch + public advisory | typically within **14 days** of triage |

If we cannot fix the issue, we will say so plainly and document
the constraint in the [anti-roadmap](./ROADMAP.md). We will credit
you in the advisory unless you ask us not to.

## Out of scope

The following are explicitly **not** vulnerabilities for the
purposes of this policy — they are constraints we publish openly:

- Astraudit hits public GitHub rate limits without a token. That
  is by design (see the constraint matrix in the README).
- Audit *findings* are static signals. A clean Astraudit report
  does not certify a project as "safe"; it certifies it passed
  ~70 specific rule-based checks.
- Astraudit does not support private repositories, OAuth flows,
  or LLM-based inference. These are in the
  [anti-roadmap](./ROADMAP.md) and will not change.
- Reports about third-party services Astraudit links to (GitHub,
  the registries) belong to those vendors.

## Scope

The repositories covered by this policy are:

- `BEKO2210/astraudit` — this repository.

Reports about repositories that *use* Astraudit (e.g. a fork) go
to the fork owner, not here.
