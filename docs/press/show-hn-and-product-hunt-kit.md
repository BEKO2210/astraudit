# M2.6 · Show HN + Product Hunt launch kit

> **Audience.** The maintainer, on launch day. Everything below is
> paste‑ready — read once, post once, reply from the canned
> answers when the same question shows up for the fifth time.
>
> **Why bundled.** Both surfaces fire on the same Tuesday window
> (00:01 PT for Product Hunt, 09:00 PT for Show HN) — see
> `docs/ROADMAP_2026_2027.md` → Monat 2 → M2.6 for the rationale.
> Keeping the two kits in one file means there's a single place
> for the launch‑day operator to look.

---

# Part 1 — Show HN

## Title

```
Show HN: Astraudit – browser-only auditor for public GitHub repos (no backend, no AI)
```

Rule‑of‑thumb the title respects:

- Starts with `Show HN:` (mandatory).
- Project name first, then a 60‑char descriptor.
- The two negations ("no backend, no AI") are the differentiator HN
  cares about in 2026 — keep them.
- No `!`, no superlatives, no version numbers. Total length ~90
  chars (HN truncates at ~80 on mobile).

## URL field

`https://beko2210.github.io/astraudit/`

(Direct to the live site — HN's algorithm slightly de‑prioritises
GitHub‑only submissions for "Show HN" specifically. The site has
the demo; the README link sits in the body.)

## Body

```
Astraudit maps, scores, and explains any public GitHub repo —
entirely in your browser. Paste an owner/repo URL, get a 100-point
score across eight categories, an interactive audit graph,
prioritised next steps, and a printable PDF.

The whole detector pipeline (~70 rules, eight scored categories)
runs in a Web Worker on your machine. There is no backend, no
account, no telemetry, no AI inference. The site is a static bundle
on GitHub Pages.

I built it because every other "audit your repo" tool I've used in
the last few years either wanted my API token + data on their
servers, or wrapped an LLM that hallucinated about my own code. I
wanted something fast, free, reproducible, and citable — every
finding maps to a documented detector with fixture tests.

It also ships an MCP server (`npx astraudit`) so AI clients can
fetch the same deterministic audit before they recommend forks,
dependencies, or contributions. Same engine, two surfaces.

The constraint contract — browser-only, free forever, public repos
only, rule-based — is enforced in CI and documented as a
non-negotiable anti-roadmap. v1.0.0 landed today.

Source + roadmap: https://github.com/BEKO2210/astraudit
Detector spec:   https://github.com/BEKO2210/astraudit/blob/main/docs/RULES.md
MCP integration: https://github.com/BEKO2210/astraudit/blob/main/docs/mcp.md

Happy to answer anything — the maintainer (me) is one person.
```

Length: ~260 words. HN bodies of 150–400 words tend to land best;
shorter feels like a self‑promo, longer feels like a blog post.

## Top‑10 anticipated questions + canned answers

> Read once, paste verbatim or with minor edits. HN values
> directness, not corporate softness. No "great question!", no
> "thanks for the feedback".

### Q1. "Why not just use SonarCloud / DeepSource / Snyk?"

```
Different scope. SonarCloud + DeepSource analyse source code at
the syntax/AST level and need to ingest your repo. Snyk focuses
on vulnerable dependencies + IaC. Astraudit looks at the
repo-as-an-artefact: README, structure, CI workflows, license,
release cadence, branch protection. The eight categories are
documented in docs/RULES.md. It's a complement, not a competitor.
```

### Q2. "Why no AI?"

```
Three reasons:
  - reproducibility (LLM verdicts drift run-to-run)
  - citability (every finding maps to a specific rule + bytes)
  - the browser-only constraint (no inference call without a
    backend or a phone-home)
LLMs are great at summarising the output, which is why the MCP
server exists — pipe the JSON into your model of choice.
```

### Q3. "How does this work with private repos?"

```
It doesn't, and it won't. Private-repo support requires a server
holding tokens; the project's anti-roadmap explicitly rules that
out. If you need private-repo auditing, use a hosted product.
```

### Q4. "Doesn't paging from the GitHub API for ~70 detectors blow rate limits?"

```
A single audit fires ~10 GitHub API calls (metadata, file tree,
readme, important configs, languages, commits, releases, issues,
org-health-fallback, branch-protection). Unauthenticated reads
get 60/hr from GitHub — enough for ~6 audits per hour. If you
want more, the Settings dialog accepts a fine-grained read-only
PAT that never leaves your browser.
```

### Q5. "How big is the bundle? Lighthouse score?"

```
~550 KB main chunk (gzip ~175 KB) + lazy graph chunk + audit
worker. Lighthouse on the live site is ≥90 on performance,
≥95 on accessibility, ≥90 on best-practices, ≥90 on SEO. The
budgets are CI-enforced via scripts/check-bundle-size.ts.
```

### Q6. "Stack: React 19, Vite, Tailwind, React Flow, no router lib?"

```
That. Plus markdown-it for the in-app renderer and zod for
type-validating the GitHub API responses. The MCP server adds
@modelcontextprotocol/sdk. Routing is hash-based (no SPA
server-rewrite required for GitHub Pages).
```

