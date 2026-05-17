import { describe, expect, it } from "vitest";
import { runI18nPack } from "../../../../src/lib/audit/rulePacks/packs/i18n";
import { classifyFiles } from "../../../../src/lib/audit/fileClassifier";
import { analyzeDependencies } from "../../../../src/lib/audit/dependencyDetector";
import { makeBundle } from "../../../fixtures/builders";
import type { RulePackContext } from "../../../../src/lib/audit/rulePacks/types";

function makeContext(opts: {
  paths?: string[];
  packageJson?: Record<string, unknown> | null;
}): RulePackContext {
  const importantFiles: Record<string, string | null> = {};
  if (opts.packageJson) {
    importantFiles["package.json"] = JSON.stringify(opts.packageJson);
  }
  const bundle = makeBundle({ paths: opts.paths ?? [], importantFiles });
  const classified = classifyFiles(bundle.tree, bundle.importantFiles);
  const deps = analyzeDependencies(classified);
  return { bundle, classified, deps };
}

describe("runI18nPack (M5.2)", () => {
  it("emits zero findings on an empty repository (no package.json, no locales)", () => {
    const findings = runI18nPack(makeContext({ paths: ["README.md"] }));
    expect(findings).toEqual([]);
  });

  it("emits `i18n-no-setup` (LOW) when a JS project has no i18n signals", () => {
    const findings = runI18nPack(
      makeContext({
        paths: ["README.md", "package.json", "src/index.ts"],
        packageJson: { name: "demo", dependencies: { react: "^18.0.0" } },
      }),
    );
    const ids = findings.map((f) => f.id);
    expect(ids).toContain("i18n-no-setup");
    expect(findings.find((f) => f.id === "i18n-no-setup")?.severity).toBe("low");
  });

  it("detects known i18n libraries from any dependency scope", () => {
    const findings = runI18nPack(
      makeContext({
        paths: ["package.json"],
        packageJson: {
          dependencies: { "react-i18next": "^14.0.0" },
          devDependencies: { "@lingui/macro": "^4.0.0" },
        },
      }),
    );
    const detected = findings.find((f) => f.id === "i18n-libraries");
    expect(detected).toBeDefined();
    expect(detected!.evidence).toContain("react-i18next");
    expect(detected!.evidence).toContain("@lingui/macro");
    expect(detected!.severity).toBe("info");
  });

  it("extracts locale coverage from conventional locale folders", () => {
    const findings = runI18nPack(
      makeContext({
        paths: [
          "package.json",
          "src/locales/en.json",
          "src/locales/de.json",
          "src/locales/ja.json",
          "src/locales/zh.json",
        ],
        packageJson: { dependencies: { i18next: "^23.0.0" } },
      }),
    );
    const coverage = findings.find((f) => f.id === "i18n-locale-coverage");
    expect(coverage).toBeDefined();
    expect(coverage!.title).toContain("de");
    expect(coverage!.title).toContain("en");
    expect(coverage!.title).toContain("ja");
    expect(coverage!.title).toContain("zh");
  });

  it("recognises .po / .xliff / .arb files as locale catalogs", () => {
    const findings = runI18nPack(
      makeContext({
        paths: [
          "translations/de.po",
          "translations/fr.po",
          "translations/messages.es.xliff",
        ],
      }),
    );
    const coverage = findings.find((f) => f.id === "i18n-locale-coverage");
    expect(coverage).toBeDefined();
    expect(coverage!.title).toMatch(/de|es|fr/);
  });

  it("detects alternate README translations at the repo root", () => {
    const findings = runI18nPack(
      makeContext({
        paths: ["README.md", "README.de.md", "README_ja.md", "README-zh.md"],
      }),
    );
    const translations = findings.find((f) => f.id === "i18n-readme-translations");
    expect(translations).toBeDefined();
    expect(translations!.title).toContain("de");
    expect(translations!.title).toContain("ja");
    expect(translations!.title).toContain("zh");
  });

  it("does not match nested README files (those are package docs, not translations)", () => {
    const findings = runI18nPack(
      makeContext({
        paths: ["README.md", "packages/foo/README.de.md"],
      }),
    );
    expect(findings.find((f) => f.id === "i18n-readme-translations")).toBeUndefined();
  });

  it("warns about English-only README when i18n libraries are present", () => {
    const findings = runI18nPack(
      makeContext({
        paths: ["README.md", "package.json"],
        packageJson: { dependencies: { i18next: "^23.0.0" } },
      }),
    );
    const warn = findings.find((f) => f.id === "i18n-readme-english-only");
    expect(warn).toBeDefined();
    expect(warn!.severity).toBe("low");
  });

  it("does NOT warn about English-only README when a translated README exists", () => {
    const findings = runI18nPack(
      makeContext({
        paths: ["README.md", "README.de.md", "package.json"],
        packageJson: { dependencies: { i18next: "^23.0.0" } },
      }),
    );
    expect(findings.find((f) => f.id === "i18n-readme-english-only")).toBeUndefined();
  });

  it("handles a malformed package.json gracefully (no crash, no library findings)", () => {
    const bundle = makeBundle({
      paths: ["package.json"],
      importantFiles: { "package.json": "{not valid json" },
    });
    const classified = classifyFiles(bundle.tree, bundle.importantFiles);
    const deps = analyzeDependencies(classified);
    const findings = runI18nPack({ bundle, classified, deps });
    expect(findings.find((f) => f.id === "i18n-libraries")).toBeUndefined();
  });
});
