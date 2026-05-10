/**
 * Tests for the Phase 3.9 license classifier + tone analyzer.
 *
 * The classifier drives a user-visible warning/critical label, so
 * the contract has to be locked down hard:
 *   1. Single SPDX ids → correct category for every documented family
 *      (permissive, public domain, weak copyleft, strong copyleft,
 *      proprietary / source-available).
 *   2. SPDX expressions: `OR` collapses to the most-permissive,
 *      `AND` collapses to the most-restrictive, parens are stripped.
 *   3. Free-text labels (PyPI's `info.license`) round-trip via the
 *      synonym table.
 *   4. Custom-text declarations (`SEE LICENSE IN <file>`) classify
 *      as `unknown`; `UNLICENSED` classifies as `none`.
 *   5. `analyzeLicenseTone` only fires findings on actionable
 *      mismatches, sorted critical → info.
 */

import { describe, expect, it } from "vitest";
import {
  analyzeLicenseTone,
  classifyLicense,
  formatLicenseCategory,
  type LicenseCategory,
} from "../../../src/lib/audit/licenseClassifier";

describe("classifyLicense — single SPDX ids", () => {
  it.each([
    ["MIT", "permissive"],
    ["Apache-2.0", "permissive"],
    ["BSD-3-Clause", "permissive"],
    ["ISC", "permissive"],
    ["0BSD", "permissive"],
    ["Unlicense", "public-domain"],
    ["CC0-1.0", "public-domain"],
    ["LGPL-3.0", "weak-copyleft"],
    ["LGPL-3.0-or-later", "weak-copyleft"],
    ["MPL-2.0", "weak-copyleft"],
    ["EPL-2.0", "weak-copyleft"],
    ["GPL-2.0", "strong-copyleft"],
    ["GPL-3.0-or-later", "strong-copyleft"],
    ["AGPL-3.0", "strong-copyleft"],
    ["BUSL-1.1", "proprietary"],
    ["SSPL-1.0", "proprietary"],
    ["UNLICENSED", "none"],
    ["Custom-Internal-1.0", "unknown"],
  ] as const)("%s → %s", (spdx, expected) => {
    expect(classifyLicense(spdx).category).toBe(expected);
  });

  it("returns `none` for empty / null input with a `—` label", () => {
    expect(classifyLicense(null)).toEqual({
      raw: "",
      label: "—",
      category: "none",
    });
    expect(classifyLicense("")).toEqual({
      raw: "",
      label: "—",
      category: "none",
    });
    expect(classifyLicense("   ")).toEqual({
      raw: "",
      label: "—",
      category: "none",
    });
  });
});

describe("classifyLicense — SPDX expressions", () => {
  it("`OR` collapses to the most-permissive alternative", () => {
    expect(classifyLicense("MIT OR Apache-2.0").category).toBe("permissive");
    expect(classifyLicense("GPL-3.0 OR Apache-2.0").category).toBe("permissive");
    expect(classifyLicense("LGPL-3.0 OR GPL-3.0").category).toBe("weak-copyleft");
  });

  it("`AND` collapses to the most-restrictive alternative", () => {
    expect(classifyLicense("MIT AND GPL-3.0").category).toBe("strong-copyleft");
    expect(classifyLicense("Apache-2.0 AND LGPL-3.0").category).toBe(
      "weak-copyleft",
    );
  });

  it("strips outer parentheses", () => {
    expect(classifyLicense("(MIT OR Apache-2.0)").category).toBe("permissive");
  });

  it("preserves the expression in the display label", () => {
    expect(classifyLicense("MIT OR Apache-2.0").label).toBe(
      "MIT OR Apache-2.0",
    );
  });
});

describe("classifyLicense — free-text labels (PyPI synonyms)", () => {
  it.each([
    ["MIT License", "MIT", "permissive"],
    ["Apache Software License", "Apache-2.0", "permissive"],
    ["Apache License 2.0", "Apache-2.0", "permissive"],
    ["BSD License", "BSD-3-Clause", "permissive"],
    ["The Unlicense", "Unlicense", "public-domain"],
    ["GNU General Public License v3 (GPLv3)", "GPL-3.0-or-later", "strong-copyleft"],
    ["GNU Lesser General Public License v3 (LGPLv3)", "LGPL-3.0-or-later", "weak-copyleft"],
    ["Mozilla Public License 2.0", "MPL-2.0", "weak-copyleft"],
  ] as const)("%s → label %s, category %s", (raw, label, category) => {
    const out = classifyLicense(raw);
    expect(out.label).toBe(label);
    expect(out.category).toBe(category);
  });

  it("returns the raw string + `unknown` when nothing matches", () => {
    expect(classifyLicense("Custom Internal License v0.1")).toEqual({
      raw: "Custom Internal License v0.1",
      label: "Custom Internal License v0.1",
      category: "unknown",
    });
  });
});

describe("classifyLicense — custom-text declarations", () => {
  it("`SEE LICENSE IN <file>` → unknown", () => {
    expect(classifyLicense("SEE LICENSE IN LICENSE.txt").category).toBe(
      "unknown",
    );
  });
  it("`UNLICENSED` → none", () => {
    expect(classifyLicense("UNLICENSED").category).toBe("none");
    expect(classifyLicense("unlicensed").category).toBe("none");
  });
});

