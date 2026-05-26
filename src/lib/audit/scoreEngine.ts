import type { CategoryScore, CategoryStatus, Grade, StackSignals } from "../../types/audit";
import type { ClassifiedFiles } from "./fileClassifier";
import type { ReadmeSignals } from "./documentationDetector";
import type { DependencySignals } from "./dependencyDetector";
import type { SecuritySignals } from "./securityDetector";
import type { MaintenanceSignals } from "./maintenanceDetector";
import type { CiSignals } from "./ciDetector";
import type { DxSignals } from "./dxDetector";
import { clamp } from "../utils/safeText";

interface ScoreContext {
  classified: ClassifiedFiles;
  readme: ReadmeSignals;
  deps: DependencySignals;
  security: SecuritySignals;
  maintenance: MaintenanceSignals;
  ci: CiSignals;
  dx: DxSignals;
  stack: StackSignals;
}

function statusForRatio(ratio: number, hasAnything: boolean): CategoryStatus {
  // When real points were earned, the status should reflect the
  // ratio — not the `hasAnything` heuristic. The legacy "if no
  // signal-of-interest, return missing" branch produced confusing
  // labels like `quality 11/15 (missing)` on repos that scored well
  // via secondary signals (CI + lockfile + typecheck) but happened
  // to ship no `test/` folder and no devDep matching LINT_TOOL_HINTS.
  if (ratio >= 0.8) return "strong";
  if (ratio >= 0.5) return "partial";
  if (ratio > 0) return "weak";
  return hasAnything ? "weak" : "missing";
}

/**
 * Phase 7.0.6 — per-stack source-directory acceptance.
 *
 * Different ecosystems lay out source code differently. Without a
 * stack-aware accept list, the audit's structure category reads
 * JS-centric: it expects `src/` / `app/` / `lib/` and scolds any
 * project that uses an ecosystem-idiomatic layout instead. This
 * helper returns the (stack, label) pair when the repo's top-level
 * folders match the conventions of the detected runtime. The
 * returned label is what surfaces in the evidence line so the
 * dashboard can credit the right convention.
 *
 *   - **Go**: `cmd/`, `internal/`, `pkg/` (canonical project layout
 *     per github.com/golang-standards/project-layout).
 *   - **Rust**: `src/` (already accepted), additionally `crates/`
 *     for Cargo workspaces.
 *   - **Python**: `src/` (PEP 518 src layout) OR a top-level package
 *     directory matching the repo name. We don't have the manifest
 *     name handy here so we keep the cross-stack default. Pure
 *     Python projects without `src/` are flagged less harshly via
 *     the test-folder check below.
 *   - **Ruby**: `lib/` (already accepted), additionally `app/` (for
 *     Rails apps).
 *   - **Default**: `src/`, `app/`, `lib/` (the legacy v1.x behaviour).
 */
function recognisedSourceLayout(
  folders: readonly string[],
  runtime: string | null,
): { matched: string[]; convention: string } | null {
  // Default + Rust/Ruby still get the legacy accept list since
  // `src/` and `lib/` are already idiomatic for them.
  const legacy = folders.filter((f) => ["src", "app", "lib"].includes(f));
  if (runtime === "Go") {
    const matched = folders.filter((f) =>
      ["cmd", "internal", "pkg", "src"].includes(f),
    );
    if (matched.length > 0) {
      return {
        matched,
        convention: matched.includes("cmd") || matched.includes("internal")
          ? "Go (cmd/internal/pkg)"
          : "Go",
      };
    }
    return null;
  }
  if (runtime === "Rust") {
    const matched = folders.filter((f) =>
      ["src", "crates"].includes(f),
    );
    if (matched.length > 0) {
      return {
        matched,
        convention: matched.includes("crates") ? "Rust workspace" : "Rust",
      };
    }
    return null;
  }
  if (runtime === "Ruby") {
    const matched = folders.filter((f) => ["lib", "app", "src"].includes(f));
    if (matched.length > 0) {
      return {
        matched,
        convention: matched.includes("app") ? "Ruby on Rails" : "Ruby",
      };
    }
    return null;
  }
  if (legacy.length > 0) {
    return { matched: legacy, convention: "src/app/lib" };
  }
  return null;
}

