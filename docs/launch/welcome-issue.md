# Pinned "Welcome — feedback wanted" issue

This file is the body of the pinned-discussion issue Phase 7.6 asks
the maintainer to open + pin in GitHub's UI. It's checked into the
repo so the wording is reviewable + version-controlled rather than
written ad hoc in the issue editor.

To use:

```sh
# Substitute owner/repo if needed.
REPO=BEKO2210/astraudit

# Open the issue from this file.
gh issue create \
  --repo "$REPO" \
  --title "Welcome — feedback wanted (Phase 7.6)" \
  --body-file docs/launch/welcome-issue.md \
  --label "discussion,phase-7"

# Then in the GitHub UI: Issues → ⋯ → Pin issue.
```

---

# Body

Hi 👋 — thanks for stopping by Astraudit.

This is the post-Track-0 feedback thread. Astraudit is a
**100% browser-only auditor** for public GitHub repositories: paste
a URL, get a 100-point score across eight categories, prioritised
findings, an interactive audit graph, and a printable PDF. No
backend, no login, no AI inference. The full constraint contract
lives in [`ROADMAP.md` § anti-roadmap](../ROADMAP.md#anti-roadmap--things-astraudit-will-never-do).

## What I'd love to hear

The first public discussion of v1.0.0 surfaced fair, specific
critique that drove [Phase 7 Track 0](../ROADMAP.md#0--credibility--stack-awareness-must-clear-before-launch)
— ten items that landed stack-aware finding gates, Wiki + external-
docs awareness, a branch-protection probe with an honest *Unknown*
verdict, `not-applicable` + `unknown` verdict states, per-stack
rule packs (Go / Rust / Ruby / pytest), a multi-stack honesty
sweep + CI gate, the [public scope page](https://beko2210.github.io/astraudit/#/scope),
and a stack-aware finding-copy review.

That track closed honestly — same input, same output. But the
audit's voice on stacks I don't personally use day-to-day is
exactly where the next round of fair critique will land. So:

1. **Run the audit on a repo you maintain** (or one whose code
   you know well) and tell me where the finding copy reads as
   noise. Examples that would help:
   - A finding that names the wrong tool for your ecosystem.
   - A "missing X" verdict where X isn't actually idiomatic.
   - A score-evidence line that doesn't make sense in context.
   - A category that should be `not-applicable` for your stack
     but reads as `missing`.
2. **File a [rule proposal](../../issues/new?template=rule_proposal.yml)**
   if you have a detector you'd like to see — the Issue Form
   walks you through the constraint check.
3. **For open-ended ideas / "how should I think about X" / vibes**,
   use [Discussions](../../discussions) instead of an issue.
   "Rule proposals" lives there as a category.

## What I won't do

The four constraints (browser-only · free forever · public-repos-
only · rule-based) are non-negotiable. Items that need a backend,
OAuth, private-repo support, or LLM inference are politely
declined and live in the
[anti-roadmap](../ROADMAP.md#anti-roadmap--things-astraudit-will-never-do).

If your idea bumps into one of those, please propose the
constraint-respecting variant — there's almost always one, and
the conversation is more useful than "no".

## What's next

The launch sequence (Phase 7 Tracks A → C) is the next focus:
Product Hunt, Show HN, the npm publish of `astraudit-mcp`,
awesome-list submissions, and a Chrome extension that adds an
"Audit on Astraudit" button to `github.com/owner/repo` pages.

Thanks for reading this far. The audit is a small piece of code
that tries to be honest about a hard problem; your nudge keeps it
honest.

— Belkis