describe("analyzeLicenseTone", () => {
  it("flags strong-copyleft deps in a permissive repo as critical", () => {
    const out = analyzeLicenseTone("MIT", [
      { name: "react", ecosystem: "npm", license: "MIT" },
      { name: "ghost-lib", ecosystem: "npm", license: "GPL-3.0" },
    ]);
    expect(out.findings).toHaveLength(1);
    expect(out.findings[0].tone).toBe("critical");
    expect(out.findings[0].id).toBe("strong-copyleft-deps");
    expect(out.findings[0].packages).toEqual(["ghost-lib"]);
  });

  it("downgrades the same finding to warning when the repo is itself copyleft", () => {
    const out = analyzeLicenseTone("GPL-3.0", [
      { name: "ghost-lib", ecosystem: "npm", license: "GPL-3.0" },
    ]);
    expect(out.findings[0].tone).toBe("warning");
  });

  it("emits an info finding for weak-copyleft deps regardless of repo license", () => {
    const out = analyzeLicenseTone("MIT", [
      { name: "lgpl-lib", ecosystem: "npm", license: "LGPL-3.0" },
    ]);
    const wc = out.findings.find((f) => f.id === "weak-copyleft-deps");
    expect(wc).toBeDefined();
    expect(wc!.tone).toBe("info");
  });

  it("warns about proprietary / source-available deps", () => {
    const out = analyzeLicenseTone("MIT", [
      { name: "redis", ecosystem: "npm", license: "BUSL-1.1" },
    ]);
    expect(out.findings[0].tone).toBe("warning");
    expect(out.findings[0].id).toBe("proprietary-deps");
  });

  it("only flags `unclassified-deps` when the share is non-trivial", () => {
    // 3 of 12 unknown → 25% threshold → fires.
    const lots = Array.from({ length: 12 }, (_, i) => ({
      name: `pkg-${i}`,
      ecosystem: "npm" as const,
      license: i < 3 ? "Custom-X" : "MIT",
    }));
    expect(
      analyzeLicenseTone("MIT", lots).findings.some(
        (f) => f.id === "unclassified-deps",
      ),
    ).toBe(true);

    // 1 of 12 unknown → 8% → suppressed.
    const few = Array.from({ length: 12 }, (_, i) => ({
      name: `pkg-${i}`,
      ecosystem: "npm" as const,
      license: i === 0 ? "Custom-X" : "MIT",
    }));
    expect(
      analyzeLicenseTone("MIT", few).findings.some(
        (f) => f.id === "unclassified-deps",
      ),
    ).toBe(false);
  });

  it("returns no findings when every dep is permissive", () => {
    const out = analyzeLicenseTone("MIT", [
      { name: "a", ecosystem: "npm", license: "MIT" },
      { name: "b", ecosystem: "npm", license: "Apache-2.0" },
      { name: "c", ecosystem: "npm", license: "ISC" },
    ]);
    expect(out.findings).toEqual([]);
  });

  it("sorts findings critical → warning → info", () => {
    const out = analyzeLicenseTone("MIT", [
      { name: "info-1", ecosystem: "npm", license: "LGPL-3.0" },
      { name: "warn-1", ecosystem: "npm", license: "BUSL-1.1" },
      { name: "crit-1", ecosystem: "npm", license: "GPL-3.0" },
    ]);
    expect(out.findings.map((f) => f.tone)).toEqual([
      "critical",
      "warning",
      "info",
    ]);
  });

  it("works when the repo declared no license (treats permissive as the default)", () => {
    const out = analyzeLicenseTone(null, [
      { name: "ghost-lib", ecosystem: "npm", license: "AGPL-3.0" },
    ]);
    expect(out.findings[0].tone).toBe("critical");
    expect(out.repo).toBeNull();
  });

  it("populates depCounts buckets correctly", () => {
    const out = analyzeLicenseTone("MIT", [
      { name: "a", ecosystem: "npm", license: "MIT" },
      { name: "b", ecosystem: "npm", license: "Apache-2.0" },
      { name: "c", ecosystem: "npm", license: "GPL-3.0" },
      { name: "d", ecosystem: "npm", license: "LGPL-3.0" },
      { name: "e", ecosystem: "npm", license: null },
      { name: "f", ecosystem: "npm", license: "Some-Custom-License" },
    ]);
    expect(out.depCounts).toMatchObject({
      permissive: 2,
      "weak-copyleft": 1,
      "strong-copyleft": 1,
      none: 1,
      unknown: 1,
    });
  });
});

describe("formatLicenseCategory", () => {
  it.each([
    ["permissive", "Permissive"],
    ["weak-copyleft", "Weak copyleft"],
    ["strong-copyleft", "Strong copyleft"],
    ["public-domain", "Public domain"],
    ["proprietary", "Proprietary"],
    ["none", "No license"],
    ["unknown", "Unknown"],
  ] as const)("%s → %s", (cat: LicenseCategory, label) => {
    expect(formatLicenseCategory(cat)).toBe(label);
  });
});