### Q7. "I audited my own repo and the score seems wrong because of X."

```
Two things help: (1) docs/RULES.md documents the exact trigger
for each detector, (2) the rule book at /#/rules shows a live
example for every rule. If after reading the rule the audit
still feels wrong, that's a bug — please open an issue using
the bug_report template. Phase 7 Track 0 was a credibility
pass specifically against this kind of feedback.
```

### Q8. "Is the MCP server safe to run on untrusted input?"

```
The MCP server takes a `owner/repo` string and queries GitHub's
public API. It doesn't execute anything from the audited repo —
no clone, no install, no script eval. Worst case from a malicious
input is a 404 from GitHub or an oversized file tree we
gracefully truncate at 60K entries.
```

### Q9. "What does the score actually mean? Is 80 'good'?"

```
The 100-point score is a weighted sum across eight categories
(see docs/RULES.md for the weights). A grade band sits on top:
"Strong" ≥85, "Solid" 70-84, "Mixed" 55-69, "Risky" 40-54,
"Avoid" <40. The numbers calibrate against the curated
honesty-sweep targets — 56 well-known repos that should all
score ≥70 if the rules are sane. A regression in their average
score blocks merge.
```

### Q10. "How do you sustain this without revenue?"

```
GitHub Sponsors + Open Collective + occasional consulting. The
product is free forever; sponsorship and consulting are
separate channels documented in the roadmap (Monat 10 lands
the formal Sponsor tier ladder). The maintainer is one human —
sustainable scale matches that headcount.
```

## Show HN timing + protocol

- **Window:** Tuesday 09:00 PT (12:00 ET, 18:00 CET). Highest
  visibility, lowest competition from Show HN.
- **First 60 min:** maintainer stays in front of the tab. Every
  top‑level comment within that hour gets a reply within ~10 min.
  HN's algorithm weights early engagement heavily.
- **Pre‑emptive:** if you have any pre‑v1 issues you've already
  closed, leave the closed issues visible — HN readers love to
  click through old discussion and see the maintainer ships.
- **Do NOT:** ask friends to upvote (HN flags voting rings hard),
  cross‑link to Reddit/Twitter from the HN thread, or argue.

---

# Part 2 — Product Hunt

## Tagline (60 chars)

```
Browser-only repo auditor — no backend, no AI inference.
```

## Description (260 chars)

```
Paste any github.com/owner/repo URL, get a 100-point score across
eight weighted categories, an interactive audit graph, prioritised
next steps, and a printable PDF. ~70 rule-based detectors,
browser-only, MIT. Includes an MCP server for AI clients.
```

## Topics

