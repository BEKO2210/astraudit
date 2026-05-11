import { describe, expect, it } from "vitest";
import { runAudit } from "../../../src/lib/audit/auditEngine";
import { makeBundle } from "../../fixtures/builders";

describe("runAudit", () => {
  it("produces a result with all required sections", () => {
    const bundle = makeBundle({
      paths: [
        "README.md",
        "LICENSE",
        "package.json",
        "package-lock.json",
        "src/index.ts",
        "tests/index.test.ts",
        ".github/workflows/ci.yml",
      ],
      importantFiles: {
        "package.json": JSON.stringify({
          dependencies: { react: "18.0.0" },
          devDependencies: { vitest: "1.0.0", eslint: "9.0.0" },
          scripts: { build: "vite build", test: "vitest run" },
        }),
      },
      readmeContent: `# Demo\n\n## Installation\n\nnpm install demo\n\n## Usage\n\nimport demo`,
    });

    const result = runAudit(bundle);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.maxScore).toBe(100);
    expect(result.categories.length).toBe(8);
    expect(result.story.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeLessThanOrEqual(7);
    expect(result.graph.nodes.length).toBeGreaterThan(0);
    expect(result.headline).toMatch(/.+/);
  });

  it("does NOT recommend SECURITY.md when one is already present", () => {
    const bundle = makeBundle({
      paths: [
        "README.md",
        "LICENSE",
        "SECURITY.md",
        "package.json",
        ".github/workflows/ci.yml",
      ],
      importantFiles: {
        "package.json": JSON.stringify({ dependencies: { react: "18.0.0" } }),
      },
      readmeContent: `# Demo\n\n## Installation\n\nnpm install demo`,
    });
    const result = runAudit(bundle);
    const titles = result.recommendations.map((r) => r.title.toLowerCase());
    for (const t of titles) {
      expect(t).not.toContain("add a security.md");
    }
  });

  it("recommends Add a LICENSE when no LICENSE is present", () => {
    const bundle = makeBundle({
      paths: ["README.md", "package.json"],
      readmeContent: `# Demo`,
      metadata: { license: null },
    });
    const result = runAudit(bundle);
    const hasLicenseReco = result.recommendations.some((r) =>
      /license/i.test(r.title),
    );
    expect(hasLicenseReco).toBe(true);
  });

  it("does not flag committed .env when it lives in test fixtures only", () => {
    const bundle = makeBundle({
      paths: [
        "README.md",
        "LICENSE",
        "tests/fixtures/.env",
        "package.json",
      ],
      readmeContent: `# Demo\n## Installation\nnpm install`,
    });
    const result = runAudit(bundle);
    const envFinding = result.findings.find((f) =>
      /\.env file/i.test(f.title),
    );
    expect(envFinding).toBeUndefined();
  });

  it("emits a Repository age section in the story", () => {
    const bundle = makeBundle({
      paths: ["README.md", "package.json"],
      readmeContent: `# Demo`,
    });
    const result = runAudit(bundle);
    const ageSection = result.story.find((s) =>
      /age/i.test(s.heading),
    );
    expect(ageSection).toBeDefined();
  });

  it("scores higher when an SBOM is present", () => {
    const base = makeBundle({
      paths: ["README.md", "LICENSE", "package.json"],
      readmeContent: `# Demo\n## Installation\nnpm install`,
    });
    const withSbom = makeBundle({
      paths: ["README.md", "LICENSE", "package.json", "sbom.json"],
      readmeContent: `# Demo\n## Installation\nnpm install`,
    });
    expect(runAudit(withSbom).insights.trustScore).toBeGreaterThan(
      runAudit(base).insights.trustScore,
    );
  });

  // Phase 7.0.6 — per-stack rule packs. The structure category used
  // to scold any project that didn't ship `src/`, `app/`, or `lib/`
  // — which read as JS-centric noise on Go / Rust / Ruby repos that
  // follow their own ecosystem layout. These tests lock the
  // stack-aware acceptance against regression.
  describe("Phase 7.0.6 — per-stack source-layout acceptance", () => {
    it("credits a Go project shipping cmd/internal/pkg as a recognised layout", () => {
      const bundle = makeBundle({
        languages: { Go: 95_000, "Go Module": 5_000 },
        paths: [
          "README.md",
          "LICENSE",
          "go.mod",
          "go.sum",
          "cmd/myapp/main.go",
          "internal/server/server.go",
          "pkg/api/api.go",
          "internal/server/server_test.go",
        ],
      });
      const result = runAudit(bundle);
      const structure = result.categories.find((c) => c.key === "structure");
      expect(structure, "structure category present").toBeTruthy();
      const evidence = structure!.evidence.join("\n");
      expect(evidence).toMatch(/Recognised source layout \(Go/);
      expect(evidence).not.toMatch(/No standard source directory/);
    });

    it("credits a Rust workspace shipping crates/ as a recognised layout", () => {
      const bundle = makeBundle({
        languages: { Rust: 90_000 },
        paths: [
          "README.md",
          "LICENSE",
          "Cargo.toml",
          "Cargo.lock",
          "crates/core/src/lib.rs",
          "crates/cli/src/main.rs",
        ],
      });
      const result = runAudit(bundle);
      const structure = result.categories.find((c) => c.key === "structure");
      const evidence = structure!.evidence.join("\n");
      expect(evidence).toMatch(/Recognised source layout \(Rust workspace/);
    });

    it("credits a Ruby on Rails project shipping app/ as a recognised layout", () => {
      const bundle = makeBundle({
        languages: { Ruby: 100_000 },
        paths: [
          "README.md",
          "LICENSE",
          "Gemfile",
          "Gemfile.lock",
          "app/controllers/application_controller.rb",
          "app/models/user.rb",
          "lib/tasks/seed.rake",
        ],
      });
      const result = runAudit(bundle);
      const structure = result.categories.find((c) => c.key === "structure");
      const evidence = structure!.evidence.join("\n");
      expect(evidence).toMatch(/Recognised source layout \(Ruby on Rails/);
    });

    it("falls back to the stack-named miss-copy on a flat Go repo", () => {
      // No source folder, but Go-detected via go.mod. The miss-copy
      // should name Go conventions, not JS ones.
      const bundle = makeBundle({
        languages: { Go: 50_000 },
        paths: ["README.md", "main.go", "go.mod"],
      });
      const result = runAudit(bundle);
      const structure = result.categories.find((c) => c.key === "structure");
      const evidence = structure!.evidence.join("\n");
      expect(evidence).toMatch(/cmd\/, internal\/, pkg\/, or src\//);
    });

    it("detects pytest's `test_*.py` files nested under a package", () => {
      // The `/test_` hint catches pytest's canonical pattern when
      // tests live inside a package subdirectory. The legacy
      // `_test.` / `_spec.` hints would miss this.
      const bundle = makeBundle({
        languages: { Python: 80_000 },
        paths: [
          "README.md",
          "LICENSE",
          "pyproject.toml",
          "src/mypkg/__init__.py",
          "src/mypkg/test_core.py",
        ],
      });
      const result = runAudit(bundle);
      const structure = result.categories.find((c) => c.key === "structure");
      const evidence = structure!.evidence.join("\n");
      expect(evidence).toMatch(/Test directory or test files detected/);
    });
  });
});