function scoreDocumentation(ctx: ScoreContext): CategoryScore {
  const { readme, classified } = ctx;
  const evidence: string[] = [];
  let score = 0;
  if (readme.exists) {
    score += 3;
    evidence.push("README is present.");
  } else {
    evidence.push("No README detected at the repository root.");
  }
  if (readme.length >= 800) {
    score += 2;
    evidence.push("README has substantial length.");
  } else if (readme.exists) {
    evidence.push("README appears short.");
  }
  if (readme.mentionsInstall) {
    score += 2;
    evidence.push("Installation/setup instructions mentioned.");
  }
  if (readme.mentionsUsage) {
    score += 1;
    evidence.push("Usage section mentioned.");
  }
  if (readme.mentionsApi) {
    score += 1;
    evidence.push("API/CLI/options mentioned.");
  }
  if (readme.mentionsExamples) {
    score += 1;
    evidence.push("Examples or demo mentioned.");
  }
  if (readme.mentionsScreenshot) {
    score += 1;
    evidence.push("Screenshot or visual reference detected.");
  }
  if (readme.hasBadges) {
    score += 1;
    evidence.push("Badges detected in README.");
  }
  if (classified.hasFile("CHANGELOG.md", "CHANGELOG", "CHANGELOG.markdown", "HISTORY.md")) {
    score += 1;
    evidence.push("Changelog present.");
  }
  if (classified.hasFile(
    "CONTRIBUTING.md",
    ".github/CONTRIBUTING.md",
    "docs/CONTRIBUTING.md",
    "Contributing.md",
  )) {
    score += 1;
    evidence.push("Contributing guide present.");
  }
  if (classified.hasDocsFolder) {
    score += 1;
    evidence.push("docs/ folder present.");
  }
  score = clamp(score, 0, 15);
  const status = statusForRatio(score / 15, readme.exists);
  return {
    key: "documentation",
    label: "Documentation",
    score,
    max: 15,
    status,
    summary:
      status === "strong"
        ? "Documentation looks comprehensive."
        : status === "partial"
          ? "Documentation exists but is incomplete."
          : status === "weak"
            ? "Documentation is minimal."
            : "Documentation is missing.",
    evidence,
  };
}

