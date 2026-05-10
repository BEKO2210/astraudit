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
  // Frontend frameworks
  { key: "react", label: "React" },
  { key: "next", label: "Next.js" },
  { key: "vue", label: "Vue" },
  { key: "nuxt", label: "Nuxt" },
  { key: "@angular/core", label: "Angular" },
  { key: "svelte", label: "Svelte" },
  { key: "@sveltejs/kit", label: "SvelteKit" },
  { key: "solid-js", label: "Solid" },
  { key: "@solidjs/start", label: "SolidStart" },
  { key: "@builder.io/qwik", label: "Qwik" },
  { key: "@qwik.dev/core", label: "Qwik" },
  { key: "@qwik.dev/router", label: "Qwik City" },
  { key: "astro", label: "Astro" },
  { key: "@remix-run/react", label: "Remix" },
  { key: "@remix-run/node", label: "Remix" },
  { key: "@tanstack/react-start", label: "TanStack Start" },
  { key: "@tanstack/start", label: "TanStack Start" },
  { key: "@tanstack/router", label: "TanStack Router" },
  { key: "@modern-js/app-tools", label: "Modern.js" },
  // Backend / API frameworks
  { key: "express", label: "Express" },
  { key: "fastify", label: "Fastify" },
  { key: "koa", label: "Koa" },
  { key: "@nestjs/core", label: "NestJS" },
  { key: "hono", label: "Hono" },
  { key: "elysia", label: "Elysia" },
  { key: "h3", label: "h3" },
  { key: "@trpc/server", label: "tRPC" },
  // Runtime libraries / patterns
  { key: "effect", label: "Effect" },
  { key: "rxjs", label: "RxJS" },
  // Mobile / desktop
  { key: "electron", label: "Electron" },
  { key: "@tauri-apps/api", label: "Tauri" },
  { key: "react-native", label: "React Native" },
  { key: "expo", label: "Expo" },
  // Styling
  { key: "tailwindcss", label: "Tailwind CSS" },
  { key: "@unocss/core", label: "UnoCSS" },
  { key: "styled-components", label: "styled-components" },
  { key: "@emotion/react", label: "Emotion" },
];

const BUILD_TOOL_HINTS: Array<{ key: string; label: string }> = [
  { key: "vite", label: "Vite" },
  { key: "webpack", label: "Webpack" },
  { key: "rollup", label: "Rollup" },
  { key: "esbuild", label: "esbuild" },
  { key: "parcel", label: "Parcel" },
  { key: "tsup", label: "tsup" },
  { key: "tsdown", label: "tsdown" },
  { key: "swc", label: "SWC" },
  { key: "@rspack/core", label: "Rspack" },
  { key: "rspress", label: "Rspress" },
  { key: "rsbuild", label: "Rsbuild" },
  { key: "unbuild", label: "unbuild" },
  { key: "@nx/vite", label: "Nx" },
];

const TEST_TOOL_HINTS: Array<{ key: string; label: string }> = [
  { key: "jest", label: "Jest" },
  { key: "vitest", label: "Vitest" },
  { key: "mocha", label: "Mocha" },
  { key: "ava", label: "AVA" },
  { key: "tap", label: "tap" },
  { key: "node:test", label: "node:test" },
  { key: "bun:test", label: "bun:test" },
  { key: "playwright", label: "Playwright" },
  { key: "@playwright/test", label: "Playwright" },
  { key: "cypress", label: "Cypress" },
  { key: "@testing-library", label: "Testing Library" },
];

