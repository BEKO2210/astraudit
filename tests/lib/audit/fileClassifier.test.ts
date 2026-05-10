import { describe, expect, it } from "vitest";
import { classifyFiles, isInNoiseFolder } from "../../../src/lib/audit/fileClassifier";
import { makeImportantFiles, makeTree } from "../../fixtures/builders";

describe("classifyFiles", () => {
  it("collects root files and root folders", () => {
    const tree = makeTree([
      "README.md",
      "package.json",
      "src/index.ts",
      "src/lib/util.ts",
      "tests/index.test.ts",
    ]);
    const c = classifyFiles(tree, []);
    expect(c.totalFiles).toBe(5);
    expect(c.rootFileCount).toBe(2);
    expect(c.rootFolders).toContain("src");
    expect(c.rootFolders).toContain("tests");
  });

  it("looks up files case-insensitively", () => {
    const tree = makeTree(["License.md", "Dockerfile", "PACKAGE.json"]);
    const c = classifyFiles(tree, []);
    expect(c.hasFile("LICENSE.md")).toBe("License.md");
    expect(c.hasFile("DOCKERFILE")).toBe("Dockerfile");
    expect(c.hasFile("package.json")).toBe("PACKAGE.json");
    expect(c.hasFile("does-not-exist")).toBeNull();
  });

  it("hasFile accepts multiple candidates and returns the first match", () => {
    const tree = makeTree(["LICENCE"]);
    const c = classifyFiles(tree, []);
    expect(c.hasFile("LICENSE", "LICENSE.md", "LICENCE")).toBe("LICENCE");
  });

  it("hasFolder finds nested folders", () => {
    const tree = makeTree([".github/workflows/ci.yml", ".github/dependabot.yml"]);
    const c = classifyFiles(tree, []);
    expect(c.hasFolder(".github/workflows")).toBeTruthy();
    expect(c.hasFolder("scripts")).toBeNull();
  });

  it("excludes test fixtures from suspicious-filename matches", () => {
    const tree = makeTree([
      "tests/fixtures/.env",
      "test/secret-key.test.js",
      "fixtures/credentials.fixture.json",
      "examples/aws-credentials.txt",
      "src/credentials.ts", // outside noise folder — should be flagged
    ]);
    const c = classifyFiles(tree, []);
    expect(c.suspiciousFiles).toEqual(["src/credentials.ts"]);
  });

  it("populates importantFilesPresent / importantFilesMissing", () => {
    const tree = makeTree(["README.md", "LICENSE", "package.json"]);
    const c = classifyFiles(tree, []);
    expect(c.importantFilesPresent).toContain("README.md");
    expect(c.importantFilesPresent).toContain("LICENSE");
    expect(c.importantFilesMissing).toContain("SECURITY.md");
    expect(c.importantFilesMissing).toContain("CHANGELOG.md");
  });

  it("populates importantFileMap with both original and lowercase keys", () => {
    const tree = makeTree(["package.json"]);
    const files = makeImportantFiles({ "package.json": '{"name":"x"}' });
    const c = classifyFiles(tree, files);
    expect(c.importantFileMap.get("package.json")?.content).toBe('{"name":"x"}');
    expect(c.importantFileMap.get("PACKAGE.JSON".toLowerCase())?.content).toBe('{"name":"x"}');
  });

  it("detects test signals via folder or file naming", () => {
    expect(classifyFiles(makeTree(["tests/foo.test.ts"]), []).hasTestSignals).toBe(true);
    expect(classifyFiles(makeTree(["src/foo.spec.ts"]), []).hasTestSignals).toBe(true);
    expect(classifyFiles(makeTree(["src/index.ts"]), []).hasTestSignals).toBe(false);
  });

  it("collects workflow paths", () => {
    const tree = makeTree([
      ".github/workflows/ci.yml",
      ".github/workflows/release.yaml",
      "src/index.ts",
    ]);
    const c = classifyFiles(tree, []);
    expect(c.workflowPaths).toHaveLength(2);
    expect(c.hasGithubWorkflows).toBe(true);
  });
});

describe("isInNoiseFolder", () => {
  it("recognises common noise prefixes", () => {
    expect(isInNoiseFolder("tests/fixtures/foo.json")).toBe(true);
    expect(isInNoiseFolder("examples/demo/index.ts")).toBe(true);
    expect(isInNoiseFolder("docs/security.md")).toBe(true);
    expect(isInNoiseFolder("vendor/whatever")).toBe(true);
  });

  it("returns false for source paths", () => {
    expect(isInNoiseFolder("src/index.ts")).toBe(false);
    expect(isInNoiseFolder("packages/core/index.ts")).toBe(false);
  });
});
