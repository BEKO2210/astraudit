# Astraudit · Maintainer repo setup

> **Audience.** The repository owner / maintainer. Everything in
> this file is a one‑shot setup the agent can't perform — it
> requires owner‑level permissions on the repo or org settings that
> aren't exposed via the GitHub Actions token.
>
> **Source.** Codifies Roadmap M2.2 (= Phase 7 / 7.6) from
> [`docs/ROADMAP_2026_2027.md`](./ROADMAP_2026_2027.md). Run this
> once after a fresh clone or before a launch milestone; re‑visit
> only when the description, topics, or social card change.

---

## 1 · `gh repo edit` — description, topics, homepage, social preview

```bash
gh repo edit BEKO2210/astraudit \
  --description "Map, score, and explain any public GitHub repository — in your browser. No backend, no signup, no AI inference. Includes an MCP server." \
  --homepage "https://beko2210.github.io/astraudit/" \
  --add-topic audit \
  --add-topic github \
  --add-topic static-analysis \
  --add-topic mcp \
  --add-topic model-context-protocol \
  --add-topic ai-tools \
  --add-topic typescript

# Social preview image (1280×640 PNG). The repo ships an OG card
# that matches the brand at the same size — use it.
gh repo edit BEKO2210/astraudit \
  --enable-issues \
  --enable-projects \
  --enable-discussions
```

> The social‑preview image (under "About → Settings → Social
> preview" in the GitHub UI) has to be uploaded by hand — `gh` has
> no CLI surface for it. Use [`public/og-card.png`](../public/og-card.png).

**Verification:**

```bash
gh repo view BEKO2210/astraudit --json description,homepageUrl,repositoryTopics
```

Expected: description string above, homepage `https://beko2210.github.io/astraudit/`,
all 7 topics present.

---

## 2 · GitHub Discussions — categories

Enable Discussions if not already on (`Settings → General → Features
→ Discussions`). Then in `Discussions → Categories`, set up exactly
these four:

| Category | Format | Description |
|---|---|---|
| **Rule proposals** | Open‑ended discussion | Pre‑file conversation before opening a `[rule]` issue. Use when the detector idea isn't fully scoped yet. |
| **Show & Tell** | Open‑ended discussion | "I audited X, here's what I found." Users sharing audits, badges, embeds. |
| **Questions** | Q&A | "How do I…" / "Does Astraudit see…". Answers get marked. |
| **Bug reports** | Announcement (locked) | One‑post pinned: "For bugs, please open an Issue using the Bug report template." Links to the issue templates. |

Defaults that ship with Discussions ("General", "Announcements",
"Ideas", "Polls") — delete or rename to match the four above. Keep
the list **short**; long category lists scatter the conversation.

---

## 3 · Pinned welcome thread

Once the four categories above exist, post **one** thread in `Show
& Tell` titled **"Welcome — feedback wanted"** and pin it. Suggested
body lives at [`docs/WELCOME_THREAD.md`](./WELCOME_THREAD.md) — copy/paste,
adjust the date, post, then click the pin icon on the thread.

The pinned thread is the canonical "first stop" link on the README's
contact line — keep it editable and high‑value (curated bug list,
upcoming items, etc.).

---

## 4 · Branch protection on `main`

`Settings → Branches → Add rule` for `main`. Settings the agent can't
toggle but the maintainer should:

- [x] Require a pull request before merging.
- [x] Require approvals: **0** (maintainer is the only reviewer).
- [x] Require status checks to pass before merging:
  - `Analyze (javascript-typescript)` (CodeQL)
  - `lighthouse`
  - `a11y`
  - `visual`
  - `honesty`
- [x] Require branches to be up to date before merging.
- [ ] Do NOT require linear history (merge commits make the
      Phase‑X provenance traceable).
- [x] Restrict pushes that create matching branches → maintainer only.
- [x] Allow force pushes → **off**.
- [x] Allow deletions → **off**.

When honesty + bundle‑diff land as required checks, every rate‑limit
flake will block a merge until the workflow re‑runs cleanly. The
M1.5/M1.6 robustness fixes already cover the worst cases.

---

## 5 · Webhooks / integrations to keep

- **CodeRabbit** (already installed for review summaries).
- **Dependabot** (configured via `.github/dependabot.yml`; no extra
  install).
- **GitHub Pages** (deploys from `gh-pages` via `deploy.yml`; verify
  `Settings → Pages → Source = GitHub Actions`).

Nothing else. Resist the urge to add status‑page integrations,
ChatOps bots, or vendor analytics — every new app expands the
trust surface.

---

## 6 · Re‑verification cadence

This whole file is idempotent — re‑run section 1 quarterly (or after
any release cut) to catch description / topic drift. Sections 2–5 are
one‑shot per repo lifetime.