const LINT_TOOL_HINTS: Array<{ key: string; label: string }> = [
  { key: "eslint", label: "ESLint" },
  { key: "@biomejs/biome", label: "Biome" },
  { key: "prettier", label: "Prettier" },
  { key: "stylelint", label: "Stylelint" },
  { key: "oxlint", label: "Oxlint" },
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

function detectEnvManagers(classified: ClassifiedFiles): string[] {
  const has = classified.hasFile;
  const out = new Set<string>();
  if (has(".mise.toml", "mise.toml")) out.add("mise");
  // .tool-versions is shared by mise and asdf — credit asdf only when no mise file exists
  if (has(".tool-versions") && !out.has("mise")) out.add("asdf");
  if (has(".nvmrc")) out.add("nvm");
  if (has(".node-version")) out.add("node-version");
  if (has(".python-version")) out.add("pyenv");
  if (has(".ruby-version")) out.add("rbenv");
  if (has(".sdkmanrc")) out.add("SDKMAN");
  if (has(".tool-versions") && out.has("mise")) {
    // mise reads .tool-versions in addition to its own files; mention both implicitly
  }
  if (has("flake.nix", "flake.lock", "shell.nix", "default.nix")) out.add("Nix");
  if (has("devbox.json", "devbox.lock")) out.add("Devbox");
  if (has(".devcontainer/devcontainer.json", ".devcontainer.json"))
    out.add("Dev Containers");
  return Array.from(out);
}

function detectPythonTools(classified: ClassifiedFiles): string[] {
  const has = classified.hasFile;
  const out = new Set<string>();
  if (has("uv.lock")) out.add("uv");
  if (has("pixi.toml", "pixi.lock")) out.add("Pixi");
  if (has("hatch.toml")) out.add("Hatch");
  if (has("poetry.lock")) out.add("Poetry");
  if (has("Pipfile.lock")) out.add("Pipenv");
  if (has("requirements.txt", "requirements/base.txt")) out.add("requirements.txt");
  if (has("environment.yml", "environment.yaml", "conda.yml")) out.add("Conda");
  if (has("setup.py")) out.add("setuptools");
  if (has("pdm.lock")) out.add("PDM");
  // Inspect pyproject.toml content if present for [tool.hatch] / [tool.poetry]
  const pyproject = classified.importantFileMap.get("pyproject.toml");
  if (pyproject?.content) {
    const c = pyproject.content;
    if (/\[tool\.hatch[\.\]]/.test(c)) out.add("Hatch");
    if (/\[tool\.poetry[\.\]]/.test(c)) out.add("Poetry");
    if (/\[tool\.uv[\.\]]/.test(c)) out.add("uv");
    if (/\[tool\.pdm[\.\]]/.test(c)) out.add("PDM");
    if (/\[tool\.ruff[\.\]]/.test(c)) out.add("Ruff");
  }
  return Array.from(out);
}

const SBOM_FILE_HINTS = [
  "sbom.json",
  "sbom.xml",
  "bom.json",
  "bom.xml",
  "cyclonedx.json",
  "cyclonedx.xml",
  "spdx.json",
  "spdx.yaml",
  ".sbom/sbom.json",
];

interface AiToolRule {
  id: string;
  label: string;
  files?: string[];
  folders?: string[];
}

/**
 * AI / agent dev-tooling integrations. Detection looks at config files
 * and dotfolders that these tools persist into a repository when they
 * are used regularly. Presence of these files means the maintainers
 * use the tool; it does not mean Astraudit endorses or audits them.
 */
const AI_DEV_TOOLS: AiToolRule[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    files: ["CLAUDE.md", "claude.md", ".claude.json"],
    folders: [".claude"],
  },
  {
    id: "cursor",
    label: "Cursor",
    files: [".cursorrules", ".cursor.json", "cursor.json"],
    folders: [".cursor"],
  },
  {
    id: "windsurf",
    label: "Windsurf",
    files: [".windsurfrules"],
    folders: [".windsurf"],
  },
  {
    id: "aider",
    label: "Aider",
    files: [
      ".aider.conf.yml",
      ".aider.conf.yaml",
      ".aiderignore",
      ".aider.model.metadata.json",
    ],
    folders: [".aider"],
  },
  {
    id: "github-copilot",
    label: "GitHub Copilot",
    files: [
      ".github/copilot-instructions.md",
      ".github/copilot-pull-request-description.md",
    ],
  },
  {
    id: "continue",
    label: "Continue",
    files: [".continuerc.json", "continue.config.ts"],
    folders: [".continue"],
  },
  {
    id: "cline",
    label: "Cline",
    files: [".clinerules"],
    folders: [".clinerules"],
  },
  {
    id: "roo-code",
    label: "Roo Code",
    files: [".roomodes"],
    folders: [".roo"],
  },
  {
    id: "codeium",
    label: "Codeium",
    files: ["codeium.json", ".codeiumignore"],
    folders: [".codeium"],
  },
  {
    id: "tabnine",
    label: "Tabnine",
    folders: [".tabnine"],
  },
  {
    id: "open-hands",
    label: "OpenHands",
    files: [".openhands.toml", "openhands.toml"],
    folders: [".openhands"],
  },
  {
    id: "open-interpreter",
    label: "Open Interpreter",
    files: ["interpreter.yaml"],
    folders: [".open-interpreter"],
  },
  {
    id: "gpt-pilot",
    label: "GPT-Pilot",
    folders: ["pilot"],
  },
  {
    id: "smolagents",
    label: "smolagents",
    files: ["smolagents.yaml"],
  },
  {
    id: "agents-md",
    label: "AGENTS.md spec",
    files: ["AGENTS.md", "agents.md"],
  },
];

