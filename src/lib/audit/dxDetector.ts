import type { ClassifiedFiles } from "./fileClassifier";
import type { ReadmeSignals } from "./documentationDetector";
import type { DependencySignals } from "./dependencyDetector";

export interface DxSignals {
  hasSetupInstructions: boolean;
  hasEnvExample: boolean;
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  hasMakefile: boolean;
  hasExamplesFolder: boolean;
  hasScriptsFolder: boolean;
  hasContributingGuide: boolean;
  hasCodeOfConduct: boolean;
  hasClearScripts: boolean;
}

export function analyzeDx(
  classified: ClassifiedFiles,
  readme: ReadmeSignals,
  deps: DependencySignals,
): DxSignals {
  const has = classified.hasFile;
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
    hasContributingGuide: !!has(
      "CONTRIBUTING.md",
      ".github/CONTRIBUTING.md",
      "docs/CONTRIBUTING.md",
      "Contributing.md",
      "contributing.md",
    ),
    hasCodeOfConduct: !!has(
      "CODE_OF_CONDUCT.md",
      ".github/CODE_OF_CONDUCT.md",
      "docs/CODE_OF_CONDUCT.md",
      "code_of_conduct.md",
    ),
    hasClearScripts: deps.scriptKeys.length >= 3,
  };
}
