import type { CategoryScore, Recommendation, StackSignals } from "../../types/audit";
import type { Finding, FindingCategory } from "../../types/finding";

interface RecoContext {
  categories: CategoryScore[];
  findings: Finding[];
  /**
   * Phase 7.0.9 — stack signals for stack-aware recommendation copy.
   * Used to pick the right test-runner name, source-folder list,
   * and onboarding-file mix for the detected ecosystem instead of
   * defaulting to the JS-centric phrasing the v1.x copy used. Tests
   * that don't care about per-stack copy can omit it; the helpers
   * fall through to a generic line in that case.
   */
  stack?: StackSignals;
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
//
// Phase 7.0.9 — fallbacks are now a `function(stack)` instead of a static
// table so the copy can name the ecosystem's actual tooling (Go modules,
// pyproject.toml, Cargo workspace) instead of always saying
// "package.json scripts". The defaults stay generic-but-honest when the
// stack signal is absent (e.g. unit tests that didn't plumb it through).
function fallbackForCategory(
  category: FindingCategory,
  stack: StackSignals | undefined,
): { title: string; rationale: string } {
  const runtime = stack?.runtime ?? null;

  const testRunnerExample = (() => {
    if (runtime === "Go") return "`go test ./...`";
    if (runtime === "Rust") return "`cargo test`";
    if (runtime === "Ruby") return "`bundle exec rspec` (RSpec) or `rake test`";
    if (runtime === "Python") return "`pytest` or `unittest`";
    if (runtime === "Node.js" || runtime === "Deno" || runtime === "Bun") {
      return "Vitest, Jest, or `node --test`";
    }
    return "your ecosystem's test runner";
  })();

  const scriptsExample = (() => {
    if (runtime === "Go" || runtime === "Rust") return "a Makefile target";
    if (runtime === "Python") return "a `pyproject.toml` `[tool]` section";
    if (runtime === "Ruby") return "a Rake task";
    if (runtime === "Node.js" || runtime === "Deno" || runtime === "Bun") {
      return "package.json scripts";
    }
    return "a Makefile or task-runner config";
  })();

  // Source-folder list mirrors Phase 7.0.6's per-stack acceptance.
  const sourceFolders = (() => {
    if (runtime === "Go") return "cmd/, internal/, pkg/, or src/";
    if (runtime === "Rust") return "src/ (or crates/ for workspaces)";
    if (runtime === "Ruby") return "lib/ or app/";
    return "src/, scripts/, and config/";
  })();

  switch (category) {
    case "security":
      return {
        title: "Tighten the security baseline",
        rationale:
          "If SECURITY.md, CODEOWNERS, Dependabot, or a CodeQL workflow are missing, add the ones that are not yet present.",
      };
    case "quality":
      return {
        title: "Strengthen the test and CI loop",
        rationale: `Add at least a smoke test (using ${testRunnerExample}), wire it to CI, and turn type/lint checks into PR gates.`,
      };
    case "documentation":
      return {
        title: "Round out the README",
        rationale:
          "Aim for installation, usage, examples, and a roadmap section — even short ones help adopters.",
      };
    case "dx":
      return {
        title: "Polish the developer onboarding flow",
        rationale: `An .env.example, a Makefile or Dockerfile, and ${scriptsExample} shorten time-to-first-contribution.`,
      };
    case "maintenance":
      return {
        title: "Re-engage maintenance signals",
        rationale:
          "Triage the open queue, ship a small maintenance release, and update topics, description, and homepage.",
      };
    case "ci":
      return {
        title: "Add or expand the GitHub Actions workflow",
        rationale:
          "Even a minimal Actions workflow that runs build + test + lint on each PR makes regressions visible early.",
      };
    case "structure":
      return {
        title: "Reorganize files into clear top-level directories",
        rationale: `Move source, scripts, and configs out of the root — for this stack the convention is ${sourceFolders}.`,
      };
    case "ecosystem":
      return {
        title: "Lock dependencies and document the stack",
        rationale:
          "Commit the package manager lockfile and add a stack section so contributors know what to expect.",
      };
  }
}

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
    // Phase 7.0.1 — stack-aware lockfile finding titles
    // ("Cargo.toml present but no Cargo.lock detected", etc.).
    [/^([\w.]+) present but no ([\w.]+) detected/i, "Commit the lockfile for this ecosystem"],
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
  const { findings, categories, stack } = ctx;

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
      const fb = fallbackForCategory(cat.key, stack);
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
