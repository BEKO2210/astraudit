import type { LanguagesMap } from "../../types/github";
import type { StackSignals } from "../../types/audit";
import type { ClassifiedFiles } from "./fileClassifier";
import { tryParseJson } from "../utils/safeText";

interface PackageJson {
  name?: string;
  packageManager?: string;
  workspaces?: unknown;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  type?: string;
  engines?: Record<string, string>;
}

const FRAMEWORK_HINTS: Array<{ key: string; label: string }> = [
  { key: "react", label: "React" },
  { key: "next", label: "Next.js" },
  { key: "vue", label: "Vue" },
  { key: "nuxt", label: "Nuxt" },
  { key: "@angular/core", label: "Angular" },
  { key: "svelte", label: "Svelte" },
  { key: "@sveltejs/kit", label: "SvelteKit" },
  { key: "solid-js", label: "Solid" },
  { key: "express", label: "Express" },
  { key: "fastify", label: "Fastify" },
  { key: "koa", label: "Koa" },
  { key: "@nestjs/core", label: "NestJS" },
  { key: "@remix-run", label: "Remix" },
  { key: "astro", label: "Astro" },
  { key: "electron", label: "Electron" },
  { key: "react-native", label: "React Native" },
  { key: "expo", label: "Expo" },
  { key: "tailwindcss", label: "Tailwind CSS" },
];

const BUILD_TOOL_HINTS: Array<{ key: string; label: string }> = [
  { key: "vite", label: "Vite" },
  { key: "webpack", label: "Webpack" },
  { key: "rollup", label: "Rollup" },
  { key: "esbuild", label: "esbuild" },
  { key: "parcel", label: "Parcel" },
  { key: "tsup", label: "tsup" },
  { key: "swc", label: "SWC" },
];

const TEST_TOOL_HINTS: Array<{ key: string; label: string }> = [
  { key: "jest", label: "Jest" },
  { key: "vitest", label: "Vitest" },
  { key: "mocha", label: "Mocha" },
  { key: "ava", label: "AVA" },
  { key: "tap", label: "tap" },
  { key: "playwright", label: "Playwright" },
  { key: "cypress", label: "Cypress" },
  { key: "@testing-library", label: "Testing Library" },
];

const LINT_TOOL_HINTS: Array<{ key: string; label: string }> = [
  { key: "eslint", label: "ESLint" },
  { key: "@biomejs/biome", label: "Biome" },
  { key: "prettier", label: "Prettier" },
  { key: "stylelint", label: "Stylelint" },
];

function pickHints<T extends { key: string; label: string }>(
  hints: T[],
  pool: Record<string, string>,
): string[] {
  const picked = new Set<string>();
  for (const dep of Object.keys(pool)) {
    for (const hint of hints) {
      if (dep === hint.key || dep.startsWith(`${hint.key}/`)) {
        picked.add(hint.label);
      }
    }
  }
  return Array.from(picked);
}

function detectMonorepo(
  classified: ClassifiedFiles,
  pkg: PackageJson | null,
): string | null {
  if (classified.blobPaths.has("turbo.json")) return "Turborepo";
  if (classified.blobPaths.has("nx.json")) return "Nx";
  if (classified.blobPaths.has("pnpm-workspace.yaml")) return "pnpm workspaces";
  if (classified.blobPaths.has("lerna.json")) return "Lerna";
  if (pkg && pkg.workspaces) return "npm/yarn workspaces";
  if (classified.blobPaths.has("rush.json")) return "Rush";
  return null;
}

function detectPackageManager(classified: ClassifiedFiles): string | null {
  if (classified.blobPaths.has("pnpm-lock.yaml")) return "pnpm";
  if (classified.blobPaths.has("yarn.lock")) return "yarn";
  if (classified.blobPaths.has("bun.lockb")) return "bun";
  if (classified.blobPaths.has("package-lock.json")) return "npm";
  if (classified.blobPaths.has("Cargo.lock")) return "cargo";
  if (classified.blobPaths.has("poetry.lock")) return "poetry";
  if (classified.blobPaths.has("Pipfile.lock")) return "pipenv";
  if (classified.blobPaths.has("go.sum")) return "go modules";
  if (classified.blobPaths.has("composer.lock")) return "composer";
  return null;
}