function scoreStructure(ctx: ScoreContext): CategoryScore {
  const { classified, deps, dx, stack } = ctx;
  const evidence: string[] = [];
  let score = 0;
  const folders = classified.importantFolders;
  // Phase 7.0.6 — per-stack source-layout acceptance. The runtime
  // signal from stackDetector tells us whether the repo follows the
  // ecosystem's idiomatic layout (Go's cmd/internal/pkg; Rust's
  // src/crates; Ruby's lib/app), so a Go project doesn't get
  // scolded for "missing src/" when it ships a perfectly fine
  // `cmd/myapp/main.go` layout.
  const sourceLayout = recognisedSourceLayout(folders, stack.runtime);
  if (sourceLayout) {
    score += 3;
    const dirs = sourceLayout.matched
      .map((f) => `\`${f}/\``)
      .join(", ");
    evidence.push(
      `Recognised source layout (${sourceLayout.convention}): ${dirs}.`,
    );
  } else {
    // Stack-aware miss-copy: name the convention the audit expected
    // for this stack so the maintainer knows what would clear the
    // finding without having to guess.
    const expected =
      stack.runtime === "Go"
        ? "cmd/, internal/, pkg/, or src/"
        : stack.runtime === "Rust"
          ? "src/ or crates/"
          : stack.runtime === "Ruby"
            ? "lib/ or app/"
            : "src/, app/, or lib/";
    evidence.push(`No standard source directory (${expected}) detected.`);
  }
  if (
    folders.includes("test") ||
    folders.includes("tests") ||
    folders.includes("__tests__") ||
    folders.includes("spec") ||
    classified.hasTestSignals
  ) {
    score += 2;
    evidence.push("Test directory or test files detected.");
  }
  if (folders.includes("docs")) {
    score += 1;
    evidence.push("docs/ folder present.");
  }
  if (classified.rootFileCount <= 25) {
    score += 2;
    evidence.push("Root directory is reasonably tidy.");
  } else {
    evidence.push(`Root has ${classified.rootFileCount} files (high count).`);
  }
  if (stack.monorepoTool) {
    score += 1;
    evidence.push(`Monorepo signal detected: ${stack.monorepoTool}.`);
  }
  if (deps.scriptKeys.length > 0) {
    score += 1;
    evidence.push("package.json scripts present.");
  }
  if (stack.buildTools.length > 0) {
    score += 2;
    evidence.push(`Build tooling detected: ${stack.buildTools.join(", ")}.`);
  } else if (classified.hasFile(
    "Makefile",
    "makefile",
    "GNUmakefile",
    "build.gradle",
    "build.gradle.kts",
    "Cargo.toml",
    "CMakeLists.txt",
    "BUILD.bazel",
    "BUILD",
  )) {
    score += 2;
    evidence.push("Build configuration file detected.");
  }
  if (dx.hasExamplesFolder) {
    score += 1;
    evidence.push("examples/ or demo/ folder present.");
  }
  if (folders.includes("config") || folders.includes("infra")) {
    score += 1;
    evidence.push("Config/infra directory detected.");
  }
  if (folders.includes("scripts")) {
    score += 1;
    evidence.push("scripts/ folder present.");
  }
  score = clamp(score, 0, 15);
  const status = statusForRatio(score / 15, classified.totalFiles > 0);
  return {
    key: "structure",
    label: "Structure",
    score,
    max: 15,
    status,
    summary:
      status === "strong"
        ? "Repository structure is clear."
        : status === "partial"
          ? "Structure is recognizable but could be tighter."
          : status === "weak"
            ? "Structure signals are limited."
            : "Could not detect a clear project structure.",
    evidence,
  };
}

function scoreQuality(ctx: ScoreContext): CategoryScore {
  const { classified, deps, ci, stack } = ctx;
  const evidence: string[] = [];
  let score = 0;
  if (classified.hasTestSignals) {
    score += 3;
    evidence.push("Test files or test directories detected.");
  } else {
    evidence.push("No test files or directories detected.");
  }
  if (deps.hasTestScript) {
    score += 1;
    evidence.push("Test script present.");
  }
  if (deps.hasLintScript || stack.lintTools.length > 0) {
    score += 2;
    evidence.push("Lint tooling detected.");
  }
  if (deps.hasTypecheckScript || deps.isTypescriptProject) {
    score += 2;
    evidence.push(
      deps.isTypescriptProject
        ? "TypeScript signals detected."
        : "Typecheck script present.",
    );
  }
  if (deps.hasFormatScript || stack.lintTools.includes("Prettier") || stack.lintTools.includes("Biome")) {
    score += 1;
    evidence.push("Formatting tooling detected.");
  }
  if (ci.hasWorkflows) {
    score += 2;
    evidence.push(`CI workflows detected (${ci.workflowCount}).`);
  } else {
    evidence.push("No CI workflows detected.");
  }
  if (deps.hasLockfile) {
    score += 2;
    evidence.push("Lockfile detected.");
  }
  if (deps.hasBuildScript) {
    score += 1;
    evidence.push("Build script present.");
  }
  if (stack.testTools.length > 0) {
    score += 1;
    evidence.push(`Test tooling: ${stack.testTools.join(", ")}.`);
  }
  score = clamp(score, 0, 15);
  const status = statusForRatio(
    score / 15,
    classified.hasTestSignals || stack.lintTools.length > 0,
  );
  return {
    key: "quality",
    label: "Code Quality Signals",
    score,
    max: 15,
    status,
    summary:
      status === "strong"
        ? "Strong testing and tooling signals."
        : status === "partial"
          ? "Some quality tooling, but coverage looks incomplete."
          : status === "weak"
            ? "Quality signals are weak."
            : "No quality signals detected.",
    evidence,
  };
}

