import type { Finding } from "../../types/finding";
import type { ClassifiedFiles } from "./fileClassifier";
import type { ReadmeSignals } from "./documentationDetector";
import type { DependencySignals } from "./dependencyDetector";
import type { SecuritySignals } from "./securityDetector";
import type { MaintenanceSignals } from "./maintenanceDetector";
import type { CiSignals } from "./ciDetector";
import type { DxSignals } from "./dxDetector";

interface RiskContext {
  classified: ClassifiedFiles;
  readme: ReadmeSignals;
  deps: DependencySignals;
  security: SecuritySignals;
  maintenance: MaintenanceSignals;
  ci: CiSignals;
  dx: DxSignals;
}

let counter = 0;
const id = (slug: string): string => `f-${slug}-${++counter}`;

export function buildFindings(ctx: RiskContext): Finding[] {
  counter = 0;
  const findings: Finding[] = [];

  if (!ctx.security.hasLicense) {
    findings.push({
      id: id("license"),
      title: "No LICENSE file detected",
      category: "security",
      severity: "critical",
      description:
        "Without a LICENSE, downstream users cannot legally use, fork, or contribute to the project.",
      evidence: "No LICENSE / LICENSE.md / LICENSE.txt at the repository root.",
      recommendation:
        "Choose an OSI-approved license (MIT, Apache-2.0, GPL-3.0) and add it as LICENSE in the root.",
      affectedFiles: [],
      confidence: "high",
    });
  }

  if (ctx.security.hasCommittedEnv) {
    findings.push({
      id: id("env-committed"),
      title: "An .env file appears committed",
      category: "security",
      severity: "high",
      description:
        ".env files are typically used for secrets and should not be committed. Treat as suspected leakage and rotate.",
      evidence:
        "A file matching .env was detected in the tree (template files like .env.example are excluded).",
      recommendation:
        "Remove the .env file, add it to .gitignore, rotate any associated secrets, and use .env.example instead.",
      affectedFiles: Array.from(ctx.classified.blobPaths).filter((p) =>
        /(^|\/)\.env($|\.)/.test(p) && !/\.env\.example$/.test(p),
      ),
      confidence: "medium",
    });
  }

  if (ctx.security.suspiciousFiles.length > 0) {
    findings.push({
      id: id("suspicious"),
      title: "Potentially sensitive filename detected",
      category: "security",
      severity: "high",
      description:
        "One or more filenames match patterns commonly associated with secrets or credentials. This is a filename match, not a content scan.",
      evidence: ctx.security.suspiciousFiles.slice(0, 6).join(", "),
      recommendation:
        "Verify each file. If it does contain secrets, remove from history, rotate, and update .gitignore.",
      affectedFiles: ctx.security.suspiciousFiles,
      confidence: "low",
    });
  }

  if (!ctx.security.hasSecurityPolicy) {
    findings.push({
      id: id("security-md"),
      title: "No SECURITY.md detected",
      category: "security",
      severity: "medium",
      description:
        "A SECURITY.md communicates how to report vulnerabilities responsibly.",
      evidence: "No SECURITY.md or .github/SECURITY.md present.",
      recommendation: "Add a SECURITY.md describing supported versions and the reporting process.",
      affectedFiles: [],
      confidence: "high",
    });
  }

  if (!ctx.security.hasDependabot) {
    findings.push({
      id: id("dependabot"),
      title: "No dependency update automation detected",
      category: "security",
      severity: "low",
      description:
        "Dependabot or similar automation keeps dependencies patched without manual work.",
      evidence: "No .github/dependabot.yml file detected.",
      recommendation: "Add a Dependabot config to track ecosystems used in this repo.",
      affectedFiles: [],
      confidence: "high",
    });
  }

  if (!ctx.readme.exists) {
    findings.push({
      id: id("readme"),
      title: "No README detected",
      category: "documentation",
      severity: "high",
      description:
        "Without a README, visitors have no introduction to the project.",
      evidence: "GET /readme returned no content.",
      recommendation:
        "Add a README.md describing the purpose, installation, and usage of the project.",
      affectedFiles: [],
      confidence: "high",
    });
  } else if (ctx.readme.length < 600) {
    findings.push({
      id: id("readme-short"),
      title: "README is too short",
      category: "documentation",
      severity: "medium",
      description:
        "Very short READMEs typically miss installation, usage, and contribution context.",
      evidence: `README content length: ~${ctx.readme.length} chars.`,
      recommendation: "Expand the README with sections for setup, usage, and examples.",
      affectedFiles: ["README.md"],
      confidence: "medium",
    });
  }

  if (!ctx.readme.mentionsInstall) {
    findings.push({
      id: id("readme-install"),
      title: "No setup instructions detected",
      category: "documentation",
      severity: "medium",
      description: "README does not appear to mention installation or setup.",
      evidence: "Pattern matching for install/setup/getting started returned no matches.",
      recommendation:
        "Add an Installation or Getting Started section with copyable commands.",
      affectedFiles: ["README.md"],
      confidence: "medium",
    });
  }

  if (!ctx.readme.mentionsExamples) {
    findings.push({
      id: id("readme-examples"),
      title: "No usage examples detected",
      category: "documentation",
      severity: "low",
      description:
        "Examples or demo content help adopters evaluate the project quickly.",
      evidence: "No example/demo references in README.",
      recommendation: "Add an Examples section or an examples/ folder.",
      affectedFiles: ["README.md"],
      confidence: "medium",
    });
  }

  if (
    !ctx.classified.blobPaths.has("CONTRIBUTING.md") &&
    !ctx.classified.blobPaths.has(".github/CONTRIBUTING.md")
  ) {
    findings.push({
      id: id("contributing"),
      title: "No contributing guide detected",
      category: "documentation",
      severity: "low",
      description: "A CONTRIBUTING.md helps onboard external contributors.",
      evidence: "No CONTRIBUTING.md detected.",
      recommendation: "Add a CONTRIBUTING.md describing the contribution flow.",
      affectedFiles: [],
      confidence: "high",
    });
  }

  if (!ctx.classified.hasTestSignals) {
    findings.push({
      id: id("tests"),
      title: "No tests detected",
      category: "quality",
      severity: "high",
      description:
        "No test files, test directories, or test scripts were detected. Static analysis cannot validate this is comprehensive.",
      evidence: "No matching test paths or scripts.",
      recommendation:
        "Add at least a smoke test plus a test runner (Vitest, Jest, or similar) and a test script.",
      affectedFiles: [],
      confidence: "medium",
    });
  }

  if (!ctx.ci.hasWorkflows) {
    findings.push({
      id: id("ci"),
      title: "No CI workflow detected",
      category: "ci",
      severity: "medium",
      description:
        "No GitHub Actions workflows were detected. Without CI, build/test/lint regressions are easy to miss.",
      evidence: "No .github/workflows/*.yml files.",
      recommendation:
        "Add a minimal GitHub Actions workflow that runs the build, lint, and tests.",
      affectedFiles: [],
      confidence: "high",
    });
  }

  if (!ctx.deps.hasLockfile && ctx.deps.hasPackageJson) {
    findings.push({
      id: id("lockfile"),
      title: "No lockfile detected",
      category: "ecosystem",
      severity: "medium",
      description:
        "A lockfile pins exact dependency versions for reproducible installs.",
      evidence: "package.json present but no package-lock.json/pnpm-lock.yaml/yarn.lock.",
      recommendation: "Commit your package manager's lockfile.",
      affectedFiles: ["package.json"],
      confidence: "high",
    });
  }

  if (ctx.classified.rootFileCount > 35) {
    findings.push({
      id: id("root"),
      title: "Too many files in root directory",
      category: "structure",
      severity: "low",
      description:
        "Crowded root directories make a project harder to navigate.",
      evidence: `${ctx.classified.rootFileCount} files at the repository root.`,
      recommendation:
        "Move source, config, and scripts into clearly named folders such as src/, scripts/, and config/.",
      affectedFiles: [],
      confidence: "high",
    });
  }

  if (
    ctx.maintenance.daysSincePush !== null &&
    ctx.maintenance.daysSincePush > 365
  ) {
    findings.push({
      id: id("inactive"),
      title: "Repository appears inactive",
      category: "maintenance",
      severity: "medium",
      description:
        "No pushes within the past year. Consider archiving or refreshing direction.",
      evidence: `Last push ${ctx.maintenance.daysSincePush} days ago.`,
      recommendation:
        "Triage open issues, ship a small maintenance release, or mark the repo as archived.",
      affectedFiles: [],
      confidence: "high",
    });
  }

  if (
    !ctx.dx.hasSetupInstructions &&
    !ctx.dx.hasMakefile &&
    !ctx.dx.hasDockerfile
  ) {
    findings.push({
      id: id("setup"),
      title: "No clear setup path detected",
      category: "dx",
      severity: "low",
      description:
        "No setup instructions, Makefile, or Dockerfile detected. Onboarding may be hard.",
      evidence: "README has no setup section, no Makefile, no Dockerfile.",
      recommendation:
        "Add a one-line setup recipe in README and consider a Makefile or Dockerfile.",
      affectedFiles: [],
      confidence: "medium",
    });
  }

  return findings;
}
