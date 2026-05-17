import { describe, expect, it } from "vitest";
import { runA11yPack, __test } from "../../../../src/lib/audit/rulePacks/packs/a11y";
import { classifyFiles } from "../../../../src/lib/audit/fileClassifier";
import { analyzeDependencies } from "../../../../src/lib/audit/dependencyDetector";
import { makeBundle } from "../../../fixtures/builders";
import type { RulePackContext } from "../../../../src/lib/audit/rulePacks/types";

function makeContext(opts: {
  paths?: string[];
  importantFiles?: Record<string, string | null>;
  readmeContent?: string | null;
}): RulePackContext {
  const bundle = makeBundle({
    paths: opts.paths ?? [],
    importantFiles: opts.importantFiles ?? {},
    readmeContent: opts.readmeContent,
  });
  const classified = classifyFiles(bundle.tree, bundle.importantFiles);
  const deps = analyzeDependencies(classified);
  return { bundle, classified, deps };
}

describe("findMarkdownImagesWithoutAlt", () => {
  it("returns urls for images with empty alt", () => {
    const out = __test.findMarkdownImagesWithoutAlt(
      "![](logo.png) ![Real alt](photo.jpg) ![ ](icon.svg)",
    );
    expect(out).toEqual(["logo.png", "icon.svg"]);
  });

  it("returns empty when every image has a non-empty alt", () => {
    const out = __test.findMarkdownImagesWithoutAlt(
      "![One](one.png)\n![Two](two.png)",
    );
    expect(out).toEqual([]);
  });

  it("ignores images with title text but accepts empty alt", () => {
    const out = __test.findMarkdownImagesWithoutAlt(
      '![](logo.png "Logo title")',
    );
    expect(out).toEqual(["logo.png"]);
  });
});

describe("findHtmlImagesWithoutAlt", () => {
  it("flags <img> tags without alt=", () => {
    const out = __test.findHtmlImagesWithoutAlt(
      '<img src="hero.png"> some text <img src="other.png" />',
    );
    expect(out).toEqual(["hero.png", "other.png"]);
  });

  it("does NOT flag <img> with alt= (including empty alt='')", () => {
    const out = __test.findHtmlImagesWithoutAlt(
      '<img src="real.png" alt="Hero shot"> <img src="dec.png" alt="">',
    );
    expect(out).toEqual([]);
  });

  it("is case-insensitive", () => {
    const out = __test.findHtmlImagesWithoutAlt('<IMG SRC="x.png">');
    expect(out).toEqual(["x.png"]);
  });
});

describe("runA11yPack (M5.1)", () => {
  it("emits zero findings on an empty repo", () => {
    expect(runA11yPack(makeContext({}))).toEqual([]);
  });

  it("flags README images without alt text (LOW for 1–3 images)", () => {
    const findings = runA11yPack(
      makeContext({
        paths: ["README.md"],
        readmeContent: "![](logo.png) ![](icon.svg)",
      }),
    );
    const f = findings.find((x) => x.id === "a11y-readme-img-no-alt");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("low");
    expect(f!.title).toContain("2 image");
  });

  it("escalates severity to MEDIUM when ≥4 images lack alt", () => {
    const findings = runA11yPack(
      makeContext({
        paths: ["README.md"],
        readmeContent: "![](a.png) ![](b.png) ![](c.png) ![](d.png) ![](e.png)",
      }),
    );
    const f = findings.find((x) => x.id === "a11y-readme-img-no-alt");
    expect(f!.severity).toBe("medium");
  });

  it("detects a11y tooling in deps and emits info", () => {
    const findings = runA11yPack(
      makeContext({
        paths: ["package.json"],
        importantFiles: {
          "package.json": JSON.stringify({
            devDependencies: { "eslint-plugin-jsx-a11y": "^6.0.0", "jest-axe": "^8.0.0" },
          }),
        },
      }),
    );
    const f = findings.find((x) => x.id === "a11y-tooling-detected");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("info");
    expect(f!.evidence).toContain("eslint-plugin-jsx-a11y");
    expect(f!.evidence).toContain("jest-axe");
  });

  it("warns when a UI project has no a11y tooling", () => {
    const findings = runA11yPack(
      makeContext({
        paths: ["package.json", "src/App.tsx"],
        importantFiles: {
          "package.json": JSON.stringify({
            dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
          }),
        },
      }),
    );
    const f = findings.find((x) => x.id === "a11y-no-tooling");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("low");
  });

  it("does NOT warn about missing tooling for non-UI repos", () => {
    const findings = runA11yPack(
      makeContext({
        paths: ["package.json", "src/cli.ts"],
        importantFiles: {
          "package.json": JSON.stringify({
            dependencies: { commander: "^11.0.0" },
          }),
        },
      }),
    );
    expect(findings.find((x) => x.id === "a11y-no-tooling")).toBeUndefined();
  });

  it("detects ACCESSIBILITY.md (case insensitive)", () => {
    const findings = runA11yPack(
      makeContext({
        paths: ["ACCESSIBILITY.md", "README.md"],
        importantFiles: { "ACCESSIBILITY.md": "We target WCAG 2.1 AA." },
      }),
    );
    const f = findings.find((x) => x.id === "a11y-docs-found");
    expect(f).toBeDefined();
    expect(f!.evidence).toContain("ACCESSIBILITY.md");
  });

  it("recognises A11Y.md as the a11y doc too", () => {
    const findings = runA11yPack(
      makeContext({
        paths: ["A11Y.md"],
        importantFiles: { "A11Y.md": "Quick a11y notes." },
      }),
    );
    expect(findings.find((x) => x.id === "a11y-docs-found")).toBeDefined();
  });

  it("warns about missing a11y docs only for UI projects", () => {
    const findings = runA11yPack(
      makeContext({
        paths: ["package.json", "src/App.tsx"],
        importantFiles: {
          "package.json": JSON.stringify({
            dependencies: { react: "^18.0.0" },
          }),
        },
      }),
    );
    expect(findings.find((x) => x.id === "a11y-no-docs")?.severity).toBe("low");
  });

  it("suppresses the `a11y-no-docs` warning if CONTRIBUTING.md mentions accessibility", () => {
    const findings = runA11yPack(
      makeContext({
        paths: ["package.json", "CONTRIBUTING.md"],
        importantFiles: {
          "package.json": JSON.stringify({
            dependencies: { react: "^18.0.0" },
          }),
          "CONTRIBUTING.md": "All UI PRs must pass our accessibility checks.",
        },
      }),
    );
    expect(findings.find((x) => x.id === "a11y-no-docs")).toBeUndefined();
  });
});
