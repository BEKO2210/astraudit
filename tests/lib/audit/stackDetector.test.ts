import { describe, expect, it } from "vitest";
import { classifyFiles } from "../../../src/lib/audit/fileClassifier";
import { detectStack } from "../../../src/lib/audit/stackDetector";
import { makeImportantFiles, makeTree } from "../../fixtures/builders";

function classify(paths: string[], importantFiles: Record<string, string | null> = {}) {
  return classifyFiles(makeTree(paths), makeImportantFiles(importantFiles));
}

describe("detectStack", () => {
  it("detects React + Vite + ESLint from package.json", () => {
    const pkg = JSON.stringify({
      dependencies: { react: "18.0.0" },
      devDependencies: { vite: "5.0.0", eslint: "9.0.0" },
    });
    const stack = detectStack(
      classify(["package.json"], { "package.json": pkg }),
      { TypeScript: 100 },
    );
    expect(stack.frameworks).toContain("React");
    expect(stack.buildTools).toContain("Vite");
    expect(stack.lintTools).toContain("ESLint");
  });

  it("detects modern frameworks (Hono, Effect, Qwik)", () => {
    const pkg = JSON.stringify({
      dependencies: {
        hono: "4.0.0",
        effect: "3.0.0",
        "@builder.io/qwik": "1.5.0",
      },
    });
    const stack = detectStack(
      classify(["package.json"], { "package.json": pkg }),
      { TypeScript: 100 },
    );
    expect(stack.frameworks).toContain("Hono");
    expect(stack.frameworks).toContain("Effect");
    expect(stack.frameworks).toContain("Qwik");
  });

  it("detects monorepo signals", () => {
    expect(
      detectStack(classify(["turbo.json"]), {}).monorepoTool,
    ).toBe("Turborepo");
    expect(
      detectStack(classify(["pnpm-workspace.yaml"]), {}).monorepoTool,
    ).toBe("pnpm workspaces");
    expect(
      detectStack(classify(["MODULE.bazel"]), {}).monorepoTool,
    ).toBe("Bazel");
  });

  it("detects env managers", () => {
    expect(detectStack(classify([".mise.toml"]), {}).envManagers).toContain("mise");
    expect(detectStack(classify([".tool-versions"]), {}).envManagers).toContain("asdf");
    expect(detectStack(classify([".nvmrc"]), {}).envManagers).toContain("nvm");
    expect(detectStack(classify(["flake.nix"]), {}).envManagers).toContain("Nix");
    expect(
      detectStack(classify([".devcontainer/devcontainer.json"]), {}).envManagers,
    ).toContain("Dev Containers");
  });

  it("does not credit asdf when mise is also present", () => {
    const env = detectStack(classify([".mise.toml", ".tool-versions"]), {}).envManagers;
    expect(env).toContain("mise");
    expect(env).not.toContain("asdf");
  });

  it("detects Python tooling from files and pyproject.toml content", () => {
    const py = `[tool.hatch.version]\npath = "src/foo/__init__.py"\n[tool.uv]\nmanaged = true`;
    const stack = detectStack(
      classify(["pyproject.toml", "uv.lock"], { "pyproject.toml": py }),
      { Python: 100 },
    );
    expect(stack.pythonTools).toContain("uv");
    expect(stack.pythonTools).toContain("Hatch");
  });

  it("detects SBOM artefacts", () => {
    expect(detectStack(classify(["sbom.json"]), {}).sboms).toContain("sbom.json");
    expect(detectStack(classify(["cyclonedx.xml"]), {}).sboms).toContain("cyclonedx.xml");
    expect(detectStack(classify(["custom.cdx.json"]), {}).sboms).toContain("custom.cdx.json");
  });

  it("detects AI dev-tooling integrations", () => {
    expect(detectStack(classify(["CLAUDE.md"]), {}).aiDevTools).toContain("Claude Code");
    expect(detectStack(classify([".claude/settings.json"]), {}).aiDevTools).toContain("Claude Code");
    expect(detectStack(classify([".cursorrules"]), {}).aiDevTools).toContain("Cursor");
    expect(
      detectStack(classify([".github/copilot-instructions.md"]), {}).aiDevTools,
    ).toContain("GitHub Copilot");
    expect(detectStack(classify([".clinerules"]), {}).aiDevTools).toContain("Cline");
    expect(detectStack(classify(["AGENTS.md"]), {}).aiDevTools).toContain("AGENTS.md spec");
  });

  it("picks runtime from primary language when configs conflict", () => {
    // JS-dominant repo with both package.json and pyproject.toml: must pick Node.js, not Python.
    const c = classify(["package.json", "pyproject.toml"], {
      "package.json": JSON.stringify({ dependencies: {} }),
    });
    expect(detectStack(c, { JavaScript: 9000, Python: 1000 }).runtime).toBe("Node.js");
  });

  it("picks Rust runtime when language is Rust", () => {
    const c = classify(["Cargo.toml", "Cargo.lock"]);
    expect(detectStack(c, { Rust: 100_000 }).runtime).toBe("Rust");
  });

  it("computes language share and gap", () => {
    const stack = detectStack(classify([]), {
      TypeScript: 8000,
      JavaScript: 1500,
      CSS: 500,
    });
    expect(stack.language).toBe("TypeScript");
    expect(stack.languages[0].share).toBeCloseTo(0.8, 1);
  });

  it("flags containerized projects", () => {
    expect(detectStack(classify(["Dockerfile"]), {}).containerized).toBe(true);
    expect(detectStack(classify(["compose.yaml"]), {}).containerized).toBe(true);
    expect(detectStack(classify(["src/index.ts"]), {}).containerized).toBe(false);
  });
});
