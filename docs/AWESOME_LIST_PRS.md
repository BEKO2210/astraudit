# M2.5 · Awesome‑list submission kit

> **Audience.** The maintainer, after `astraudit` is published on
> npm (M2.3) and the press kit exists (M2.1). Each entry below is
> a separate fork → edit → PR cycle. Total budget: ~2 h spread
> over 2 weeks (one list per day keeps cognitive load low and
> each PR fresh in your head when reviewers comment).
>
> **Why staggered.** Awesome‑list maintainers talk to each other
> and notice when "the same project just spammed seven lists in a
> day". One‑per‑day is humane.

---

## Universal rules (every awesome list)

1. **Read the target's `CONTRIBUTING.md` first.** Conventions differ
   slightly (alphabetical sort key, badge requirements, description
   length, banned superlatives). The entries below assume the
   common defaults; tweak per list.
2. **No hype words.** "Awesome", "amazing", "powerful", "best",
   "blazing‑fast" — most lists' linters bounce these.
3. **One sentence per entry, present tense, ends with a period.**
4. **Alphabetical order inside the section** unless the list
   explicitly sorts by stars / topic / age.
5. **PR title:** `Add Astraudit` (some lists prefer
   `Add Astraudit (browser-only repo auditor)`).
6. **PR body** explains *why this fits the list* in one sentence
   + links the entry's docs / live site. Don't pitch features —
   that goes in the entry, not the PR.
7. **Be patient with CI.** Most awesome lists run `awesome-lint` or
   a similar bot — fix what it flags before pinging the maintainer.

The canonical paragraph below is **the one we re‑use**, with
per‑list trims for length:

> **Astraudit** — Map, score and explain any public GitHub
> repository entirely in your browser. Seventy rule‑based
> detectors, eight scored categories, an MCP server for AI clients,
> and a printable PDF report. No backend, no signup, no AI
> inference. MIT.

---

## 1 · awesome‑github

- **Target:** https://github.com/phillipadsmith/awesome-github
  (or `Kikobeats/awesome-github` if Phillip's is stale — check
  last commit date before picking)