function scoreSecurity(ctx: ScoreContext): CategoryScore {
  const { security } = ctx;
  const evidence: string[] = [];
  let score = 0;
  if (security.hasLicense) {
    score += 4;
    evidence.push("LICENSE file present.");
  } else {
    evidence.push("No LICENSE file detected.");
  }
  if (security.hasSecurityPolicy) {
    score += 3;
    evidence.push(
      security.securityPolicySource === "org-fallback"
        ? "SECURITY.md inherited from the org's .github repo."
        : "SECURITY.md present.",
    );
  } else {
    evidence.push("No SECURITY.md detected.");
  }
  if (security.hasDependabot) {
    score += 2;
    evidence.push("Dependabot configuration detected.");
  }
  if (security.hasCodeQL) {
    score += 2;
    evidence.push("CodeQL workflow detected.");
  }
  if (security.hasCodeowners) {
    score += 1;
    evidence.push("CODEOWNERS file present.");
  }
  if (security.hasEnvExample) {
    score += 1;
    evidence.push(".env.example present (template, no secrets).");
  }
  if (security.hasCommittedEnv) {
    score = Math.max(0, score - 2);
    evidence.push("A .env file appears committed (template files excluded).");
  }
  if (security.suspiciousFiles.length > 0) {
    score = Math.max(0, score - 1);
    evidence.push(
      `${security.suspiciousFiles.length} potentially sensitive filename(s) detected.`,
    );
  }
  // Phase 7.0.3 — branch protection probe evidence. The probe lives
  // on the bundle (`fetchBranchProtection`); the detector hands it
  // here as-is. When the probe succeeded, surface the real numbers.
  // When it returned `unknown` (the public surface couldn't carry
  // the data — gated to repo admins), surface the honest *Unknown*
  // verdict instead of pretending the absence of evidence is
  // evidence of absence. **Never** emit a `no required reviews`
  // finding from an unknown probe.
  const protection = security.branchProtection;
  if (protection.status === "observed") {
    const reviewCount = protection.requiredReviews;
    const reviewsCopy =
      reviewCount === null
        ? "configured"
        : reviewCount === 0
          ? "0 required"
          : `${reviewCount} required`;
    const checksCopy = protection.requiredStatusChecks
      ? "status checks enabled"
      : "no status checks";
    evidence.push(
      `Branch protection observed on \`${protection.branch}\`: ${reviewsCopy} review${reviewCount === 1 ? "" : "s"}, ${checksCopy}.`,
    );
    // Tiny positive bump when the public surface actively confirms
    // protection. We deliberately cap this so the audit can't be
    // gamed by a project that ticks branch-protection but ships no
    // license / no SECURITY.md. The status-checks bonus is the
    // higher-trust signal because it implies a real CI gate.
    if (protection.requiredStatusChecks) score += 1;
    if (reviewCount && reviewCount >= 1) score += 1;
  } else if (
    !security.hasLicense &&
    !security.hasSecurityPolicy &&
    !security.hasCodeowners &&
    !security.hasDependabot
  ) {
    // Pre-7.0.3 copy, narrowed: only fire when the rest of the
    // security surface is also empty. A repo that ships a LICENSE
    // + SECURITY.md but hides branch protection behind admin auth
    // doesn't deserve to read "couldn't inspect protection" — the
    // honest line below covers it.
    evidence.push(
      "Branch protection is private to repo admins — Unknown verdict.",
    );
  } else {
    evidence.push(
      "Branch protection is private to repo admins — Unknown (see /scope for why).",
    );
  }
  score = clamp(score, 0, 15);
  const has = security.hasLicense || security.hasSecurityPolicy;
  const status = statusForRatio(score / 15, has);
  return {
    key: "security",
    label: "Security & Trust",
    score,
    max: 15,
    status,
    summary:
      status === "strong"
        ? "Security and trust signals are solid."
        : status === "partial"
          ? "Security baseline is partial."
          : status === "weak"
            ? "Security signals are weak."
            : "No security signals detected.",
    evidence,
  };
}

