# Astraudit ships a 100 % browser‑only auditor for public GitHub repositories

**For immediate release · 2026‑05 · MIT‑licensed open source**

---

**A small, self‑funded project is reframing what "static analysis" can look
like when it refuses to phone home.** [Astraudit](https://beko2210.github.io/astraudit/)
maps, scores and explains any public GitHub repository — entirely in the
visitor's browser, with no backend, no signup, no telemetry, and no AI
inference in the loop.

Paste a `github.com/owner/repo` URL into the search box. Astraudit then
fetches metadata, the file tree, key config files and a recent‑commit
snapshot from GitHub's unauthenticated public API; runs about seventy
rule‑based detectors inside a dedicated Web Worker; scores the repo
0–100 across eight weighted categories; and renders an interactive audit
graph, prioritised next steps, and printable reports in Markdown, JSON,
AsciiDoc or PDF. A single share‑URL opens any audit straight into the
dashboard.

The project's four operating constraints — browser‑only, free forever,
public repos only, rule‑based — are enforced in CI and documented as a
non‑negotiable anti‑roadmap. No commercial tier is planned: revenue, if
any, flows through clearly separated channels (GitHub Sponsors,
Open Collective, paid consulting) that don't gate the audit itself.

Astraudit also ships as a [Model Context Protocol server](https://github.com/BEKO2210/astraudit/blob/main/docs/mcp.md),
letting AI clients spawn the same audit engine locally — useful for
agents that need a deterministic, citation‑backed signal about a
repository's health before they recommend forks, dependencies or
contributions.

The project launched v1.0.0 on 2026‑05‑11 and has since closed Phase 7
Track 0 — a credibility pass that fixed every stack‑awareness gap
reported in the launch‑week feedback (JS‑centric noise on non‑JS
stacks, missing branch‑protection awareness, missing wiki/external‑docs
detection). The audit now produces output that maintainers of Python,
Rust, Go and Ruby projects read as "this tool understands me".

## About Astraudit

Astraudit is an MIT‑licensed open‑source project by
[@BEKO2210](https://github.com/BEKO2210). Code, copy and assets in
[`public/press/`](https://github.com/BEKO2210/astraudit/tree/main/public/press)
are free to use under attribution. The full roadmap, anti‑roadmap and
detector contract are published at
[github.com/BEKO2210/astraudit](https://github.com/BEKO2210/astraudit).

## Press contact

GitHub Discussions: https://github.com/BEKO2210/astraudit/discussions
Maintainer profile (contact methods linked there): https://github.com/BEKO2210

## Quick‑reference links

- Live site · https://beko2210.github.io/astraudit/
- Source · https://github.com/BEKO2210/astraudit
- Constraint contract / anti‑roadmap · https://github.com/BEKO2210/astraudit/blob/main/ROADMAP.md#anti-roadmap--things-astraudit-will-never-do
- Detector spec · https://github.com/BEKO2210/astraudit/blob/main/docs/RULES.md
- MCP server docs · https://github.com/BEKO2210/astraudit/blob/main/docs/mcp.md
- Press kit · https://github.com/BEKO2210/astraudit/tree/main/public/press
