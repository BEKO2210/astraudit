import type { ClassifiedFiles } from "./fileClassifier";
import { tryParseJson } from "../utils/safeText";

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
}

interface PackageJson {
  scripts?: Record<string, string>;
}

export function analyzeDependencies(
  classified: ClassifiedFiles,
): DependencySignals {
  const pkgFile = classified.importantFileMap.get("package.json");
  const pkg = pkgFile?.content ? tryParseJson<PackageJson>(pkgFile.content) : null;
  const scripts = pkg?.scripts ?? {};
  const scriptKeys = Object.keys(scripts);

  const has = (re: RegExp) =>
    scriptKeys.some((key) => re.test(key) || re.test(scripts[key] ?? ""));

  const hasLockfile =
    classified.blobPaths.has("package-lock.json") ||
    classified.blobPaths.has("pnpm-lock.yaml") ||
    classified.blobPaths.has("yarn.lock") ||
    classified.blobPaths.has("bun.lockb") ||
    classified.blobPaths.has("Cargo.lock") ||
    classified.blobPaths.has("poetry.lock") ||
    classified.blobPaths.has("composer.lock") ||
    classified.blobPaths.has("Pipfile.lock") ||
    classified.blobPaths.has("go.sum");

  let packageManager: string | null = null;
  if (classified.blobPaths.has("pnpm-lock.yaml")) packageManager = "pnpm";
  else if (classified.blobPaths.has("yarn.lock")) packageManager = "yarn";
  else if (classified.blobPaths.has("bun.lockb")) packageManager = "bun";
  else if (classified.blobPaths.has("package-lock.json")) packageManager = "npm";
  else if (classified.blobPaths.has("Cargo.lock")) packageManager = "cargo";
  else if (classified.blobPaths.has("poetry.lock")) packageManager = "poetry";
  else if (classified.blobPaths.has("Pipfile.lock")) packageManager = "pipenv";
  else if (classified.blobPaths.has("go.sum")) packageManager = "go modules";
  else if (classified.blobPaths.has("composer.lock")) packageManager = "composer";

  const isTypescriptProject =
    classified.blobPaths.has("tsconfig.json") ||
    Array.from(classified.blobPaths).some((p) => p.endsWith(".ts") || p.endsWith(".tsx"));

  return {
    packageManager,
    hasLockfile,
    hasPackageJson: classified.blobPaths.has("package.json"),
    hasTypecheckScript: has(/\b(typecheck|tsc|type-check)\b/i),
    hasLintScript: has(/\blint\b/i),
    hasFormatScript: has(/\b(format|prettier)\b/i),
    hasTestScript: has(/\btest\b/i) || classified.hasTestSignals,
    hasBuildScript: has(/\bbuild\b/i),
    scriptKeys,
    isTypescriptProject,
  };
}