function scoreMaintenance(ctx: ScoreContext): CategoryScore {
  const { maintenance } = ctx;
  const evidence: string[] = [];
  let score = 0;
  if (maintenance.daysSincePush !== null) {
    if (maintenance.daysSincePush <= 30) {
      score += 4;
      evidence.push(`Last push ${maintenance.daysSincePush} days ago.`);
    } else if (maintenance.daysSincePush <= 180) {
      score += 3;
      evidence.push(`Last push ${maintenance.daysSincePush} days ago.`);
    } else if (maintenance.daysSincePush <= 365) {
      score += 2;
      evidence.push(`Last push ${maintenance.daysSincePush} days ago.`);
    } else {
      score += 0;
      evidence.push(`Repository looks inactive (last push > 1 year).`);
    }
  } else {
    evidence.push("Last push timestamp is unavailable.");
  }
  if (maintenance.recentCommitCount >= 5) {
    score += 2;
    evidence.push(`${maintenance.recentCommitCount} recent commits visible.`);
  }
  if (maintenance.releasesCount > 0) {
    score += 2;
    evidence.push(`${maintenance.releasesCount} release(s) detected.`);
  }
  if (maintenance.hasDescription) {
    score += 1;
    evidence.push("Repository description is set.");
  }
  if (maintenance.topicsCount > 0) {
    score += 1;
    evidence.push(`${maintenance.topicsCount} topic(s) set.`);
  }
  if (maintenance.hasHomepage) {
    score += 1;
    evidence.push("Homepage URL is set.");
  }
  if (maintenance.archived) {
    score = Math.max(0, score - 4);
    evidence.push("Repository is archived.");
  }
  if (maintenance.fork) {
    evidence.push("Repository is a fork.");
  }
  if (maintenance.openPRs !== null) {
    evidence.push(`Open PRs: ${maintenance.openPRs}.`);
  }
  evidence.push(`Open issues: ${maintenance.openIssues}.`);
  score = clamp(score, 0, 15);
  const status = statusForRatio(
    score / 15,
    maintenance.daysSincePush !== null,
  );
  return {
    key: "maintenance",
    label: "Maintenance",
    score,
    max: 15,
    status,
    summary:
      status === "strong"
        ? "Project looks actively maintained."
        : status === "partial"
          ? "Project shows partial maintenance signals."
          : status === "weak"
            ? "Maintenance signals are weak."
            : "Maintenance status is unclear.",
    evidence,
  };
}

function scoreDx(ctx: ScoreContext): CategoryScore {
  const { dx, deps } = ctx;
  const evidence: string[] = [];
  let score = 0;
  if (dx.hasSetupInstructions) {
    score += 2;
    evidence.push("README mentions setup/installation.");
  }
  if (dx.hasEnvExample) {
    score += 1;
    evidence.push(".env.example present.");
  }
  if (dx.hasDockerfile) {
    score += 1;
    evidence.push("Dockerfile present.");
  }
  if (dx.hasDockerCompose) {
    score += 1;
    evidence.push("docker-compose file present.");
  }
  if (dx.hasMakefile) {
    score += 1;
    evidence.push("Makefile present.");
  }
  if (dx.hasExamplesFolder) {
    score += 1;
    evidence.push("examples/ or demo/ folder present.");
  }
  if (dx.hasScriptsFolder) {
    score += 1;
    evidence.push("scripts/ folder present.");
  }
  if (deps.scriptKeys.length >= 3) {
    score += 1;
    evidence.push("package.json scripts are well-defined.");
  }
  if (dx.hasContributingGuide) {
    score += 1;
    evidence.push("Contributing guide present.");
  }
  if (dx.hasCodeOfConduct) {
    score += 1;
    evidence.push("Code of Conduct present.");
  }
  score = clamp(score, 0, 10);
  const status = statusForRatio(score / 10, score > 0);
  return {
    key: "dx",
    label: "Developer Experience",
    score,
    max: 10,
    status,
    summary:
      status === "strong"
        ? "Strong developer onboarding signals."
        : status === "partial"
          ? "Developer experience is partial."
          : status === "weak"
            ? "Developer onboarding signals are weak."
            : "No developer experience signals detected.",
    evidence,
  };
}

