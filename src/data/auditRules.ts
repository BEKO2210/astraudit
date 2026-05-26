export const IMPORTANT_ROOT_FILES = [
  "README.md",
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
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
  ".prettierrc.yml",
  ".prettierrc.yaml",
  ".eslintrc.yml",
  ".eslintrc.yaml",
  "biome.json",
  ".mocharc.yml",
  ".mocharc.yaml",
  ".mocharc.js",
  ".mocharc.cjs",
  ".mocharc.json",
  "jest.config.js",
  "jest.config.ts",
  "jest.config.mjs",
  "jest.config.cjs",
  "vitest.config.ts",
  "vitest.config.js",
  "playwright.config.ts",
  "playwright.config.js",
  "cypress.config.js",
  "cypress.config.ts",
  "karma.conf.js",
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
  // Dart / Flutter — pubspec is the canonical manifest. Without
  // this entry the structure detector reports "no manifest" on
  // every sass/dart-sass-style repo.
  "pubspec.yaml",
  "pubspec.lock",
  // .NET — project / solution files.
  "Directory.Build.props",
  "Directory.Packages.props",
  "global.json",
  "nuget.config",
  // Conan / vcpkg / CMake — C/C++ ecosystem manifests.
  "CMakeLists.txt",
  "conanfile.txt",
  "conanfile.py",
  "vcpkg.json",
  // Bazel / Buck — meta-build systems.
  "WORKSPACE",
  "WORKSPACE.bazel",
  "MODULE.bazel",
  "BUILD.bazel",
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
  "CHANGELOG.md": [
    "History.md",
    "HISTORY.md",
    "CHANGELOG",
    "CHANGELOG.markdown",
    "CHANGELOG.rst",
    "CHANGELOG.txt",
    "CHANGES.md",
    "CHANGES.rst",
    "CHANGES.txt",
    "CHANGES",
    "NEWS.md",
    "NEWS.rst",
    "NEWS",
    "ReleaseNotes.md",
    "RELEASES.md",
    "RELEASES",
  ],
  "LICENSE": [
    "LICENSE.md",
    "LICENSE.txt",
    "LICENSE.rst",
    "LICENCE",
    "LICENCE.md",
    "LICENCE.txt",
    "COPYING",
    "COPYING.md",
    "COPYING.txt",
    "COPYING.LESSER",
    "COPYRIGHT",
    "COPYRIGHT.md",
    "UNLICENSE",
    "License",
    "License.md",
    "License.txt",
    "license",
    "license.md",
    "license.txt",
    // Apache + MIT dual-licensed projects (rust-lang/rust, many crates)
    // commonly ship both files. Either one satisfies "has a license".
    "LICENSE-MIT",
    "LICENSE-APACHE",
    "LICENSE-APACHE-2.0",
    "LICENSE.MIT",
    "LICENSE.APACHE",
  ],
  "CODE_OF_CONDUCT.md": [
    "Code-Of-Conduct.md",
    "Code-of-Conduct.md",
    "Code-of-conduct.md",
    "CODE-OF-CONDUCT.md",
    "code-of-conduct.md",
    "CodeOfConduct.md",
    "code_of_conduct.md",
    "CODE_OF_CONDUCT",
    "CODE_OF_CONDUCT.markdown",
    "CODE_OF_CONDUCT.rst",
    "CODE_OF_CONDUCT.txt",
    "CODEOFCONDUCT.md",
    ".github/CODE_OF_CONDUCT.md",
    ".github/CODE_OF_CONDUCT.rst",
    ".github/CODE_OF_CONDUCT",
    "docs/CODE_OF_CONDUCT.md",
    "docs/code-of-conduct.md",
  ],
  "CONTRIBUTING.md": [
    "Contributing.md",
    "contributing.md",
    "CONTRIBUTING",
    "CONTRIBUTING.markdown",
    "CONTRIBUTING.rst",
    "CONTRIBUTING.txt",
    "CONTRIBUTING.adoc",
    "CONTRIBUTING.asciidoc",
    ".github/CONTRIBUTING.md",
    ".github/CONTRIBUTING.rst",
    ".github/CONTRIBUTING",
    "docs/CONTRIBUTING.md",
    "docs/CONTRIBUTING.rst",
    "docs/contributing.md",
  ],
  "SECURITY.md": [
    "Security.md",
    "security.md",
    "SECURITY",
    "SECURITY.markdown",
    "SECURITY.rst",
    "SECURITY.txt",
    "SECURITY.adoc",
    ".github/SECURITY.md",
    ".github/SECURITY.rst",
    ".github/SECURITY",
    "docs/SECURITY.md",
    "docs/SECURITY.rst",
    "docs/security.md",
  ],
  "CODEOWNERS": [
    ".github/CODEOWNERS",
    "docs/CODEOWNERS",
    ".gitlab/CODEOWNERS",
    ".gitea/CODEOWNERS",
  ],
  // Many JS ecosystems use `README.md`, but reST (Python) and AsciiDoc
  // (Asciidoctor / Spring) projects ship `.rst` / `.adoc`. Without
  // aliases the panel reports "missing README" on Django, Flask,
  // Sphinx, and most Spring projects. The classifier still flags the
  // canonical "README.md" name in the missing list otherwise.
  "README.md": [
    "Readme.md",
    "readme.md",
    "README",
    "README.markdown",
    "README.rst",
    "README.txt",
    "README.adoc",
    "README.asciidoc",
    "ReadMe.md",
    "Readme.markdown",
  ],
  // Phase 7.x — bundler / framework config aliases. Modern
  // projects regularly ship `.mts` / `.cts` ESM-typed configs;
  // Next 15 supports `.ts` configs natively; webpack/rollup
  // commonly use `.cjs` for CommonJS pinning. Without these
  // aliases the "Notable missing files" panel would list every
  // canonical as missing on a repo that just picked a different
  // extension. Each entry only adds an alias — the canonical
  // is what shows in the panel when nothing better matches.
  "vite.config.ts": ["vite.config.js", "vite.config.mts", "vite.config.cts", "vite.config.mjs", "vite.config.cjs"],
  "vite.config.js": ["vite.config.ts", "vite.config.mts", "vite.config.cts", "vite.config.mjs", "vite.config.cjs"],
  "next.config.js": ["next.config.mjs", "next.config.ts", "next.config.cjs"],
  "next.config.mjs": ["next.config.js", "next.config.ts", "next.config.cjs"],
  "webpack.config.js": ["webpack.config.ts", "webpack.config.mjs", "webpack.config.cjs"],
  "rollup.config.js": ["rollup.config.ts", "rollup.config.mjs", "rollup.config.cjs"],
  // eslint 9 with --experimental-cli + tsx supports a TS config.
  "eslint.config.js": ["eslint.config.ts", "eslint.config.mjs", "eslint.config.cjs"],
  "eslint.config.mjs": ["eslint.config.js", "eslint.config.ts", "eslint.config.cjs"],
  "eslint.config.cjs": ["eslint.config.js", "eslint.config.ts", "eslint.config.mjs"],
  // Legacy eslintrc supports YAML/YML on top of the JSON/JS forms (expressjs/express ships
  // `.eslintrc.yml`). Without these aliases the "Notable missing files" panel would say
  // "no ESLint config" on a repo that clearly has one.
  ".eslintrc": [".eslintrc.json", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yml", ".eslintrc.yaml"],
  ".eslintrc.json": [".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yml", ".eslintrc.yaml"],
  ".eslintrc.js": [".eslintrc", ".eslintrc.json", ".eslintrc.cjs", ".eslintrc.yml", ".eslintrc.yaml"],
  ".eslintrc.yml": [".eslintrc", ".eslintrc.json", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yaml"],
  ".eslintrc.yaml": [".eslintrc", ".eslintrc.json", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yml"],
  // Biome accepts JSONC variant since v1.5.
  "biome.json": ["biome.jsonc"],
  // Prettier honours every JS variant + JSON + YAML configs (toml too in newer
  // versions). Without YAML/YML the "no Prettier config" line fires on every
  // repo that ships `.prettierrc.yml` instead.
  ".prettierrc": [".prettierrc.json", ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.mjs", ".prettierrc.yml", ".prettierrc.yaml", ".prettierrc.toml", "prettier.config.js", "prettier.config.cjs", "prettier.config.mjs", "prettier.config.ts"],
  ".prettierrc.json": [".prettierrc", ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.mjs", ".prettierrc.yml", ".prettierrc.yaml", "prettier.config.js", "prettier.config.cjs", "prettier.config.mjs", "prettier.config.ts"],
  ".prettierrc.js": [".prettierrc", ".prettierrc.json", ".prettierrc.cjs", ".prettierrc.mjs", ".prettierrc.yml", ".prettierrc.yaml", "prettier.config.js", "prettier.config.cjs", "prettier.config.mjs", "prettier.config.ts"],
  ".prettierrc.yml": [".prettierrc", ".prettierrc.json", ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.yaml", "prettier.config.js"],
  ".prettierrc.yaml": [".prettierrc", ".prettierrc.json", ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.yml", "prettier.config.js"],
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
  // Per-stack idiomatic test directories. Without these, the audit's
  // "Code Quality" detector reports "no tests" on Maven/Gradle Java
  // projects (`src/test/java/`), Rails apps (`spec/`), Go modules
  // (`*_test.go` files — handled in TEST_FILE_HINTS), and Python
  // pytest layouts (`tests/` already covered).
  "src/test/",
  "src/Test/",
  "src/tests/",
  "src/spec/",
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
  // Go's canonical test-file convention: `<name>_test.go`. The
  // existing `_test.` matches it, but only because the `.` happens
  // to follow `_test`. Pin the Go-style extension explicitly so a
  // file named e.g. `foo_test.go` registers regardless of upstream
  // refactors to the existing hint.
  "_test.go",
  // Rust `#[cfg(test)]` integration tests live in `tests/<name>.rs`,
  // already covered by TEST_FOLDER_HINTS. But unit tests inside
  // `src/` are conventionally inline in the same `.rs` file; the
  // file-name heuristic can't see those without parsing, so we
  // accept the `tests/` folder + `Cargo.toml` presence as the
  // signal at the detector level.
  // Java tests: `*Test.java`, `*Tests.java`, `*IT.java` (integration).
  "test.java",
  "tests.java",
  // Ruby RSpec: `<name>_spec.rb` already caught by `_spec.`.
  // PHP: `<Name>Test.php`.
  "test.php",
  // .NET: `<Name>Tests.cs`. Conventionally PascalCase, but the
  // matcher is case-insensitive (we lowercase paths before testing).
  "tests.cs",
];
