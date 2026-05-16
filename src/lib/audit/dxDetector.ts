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

  // Phase 7.x — honesty fix. GitHub recognises community-health files
  // with any of: no extension, .md, .markdown, .rst (Python),
  // .txt (legacy), AND in any of: root, /docs, /.github. We expand the
  // list here so the detector matches what `github.com/{repo}` itself
  // matches — otherwise we tell users "missing CONTRIBUTING" when
  // GitHub clearly shows a tab for it. Filename matching is
  // case-insensitive (see ClassifiedFiles.hasFile).
  const contributingHit = has(
    "CONTRIBUTING.md",
    "CONTRIBUTING.markdown",
    "CONTRIBUTING.rst",
    "CONTRIBUTING.txt",
    "CONTRIBUTING.adoc",
    "CONTRIBUTING.asciidoc",
    "CONTRIBUTING",
    ".github/CONTRIBUTING.md",
    ".github/CONTRIBUTING.markdown",
    ".github/CONTRIBUTING.rst",
    ".github/CONTRIBUTING.txt",
    ".github/CONTRIBUTING.adoc",
    ".github/CONTRIBUTING.asciidoc",
    ".github/CONTRIBUTING",
    "docs/CONTRIBUTING.md",
    "docs/CONTRIBUTING.markdown",
    "docs/CONTRIBUTING.rst",
    "docs/CONTRIBUTING.txt",
    "docs/CONTRIBUTING.adoc",
    "docs/CONTRIBUTING.asciidoc",
    "docs/contributing.md",
  );
  const codeOfConductHit = has(
    "CODE_OF_CONDUCT.md",
    "CODE_OF_CONDUCT.markdown",
    "CODE_OF_CONDUCT.rst",
    "CODE_OF_CONDUCT.txt",
    "CODE_OF_CONDUCT",
    "Code-of-conduct.md",
    "Code-of-Conduct.md",
    "code-of-conduct.md",
    ".github/CODE_OF_CONDUCT.md",
    ".github/CODE_OF_CONDUCT.markdown",
    ".github/CODE_OF_CONDUCT.rst",
    ".github/CODE_OF_CONDUCT",
    "docs/CODE_OF_CONDUCT.md",
    "docs/code_of_conduct.md",
    "docs/code-of-conduct.md",
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