function scoreEcosystem(ctx: ScoreContext): CategoryScore {
  const { stack, deps } = ctx;
  const evidence: string[] = [];
  let score = 0;
  if (stack.packageManager) {
    score += 2;
    evidence.push(`Package manager detected: ${stack.packageManager}.`);
  }
  if (deps.hasLockfile) {
    score += 2;
    evidence.push("Lockfile present.");
  } else {
    evidence.push("No lockfile detected.");
  }
  if (stack.frameworks.length > 0) {
    score += 2;
    evidence.push(`Frameworks: ${stack.frameworks.join(", ")}.`);
  }
  if (stack.runtime) {
    score += 1;
    evidence.push(`Runtime: ${stack.runtime}.`);
  }
  if (stack.buildTools.length > 0) {
    score += 1;
    evidence.push(`Build tools: ${stack.buildTools.join(", ")}.`);
  }
  if (stack.monorepoTool) {
    score += 1;
    evidence.push(`Monorepo tooling: ${stack.monorepoTool}.`);
  }
  if (stack.dependencyCounts) {
    score += 1;
    evidence.push(
      `Dependencies: ${stack.dependencyCounts.dependencies}, dev: ${stack.dependencyCounts.devDependencies}.`,
    );
  }
  score = clamp(score, 0, 10);
  const has =
    !!stack.packageManager || stack.frameworks.length > 0 || !!stack.language;
  const status = statusForRatio(score / 10, has);
  return {
    key: "ecosystem",
    label: "Ecosystem & Dependencies",
    score,
    max: 10,
    status,
    summary:
      status === "strong"
        ? "Ecosystem signals are clear."
        : status === "partial"
          ? "Ecosystem detected, with some gaps."
          : status === "weak"
            ? "Ecosystem signals are weak."
            : "Could not detect ecosystem signals.",
    evidence,
  };
}

function scoreCi(ctx: ScoreContext): CategoryScore {
  const { ci } = ctx;
  const evidence: string[] = [];
  let score = 0;
  if (ci.hasWorkflows) {
    score += 2;
    evidence.push(`Workflows: ${ci.workflowCount}.`);
  }
  if (ci.hasBuildWorkflow) {
    score += 1;
    evidence.push("Build/CI workflow detected.");
  }
  if (ci.hasTestWorkflow) {
    score += 1;
    evidence.push("Test workflow detected.");
  }
  if (ci.hasDeployWorkflow) {
    score += 1;
    evidence.push("Deploy/release workflow detected.");
  }
  score = clamp(score, 0, 5);
  const status = statusForRatio(score / 5, ci.hasWorkflows);
  return {
    key: "ci",
    label: "CI/CD & Automation",
    score,
    max: 5,
    status,
    summary:
      status === "strong"
        ? "Automation pipeline looks strong."
        : status === "partial"
          ? "Some automation, with gaps."
          : status === "weak"
            ? "Automation signals are weak."
            : "No CI/CD automation detected.",
    evidence,
  };
}

export function buildCategoryScores(ctx: ScoreContext): CategoryScore[] {
  return [
    scoreDocumentation(ctx),
    scoreStructure(ctx),
    scoreQuality(ctx),
    scoreSecurity(ctx),
    scoreMaintenance(ctx),
    scoreDx(ctx),
    scoreEcosystem(ctx),
    scoreCi(ctx),
  ];
}

export function totalScore(categories: CategoryScore[]): number {
  return categories.reduce((sum, cat) => sum + cat.score, 0);
}

/**
 * Phase 7.0.5 — denominator-aware total max.
 *
 * Categories whose status is `not-applicable` (the file / pattern
 * doesn't belong on this stack — e.g. `Dockerfile` on a pure Rust
 * library) drop out of the denominator entirely so the displayed
 * percentage stays honest. Categories whose status is `unknown`
 * (the public surface can't carry the data — e.g. branch
 * protection) also drop out of the denominator: `0` to numerator,
 * `0` to denominator, no penalty, no credit.
 *
 * Every other status — `strong` / `partial` / `weak` / `missing` /
 * `not-detected` / `info` — contributes its declared `max` to the
 * denominator unchanged. This keeps `totalScore` + `effectiveMaxScore`
 * mathematically coherent: for a v1.0-era audit (no n/a + no unknown
 * states emitted yet) `effectiveMaxScore === 100`, the legacy value.
 */
