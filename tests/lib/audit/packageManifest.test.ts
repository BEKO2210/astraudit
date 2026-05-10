/**
 * Tests for the Phase 3.5 package.json manifest parser.
 *
 * Contract:
 *   1. `parseManifestObject` extracts `engines`, `peerDependencies`
 *      (with `peerDependenciesMeta.optional` honoured), the
 *      Corepack `packageManager` pin, and the `type` field — and
 *      gracefully skips fields that aren't strings / objects.
 *   2. `minimumMajorFromRange` honours the documented SemVer range
 *      forms: `>=`, `>`, `~`, `^`, `=`, plain numerics, multi-clause
 *      AND ranges (`>=18 <21`), OR ranges (`16 || 18 || 20`).
 *      Upper-bound-only comparators (`<X`, `<=X`) are NOT counted as
 *      a minimum.
 *   3. `bucketNodeFreshness` maps minimum-major numbers to the
 *      May-2026 LTS-aware buckets (`ancient` / `aging` / `current` /
 *      `modern`), and `*` / `latest` collapse to `any`.
 *   4. peerDependencies are sorted alphabetically for stable UI
 *      output.
 */

import { describe, expect, it } from "vitest";
import {
  formatNodeFreshness,
  minimumMajorFromRange,
  parseManifestObject,
} from "../../../src/lib/audit/packageManifest";

describe("parseManifestObject — happy path", () => {
  it("extracts every contract field from a typical manifest", () => {
    const m = parseManifestObject({
      type: "module",
      packageManager: "pnpm@9.7.0+sha256.deadbeef",
      engines: {
        node: ">=22",
        pnpm: ">=9",
      },
      peerDependencies: {
        react: ">=18",
        "react-dom": ">=18",
        "@types/react": "^18.0.0",
      },
      peerDependenciesMeta: {
        "@types/react": { optional: true },
      },
    });

    expect(m.moduleType).toBe("module");
    expect(m.engines).toEqual({ node: ">=22", pnpm: ">=9" });
    expect(m.minimumNodeMajor).toBe(22);
    expect(m.nodeFreshness).toBe("current");
    expect(m.packageManagerPin).toBe("pnpm@9.7.0+sha256.deadbeef");
    expect(m.peerDependencies).toEqual([
      { name: "@types/react", range: "^18.0.0", optional: true },
      { name: "react", range: ">=18", optional: false },
      { name: "react-dom", range: ">=18", optional: false },
    ]);
  });

  it("handles a manifest with no contract fields at all", () => {
    const m = parseManifestObject({});
    expect(m.moduleType).toBeNull();
    expect(m.engines).toEqual({});
    expect(m.minimumNodeMajor).toBeNull();
    expect(m.nodeFreshness).toBe("missing");
    expect(m.packageManagerPin).toBeNull();
    expect(m.peerDependencies).toEqual([]);
  });

  it("ignores non-string engine values without throwing", () => {
    const m = parseManifestObject({
      engines: {
        node: ">=20",
        // typo / bad config someone shipped — must not crash
        npm: 10 as unknown as string,
      },
    });
    expect(m.engines).toEqual({ node: ">=20" });
  });

  it("treats `type: \"commonjs\"` and unknown `type` distinctly", () => {
    expect(parseManifestObject({ type: "commonjs" }).moduleType).toBe(
      "commonjs",
    );
    expect(parseManifestObject({ type: "weird" }).moduleType).toBeNull();
  });

  it("trims whitespace on packageManager and peer-dep ranges", () => {
    const m = parseManifestObject({
      packageManager: "  yarn@4.1.0  ",
      peerDependencies: { react: "  >=18  " },
    });
    expect(m.packageManagerPin).toBe("yarn@4.1.0");
    expect(m.peerDependencies[0].range).toBe(">=18");
  });
});

describe("minimumMajorFromRange", () => {
  it.each([
    [">=18", 18],
    [">=22.5.0", 22],
    ["^20.10.0", 20],
    ["~16.5", 16],
    ["18", 18],
    ["18.0.0", 18],
    ["v20", 20],
    [">=18 <21", 18],
    ["16 || 18 || 20", 16],
    ["^22 || ^24", 22],
    ["=20", 20],
  ])("%s → %i", (range, expected) => {
    expect(minimumMajorFromRange(range)).toBe(expected);
  });

  it.each([["*"], ["x"], ["latest"], ["current"], [""], ["   "]])(
    "%s → null (unconstrained)",
    (range) => {
      expect(minimumMajorFromRange(range)).toBeNull();
    },
  );

  it("ignores upper-bound-only comparators (<, <=)", () => {
    // `<22` doesn't define a minimum on its own.
    expect(minimumMajorFromRange("<22")).toBeNull();
    expect(minimumMajorFromRange("<=22")).toBeNull();
    // But mixed AND clauses still work.
    expect(minimumMajorFromRange(">=18 <22")).toBe(18);
  });

  it("returns null for unparseable ranges", () => {
    expect(minimumMajorFromRange("nightly")).toBeNull();
    expect(minimumMajorFromRange("hello world")).toBeNull();
  });
});

describe("nodeFreshness bucket boundaries", () => {
  it.each([
    [{ engines: { node: ">=24" } }, "modern"],
    [{ engines: { node: ">=22" } }, "current"],
    [{ engines: { node: ">=20" } }, "aging"],
    [{ engines: { node: ">=18" } }, "aging"],
    [{ engines: { node: ">=16" } }, "aging"],
    [{ engines: { node: ">=14" } }, "ancient"],
    [{ engines: { node: ">=12" } }, "ancient"],
    [{ engines: { node: "*" } }, "any"],
    [{ engines: { node: "latest" } }, "any"],
    [{ engines: {} }, "missing"],
    [{}, "missing"],
  ])("%j → %s", (input, expected) => {
    expect(parseManifestObject(input).nodeFreshness).toBe(expected);
  });
});

describe("formatNodeFreshness UI labels", () => {
  it.each([
    ["missing", "Node version not declared"],
    ["any", "Node version unconstrained"],
    ["modern", "Modern Node"],
    ["current", "Current LTS"],
    ["aging", "Pins an EOL Node major"],
    ["ancient", "Pins a pre-LTS Node major"],
  ] as const)("%s → %s", (freshness, expected) => {
    expect(formatNodeFreshness(freshness)).toBe(expected);
  });
});
