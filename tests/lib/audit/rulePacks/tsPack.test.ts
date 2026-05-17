import { describe, expect, it } from "vitest";
import { runTsPack, __test } from "../../../../src/lib/audit/rulePacks/packs/ts";
import { classifyFiles } from "../../../../src/lib/audit/fileClassifier";
import { analyzeDependencies } from "../../../../src/lib/audit/dependencyDetector";
import { makeBundle } from "../../../fixtures/builders";
import type { RulePackContext } from "../../../../src/lib/audit/rulePacks/types";

function makeContext(opts: {
  paths?: string[];
  tsconfig?: string | null;
  packageJson?: Record<string, unknown> | null;
}): RulePackContext {
  const importantFiles: Record<string, string | null> = {};
  if (opts.tsconfig !== undefined) {
    importantFiles["tsconfig.json"] = opts.tsconfig;
  }
  if (opts.packageJson) {
    importantFiles["package.json"] = JSON.stringify(opts.packageJson);
  }
  const bundle = makeBundle({ paths: opts.paths ?? [], importantFiles });
  const classified = classifyFiles(bundle.tree, bundle.importantFiles);
  const deps = analyzeDependencies(classified);
  return { bundle, classified, deps };
}

describe("stripJsonc (M5.3)", () => {
  it("strips line comments outside string literals", () => {
    expect(__test.stripJsonc('{"a": 1} // tail')).toContain('{"a": 1}');
    expect(__test.stripJsonc('{"a": 1} // tail')).not.toContain("tail");
  });

  it("strips block comments", () => {
    expect(__test.stripJsonc('{ /* drop me */ "a": 1 }')).toBe('{  "a": 1 }');
  });

  it("preserves `//` inside string literals", () => {
    const src = '{ "url": "https://example.test/path" }';
    expect(__test.stripJsonc(src)).toContain("https://example.test/path");
  });

  it("removes trailing commas before } or ]", () => {
    expect(__test.stripJsonc('{ "a": 1, }')).toBe('{ "a": 1 }');
    expect(__test.stripJsonc('[1, 2, 3, ]')).toBe('[1, 2, 3 ]');
  });
});

describe("runTsPack (M5.3)", () => {
  it("emits zero findings on a non-TS repo with no tsconfig", () => {
    const findings = runTsPack(makeContext({ paths: ["README.md"] }));
    expect(findings).toEqual([]);
  });

  it("emits `ts-no-tsconfig` when .ts files exist but no tsconfig", () => {
    const findings = runTsPack(
      makeContext({ paths: ["src/index.ts", "README.md"] }),
    );
    expect(findings.find((f) => f.id === "ts-no-tsconfig")?.severity).toBe(
      "low",
    );
  });

  it("emits `ts-strict-on` (info) when strict: true is set", () => {
    const findings = runTsPack(
      makeContext({
        paths: ["src/index.ts"],
        tsconfig: '{ "compilerOptions": { "strict": true } }',
      }),
    );
    expect(findings.find((f) => f.id === "ts-strict-on")?.severity).toBe("info");
  });

  it("emits `ts-strict-off` (medium) when strict is missing", () => {
    const findings = runTsPack(
      makeContext({
        paths: ["src/index.ts"],
        tsconfig: '{ "compilerOptions": { "target": "ES2022" } }',
      }),
    );
    expect(findings.find((f) => f.id === "ts-strict-off")?.severity).toBe(
      "medium",
    );
  });

  it("emits `ts-strict-partial` (low) when individual strict flags are set", () => {
    const findings = runTsPack(
      makeContext({
        paths: ["src/index.ts"],
        tsconfig:
          '{ "compilerOptions": { "noImplicitAny": true, "strictNullChecks": true } }',
      }),
    );
    const partial = findings.find((f) => f.id === "ts-strict-partial");
    expect(partial?.severity).toBe("low");
    expect(partial?.evidence).toContain("noImplicitAny");
    expect(partial?.evidence).toContain("strictNullChecks");
  });

  it("surfaces explicit per-flag overrides when strict: true", () => {
    const findings = runTsPack(
      makeContext({
        paths: ["src/index.ts"],
        tsconfig:
          '{ "compilerOptions": { "strict": true, "strictNullChecks": false } }',
      }),
    );
    const strictOn = findings.find((f) => f.id === "ts-strict-on");
    expect(strictOn?.evidence).toContain("strictNullChecks");
  });

  it("emits `ts-extra-strict-on` when noUncheckedIndexedAccess is enabled", () => {
    const findings = runTsPack(
      makeContext({
        paths: ["src/index.ts"],
        tsconfig:
          '{ "compilerOptions": { "strict": true, "noUncheckedIndexedAccess": true } }',
      }),
    );
    expect(findings.find((f) => f.id === "ts-extra-strict-on")?.severity).toBe(
      "info",
    );
  });

  it("suggests extras when strict is on but none of the extras are", () => {
    const findings = runTsPack(
      makeContext({
        paths: ["src/index.ts"],
        tsconfig: '{ "compilerOptions": { "strict": true } }',
      }),
    );
    expect(
      findings.find((f) => f.id === "ts-extra-strict-suggest")?.severity,
    ).toBe("low");
  });

  it("does NOT suggest extras when strict is off (we already nudge about strict itself)", () => {
    const findings = runTsPack(
      makeContext({
        paths: ["src/index.ts"],
        tsconfig: '{ "compilerOptions": {} }',
      }),
    );
    expect(findings.find((f) => f.id === "ts-extra-strict-suggest")).toBeUndefined();
  });

  it("tolerates JSONC comments + trailing commas in tsconfig", () => {
    const findings = runTsPack(
      makeContext({
        paths: ["src/index.ts"],
        tsconfig: `{
          // Reasonable defaults
          "compilerOptions": {
            "strict": true, /* enable all eight */
            "target": "ES2022",
          },
        }`,
      }),
    );
    expect(findings.find((f) => f.id === "ts-strict-on")).toBeDefined();
  });

  it("silently no-ops on unparseable tsconfig (core audit handles the parse error)", () => {
    const findings = runTsPack(
      makeContext({
        paths: ["src/index.ts"],
        tsconfig: "{ not json at all",
      }),
    );
    expect(findings).toEqual([]);
  });

  it("emits no findings when there is no tsconfig AND no TS files", () => {
    const findings = runTsPack(
      makeContext({ paths: ["src/index.js", "package.json"] }),
    );
    expect(findings).toEqual([]);
  });
});
