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
  hasClearScripts: boolean;
}

export function analyzeDx(
  classified: ClassifiedFiles,
  readme: ReadmeSignals,
  deps: DependencySignals,
): DxSignals {
  return {
    hasSetupInstructions: readme.mentionsInstall,
    hasEnvExample: classified.blobPaths.has(".env.example"),
    hasDockerfile: classified.blobPaths.has("Dockerfile"),
    hasDockerCompose:
      classified.blobPaths.has("docker-compose.yml") ||
      classified.blobPaths.has("docker-compose.yaml"),
    hasMakefile: classified.blobPaths.has("Makefile"),
    hasExamplesFolder:
      classified.importantFolders.includes("examples") ||
      classified.importantFolders.includes("demo"),
    hasScriptsFolder: classified.importantFolders.includes("scripts"),
    hasContributingGuide:
      classified.blobPaths.has("CONTRIBUTING.md") ||
      classified.blobPaths.has(".github/CONTRIBUTING.md"),
    hasClearScripts: deps.scriptKeys.length >= 3,
  };
}
