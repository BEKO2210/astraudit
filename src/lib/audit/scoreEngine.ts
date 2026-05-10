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
  if (!hasAnything) return "missing";
  if (ratio >= 0.8) return "strong";
  if (ratio >= 0.5) return "partial";
  if (ratio > 0) return "weak";
  return "missing";
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
  if (folders.includes("src") || folders.includes("app") || folders.includes("lib")) {
    score += 3;
    evidence.push("Recognizable source directory present.");
  } else {
    evidence.push("No standard source directory (src/app/lib) detected.");
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
    evidence.push("SECURITY.md present.");
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
  if (
    !security.hasLicense &&
    !security.hasSecurityPolicy &&
    !security.hasCodeowners &&
    !security.hasDependabot
  ) {
    evidence.push("Branch protection cannot be inspected from a public static audit.");
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

export function gradeFromScore(score: number): Grade {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Strong";
  if (score >= 70) return "Strong";
  if (score >= 60) return "Good, but incomplete";
  if (score >= 45) return "Risky";
  return "Critical";
}

export function buildVerdict(score: number, grade: Grade): string {
  if (score >= 90)
    return "This repository shows mature, well-rounded engineering signals across documentation, quality, and maintenance.";
  if (score >= 80)
    return "Strong fundamentals: clear structure, good tooling, and active maintenance with only minor gaps.";
  if (score >= 70)
    return "A solid project with recognizable structure and tooling, though several signals are incomplete.";
  if (score >= 60)
    return "Workable, but several documentation, security, or quality signals are missing.";
  if (score >= 45)
    return "Risky: critical signals such as license, tests, or maintenance activity are missing or weak.";
  return `${grade}: too many trust and quality signals are missing to recommend without further investigation.`;
}
