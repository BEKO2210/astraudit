# Welcome — feedback wanted

> Copy/paste this body when you post the pinned Welcome thread in
> `Discussions → Show & Tell` (see [`MAINTAINER_REPO_SETUP.md` § 3](./MAINTAINER_REPO_SETUP.md#3--pinned-welcome-thread)).
> Adjust the date and the "what changed this month" bullets before
> posting; everything else is reusable verbatim.

---

👋 **Welcome to Astraudit Discussions.**

Astraudit is a free, browser‑only auditor for public GitHub
repositories. v1.0.0 shipped on **2026‑05‑11**, Phase 7 Track 0
(credibility / stack‑awareness pass) closed shortly after, and the
project is actively shipping under a one‑maintainer, no‑backend,
no‑AI‑inference contract.

### Use Discussions for

- **Rule proposals** — pre‑file the conversation when the detector
  idea isn't fully scoped yet. Once it's concrete, a `[rule]` issue
  picks up where the thread leaves off.
- **Questions** — "How do I…", "Does Astraudit see…", "Why did it
  score X". The Q&A category marks accepted answers so the next
  visitor can find them.
- **Show & Tell** — audits you ran, badges you embedded, write‑ups
  you published. Tag the project authors if you can — Astraudit is a
  read‑only tool and any feedback to the upstream maintainer comes
  from you, not from us.

### Use Issues for

- **Bugs** — the [Bug report](https://github.com/BEKO2210/astraudit/issues/new?template=bug_report.yml)
  template. A reproduction URL + browser version turns a 30‑minute
  triage into a 30‑second fix.
- **Features** — the [Feature request](https://github.com/BEKO2210/astraudit/issues/new?template=feature_request.yml)
  template. The four‑constraint checklist filters out the requests
  that would break the project's anti‑roadmap before they hit triage.
- **New detectors** — the [Rule proposal](https://github.com/BEKO2210/astraudit/issues/new?template=rule_proposal.yml)
  template (Issue Form). Structured up front so triage doesn't need
  back‑and‑forth.

### Operating constraints — non‑negotiable

| Constraint | What it means |
|---|---|
| 🌐 Browser‑only | Audit runs entirely in your browser; no backend. |
| 🆓 Free forever | No paid tier, no signup, no tracking. |
| 📂 Public repos only | Private‑repo support requires server‑held secrets. |
| 📐 Rule‑based | No AI inference for findings — detectors are pure TypeScript. |

The full [anti‑roadmap](https://github.com/BEKO2210/astraudit/blob/main/ROADMAP.md#anti-roadmap--things-astraudit-will-never-do)
spells out the consequences. Feature requests that need a backend,
LLM, OAuth, or private‑repo access are politely declined.

### Response time

The maintainer is one person. Expect a first response within **48 h**
on weekdays, ~72 h on weekends. Security reports route through
[GitHub Security Advisories](https://github.com/BEKO2210/astraudit/security/advisories/new)
— don't post those publicly here.

### Currently shipping

- *(Curate three bullets here per month — what's just landed and
  what's in flight. The roadmap source of truth is
  [`docs/ROADMAP_2026_2027.md`](https://github.com/BEKO2210/astraudit/blob/main/docs/ROADMAP_2026_2027.md);
  this section is the human‑readable digest.)*

Thanks for being here.

— Maintainer
