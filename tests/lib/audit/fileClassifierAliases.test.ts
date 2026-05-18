import { describe, expect, it } from "vitest";
import { classifyFiles } from "../../../src/lib/audit/fileClassifier";
import { makeTree, makeImportantFiles } from "../../fixtures/builders";

describe("classifyFiles — IMPORTANT_FILE_ALIASES (Phase 7.x)", () => {
  it("treats History.md as a CHANGELOG.md alias", () => {
    const tree = makeTree(["README.md", "History.md", "package.json"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain("History.md");
    expect(c.importantFilesMissing).not.toContain("CHANGELOG.md");
  });

  it("treats HISTORY.md (upper-case) as a CHANGELOG.md alias", () => {
    const tree = makeTree(["README.md", "HISTORY.md"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain("HISTORY.md");
    expect(c.importantFilesMissing).not.toContain("CHANGELOG.md");
  });

  it("treats Code-Of-Conduct.md (dashed) as a CODE_OF_CONDUCT.md alias", () => {
    const tree = makeTree(["README.md", "Code-Of-Conduct.md"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain("Code-Of-Conduct.md");
    expect(c.importantFilesMissing).not.toContain("CODE_OF_CONDUCT.md");
  });

  it("treats LICENSE.md / LICENCE / COPYING as LICENSE aliases", () => {
    const tree = makeTree(["README.md", "COPYING"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain("COPYING");
    expect(c.importantFilesMissing).not.toContain("LICENSE");
  });

  it("treats .github/CODE_OF_CONDUCT.md as the root-level alias", () => {
    const tree = makeTree(["README.md", ".github/CODE_OF_CONDUCT.md"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain(".github/CODE_OF_CONDUCT.md");
    expect(c.importantFilesMissing).not.toContain("CODE_OF_CONDUCT.md");
  });

  it("treats .github/CODEOWNERS as the root-level CODEOWNERS alias", () => {
    const tree = makeTree(["README.md", ".github/CODEOWNERS"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain(".github/CODEOWNERS");
    expect(c.importantFilesMissing).not.toContain("CODEOWNERS");
  });

  it("does not double-list when both the canonical and an alias exist", () => {
    const tree = makeTree(["README.md", "CHANGELOG.md", "History.md"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    // Only the first matching candidate (canonical) is surfaced.
    expect(c.importantFilesPresent.filter((f) => /changelog|history/i.test(f))).toEqual(
      ["CHANGELOG.md"],
    );
  });

  it("still reports the canonical as missing when no alias exists", () => {
    const tree = makeTree(["README.md", "package.json"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesMissing).toContain("CHANGELOG.md");
    expect(c.importantFilesMissing).toContain("CODE_OF_CONDUCT.md");
  });

  it("flips vite.config.ts to present when only vite.config.mts exists (Vite 5+ ESM)", () => {
    const tree = makeTree(["vite.config.mts", "package.json"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain("vite.config.mts");
    expect(c.importantFilesMissing).not.toContain("vite.config.ts");
  });

  it("flips next.config.js to present when next.config.ts exists (Next 15+)", () => {
    const tree = makeTree(["next.config.ts", "package.json"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain("next.config.ts");
    expect(c.importantFilesMissing).not.toContain("next.config.js");
  });

  it("flips webpack.config.js to present when webpack.config.cjs exists", () => {
    const tree = makeTree(["webpack.config.cjs"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain("webpack.config.cjs");
    expect(c.importantFilesMissing).not.toContain("webpack.config.js");
  });

  it("flips rollup.config.js to present when rollup.config.ts exists", () => {
    const tree = makeTree(["rollup.config.ts"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain("rollup.config.ts");
    expect(c.importantFilesMissing).not.toContain("rollup.config.js");
  });

  it("flips eslint.config.js to present when eslint.config.ts exists", () => {
    const tree = makeTree(["eslint.config.ts"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain("eslint.config.ts");
    expect(c.importantFilesMissing).not.toContain("eslint.config.js");
  });

  it("flips biome.json to present when biome.jsonc exists", () => {
    const tree = makeTree(["biome.jsonc"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain("biome.jsonc");
    expect(c.importantFilesMissing).not.toContain("biome.json");
  });

  it("flips .prettierrc to present when prettier.config.cjs exists", () => {
    const tree = makeTree(["prettier.config.cjs"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toContain("prettier.config.cjs");
    expect(c.importantFilesMissing).not.toContain(".prettierrc");
  });

  it("expressjs/express-shaped tree: History.md + Readme.md flips CHANGELOG to present", () => {
    const tree = makeTree(["Readme.md", "History.md", "LICENSE", "package.json"]);
    const c = classifyFiles(tree, makeImportantFiles({}));
    expect(c.importantFilesPresent).toEqual(
      expect.arrayContaining(["Readme.md", "History.md", "LICENSE", "package.json"]),
    );
    expect(c.importantFilesMissing).not.toContain("CHANGELOG.md");
    expect(c.importantFilesMissing).not.toContain("LICENSE");
  });
});
