import type { ClassifiedFiles } from "./fileClassifier";
import type { ReadmeSignals } from "./documentationDetector";
import type { DependencySignals } from "./dependencyDetector";
import type { OrgHealthSnapshot } from "../../types/github";

export interface DxSignals {
  hasSetupInstructions: boolean;
  hasEnvExample: boolean;
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  hasMakefile: boolean;
  hasExamplesFolder: boolean;
  hasScriptsFolder: boolean;
  hasContributingGuide: boolean;
  /** "repo" when shipped in the target repo, "org-fallback" when
   *  inherited from `{owner}/.github`, null when missing. */
  contributingGuideSource: "repo" | "org-fallback" | null;
  hasCodeOfConduct: boolean;
  codeOfConductSource: "repo" | "org-fallback" | null;
  hasClearScripts: boolean;
}

export function analyzeDx(
  classified: ClassifiedFiles,
  readme: ReadmeSignals,
  deps: DependencySignals,
  orgHealth?: OrgHealthSnapshot,
): DxSignals {
  const has = classified.hasFile;

  const contributingHit = has(
    "CONTRIBUTING.md",
    ".github/CONTRIBUTING.md",
    "docs/CONTRIBUTING.md",
    "Contributing.md",
    "contributing.md",
  );
  const codeOfConductHit = has(
    "CODE_OF_CONDUCT.md",
    ".github/CODE_OF_CONDUCT.md",
    "docs/CODE_OF_CONDUCT.md",
    "code_of_conduct.md",
  );

  const contributingFallback = !contributingHit && !!orgHealth?.contributingContent;
  const codeOfConductFallback = !codeOfConductHit && !!orgHealth?.codeOfConductContent;

  return {
    hasSetupInstructions: readme.mentionsInstall,
    hasEnvExample: !!has(
      ".env.example",
      ".env.sample",
      ".env.template",
      ".env.dist",
      "env.example",
      "example.env",
    ),
    hasDockerfile: !!has("Dockerfile", "dockerfile", "Containerfile"),
    hasDockerCompose: !!has(
      "docker-compose.yml",
      "docker-compose.yaml",
      "compose.yml",
      "compose.yaml",
    ),
    hasMakefile: !!has("Makefile", "makefile", "GNUmakefile"),
    hasExamplesFolder:
      classified.importantFolders.includes("examples") ||
      classified.importantFolders.includes("demo") ||
      !!classified.hasFolder("examples", "example", "demo", "demos", "samples"),
    hasScriptsFolder:
      classified.importantFolders.includes("scripts") ||
      !!classified.hasFolder("scripts", "bin"),
    hasContributingGuide: !!contributingHit || contributingFallback,
    contributingGuideSource: contributingHit
      ? "repo"
      : contributingFallback
        ? "org-fallback"
        : null,
    hasCodeOfConduct: !!codeOfConductHit || codeOfConductFallback,
    codeOfConductSource: codeOfConductHit
      ? "repo"
      : codeOfConductFallback
        ? "org-fallback"
        : null,
    hasClearScripts: deps.scriptKeys.length >= 3,
  };
}
