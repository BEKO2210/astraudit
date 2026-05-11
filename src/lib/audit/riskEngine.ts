import type { Finding } from "../../types/finding";
import type { StackSignals } from "../../types/audit";
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
  /**
   * Phase 7.0.9 — stack signals for stack-aware finding copy. Used
   * to name the right test runner (`go test` / `cargo test` /
   * `pytest`) per ecosystem instead of always recommending
   * "Vitest, Jest, or similar". Required: callers must thread the
   * existing `stack` value through.
   */
  stack: StackSignals;
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
      title: "An .env file appears committed outside test fixtures",
      category: "security",
      severity: "high",
      description:
        ".env files are typically used for secrets and should not be committed. Treat as suspected leakage and rotate. Files inside test/, fixtures/, examples/, and docs/ have already been excluded.",
      evidence: ctx.security.committedEnvFiles.slice(0, 4).join(", "),
      recommendation:
        "Remove the .env file from the working tree, add the path to .gitignore, rotate any associated secrets, and use .env.example as the template instead.",
      affectedFiles: ctx.security.committedEnvFiles,
      confidence: "medium",
    });
  }

  if (ctx.security.suspiciousFiles.length > 0) {
    findings.push({
      id: id("suspicious"),
      title: "Potentially sensitive filename detected",
      category: "security",
      severity: "medium",
      description:
        "One or more filenames match patterns commonly associated with secrets or credentials. This is a filename match, not a content scan, and may be a false positive.",
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

  // Phase 7.0.2 — when documentation lives elsewhere (GitHub Wiki,
  // Read the Docs, a docs.* subdomain, etc.), the README itself
  // can be intentionally thin. The thin-README findings below
  // soften their severity + copy when this is the case, so we
  // don't tell e.g. a Tailwind-style project with a dedicated docs
  // site that they have "no docs".
  const externalDocs = ctx.readme.exists ? ctx.readme.externalDocsHost : null;
  const externalDocsClause = externalDocs
    ? ` Astraudit detected external documentation at ${externalDocs}; consider mirroring a short overview in the README too so first-time visitors see it without clicking through.`
    : "";

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
      title: externalDocs
        ? "README is short — most docs may live elsewhere"
        : "README is too short",
      category: "documentation",
      severity: externalDocs ? "low" : "medium",
      description: externalDocs
        ? `The README is short (~${ctx.readme.length} chars). That's expected when documentation lives on a separate surface.${externalDocsClause}`
        : "Very short READMEs typically miss installation, usage, and contribution context.",
      evidence: `README content length: ~${ctx.readme.length} chars. external-docs=${externalDocs ?? "none detected"}.`,
      recommendation: externalDocs
        ? "Add a short README intro that points first-time visitors at the full docs."
        : "Expand the README with sections for setup, usage, and examples.",
      affectedFiles: ["README.md"],
      confidence: externalDocs ? "low" : "medium",
    });
  }

  if (!ctx.readme.mentionsInstall && !externalDocs) {
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

  if (!ctx.readme.mentionsExamples && !externalDocs) {
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

  // Phase 7.x — honesty fix. Was checking `classified.hasFile()`
  // directly, which missed the very common case where a repo inherits
  // CONTRIBUTING.md from `{owner}/.github` (expressjs/express,
  // facebook/react, nodejs/node all do this). Now we trust
  // `ctx.dx.hasContributingGuide` which already accounts for the
  // org-fallback path resolved during `analyzeDx`.
  if (!ctx.dx.hasContributingGuide) {
    findings.push({
      id: id("contributing"),
      title: "No contributing guide detected",
      category: "documentation",
      severity: "low",
      description: "A CONTRIBUTING.md helps onboard external contributors.",
      evidence: "No CONTRIBUTING.md in the repo or at {owner}/.github fallback.",
      recommendation: "Add a CONTRIBUTING.md describing the contribution flow.",
      affectedFiles: [],
      confidence: "high",
    });
  }

  if (!ctx.classified.hasTestSignals) {
    // Phase 7.0.9 — stack-aware test-runner copy. The old
    // "Vitest, Jest, or similar" line read as noise on Go / Rust /
    // Python repos that already have their own canonical runner.
    // Name the right one per stack; fall back to a generic line
    // when the runtime detector couldn't pin one down.
    const runtime = ctx.stack.runtime;
    const runnerHint =
      runtime === "Go"
        ? "`go test ./...` is the canonical entry point"
        : runtime === "Rust"
          ? "`cargo test` runs the test suite in src/ + tests/"
          : runtime === "Python"
            ? "pytest is the de facto runner; `python -m unittest` works too"
            : runtime === "Ruby"
              ? "RSpec (`bundle exec rspec`) or Minitest (`rake test`)"
              : runtime === "Node.js" || runtime === "Deno" || runtime === "Bun"
                ? "Vitest, Jest, or `node --test`"
                : "your ecosystem's test runner";
    findings.push({
      id: id("tests"),
      title: "No tests detected",
      category: "quality",
      severity: "high",
      description:
        "No test files, test directories, or test scripts were detected. Static analysis cannot validate this is comprehensive.",
      evidence: "No matching test paths or scripts.",
      recommendation: `Add at least a smoke test — ${runnerHint}.`,
      affectedFiles: [],
      confidence: "medium",
    });
  }

  if (!ctx.ci.hasWorkflows) {
    findings.push({
      id: id("ci"),
      title: "No CI/CD pipeline detected",
      category: "ci",
      severity: "medium",
      description:
        "No CI/CD configuration was found from any of the providers Astraudit recognizes (GitHub Actions, GitLab CI, CircleCI, Travis, Jenkins, Drone, Woodpecker, Azure Pipelines, Buildkite, AppVeyor, Bitbucket Pipelines, Gitea Actions). Without CI, build/test/lint regressions are easy to miss.",
      evidence: "No CI configuration files matched.",
      recommendation:
        "Add a minimal pipeline (a .github/workflows/*.yml is a fast default) that runs the build, lint, and tests.",
      affectedFiles: [],
      confidence: "high",
    });
  }

  // Phase 7.0.1 — stack-aware lockfile findings. One finding per
  // (manifest present, lockfile absent) pair, with stack-specific
  // copy. A Rust crate without `Cargo.lock` gets a finding that
  // names `Cargo.lock` — never "your package manager's lockfile"
  // generically (the Reddit critique called that out as noise on
  // non-JS repos). Repos with no recognised manifest at all (e.g.
  // header-only C libraries, raw docs repos) get no lockfile
  // finding — there's nothing meaningful to commit.
  for (const miss of ctx.deps.missingLockfiles) {
    const canonical = miss.expectedLockfiles[0];
    const alts = miss.expectedLockfiles.slice(1);
    const lockList = alts.length
      ? `${canonical} (or ${alts.join(" / ")})`
      : canonical;
    findings.push({
      id: id(`lockfile-${miss.manifest.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`),
      title: `${miss.manifest} present but no ${canonical} detected`,
      category: "ecosystem",
      severity: "medium",
      description: `A lockfile pins exact dependency versions for reproducible installs across teammates and CI. ${miss.ecosystem} uses ${lockList}.`,
      evidence: `${miss.manifest} found at repo root; no ${miss.expectedLockfiles.join(" / ")} alongside it.`,
      recommendation: `Run the ecosystem's install command to generate ${canonical} and commit it.`,
      affectedFiles: [miss.manifest],
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
