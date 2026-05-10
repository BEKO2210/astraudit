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
  const has = classified.hasFile;
  if (has("turbo.json")) return "Turborepo";
  if (has("nx.json")) return "Nx";
  if (has("pnpm-workspace.yaml", "pnpm-workspace.yml")) return "pnpm workspaces";
  if (has("lerna.json")) return "Lerna";
  if (pkg && pkg.workspaces) return "npm/yarn workspaces";
  if (has("rush.json")) return "Rush";
  if (has("moon.yml")) return "Moon";
  return null;
}

function detectPackageManager(classified: ClassifiedFiles): string | null {
  const has = classified.hasFile;
  if (has("pnpm-lock.yaml")) return "pnpm";
  if (has("yarn.lock")) return "yarn";
  if (has("bun.lockb", "bun.lock")) return "bun";
  if (has("package-lock.json")) return "npm";
  if (has("Cargo.lock")) return "cargo";
  if (has("poetry.lock")) return "poetry";
  if (has("Pipfile.lock")) return "pipenv";
  if (has("go.sum")) return "go modules";
  if (has("composer.lock")) return "composer";
  if (has("Gemfile.lock")) return "bundler";
  return null;
}

function detectRuntime(
  classified: ClassifiedFiles,
  pkg: PackageJson | null,
  primaryLang: string | null,
): string | null {
  const has = classified.hasFile;
  if (has("deno.json", "deno.jsonc")) return "Deno";
  if (has("bun.lockb", "bun.lock")) return "Bun";

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
    if (has("Cargo.toml")) return "Rust";
    if (has("go.mod")) return "Go";
    if (has("Gemfile")) return "Ruby";
    if (has("composer.json")) return "PHP";
    if (has("pom.xml", "build.gradle", "build.gradle.kts")) return "JVM";
    if (has("pyproject.toml", "requirements.txt", "setup.py")) return "Python";
  }

  if (hasNodeManifest || isJsProject) return "Node.js";
  return null;
}

export function detectStack(
  classified: ClassifiedFiles,
  languages: LanguagesMap,
): StackSignals {
  const pkgFile =
    classified.importantFileMap.get("package.json") ??
    classified.importantFileMap.get("package.json".toLowerCase());
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

  const containerized = !!classified.hasFile(
    "Dockerfile",
    "dockerfile",
    "Containerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
  );

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
    !!classified.hasFile(
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "bun.lockb",
      "bun.lock",
      "Cargo.lock",
      "poetry.lock",
      "Pipfile.lock",
      "go.sum",
      "composer.lock",
      "Gemfile.lock",
    );

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
