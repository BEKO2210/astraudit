import { isInNoiseFolder, type ClassifiedFiles } from "./fileClassifier";
import { parseDependabotConfig, type ParsedDependabot } from "./dependabotParser";
import {
  computeCoverage,
  parseCodeowners,
  type ParsedCodeowners,
} from "./codeownersParser";

export interface SecuritySignals {
  hasLicense: boolean;
  hasSecurityPolicy: boolean;
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

export function analyzeSecurity(classified: ClassifiedFiles): SecuritySignals {
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

  const securityHit = has(
    "SECURITY.md",
    "SECURITY.markdown",
    "SECURITY",
    ".github/SECURITY.md",
    ".github/SECURITY.markdown",
    ".github/SECURITY",
    "docs/SECURITY.md",
    "docs/security.md",
    "doc/SECURITY.md",
    "documentation/SECURITY.md",
  );

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
    hasSecurityPolicy: !!securityHit,
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
