---
title: "Astraudit: a 100% browser-only repo auditor that refuses to phone home"
published: false
description: "How a one-maintainer project ships seventy rule-based detectors, an MCP server for AI clients, and a printable PDF report — without a backend, an AI inference call, or a single user account."
tags: opensource, javascript, react, mcp
canonical_url: https://dev.to/beko2210/astraudit-launch
cover_image: https://beko2210.github.io/astraudit/og-card.png
---

> **Maintainer note.** This article is the cross‑post‑ready draft
> for the M2.4 milestone (`docs/ROADMAP_2026_2027.md` → Monat 2 →
> Launch Track A → 7.3). Publish on dev.to first, set
> `canonical_url` there, then paste the same body into Hashnode
> and Medium. The frontmatter above is dev.to specific; strip it
> for the other platforms. Read once, edit once, post.

---

Drop a `github.com/owner/repo` URL into [Astraudit](https://beko2210.github.io/astraudit/)
and ten seconds later you have a 100‑point health score, an
interactive audit graph, a prioritised list of things to fix, and a
printable PDF report. No account. No tracking. No backend. No AI
inference. The entire detector pipeline runs in a Web Worker inside
your browser, on your machine, against GitHub's public REST API.

I'm publishing v1.0.0 today. This article is the long version of
"why I built this when SonarCloud, DeepSource, Snyk, and a hundred
shiny AI tools already exist". The short version: I wanted a tool I
could trust without trusting anyone else.

## The constraint contract

Astraudit ships under four hard constraints that are encoded in CI
as a non‑negotiable [anti‑roadmap](https://github.com/BEKO2210/astraudit/blob/main/ROADMAP.md#anti-roadmap--things-astraudit-will-never-do):

| Constraint | Practical consequence |
|---|---|
| 🌐 **Browser‑only** | No backend, no serverless, no database. The site is a static bundle on GitHub Pages. Detectors run in a `Web Worker` so the UI stays smooth on a 200K‑file repo. |
| 🆓 **Free forever** | No paid tier. No "team plan". No "starting at $X per seat". Sponsorship and consulting are separate channels that never gate the audit. |
| 📂 **Public repos only** | The unauthenticated GitHub REST API works for every public repo. Private repos would require a server holding tokens; we don't go there. |
| 📐 **Rule‑based** | Every finding maps to a TypeScript detector with a documented contract and a fixture test. No LLM in the loop. No surprise verdicts that vary run‑to‑run. |

A constraint isn't a constraint until breaking it is uncomfortable.
The CI for this repo enforces the contract directly: a PR that
adds a server dep fails the audit gate, a PR that imports an
inference SDK gets caught in code review, and a PR that introduces
a "lie" (a finding the audit claims about a repo that doesn't match
the repo's actual file tree) blocks merge via the
[multi‑stack honesty sweep](https://github.com/BEKO2210/astraudit/blob/main/scripts/honesty-check.ts)
across fifty‑six curated cross‑stack repos.

The contract exists because tools that grow over time tend to grow
*outward* — into adjacent verticals, business models, network
effects — and the original promise gets quietly diluted. Encoding
the contract in CI is how a one‑maintainer project keeps that drift
from sneaking in.

## "Rule‑based, no AI" is a feature, not a limitation

The reflexive 2024–2026 reaction to a static‑analysis tool that
ships without an LLM is "why not?". The reflexive 2026 question
should be the inverse: *what does the LLM actually buy you here?*

For Astraudit specifically, the answer is: nothing that justifies
the tradeoffs.

- **Reproducibility.** A rule says "if `package.json` has `scripts.test`,
  the project has a test runner". Run the audit twice, get the same
  answer twice. Hand the audit to a procurement reviewer; they can
  reproduce it. Reproducibility is the floor of a useful audit, and
  LLM verdicts that drift between runs sit below it.
- **Citability.** Every finding links to the exact rule that fired
  and the bytes that triggered it. When a maintainer disputes a
  finding, the conversation is "look at this line of the rule book"
  — not "the model thinks…". This matters more than it sounds. An
  audit that can't justify itself is an audit that can't be
  improved.
- **Speed.** Seventy detectors against a public repo run in a Web
  Worker in under three seconds on a 2023 laptop. An LLM round‑trip
  per detector would multiply that by 100×, add a network
  dependency, and burn somebody's token budget on every page load.
- **Constraint compatibility.** Browser‑only + LLM means either
  shipping a model in the bundle (no thanks) or calling someone
  else's API (introduces a backend dependency). Neither survives
  the four constraints above.

What LLMs *could* add: better natural‑language summarisation of
findings, smarter "should you trust this dependency" heuristics
based on commit‑message vibes, etc. Those are real wins, and they
all live on the other side of a network boundary. Astraudit's job
is to be a clean, fast, deterministic foundation. Anyone who wants
the LLM layer can pipe Astraudit's structured JSON output into
their model of choice — which, conveniently, is what the MCP server
exists for.

## The MCP server: same audit, AI‑client side

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is
the open standard for letting AI clients spawn external tools. The
2025 wave of MCP servers is mostly thin wrappers around vendor
APIs; Astraudit's takes the opposite approach.

The npm package `astraudit` ships a binary called `astraudit-mcp`
that exposes the **same TypeScript detector pipeline** the website
runs, but speaks MCP over stdio:

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "astraudit": {
      "command": "npx",
      "args": ["-y", "astraudit"]
    }
  }
}
```

After that snippet, an AI agent can ask Astraudit for a structured
audit of any public repo and weave the results into its own
reasoning — *before* it recommends forking, depending on, or
contributing to that repo. The audit comes back as JSON: scored
categories, every finding with its evidence path, the stack
fingerprint, the file tree summary. Deterministic, citable,
reproducible.

The architectural payoff: the audit engine is implemented exactly
once. Browser path and MCP path import the same `src/lib/audit/`
modules, run against the same fixtures, and pass the same 909 unit
tests. Bugs found in either path get fixed in both.

This is the part I'm most proud of. The 2025–2026 default is "we
have an AI integration → we bolt on a server with an LLM in it →
the LLM hallucinates". Astraudit's MCP server runs the deterministic
audit, hands the AI the receipts, and lets the AI decide what to do
with them. The constraint contract holds end to end.

## Architecture in 60 seconds

For the readers who like a peek inside the box:

```
                 ┌─ React 19 + Vite + Tailwind ─┐
github.com/  →   │  Typed fetchers              │  →  AuditResult JSON
owner/repo URL   │  + 24h localStorage cache    │      ↓        ↓        ↓
                 └────────┬─────────────────────┘    Dashboard PDF  MD/JSON/AsciiDoc
                          │
                          ▼
            ┌─ Web Worker ─────────────────────┐
            │  stackDetector → ~70 rule-based │
            │  category detectors → scoreEngine│
            │  → graphEngine → copyEngine     │
            └──────────────────────────────────┘
```

The fetchers (`src/lib/github/`) talk to GitHub's public REST API,
cache responses in `localStorage` for 24 h (so re‑auditing the
same repo is instant), and hand a typed `RepoBundle` to a dedicated
Web Worker. The worker runs every detector in `src/lib/audit/` —
one module per concern (`securityDetector`, `dependencyDetector`,
`ciDetector`, `documentationDetector`, …) — and produces an
`AuditResult` that fans out to the dashboard UI, the React Flow
audit graph, the prioritised next‑steps panel, the printable PDF,
and the Markdown / JSON / AsciiDoc export. The MCP server imports
the exact same audit engine and exposes it over stdio. One audit
implementation, four delivery surfaces, zero ambient state.

That single‑engine architecture is what makes the constraint
contract enforceable. There is no second audit code path for the
agent to drift from. There is no proxy server that "just" caches
responses. There is no inference layer that "might be added
later". The whole story fits in a 550 KB JavaScript bundle the
visitor downloads once, plus a 100 KB worker that the worker
loader fetches on demand.

## Three real audits, three different stacks

The audit on the homepage is a generic walkthrough. Here are three
specific repos audited at the time of writing — pick whichever
matches a stack you care about.

### `BurntSushi/ripgrep` (Rust, ~50K stars)

Score: **94/100** — *Strong*. The maintainer's discipline is
visible in the audit even at this depth: every category clears 90 %
except *Maintenance*, where the audit notes that release cadence
slowed in 2026 (a real signal — the project is mature and
intentionally low‑churn, which a naive "is it stale?" detector
would mis‑read). The post‑Phase‑7‑Track‑0 stack‑awareness fix is
what catches this nuance: ripgrep is a Rust binary, not a JS lib,
so the "no `package.json`" line never fires. The audit instead
inspects `Cargo.toml`, MSRV declaration, feature‑flag hygiene, and
the `internal/`‑discipline conventions that Rust projects honour.

### `pallets/flask` (Python, ~70K stars)

Score: **96/100** — *Strong*. Flask's audit reveals exactly two
non‑trivial signals: a slightly thin `SECURITY.md` (which is
flagged as info, not as a finding — Flask publishes its security
policy on its website, which Astraudit can't reach from the API)
and a "high indirect/direct dep ratio" in `pyproject.toml`. Both
are honest — the audit doesn't pretend Flask's site doesn't exist;
it tells you what it can and can't see from the API surface, and
gracefully degrades the verdict from *missing* to *unknown* when
ground truth lives outside its reach. That's the Phase 7 / Track 0
honesty fix in action.

### `BEKO2210/astraudit` (eat your own dog food)

Score: **91/100** — *Strong*, with the usual humbling reminder
that your own project's audit is always the worst feedback you'll
get all week. The audit flags a thin top‑level README (which is
true — the long form lives in `ROADMAP.md` + `docs/`), a missing
`.github/funding.yml` (queued for M10 — Sustainability), and an
information‑only note that the `docs/` folder is large enough to
warrant a sub‑index. Every one of these is a real, actionable
finding, prioritised in the *next steps* panel with concrete fixes
linked to specific files.

## What v1.0 doesn't do (and won't)

A short, honest list of what you *won't* get from Astraudit:

- **Anything about private repos.** No GitHub App. No OAuth flow.
  Use a paid product if you need that.
- **A SaaS dashboard.** No multi‑repo team view, no org‑wide
  rollups, no historical trending over years. The audit history
  is local‑first via `localStorage`; if you need cross‑machine
  rollups, the JSON exports compose into whatever pipeline you
  prefer.
- **Findings about secret leaks, vulnerable code paths, or runtime
  behaviour.** Astraudit reads metadata + the file tree + key
  configs. It doesn't execute code, run dependencies, or fuzz
  endpoints. Snyk and Trivy do that better.
- **"AI‑powered explanations".** See the rant above.

What it *does* do is give you a fast, free, reproducible health
check on any public repo, plus an MCP integration for the agent
workflows that are eating the world. The eight scored categories
are summarised in the README; the per‑detector contract is
documented in [`docs/RULES.md`](https://github.com/BEKO2210/astraudit/blob/main/docs/RULES.md)
and rendered live at the site's `#/rules` route.

## What's next

The v1.0 release is the boring end of an interesting roadmap. The
[12‑month plan](https://github.com/BEKO2210/astraudit/blob/main/docs/ROADMAP_2026_2027.md)
covers the Browser Extension (Chrome MV3 / Firefox / Safari),
side‑by‑side compare with stack‑mates, German + Japanese
localisation, optional opt‑in rule packs (a11y / i18n / TS‑strict /
monorepo), the Top‑100 leaderboard via a weekly GitHub Action that
commits a static JSON snapshot, and the *State of Open Source 2026*
report aggregated across a thousand audits.

Everything is sponsorship‑funded, anti‑roadmap‑respecting, and
maintained by exactly one human. If any of the above maps to a
problem you have, [open a discussion](https://github.com/BEKO2210/astraudit/discussions)
or audit your own repo and report what surprised you.

The site is at
[**beko2210.github.io/astraudit**](https://beko2210.github.io/astraudit/).
The MCP server is one `npx astraudit-mcp` away. Everything is MIT.
Pull requests welcome — bring the constraint contract with you.
