import { describe, expect, it } from "vitest";
import { classifyFiles } from "../../../src/lib/audit/fileClassifier";
import { analyzeDependencies } from "../../../src/lib/audit/dependencyDetector";
import { makeImportantFiles, makeTree } from "../../fixtures/builders";

function withPackageJson(scripts: Record<string, string> = {}, files: string[] = []) {
  const tree = makeTree(["package.json", ...files]);
  const importantFiles = makeImportantFiles({
    "package.json": JSON.stringify({ scripts }),
  });
  return classifyFiles(tree, importantFiles);
}

describe("analyzeDependencies", () => {
  it("detects pnpm package manager + lockfile", () => {
    const c = classifyFiles(makeTree(["package.json", "pnpm-lock.yaml"]), []);
    const d = analyzeDependencies(c);
    expect(d.packageManager).toBe("pnpm");
    expect(d.hasLockfile).toBe(true);
  });

  it("detects npm via package-lock.json", () => {
    const c = classifyFiles(makeTree(["package.json", "package-lock.json"]), []);
    expect(analyzeDependencies(c).packageManager).toBe("npm");
  });

  it("detects bun via either bun.lockb or bun.lock", () => {
    expect(
      analyzeDependencies(classifyFiles(makeTree(["bun.lockb"]), [])).packageManager,
    ).toBe("bun");
    expect(
      analyzeDependencies(classifyFiles(makeTree(["bun.lock"]), [])).packageManager,
    ).toBe("bun");
  });

  it("detects rust via Cargo.lock", () => {
    expect(
      analyzeDependencies(classifyFiles(makeTree(["Cargo.lock"]), [])).packageManager,
    ).toBe("cargo");
  });

  it("returns null packageManager when no lockfile", () => {
    const d = analyzeDependencies(classifyFiles(makeTree(["src/index.ts"]), []));
    expect(d.packageManager).toBeNull();
    expect(d.hasLockfile).toBe(false);
  });

  it("recognises typecheck/lint/format/test/build scripts", () => {
    const c = withPackageJson({
      typecheck: "tsc -b --noEmit",
      lint: "eslint .",
      format: "prettier .",
      test: "vitest run",
      build: "vite build",
    });
    const d = analyzeDependencies(c);
    expect(d.hasTypecheckScript).toBe(true);
    expect(d.hasLintScript).toBe(true);
    expect(d.hasFormatScript).toBe(true);
    expect(d.hasTestScript).toBe(true);
    expect(d.hasBuildScript).toBe(true);
  });

  it("treats a project with .ts files as TypeScript even without tsconfig", () => {
    const c = classifyFiles(makeTree(["src/index.ts"]), []);
    expect(analyzeDependencies(c).isTypescriptProject).toBe(true);
  });

  it("hasTestScript also true when test signals exist without a script", () => {
    const c = classifyFiles(makeTree(["tests/index.test.ts"]), []);
    expect(analyzeDependencies(c).hasTestScript).toBe(true);
  });
});
