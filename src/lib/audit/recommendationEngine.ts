import type { CategoryScore, Recommendation } from "../../types/audit";
import type { Finding, FindingCategory } from "../../types/finding";

interface RecoContext {
  categories: CategoryScore[];
  findings: Finding[];
}

const TEMPLATE: Record<
  FindingCategory,
  { title: string; rationale: string }
> = {
  security: {
    title: "Add a SECURITY.md and license baseline",
    rationale:
      "A SECURITY.md, LICENSE, and Dependabot config dramatically increase trust without changing code.",
  },
  quality: {
    title: "Add automated tests and a CI workflow",
    rationale:
      "Tests plus a CI workflow turn one-off contributions into reliable changes and catch regressions early.",
  },
  documentation: {
    title: "Strengthen the README and add usage examples",
    rationale:
      "Clear installation, usage, and example sections drive adoption and reduce reviewer time.",
  },
  dx: {
    title: "Polish the developer onboarding flow",
    rationale:
      ".env.example, scripts, and a Makefile or Dockerfile shorten time-to-first-contribution.",
  },
  maintenance: {
    title: "Re-engage maintenance signals",
    rationale:
      "Triaging open issues, tagging releases, and updating topics communicates stewardship.",
  },
  ci: {
    title: "Wire up GitHub Actions for build and lint",
    rationale:
      "Even a minimal Actions workflow proves the project builds, tests, and lints cleanly on each PR.",
  },
  structure: {
    title: "Reorganize files into clear top-level directories",
    rationale:
      "A tidy root with `src/`, `tests/`, and `docs/` makes the project legible at a glance.",
  },
  ecosystem: {
    title: "Lock dependencies and document the stack",
    rationale:
      "A lockfile plus an explicit stack section prevents reproducibility drift and confused contributors.",
  },
};

const PRIORITY: FindingCategory[] = [
  "security",
  "quality",
  "documentation",
  "dx",
  "maintenance",
  "ci",
  "structure",
  "ecosystem",
];

export function buildRecommendations(ctx: RecoContext): Recommendation[] {
  const ranked = [...ctx.categories].sort(
    (a, b) => a.score / a.max - b.score / b.max,
  );
  const seen = new Set<FindingCategory>();
  const recos: Recommendation[] = [];

  for (const category of ranked) {
    if (seen.has(category.key)) continue;
    seen.add(category.key);
    const tpl = TEMPLATE[category.key];
    const ratio = category.score / category.max;
    const impact: "high" | "medium" | "low" =
      ratio < 0.4 ? "high" : ratio < 0.7 ? "medium" : "low";
    recos.push({
      id: `reco-${category.key}`,
      title: tpl.title,
      area: category.key,
      rationale: tpl.rationale,
      impact,
    });
    if (recos.length >= 7) break;
  }

  for (const cat of PRIORITY) {
    if (recos.length >= 7) break;
    if (seen.has(cat)) continue;
    seen.add(cat);
    const tpl = TEMPLATE[cat];
    recos.push({
      id: `reco-${cat}`,
      title: tpl.title,
      area: cat,
      rationale: tpl.rationale,
      impact: "low",
    });
  }

  return recos.slice(0, 7);
}