export function effectiveMaxScore(categories: CategoryScore[]): number {
  return categories.reduce((sum, cat) => {
    if (cat.status === "not-applicable" || cat.status === "unknown") {
      return sum;
    }
    return sum + cat.max;
  }, 0);
}

export function gradeFromScore(score: number): Grade {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Strong";
  if (score >= 70) return "Strong";
  if (score >= 60) return "Good, but incomplete";
  if (score >= 45) return "Risky";
  return "Critical";
}

/**
 * Phase 5.x bugfix — `buildVerdict` used to be a function of the
 * total score alone, which produced contradictions like "Strong
 * fundamentals … active maintenance" when Maintenance was actually
 * the weakest category. The new version takes the category list
 * and:
 *   1. Picks the verdict template by score band (unchanged contract).
 *   2. For the "Strong" / "Solid" bands, REPLACES the generic
 *      "active maintenance" text with the categories that actually
 *      ARE strong, and explicitly calls out weak categories instead
 *      of pretending they're fine.
 *
 * The old contract — `buildVerdict(score, grade)` — is still
 * supported for callers that don't have the categories handy; in
 * that mode the function falls back to the legacy generic copy.
 */
export function buildVerdict(
  score: number,
  grade: Grade,
  categories?: CategoryScore[],
): string {
  // Build a "what's actually strong" + "what's weak" pair from
  // the category mix so we can substitute it into the verdict
  // sentence. Strong = ≥ 80% of the category max; weak = < 60%.
  // Empty arrays / missing argument fall through to the legacy copy.
  const strongLabels = (categories ?? [])
    .filter((c) => c.score / c.max >= 0.8)
    .map((c) => labelForVerdict(c.label));
  const weakLabels = (categories ?? [])
    .filter((c) => c.score / c.max < 0.6)
    .map((c) => labelForVerdict(c.label));

  if (score >= 90) {
    if (strongLabels.length >= 3) {
      return `Mature, well-rounded engineering signals across ${oxfordList(strongLabels.slice(0, 3))}.`;
    }
    return "This repository shows mature, well-rounded engineering signals across documentation, quality, and maintenance.";
  }

  if (score >= 80) {
    if (strongLabels.length > 0 && weakLabels.length > 0) {
      return `Strong on ${oxfordList(strongLabels.slice(0, 3))}; thinner on ${oxfordList(weakLabels.slice(0, 2))}.`;
    }
    if (strongLabels.length > 0) {
      return `Strong on ${oxfordList(strongLabels.slice(0, 3))} with only minor gaps elsewhere.`;
    }
    return "Strong fundamentals overall, with only minor gaps.";
  }

  if (score >= 70) {
    if (weakLabels.length > 0) {
      return `Recognizable structure and tooling, but ${oxfordList(weakLabels.slice(0, 2))} could use more attention.`;
    }
    return "A solid project with recognizable structure and tooling, though several signals are incomplete.";
  }

  if (score >= 60) {
    if (weakLabels.length > 0) {
      return `Workable, but ${oxfordList(weakLabels.slice(0, 3))} signals are missing.`;
    }
    return "Workable, but several documentation, security, or quality signals are missing.";
  }

  if (score >= 45) {
    if (weakLabels.length > 0) {
      return `Risky: ${oxfordList(weakLabels.slice(0, 3))} signals are missing or weak.`;
    }
    return "Risky: critical signals such as license, tests, or maintenance activity are missing or weak.";
  }

  return `${grade}: too many trust and quality signals are missing to recommend without further investigation.`;
}

/** Lower-case the category label and shorten the longer ones so
 *  they fit naturally inside a sentence. */
function labelForVerdict(label: string): string {
  const lower = label.toLowerCase();
  // "Code Quality Signals" → "code quality"; "Security & Trust" →
  // "security"; "Ecosystem & Dependencies" → "ecosystem".
  return lower
    .replace(/ signals$/, "")
    .replace(/ & .+$/, "")
    .replace(/ and .+$/, "");
}

/** Compose 1-3 items into an Oxford-list sentence fragment. */
function oxfordList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
