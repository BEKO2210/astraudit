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
});
