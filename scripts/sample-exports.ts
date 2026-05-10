/**
 * Phase 5.8 follow-up — sample-export generator.
 *
 * Runs the rich print-validation fixture through `runAudit` and
 * writes one sample of each export format to `.audit-cache/` so the
 * user can visually inspect Markdown / JSON / AsciiDoc output without
 * spinning up a browser.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { makeBundle } from "../tests/fixtures/builders";
import { runAudit } from "../src/lib/audit/auditEngine";
import { exportAudit } from "../src/lib/export/auditExport";

const OUT_DIR = join(process.cwd(), ".audit-cache");
mkdirSync(OUT_DIR, { recursive: true });

const bundle = makeBundle({
  metadata: {
    fullName: "demo-org/sample",
    name: "sample",
    owner: {
      login: "demo-org",
      avatarUrl: "https://example.com/a.png",
      htmlUrl: "https://example.com/demo-org",
      type: "Organization",
    },
    description: "Sample audit fixture used to demonstrate export formats.",
    stars: 1234,
    defaultBranch: "main",
    language: "TypeScript",
    topics: ["typescript", "react", "vite"],
    license: { spdxId: "MIT", name: "MIT License" },
  },
  paths: [
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "package.json",
    "src/index.ts",
    "tests/index.test.ts",
    ".github/workflows/ci.yml",
    ".github/dependabot.yml",
  ],
  importantFiles: {
    "package.json": JSON.stringify({
      name: "sample",
      scripts: { build: "vite build", test: "vitest run", lint: "eslint ." },
      dependencies: { react: "^18.0.0" },
    }),
    "SECURITY.md": "# Security Policy\n\nReport vulnerabilities to security@example.com.",
  },
  readmeContent: "# Sample\n\n## Installation\nnpm install\n\n## Usage\nnpm run dev",
  workflows: [
    { name: "CI", path: ".github/workflows/ci.yml", state: "active" },
  ],
  recentCommits: [
    { sha: "a1", message: "Initial commit", authorName: "Alice", authorDate: new Date(Date.now() - 86_400_000).toISOString() },
    { sha: "b2", message: "Add feature", authorName: "Bob", authorDate: new Date(Date.now() - 2 * 86_400_000).toISOString() },
  ],
});

const result = runAudit(bundle);

for (const format of ["json", "markdown", "asciidoc"] as const) {
  const file = exportAudit(result, format);
  const out = join(OUT_DIR, file.filename);
  writeFileSync(out, file.content);
  console.log(`Wrote ${file.filename} (${file.content.length} bytes) → ${out}`);
}