`Developer Tools`, `Open Source`, `GitHub`, `Productivity`,
`Security` (pick the 3 most fitting in PH's UI — it caps at 3).

## Gallery

Reuse the seven panel shots from
[`public/press/screenshots/`](https://github.com/BEKO2210/astraudit/tree/main/public/press/screenshots)
(M2.1 / 2/3). PH wants 16:9 — that's exactly what the capture
script produces. Recommended order:

1. `01-overview.png` — hero
2. `05-graph.png` — the interactive audit graph (visual hook)
3. `04-findings.png` — concrete findings
4. `06-next-steps.png` — prioritised actions (proves the value)
5. `07-export.png` — Markdown/JSON/AsciiDoc menu

The 60‑second screencast slot in PH goes to the maintainer‑made
.mp4 (still open Maintainer‑Task from M2.1).

## Maker comment (250 words)

Post this as the *first* comment on the PH page (PH highlights
"Maker says" comments at the top of the thread):

```
Hi PH! Maker here.

Astraudit is the audit tool I kept wishing existed. Every
"check the health of your repo" tool I tried in the last few
years either uploaded my code to their servers, asked for a
GitHub token I didn't want to hand out, or wrapped an LLM that
hallucinated about my own files. So I built the version that
fits inside my own browser.

What's in the box:
  • A 100-point score across eight categories (documentation,
    structure, code-quality, security, maintenance, DX,
    ecosystem, CI/CD). About seventy individual rule-based
    detectors — each one with a public contract and fixture
    tests.
  • An interactive audit graph that colour-codes every signal.
  • Prioritised next steps with concrete fixes linked to the
    exact files.
  • Markdown / JSON / AsciiDoc / printable-PDF export.
  • An MCP server (`npx astraudit`) for Claude / Cursor / any
    AI client — the same deterministic audit, served over
    stdio.

What's NOT in the box, deliberately:
  • A backend. A login. Telemetry. An AI in the verdict path.
    Private-repo support. A SaaS dashboard.

It's MIT, made by one human, sustained by sponsorship.
Constraint contract documented as a non-negotiable
anti-roadmap. Everything in the source tree.

Audit your own repo — I'd love to know what surprised you.

— [Maintainer]
```

## First‑five supporters DM kit

Send these 6–24 h before launch. Personal, short, no auto‑gen.

```
Subject: Quick favour, ~30 seconds — launching Astraudit on
Product Hunt Tuesday

Hey [Name] — quick ask. I'm launching Astraudit on Product
Hunt this Tuesday (PT). It's a free, browser-only auditor for
public GitHub repos — no backend, no AI, just rule-based
detectors against the public API. The MCP server might be
interesting to you specifically because of [reason that ties
to their work].

If you can drop by the launch page on Tuesday and leave a
comment or upvote if you find it useful, that would mean a lot.
No worries if you can't.

Link will be: producthunt.com/posts/astraudit (live Tuesday
00:01 PT). I'll send you the live URL on the day.

Thanks either way — happy to return any favour.
```

## Top‑10 PH FAQ (different register than HN — PH is more visual + product‑manager‑shaped)

### Q1. "How does this compare to [established competitor]?"

```
Most "competitors" are SaaS dashboards that ingest your repo.
Astraudit is the opposite — it runs in your browser, against
the public API, and never sees your code. If you want a full
managed dashboard, Snyk / SonarCloud / DeepSource are the right
call. If you want a fast, free, reproducible first-pass that
respects your data, that's the gap Astraudit fills.
```

### Q2. "Is there a Pro tier?"

```
No, and there won't be. The roadmap explicitly rules out a paid
tier (the project's anti-roadmap is part of the contract). If
you'd like to support the project, GitHub Sponsors / Open
Collective links are in the footer once Monat 10 lands.
```

### Q3. "Where does my data go?"

```
Nowhere. There is no backend. The audit runs in a Web Worker
on your machine, against GitHub's public REST API. The only
data the site fetches is whatever GitHub returns to your
browser. localStorage caches the response for 24 h locally,
nothing else.
```

### Q4. "Can I export the audit?"

```
Yes — Markdown, JSON, AsciiDoc, and PDF (via your browser's
print). Plus a share URL (audit.../#/audit/owner/repo) so a
reviewer can open straight into the dashboard.
```

### Q5. "What about my private repos?"

```
Not supported, and won't be (would require a backend). Public
repos only. The "Settings" dialog accepts your own PAT for
higher rate limits, but the token never leaves your browser.
```

### Q6. "What's the MCP server for?"

```
Same audit engine, but exposed over stdio so AI clients
(Claude Desktop, Cursor, etc.) can pull a deterministic repo
health signal into their reasoning. `npx astraudit` and you're
done — config snippet in the docs.
```

### Q7. "I got a weird score — is that a bug?"

```
Possibly. Every detector has a documented trigger in
docs/RULES.md and a live example at /#/rules. If after
reading the rule the audit still feels wrong, open a bug
report — Phase 7 Track 0 was a credibility pass exactly for
this kind of feedback.
```

### Q8. "Can I embed the score in my own README?"

```
Yes — an SVG badge is generated per audit. Click the "Badge"
action on the dashboard to copy the Markdown snippet.
```

### Q9. "Mobile support?"

```
Yes — the dashboard is responsive down to ~390×844 (iPhone 14
Pro). The audit graph hands the touch stream back to the page
on mobile so vertical scroll never wobbles.
```

### Q10. "Does it support [language X]?"

```
Stack-aware for JS/TS, Python, Rust, Go, Ruby, PHP, Java,
Swift, C/C++ as of v1.0.0. Phase 7 Track 0 closed the
JS-centric gap that earlier critics flagged — the audit now
respects Cargo.toml / go.mod / pyproject.toml / Gemfile and
their respective lockfile conventions. Per-language depth
deepens in Monat 11 of the roadmap.
```

## PH timing + protocol

- **Window:** Tuesday 00:01 PT (09:00 CET). PH's day starts
  midnight PT; first‑hour upvotes set the daily ranking
  trajectory.
- **First 4 hours:** maintainer present, replies to every
  comment within ~15 min. Even a "thanks" reply counts —
  comment count is part of PH's ranking signal.
- **Hunter:** optional. Pre‑PH days you needed a hunter; in
  2026 self‑post works fine. If a notable hunter offers,
  accept; if not, post yourself.
- **Cross‑post:** to Twitter/X + Bluesky + Mastodon at 09:00 PT
  with the PH URL. Pin the thread.
- **Do NOT:** buy votes (PH bans instantly), ask private
  channels to mass‑upvote at the same time (they detect rings),
  or post the same product twice in the same year.

---

## Post‑launch (both surfaces, ~24 h after)

- Move PH page → Today/Yesterday view, screenshot the badge if
  Astraudit was in top 5 for the day. Add to
  [`public/press/`](https://github.com/BEKO2210/astraudit/tree/main/public/press)
  for future press‑kit use.
- Capture the Show HN URL in a "Featured on" section of the
  press wall (M10.5 plans this asset).
- Append a one‑line note to `CHANGELOG.md`: "Launched on Show HN
  + Product Hunt on `YYYY-MM-DD`." Don't enumerate metrics —
  vanity metrics rot fast in a changelog.
- Open follow‑up issues for every legitimate feature suggestion
  from either thread, labelled `from-launch`. The label makes
  the first‑month iteration plan write itself.
