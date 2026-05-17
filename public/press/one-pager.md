# Astraudit · One‑Pager

> **Map, score and understand any public GitHub repository — entirely
> in your browser.** No backend, no signup, no AI inference, MIT.

**Live · https://beko2210.github.io/astraudit/ ·
Source · https://github.com/BEKO2210/astraudit**

---

## The pitch in one sentence

A free, deterministic, browser‑only health‑check for public GitHub
repositories that produces a 100‑point score, an interactive audit
graph, prioritised next steps, and a printable report — without
sending your repository data, your API token, or your browsing
behaviour anywhere.

## Why now

The static‑analysis space is bifurcated. Enterprise tools
(Snyk, SonarCloud, DeepSource) require accounts, often pricing
plans, and route repo data through their servers. Drive‑by AI tools
hallucinate. **Astraudit picks the third option:** seventy
documented rule‑based detectors, audited in CI against fifty‑six
curated cross‑stack repos so a regression in audit honesty blocks
merge.

## Three key facts a reviewer can cite

1. **Zero backend.** The entire audit runs in a Web Worker on the
   visitor's machine. Hosted as a static bundle on GitHub Pages.
2. **Eight scored categories, ~70 detectors.** Documentation,
   Structure, Code‑Quality, Security & Trust, Maintenance, DX,
   Ecosystem, CI/CD. Full per‑detector contract in
   [`docs/RULES.md`](https://github.com/BEKO2210/astraudit/blob/main/docs/RULES.md).
3. **Stack‑aware.** Post‑Phase‑7‑Track‑0, the audit no longer
   complains about JS‑only files on Go, Rust, Python or Ruby
   projects, no longer ignores GitHub Wikis, and surfaces an
   honest "unknown" verdict on branch‑protection when the public
   API doesn't expose it.

## Three real use cases

- **OSS maintainer audit.** Paste your repo's URL, learn what a
  drive‑by contributor sees in the first ten seconds. Get a
  shareable badge for the README.
- **Pre‑adoption due diligence.** Vetting an unfamiliar dependency?
  Run it through Astraudit, then archive the printed PDF with the
  rest of the procurement record.
- **AI‑agent context.** Drop the [MCP server](https://github.com/BEKO2210/astraudit/blob/main/docs/mcp.md)
  into a Claude / Cursor / IDE workflow and let an agent fetch a
  deterministic repo health signal before recommending forks or
  contributions.

## Anti‑claims (what Astraudit is not)

- ❌ Not a SaaS. There is no platform, no account, no quota.
- ❌ Not an AI tool. Detectors are pure TypeScript.
- ❌ Not a paid product. Free forever; the constraint is part of
  the project's anti‑roadmap.
- ❌ Not a private‑repo solution. Public repos only — a backend
  would be required for anything else.

## What changed in v1.0.0 + Phase 7 Track 0

- Stack‑aware finding gates across JS/TS · Python · Rust · Go ·
  Ruby (no more JS‑only false positives on non‑JS repos).
- Branch‑protection probe with graceful "unknown" verdict.
- Wiki + external‑docs awareness (Read the Docs, Mintlify, GitBook,
  docs.rs, pkg.go.dev).
- Multi‑stack honesty sweep in CI — 56 curated repos, any new
  "lie" blocks merge.
- Public scope page documenting what the audit can and cannot see.

## Asset pack

`/public/press/` in the repository. Logo, OG card, seven panel
screenshots (desktop dark/light + audit graph + export + mobile
dark/light), pipeline diagram, Markdown press release, this
one‑pager. All MIT.

## Contact

GitHub Discussions: https://github.com/BEKO2210/astraudit/discussions
Maintainer: https://github.com/BEKO2210 (DM methods on profile).
