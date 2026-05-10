import { isInNoiseFolder, type ClassifiedFiles } from "./fileClassifier";

export interface SecuritySignals {
  hasLicense: boolean;
  hasSecurityPolicy: boolean;
  hasCodeowners: boolean;
  hasDependabot: boolean;
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

  const dependabotHit = has(
    ".github/dependabot.yml",
    ".github/dependabot.yaml",
    ".gitlab/dependabot.yml",
  );

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
    hasDependabot: !!dependabotHit,
    hasCodeQL: codeqlHit,
    hasEnvExample: !!envExampleHit,
    hasCommittedEnv: committedEnvFiles.length > 0,
    committedEnvFiles,
    suspiciousFiles: classified.suspiciousFiles,
  };
}