function detectRuntime(
  classified: ClassifiedFiles,
  pkg: PackageJson | null,
  primaryLang: string | null,
): string | null {
  const blob = classified.blobPaths;
  if (blob.has("deno.json")) return "Deno";
  if (blob.has("bun.lockb")) return "Bun";

  const lang = primaryLang ? primaryLang.toLowerCase() : null;
  const hasNodeManifest = !!pkg;
  const isJsProject =
    lang === "javascript" || lang === "typescript" || lang === "coffeescript";

  // Strong signal: primary language matches a runtime ecosystem.
  if (lang === "rust") return "Rust";
  if (lang === "go") return "Go";
  if (lang === "ruby") return "Ruby";
  if (lang === "php") return "PHP";
  if (lang === "java" || lang === "kotlin" || lang === "scala") return "JVM";
  if (lang === "python") return "Python";

  // Fall back to config-file heuristics only when the project isn't
  // dominantly JavaScript/TypeScript — otherwise auxiliary build tooling
  // (e.g. pyproject.toml in a JS repo) would falsely set the runtime.
  if (!isJsProject) {
    if (blob.has("Cargo.toml")) return "Rust";
    if (blob.has("go.mod")) return "Go";
    if (blob.has("Gemfile")) return "Ruby";
    if (blob.has("composer.json")) return "PHP";
    if (blob.has("pom.xml") || blob.has("build.gradle")) return "JVM";
    if (blob.has("pyproject.toml") || blob.has("requirements.txt"))
      return "Python";
  }

  if (hasNodeManifest || isJsProject) return "Node.js";
  return null;
}

export function detectStack(
  classified: ClassifiedFiles,
  languages: LanguagesMap,
): StackSignals {
  const pkgFile = classified.importantFileMap.get("package.json");
  const pkg = pkgFile?.content ? tryParseJson<PackageJson>(pkgFile.content) : null;

  const allDeps: Record<string, string> = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
    ...(pkg?.peerDependencies ?? {}),
  };

  const frameworks = pickHints(FRAMEWORK_HINTS, allDeps);
  const buildTools = pickHints(BUILD_TOOL_HINTS, allDeps);
  const testTools = pickHints(TEST_TOOL_HINTS, allDeps);
  const lintTools = pickHints(LINT_TOOL_HINTS, allDeps);

  const totalBytes = Object.values(languages).reduce((sum, n) => sum + n, 0);
  const languagesArr = Object.entries(languages)
    .map(([name, bytes]) => ({
      name,
      bytes,
      share: totalBytes ? bytes / totalBytes : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const containerized =
    classified.blobPaths.has("Dockerfile") ||
    classified.blobPaths.has("docker-compose.yml") ||
    classified.blobPaths.has("docker-compose.yaml");

  const dependencyCounts = pkg
    ? {
        dependencies: pkg.dependencies ? Object.keys(pkg.dependencies).length : 0,
        devDependencies: pkg.devDependencies
          ? Object.keys(pkg.devDependencies).length
          : 0,
      }
    : null;

  const language = languagesArr[0]?.name ?? null;
  const monorepoTool = detectMonorepo(classified, pkg);
  const packageManager = detectPackageManager(classified);
  const runtime = detectRuntime(classified, pkg, language);

  const hasLockfile =
    !!packageManager &&
    [
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "bun.lockb",
      "Cargo.lock",
      "poetry.lock",
      "Pipfile.lock",
      "go.sum",
      "composer.lock",
    ].some((f) => classified.blobPaths.has(f));

  return {
    language,
    languages: languagesArr,
    packageManager,
    runtime,
    frameworks,
    buildTools,
    testTools,
    lintTools,
    monorepoTool,
    containerized,
    hasLockfile,
    dependencyCounts,
  };
}
