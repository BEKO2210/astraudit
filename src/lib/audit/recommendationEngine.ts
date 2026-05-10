import type { CategoryScore, Recommendation } from "../../types/audit";
import type { Finding, FindingCategory } from "../../types/finding";

interface RecoContext {
  categories: CategoryScore[];
  findings: Finding[];
}

const SEVERITY_TO_IMPACT: Record<string, "high" | "medium" | "low"> = {
  critical: "high",
  high: "high",
  medium: "medium",
  low: "low",
  info: "low",
};

// Used only when no specific finding exists for a weak category — phrasing
// is intentionally hedged ("if missing") so it never claims something exists
// or is missing without evidence.
const FALLBACK_BY_CATEGORY: Record<
  FindingCategory,
  { title: string; rationale: string }
> = {
  security: {
    title: "Tighten the security baseline",
    rationale:
      "If SECURITY.md, CODEOWNERS, Dependabot, or a CodeQL workflow are missing, add the ones that are not yet present.",
  },
  quality: {
    title: "Strengthen the test and CI loop",
    rationale:
      "Add a smoke test, wire the test command to CI, and turn type/lint checks into PR gates.",
  },
  documentation: {
    title: "Round out the README",
    rationale:
      "Aim for installation, usage, examples, and a roadmap section — even short ones help adopters.",
  },
  dx: {
    title: "Polish the developer onboarding flow",
    rationale:
      "An .env.example, a Makefile or Dockerfile, and clean package.json scripts shorten time-to-first-contribution.",
  },
  maintenance: {
    title: "Re-engage maintenance signals",
    rationale:
      "Triage the open queue, ship a small maintenance release, and update topics, description, and homepage.",
  },
  ci: {
    title: "Add or expand the GitHub Actions workflow",
    rationale:
      "Even a minimal Actions workflow that runs build + test + lint on each PR makes regressions visible early.",
  },
  structure: {
    title: "Reorganize files into clear top-level directories",
    rationale:
      "Move source, scripts, and configs out of the root into src/, scripts/, and config/.",
  },
  ecosystem: {
    title: "Lock dependencies and document the stack",
    rationale:
      "Commit the package manager lockfile and add a stack section so contributors know what to expect.",
  },
};

function titleFromFinding(f: Finding): string {
  // Convert "No X detected" / "An X appears" findings to action-oriented titles.
  const map: Array<[RegExp, string]> = [
    [/^No LICENSE file detected/i, "Add a LICENSE file"],
    [/^No SECURITY\.md detected/i, "Add a SECURITY.md security policy"],
    [/^No README detected/i, "Add a README"],
    [/^README is too short/i, "Expand the README"],
    [/^No setup instructions detected/i, "Add a setup section to the README"],
    [/^No usage examples detected/i, "Add a usage / examples section"],
    [/^No contributing guide detected/i, "Add a CONTRIBUTING.md"],
    [/^No tests detected/i, "Introduce a test suite"],
    [/^No CI workflow detected/i, "Add a GitHub Actions CI workflow"],
    [/^No lockfile detected/i, "Commit the package manager lockfile"],
    [/^Too many files in root directory/i, "Reorganize the repository root"],
    [/^Repository appears inactive/i, "Refresh maintenance signals or archive"],
    [/^No clear setup path detected/i, "Document a one-line local setup"],
    [/^No dependency update automation/i, "Configure Dependabot or Renovate"],
    [/^Potentially sensitive filename detected/i, "Verify and gitignore suspicious filenames"],
    [/^An \.env file appears committed/i, "Remove the committed .env file"],
  ];
  for (const [re, replacement] of map) {
    if (re.test(f.title)) return replacement;
  }
  return f.title;
}

const SEVERITY_RANK: Record<Finding["severity"], number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export function buildRecommendations(ctx: RecoContext): Recommendation[] {
  const { findings, categories } = ctx;

  const sortedFindings = [...findings].sort((a, b) => {
    const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sev !== 0) return sev;
    // tie-breaker: confidence (high first)
    const conf = (b.confidence === "high" ? 2 : b.confidence === "medium" ? 1 : 0) -
      (a.confidence === "high" ? 2 : a.confidence === "medium" ? 1 : 0);
    return conf;
  });

  const recos: Recommendation[] = [];
  const seenAreas = new Set<FindingCategory>();
  const seenTitles = new Set<string>();

  // 1) Map concrete findings to action-oriented recommendations.
  for (const f of sortedFindings) {
    if (recos.length >= 7) break;
    const title = titleFromFinding(f);
    if (seenTitles.has(title)) continue;
    seenTitles.add(title);
    recos.push({
      id: `reco-${f.id}`,
      title,
      area: f.category,
      rationale: f.recommendation,
      impact: SEVERITY_TO_IMPACT[f.severity] ?? "low",
    });
    seenAreas.add(f.category);
  }

  // 2) Fill remaining slots with category-level guidance for the weakest
  // categories that don't already have a finding-driven recommendation.
  if (recos.length < 7) {
    const ranked = [...categories]
      .filter((c) => !seenAreas.has(c.key))
      .filter((c) => c.score / c.max < 0.85)
      .sort((a, b) => a.score / a.max - b.score / b.max);
    for (const cat of ranked) {
      if (recos.length >= 7) break;
      const fb = FALLBACK_BY_CATEGORY[cat.key];
      if (!fb || seenTitles.has(fb.title)) continue;
      seenTitles.add(fb.title);
      const ratio = cat.score / cat.max;
      const impact: Recommendation["impact"] =
        ratio < 0.4 ? "medium" : ratio < 0.7 ? "low" : "low";
      recos.push({
        id: `reco-${cat.key}-fallback`,
        title: fb.title,
        area: cat.key,
        rationale: fb.rationale,
        impact,
      });
      seenAreas.add(cat.key);
    }
  }

  return recos.slice(0, 7);
}
