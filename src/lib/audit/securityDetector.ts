import type { ClassifiedFiles } from "./fileClassifier";

export interface SecuritySignals {
  hasLicense: boolean;
  hasSecurityPolicy: boolean;
  hasCodeowners: boolean;
  hasDependabot: boolean;
  hasCodeQL: boolean;
  hasEnvExample: boolean;
  hasCommittedEnv: boolean;
  suspiciousFiles: string[];
}

export function analyzeSecurity(classified: ClassifiedFiles): SecuritySignals {
  const blob = classified.blobPaths;
  const hasDependabot =
    blob.has(".github/dependabot.yml") ||
    blob.has(".github/dependabot.yaml");
  const hasCodeQL = classified.workflowPaths.some((p) =>
    /codeql/i.test(p),
  );
  const hasCommittedEnv = Array.from(blob).some(
    (p) =>
      /(^|\/)\.env$/.test(p) ||
      /(^|\/)\.env\.local$/.test(p) ||
      /(^|\/)\.env\.production$/.test(p),
  );

  return {
    hasLicense: blob.has("LICENSE") || blob.has("LICENSE.md") || blob.has("LICENSE.txt"),
    hasSecurityPolicy:
      blob.has("SECURITY.md") || blob.has(".github/SECURITY.md"),
    hasCodeowners:
      blob.has("CODEOWNERS") ||
      blob.has(".github/CODEOWNERS") ||
      blob.has("docs/CODEOWNERS"),
    hasDependabot,
    hasCodeQL,
    hasEnvExample: blob.has(".env.example") || blob.has(".env.sample"),
    hasCommittedEnv,
    suspiciousFiles: classified.suspiciousFiles,
  };
}