- **Section:** *Tools* (or *Apps & Services* if Tools doesn't fit)
- **Entry (paste in alphabetical order):**

```md
- [Astraudit](https://github.com/BEKO2210/astraudit) - Browser-only auditor for public GitHub repositories: 100-point score across eight categories, interactive audit graph, prioritised next steps, Markdown / JSON / AsciiDoc / PDF export. No backend, no signup. MIT.
```

- **PR title:** `Add Astraudit (browser-only repo auditor)`
- **PR body:**

```md
Adds Astraudit under Tools. It's a self-hosted-by-design audit for
any public GitHub repo — the entire detector pipeline runs in a
Web Worker on the visitor's machine, so the list's "no SaaS"
spirit is fully respected. Live site:
https://beko2210.github.io/astraudit/ — drop any
`github.com/owner/repo` URL and it produces a structured report.

Repository: https://github.com/BEKO2210/astraudit
License: MIT
Last commit: <today's date>
```

---

## 2 · awesome‑static‑analysis

- **Target:** https://github.com/mre/awesome-static-analysis
- **Section:** *Multiple languages → JavaScript* or *Other → General*
  (Astraudit is meta — it analyses repos, not source code per se;
  some maintainers route it to *Other*. Open a comment thread if
  you're unsure rather than guessing in the PR.)
- **Notes:** Strict alphabetical order; the list has a CI linter
  (`awesome_bot` + custom checks). Read `.travis.yml` / GH Actions
  in the repo for the exact rules.
- **Entry:**

```md
- [Astraudit](https://github.com/BEKO2210/astraudit) — :copyright: MIT — Browser-only static auditor for public GitHub repositories: scores repos 0–100 across eight weighted categories with rule-based detectors. Includes an MCP server for AI clients.
```

- **PR title:** `Add Astraudit (browser-only repo auditor)`
- **PR body:** point to the [detector contract](https://github.com/BEKO2210/astraudit/blob/main/docs/RULES.md)
  so reviewers can confirm "rule-based, not AI" before merging.

---

## 3 · awesome‑developer‑tools (a.k.a. awesome‑dev‑tools / awesome‑developer‑experience)

- **Target candidates:**
  - https://github.com/jondot/awesome-devenv (broad)
  - https://github.com/wbinnssmith/awesome-developer-experience
  - https://github.com/Granze/awesome-developer-tools-and-services
- **Pick** whichever has the most recent commit + matches Astraudit
  best ("DX tool that helps maintainers audit their own repo").
- **Section:** *Code Quality* or *Repository Tools*.
- **Entry:**

```md
- [Astraudit](https://github.com/BEKO2210/astraudit) - 100-point browser-only health-check for any public GitHub repository. Eight scored categories, interactive audit graph, prioritised next-steps. MIT, no backend, includes an MCP server.
```

---

## 4 · awesome‑mcp (Model Context Protocol)

- **Target:** https://github.com/punkpeye/awesome-mcp-servers
  (the most active community list)
- **Section:** *Developer Tools* (the existing CI/CD section is
  also a reasonable fit)
- **Notes:** This list has explicit columns for the implementation
  language and the install method. Use the table form they ship:

```md
| [Astraudit](https://github.com/BEKO2210/astraudit) | TypeScript | npx | Run the same browser-side repository audit from an AI client. Pulls metadata, file tree, key configs from GitHub's public API, runs ~70 rule-based detectors, returns a structured AuditResult plus a Markdown summary. |
```

- **PR title:** `Add astraudit-mcp under Developer Tools`
- **PR body:** include the MCP install snippet from
  [`docs/mcp.md`](../docs/mcp.md) so reviewers can verify in 30 s:

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "astraudit": { "command": "npx", "args": ["-y", "astraudit"] }
  }
}
```

---

## 5 · awesome‑open‑source

- **Target:** https://github.com/zachflower/awesome-open-source-supporters
  (or the more general `iCHAIT/awesome-os`)
- **Section:** *Tools* / *Developer Resources*
- **Entry:** same canonical paragraph as #1 above.
- **Note:** Many "awesome-open-source" lists are dormant. Check
  `last commit < 12 months` before investing in a PR.

---

## 6 · awesome‑react

- **Target:** https://github.com/enaqx/awesome-react
- **Section:** *React Boilerplates* (no — wrong fit). *React Development → Tools*
  is the right slot, OR a new line under *Real Apps* if the list
  has one for showcase apps.
- **Notes:** This list has thousands of entries and is strict about
  fit. Astraudit fits because:
  - Built with React 19 + Vite + TypeScript (DX showcase)
  - Production app, not a tutorial
  - MIT, well‑documented, actively maintained
- **Entry:**

```md
- [Astraudit](https://github.com/BEKO2210/astraudit) - Browser-only auditor for public GitHub repositories, built with React 19 + Vite + TypeScript + Tailwind + React Flow. Web Worker for the detector pipeline; ships an MCP server for AI clients. MIT.
```

---

## 7 · awesome‑typescript

- **Target:** https://github.com/dzharii/awesome-typescript
  (or `semlinker/awesome-typescript` if that's more active)
- **Section:** *Tools* or *Real World Applications*.
- **Notes:** TS‑specific lists value strictness. Mention that the
  project's `tsconfig.app.json` is strict‑mode‑on.
- **Entry:**

```md
- [Astraudit](https://github.com/BEKO2210/astraudit) - 100% TypeScript browser-only auditor for public GitHub repositories. Strict mode, 909 vitest unit tests, 70+ rule-based detectors, MCP server entry point. MIT.
```

---

## Step‑by‑step PR flow (every list)

```bash
# 1. Fork the awesome list on GitHub via the UI.

# 2. Clone YOUR fork (replace YOURFORK):
git clone git@github.com:BEKO2210/<list-repo>.git awesome-fork
cd awesome-fork

# 3. Edit README.md — paste the entry from this doc in the
#    correct alphabetical position. Run any local linter the
#    list ships (often `npm test` or `make lint`).

# 4. Commit + push to a branch on your fork:
git checkout -b add-astraudit
git add README.md
git commit -m "Add Astraudit"
git push -u origin add-astraudit

# 5. Open the PR from your fork to the upstream awesome list,
#    using the PR title + body from this doc.

# 6. If the list's CI runs `awesome-lint`:
#       npx awesome-lint
#    Fix anything it flags before pinging a maintainer.

# 7. Move on to the next list. Stagger by at least 24 h.
```

---

## Triage matrix — what to do if a PR is declined

| Maintainer says | What to do |
|---|---|
| "Not enough stars yet" (often >50 or >100 required) | Wait until threshold is reached, then re‑open. Don't argue. |
| "Out of scope for this list" | Accept it. Some lists are narrower than they look. Cross it off and add another candidate from the *Backup lists* section below. |
| "Add a badge" / "Add the license column" | Comply silently. Lint output is your friend. |
| Crickets for > 30 days | Politely bump once. After two no‑responses, the list is dormant — close your PR and move on. |
| "We already have similar tool X" | Acknowledge, explain the distinct constraint contract (browser‑only, MCP server, free forever), let them decide. Don't escalate. |

---

## Backup lists (if any of the seven above declines)

- https://github.com/sindresorhus/awesome (the meta — only if the
  per‑topic list above accepts first; sindresorhus is strict)
- https://github.com/Granze/awesome-developer-tools-and-services
- https://github.com/learn-anything/static-site-generators (Astraudit
  isn't an SSG, but the audit *output* is a static asset story)
- https://github.com/sotayamashita/awesome-mac (if Astraudit ever
  ships a Mac wrapper — currently no)
- https://awesomeopensource.com (auto‑indexed; no PR needed)

---

## Tracking

Maintain the seven submissions in a private spreadsheet (no need
to commit it to the repo). One row per list with:

| List | PR URL | Date opened | Status | Last action | Notes |

When all 7 are decided, append a single line to `CHANGELOG.md`
under the next release: *"Listed on N awesome‑lists (see press
kit)."* Don't enumerate them — the press kit links each one.