function detectAiDevTools(classified: ClassifiedFiles): string[] {
  const has = classified.hasFile;
  const hasFolder = classified.hasFolder;
  const out: string[] = [];
  for (const rule of AI_DEV_TOOLS) {
    let hit = false;
    if (rule.files) {
      for (const f of rule.files) {
        if (has(f)) {
          hit = true;
          break;
        }
      }
    }
    if (!hit && rule.folders) {
      for (const f of rule.folders) {
        if (hasFolder(f)) {
          hit = true;
          break;
        }
      }
    }
    if (hit && !out.includes(rule.label)) out.push(rule.label);
  }
  return out;
}

function detectSboms(classified: ClassifiedFiles): string[] {
  const out: string[] = [];
  for (const candidate of SBOM_FILE_HINTS) {
    const hit = classified.hasFile(candidate);
    if (hit) out.push(hit);
  }
  // Also catch glob-ish patterns: any *.cdx.json / *.spdx.json file at the root.
  for (const lower of classified.blobPathsLower.keys()) {
    if (lower.includes("/")) continue; // root only
    if (
      lower.endsWith(".cdx.json") ||
      lower.endsWith(".spdx.json") ||
      lower.endsWith(".cdx.xml") ||
      lower.endsWith(".spdx.xml")
    ) {
      const original = classified.blobPathsLower.get(lower);
      if (original && !out.includes(original)) out.push(original);
    }
  }
  return out.slice(0, 6);
}

function detectMonorepo(
  classified: ClassifiedFiles,
  pkg: PackageJson | null,
): string | null {
  const has = classified.hasFile;
  if (has("turbo.json", "turbo.jsonc")) return "Turborepo";
  if (has("nx.json")) return "Nx";
  if (has("pnpm-workspace.yaml", "pnpm-workspace.yml")) return "pnpm workspaces";
  if (has("lerna.json")) return "Lerna";
  if (pkg && pkg.workspaces) return "npm/yarn workspaces";
  if (has("rush.json")) return "Rush";
  if (has("moon.yml", "moon.yaml")) return "Moon";
  if (has("WORKSPACE", "WORKSPACE.bazel", "MODULE.bazel")) return "Bazel";
  if (has(".pnp.cjs", ".pnp.loader.mjs")) return "Yarn Plug'n'Play";
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

  const envManagers = detectEnvManagers(classified);
  const pythonTools = detectPythonTools(classified);
  const sboms = detectSboms(classified);
  const aiDevTools = detectAiDevTools(classified);

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
    envManagers,
    pythonTools,
    sboms,
    aiDevTools,
  };
}
