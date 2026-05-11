import { isInNoiseFolder, type ClassifiedFiles } from "./fileClassifier";
import { parseDependabotConfig, type ParsedDependabot } from "./dependabotParser";
import {
  computeCoverage,
  parseCodeowners,
  type ParsedCodeowners,
} from "./codeownersParser";
import {
  parseSecurityPolicy,
  type ParsedSecurityPolicy,
} from "./securityPolicyParser";
import type { OrgHealthSnapshot } from "../../types/github";

export interface SecuritySignals {
  hasLicense: boolean;
  hasSecurityPolicy: boolean;
  /**
   * Set when the policy was inherited from `{owner}/.github` instead
   * of being shipped in the repo itself. Lets the UI explain "policy
   * lives at expressjs/.github" rather than just "present" — and lets
   * the recommendation engine still nudge the maintainer to ship a
   * repo-local copy if they want to override it.
   */
  securityPolicySource: "repo" | "org-fallback" | null;
  /**
   * Parsed SECURITY.md with contact channels + OpenSSF-style quality
   * grade. Null when the file is absent or empty. Phase 3.4.
   */
  securityPolicy: ParsedSecurityPolicy | null;
  hasCodeowners: boolean;
  /**
   * Parsed CODEOWNERS file with rules, distinct owners, ownership
   * shape, and coverage % over the repo blobs. Null when the file is
   * absent or empty. Phase 3.3.
   */
  codeownersConfig: ParsedCodeowners | null;
  hasDependabot: boolean;
  /**
   * Parsed Dependabot config — null when the file is absent, isn't
   * v2, or contains shapes the scoped parser doesn't understand.
   * See `dependabotParser.ts` for the supported subset. Phase 3.2.
   */
  dependabotConfig: ParsedDependabot | null;
  hasCodeQL: boolean;
  hasEnvExample: boolean;
  hasCommittedEnv: boolean;
  committedEnvFiles: string[];
  suspiciousFiles: string[];
}

const ENV_REGEX = [
  /(^|\/)\.env$/,
  /(^|\/)\.env\.local$/,
  /(^|\/)\.env\.production$/,
  /(^|\/)\.env\.prod$/,
  /(^|\/)\.env\.development$/,
  /(^|\/)\.env\.dev$/,
];

