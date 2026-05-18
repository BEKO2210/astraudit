export const IMPORTANT_ROOT_FILES = [
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "CODEOWNERS",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "tsconfig.json",
  "jsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs",
  "webpack.config.js",
  "rollup.config.js",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  ".eslintrc",
  ".eslintrc.json",
  ".eslintrc.js",
  ".prettierrc",
  ".prettierrc.json",
  "biome.json",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Makefile",
  ".env.example",
  ".gitignore",
  "pyproject.toml",
  "requirements.txt",
  "Pipfile",
  "poetry.lock",
  "Cargo.toml",
  "Cargo.lock",
  "go.mod",
  "go.sum",
  "pom.xml",
  "build.gradle",
  "composer.json",
  "Gemfile",
  "deno.json",
  "turbo.json",
  "nx.json",
];

/**
 * Canonical → alternate filename map for the `IMPORTANT_ROOT_FILES`
 * presence check. When a repo ships an alias the classifier treats
 * the canonical entry as present and surfaces the actual filename in
 * `importantFilesPresent`, so the dashboard's "Important files
 * present" / "Notable missing files" panels stay honest on
 * ecosystems that don't use the modern convention.
 *
 * Examples
 * - `History.md` is the canonical Node.js-era release log
 *   (expressjs/express, Bun's lockb, every koajs repo, …).
 * - `CHANGES`/`CHANGES.md` is the Python / Werkzeug convention.
 * - `LICENSE.md` / `LICENSE.txt` / `COPYING` are common license
 *   filename variants the SPDX classifier already tolerates but
 *   the presence check should too.
 * - `Code-Of-Conduct.md` is the dashed form (CNCF / Express-style).
 *
 * Casing is irrelevant — the classifier already does case-insensitive
 * lookups; only punctuation / extension variants need to be listed
 * here.
 */
export const IMPORTANT_FILE_ALIASES: Record<string, readonly string[]> = {
  "CHANGELOG.md": ["History.md", "HISTORY.md", "CHANGELOG", "CHANGELOG.markdown", "CHANGES.md", "CHANGES"],
  "LICENSE": ["LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md", "COPYING", "COPYING.md"],
  "CODE_OF_CONDUCT.md": ["Code-Of-Conduct.md", "CODE-OF-CONDUCT.md", "CodeOfConduct.md", ".github/CODE_OF_CONDUCT.md"],
  "CONTRIBUTING.md": ["Contributing.md", ".github/CONTRIBUTING.md", "docs/CONTRIBUTING.md"],
  "SECURITY.md": ["Security.md", ".github/SECURITY.md", "docs/SECURITY.md"],
  "CODEOWNERS": [".github/CODEOWNERS", "docs/CODEOWNERS"],
};

export const IMPORTANT_FOLDERS = [
  "src",
  "app",
  "pages",
  "components",
  "lib",
  "packages",
  "services",
  "server",
  "client",
  "docs",
  "test",
  "tests",
  "__tests__",
  "spec",
  "e2e",
  "cypress",
  "playwright",
  ".github",
  ".github/workflows",
  "scripts",
  "examples",
  "demo",
  "public",
  "assets",
  "config",
  "infra",
  "deployment",
  "k8s",
  "helm",
  // Phase 7.0.6 — per-stack canonical source folders so the
  // structure detector can credit ecosystem-idiomatic layouts:
  //   - `cmd`, `internal`, `pkg`: Go (github.com/golang-standards
  //     /project-layout).
  //   - `crates`: Rust Cargo workspaces.
  "cmd",
  "internal",
  "pkg",
  "crates",
];

export const SUSPICIOUS_FILE_HINTS = [
  ".env",
  "secret",
  "secrets",
  "token",
  "credentials",
  "private_key",
  "id_rsa",
  "id_dsa",
  "key.pem",
  "cert.pem",
  "service-account",
  "firebase-adminsdk",
  "aws-credentials",
  "kubeconfig",
];

export const SUSPICIOUS_ALLOW_LIST = [
  ".env.example",
  ".env.sample",
  ".env.template",
  ".env.test.example",
];

export const TEST_FOLDER_HINTS = [
  "test/",
  "tests/",
  "__tests__/",
  "spec/",
  "e2e/",
  "cypress/",
  "playwright/",
];

export const TEST_FILE_HINTS = [
  ".test.",
  ".spec.",
  "_test.",
  "_spec.",
  // Phase 7.0.6 — per-stack test-file conventions. pytest's
  // canonical pattern is `test_*.py`; RSpec's is `spec/*_spec.rb`
  // (already caught by `_spec.`). Adding `test_` here lets Python
  // repos that follow pytest's recommended layout register as
  // "has tests" without forcing them to also ship a `tests/` folder.
  // We require the `test_` prefix to come right after a path
  // separator so it doesn't false-positive on substrings like
  // `manifest_loader.go`. The matcher does `p.includes(hint)`, so
  // we slash-anchor here.
  "/test_",
];
