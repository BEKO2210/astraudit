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

// Phase 7.0.1 — stack-aware manifest + lockfile awareness.
describe("analyzeDependencies — per-stack manifests + lockfiles", () => {
  it("flags Cargo.toml WITHOUT Cargo.lock as missing-lockfile (Rust)", () => {
    const c = classifyFiles(makeTree(["Cargo.toml", "src/main.rs"]), []);
    const d = analyzeDependencies(c);
    expect(d.manifestsPresent.map((m) => m.manifest)).toContain("Cargo.toml");
    expect(d.missingLockfiles).toHaveLength(1);
    expect(d.missingLockfiles[0].manifest).toBe("Cargo.toml");
    expect(d.missingLockfiles[0].expectedLockfiles).toEqual(["Cargo.lock"]);
    expect(d.missingLockfiles[0].ecosystem).toMatch(/Rust/);
  });

  it("doesn't flag missing-lockfile when Cargo.lock IS present", () => {
    const c = classifyFiles(makeTree(["Cargo.toml", "Cargo.lock", "src/main.rs"]), []);
    expect(analyzeDependencies(c).missingLockfiles).toHaveLength(0);
  });

  it("flags go.mod WITHOUT go.sum (Go)", () => {
    const c = classifyFiles(makeTree(["go.mod", "main.go"]), []);
    const d = analyzeDependencies(c);
    expect(d.missingLockfiles).toHaveLength(1);
    expect(d.missingLockfiles[0].expectedLockfiles).toEqual(["go.sum"]);
  });

  it("accepts poetry.lock / pdm.lock / uv.lock as satisfying pyproject.toml", () => {
    expect(
      analyzeDependencies(
        classifyFiles(makeTree(["pyproject.toml", "poetry.lock"]), []),
      ).missingLockfiles,
    ).toHaveLength(0);
    expect(
      analyzeDependencies(
        classifyFiles(makeTree(["pyproject.toml", "pdm.lock"]), []),
      ).missingLockfiles,
    ).toHaveLength(0);
    expect(
      analyzeDependencies(
        classifyFiles(makeTree(["pyproject.toml", "uv.lock"]), []),
      ).missingLockfiles,
    ).toHaveLength(0);
  });

  it("emits one finding per stack in a polyglot monorepo (Cargo + npm)", () => {
    const c = classifyFiles(
      makeTree(["Cargo.toml", "package.json", "src/main.rs"]),
      [],
    );
    const d = analyzeDependencies(c);
    expect(d.manifestsPresent).toHaveLength(2);
    expect(d.missingLockfiles).toHaveLength(2);
    const kinds = d.missingLockfiles.map((m) => m.manifest).sort();
    expect(kinds).toEqual(["Cargo.toml", "package.json"]);
  });

  it("emits NO lockfile finding for a header-only repo with no manifest", () => {
    const c = classifyFiles(
      makeTree(["include/header.h", "src/lib.c", "Makefile"]),
      [],
    );
    const d = analyzeDependencies(c);
    expect(d.manifestsPresent).toHaveLength(0);
    expect(d.missingLockfiles).toHaveLength(0);
  });

  it("flags Gemfile WITHOUT Gemfile.lock (Ruby)", () => {
    const c = classifyFiles(makeTree(["Gemfile", "lib/app.rb"]), []);
    const d = analyzeDependencies(c);
    expect(d.missingLockfiles).toHaveLength(1);
    expect(d.missingLockfiles[0].expectedLockfiles).toEqual(["Gemfile.lock"]);
  });

  it("flags Package.swift WITHOUT Package.resolved (Swift)", () => {
    const c = classifyFiles(makeTree(["Package.swift", "Sources/foo.swift"]), []);
    const d = analyzeDependencies(c);
    expect(d.missingLockfiles).toHaveLength(1);
    expect(d.missingLockfiles[0].expectedLockfiles).toEqual(["Package.resolved"]);
  });
});
