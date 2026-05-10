import type { ClassifiedFiles } from "./fileClassifier";
import { tryParseJson } from "../utils/safeText";
import { readManifest, type ParsedManifest } from "./packageManifest";

export interface DependencySignals {
  packageManager: string | null;
  hasLockfile: boolean;
  hasPackageJson: boolean;
  hasTypecheckScript: boolean;
  hasLintScript: boolean;
  hasFormatScript: boolean;
  hasTestScript: boolean;
  hasBuildScript: boolean;
  scriptKeys: string[];
  isTypescriptProject: boolean;
  /**
   * Parsed manifest contract (engines, peerDependencies,
   * packageManager pin, module type). Null when the file is absent
   * or unparseable. Phase 3.5.
   */
  manifest: ParsedManifest | null;
}

interface PackageJson {
  scripts?: Record<string, string>;
}

export function analyzeDependencies(
  classified: ClassifiedFiles,
): DependencySignals {
  const has = classified.hasFile;
  const pkgFile =
    classified.importantFileMap.get("package.json") ??
    classified.importantFileMap.get("package.json".toLowerCase());
  const pkg = pkgFile?.content ? tryParseJson<PackageJson>(pkgFile.content) : null;
  const scripts = pkg?.scripts ?? {};
  const scriptKeys = Object.keys(scripts);

  const matchesScript = (re: RegExp) =>
    scriptKeys.some((key) => re.test(key) || re.test(scripts[key] ?? ""));

  const hasLockfile = !!has(
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    "bun.lock",
    "Cargo.lock",
    "poetry.lock",
    "composer.lock",
    "Pipfile.lock",
    "go.sum",
    "Gemfile.lock",
  );

  let packageManager: string | null = null;
  if (has("pnpm-lock.yaml")) packageManager = "pnpm";
  else if (has("yarn.lock")) packageManager = "yarn";
  else if (has("bun.lockb", "bun.lock")) packageManager = "bun";
  else if (has("package-lock.json")) packageManager = "npm";
  else if (has("Cargo.lock")) packageManager = "cargo";
  else if (has("poetry.lock")) packageManager = "poetry";
  else if (has("Pipfile.lock")) packageManager = "pipenv";
  else if (has("go.sum")) packageManager = "go modules";
  else if (has("composer.lock")) packageManager = "composer";
  else if (has("Gemfile.lock")) packageManager = "bundler";

  const isTypescriptProject =
    !!has("tsconfig.json", "tsconfig.base.json") ||
    Array.from(classified.blobPathsLower.keys()).some(
      (p) => p.endsWith(".ts") || p.endsWith(".tsx"),
    );

  return {
    packageManager,
    hasLockfile,
    hasPackageJson: !!has("package.json"),
    hasTypecheckScript: matchesScript(/\b(typecheck|tsc|type-check)\b/i),
    hasLintScript: matchesScript(/\blint\b/i),
    hasFormatScript: matchesScript(/\b(format|prettier|biome)\b/i),
    hasTestScript: matchesScript(/\btest\b/i) || classified.hasTestSignals,
    hasBuildScript: matchesScript(/\bbuild\b/i),
    scriptKeys,
    isTypescriptProject,
    manifest: readManifest(classified),
  };
}