export function analyzeSecurity(
  classified: ClassifiedFiles,
  orgHealth?: OrgHealthSnapshot,
): SecuritySignals {
  const has = classified.hasFile;
  const hasFolder = classified.hasFolder;

  const licenseHit = has(
    "LICENSE",
    "LICENSE.md",
    "LICENSE.txt",
    "LICENSE.rst",
    "LICENCE",
    "LICENCE.md",
    "LICENCE.txt",
    "License",
    "License.md",
    "License.txt",
    "license",
    "license.md",
    "COPYING",
    "COPYING.md",
    "COPYRIGHT",
    "COPYRIGHT.md",
  );

  // Parse SECURITY.md when present so we can grade the policy quality
  // (does it actually give a reporter a channel?). Defined as a `let`
  // because the file lookup happens after `securityHit` is resolved
  // below; we attach the parsed result to the returned signals.
  let securityPolicy: ParsedSecurityPolicy | null = null;
  let securityPolicySource: "repo" | "org-fallback" | null = null;

  const securityHit = has(
    // Phase 7.x — honesty fix. Match what GitHub itself matches:
    // any extension (.md, .markdown, .rst, .txt, no-extension) in any
    // of (root, .github, docs, doc, documentation).
    "SECURITY.md",
    "SECURITY.markdown",
    "SECURITY.rst",
    "SECURITY.txt",
    "SECURITY",
    "Security.md",
    "security.md",
    ".github/SECURITY.md",
    ".github/SECURITY.markdown",
    ".github/SECURITY.rst",
    ".github/SECURITY.txt",
    ".github/SECURITY",
    "docs/SECURITY.md",
    "docs/SECURITY.rst",
    "docs/security.md",
    "doc/SECURITY.md",
    "documentation/SECURITY.md",
  );

  if (securityHit) {
    securityPolicySource = "repo";
    const file =
      classified.importantFileMap.get(securityHit) ??
      classified.importantFileMap.get(securityHit.toLowerCase());
    if (file?.content) {
      securityPolicy = parseSecurityPolicy(file.content);
    }
  } else if (orgHealth?.securityPolicyContent) {
    // Org-level fallback: GitHub's UI treats `{owner}/.github`'s
    // SECURITY.md as the effective policy when the target repo
    // doesn't ship one. We mirror that so we don't false-flag
    // `expressjs/express` (and the long tail of orgs that centralize
    // their policy this way).
    securityPolicySource = "org-fallback";
    securityPolicy = parseSecurityPolicy(orgHealth.securityPolicyContent);
  }

  const codeownersHit = has(
    "CODEOWNERS",
    ".github/CODEOWNERS",
    "docs/CODEOWNERS",
    ".gitlab/CODEOWNERS",
  );

  // Parse CODEOWNERS when present. Coverage % is computed against the
  // repo's blob list — it's a useful signal but only meaningful when
  // the rule set is non-empty, so we degrade gracefully on
  // unparseable / empty files.
  let codeownersConfig: ParsedCodeowners | null = null;
  if (codeownersHit) {
    const file =
      classified.importantFileMap.get(codeownersHit) ??
      classified.importantFileMap.get(codeownersHit.toLowerCase());
    if (file?.content) {
      codeownersConfig = parseCodeowners(file.content);
      if (codeownersConfig) {
        computeCoverage(codeownersConfig, classified.blobPaths);
      }
    }
  }

  const dependabotHit = has(
    ".github/dependabot.yml",
    ".github/dependabot.yaml",
    ".gitlab/dependabot.yml",
  );

  // When the file exists, attempt to parse the YAML so we can list
  // ecosystems + cadence in the UI. The parser tolerates unknown
  // shapes by returning null, so an exotic config never breaks the
  // audit — it just shows the legacy "yes/no" pill.
  let dependabotConfig: ParsedDependabot | null = null;
  if (dependabotHit) {
    const file =
      classified.importantFileMap.get(dependabotHit) ??
      classified.importantFileMap.get(dependabotHit.toLowerCase());
    if (file?.content) {
      dependabotConfig = parseDependabotConfig(file.content);
    }
  }

  const codeqlHit =
    classified.workflowPaths.some((p) => /codeql/i.test(p)) ||
    !!has(".github/workflows/codeql.yml", ".github/workflows/codeql-analysis.yml");

  const envExampleHit = has(
    ".env.example",
    ".env.sample",
    ".env.template",
    ".env.dist",
    "env.example",
    "example.env",
    ".env.test.example",
  );

  // Real .env files only — exclude .env.example (handled above) and any path
  // inside test/fixture/example/docs noise folders, where committed .env is
  // typically intentional (test fixtures).
  const committedEnvFiles: string[] = [];
  for (const path of classified.blobPaths) {
    const lower = path.toLowerCase();
    if (isInNoiseFolder(lower)) continue;
    // explicitly skip .env.example variants
    if (/\.env\.(example|sample|template|dist)$/.test(lower)) continue;
    if (ENV_REGEX.some((re) => re.test(lower))) {
      committedEnvFiles.push(path);
    }
  }

  // Folder-based escape hatch: COPYING in docs/, etc.
  const licenseFolderHit = hasFolder("license", "licenses");

  return {
    hasLicense: !!licenseHit || !!licenseFolderHit,
    hasSecurityPolicy: !!securityHit || !!orgHealth?.securityPolicyContent,
    securityPolicySource,
    securityPolicy,
    hasCodeowners: !!codeownersHit,
    codeownersConfig,
    hasDependabot: !!dependabotHit,
    dependabotConfig,
    hasCodeQL: codeqlHit,
    hasEnvExample: !!envExampleHit,
    hasCommittedEnv: committedEnvFiles.length > 0,
    committedEnvFiles,
    suspiciousFiles: classified.suspiciousFiles,
  };
}
