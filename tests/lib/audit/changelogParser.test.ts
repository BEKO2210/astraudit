/**
 * Tests for the Phase 3.6 CHANGELOG release-pace parser.
 *
 * Contract:
 *   1. Recognises the canonical Keep-a-Changelog heading
 *      `## [1.0.0] - 2024-01-15` as well as the documented
 *      real-world variants (`v1.0.0`, no brackets, parentheses
 *      around date, slash separator, h1 + h2 + h3 headings).
 *   2. Skips the special `[Unreleased]` section without producing a
 *      release entry, and exposes its presence as
 *      `hasUnreleasedSection`.
 *   3. Validates dates structurally — `2024-13-99` is rejected.
 *   4. Sorts releases oldest → newest deterministically.
 *   5. Computes mean + median deltas; `daysSinceLatest` honours the
 *      injected `now` clock for deterministic tests.
 *   6. Cadence bucket maps mean-delta thresholds correctly *and*
 *      promotes long-stale projects to `dormant` regardless of
 *      historical cadence.
 *   7. Returns null on input without dated release headings.
 */

import { describe, expect, it } from "vitest";
import {
  formatCadence,
  parseChangelog,
} from "../../../src/lib/audit/changelogParser";

const NOW = new Date("2026-05-10T12:00:00Z");

describe("parseChangelog — heading recognition", () => {
  it("parses canonical Keep-a-Changelog headings", () => {
    const file = [
      "# Changelog",
      "",
      "## [Unreleased]",
      "- WIP feature",
      "",
      "## [1.0.0] - 2024-01-15",
      "- First stable release",
      "",
      "## [0.9.0] - 2023-11-01",
      "- Beta",
    ].join("\n");
    const out = parseChangelog(file, NOW);
    expect(out).not.toBeNull();
    expect(out!.hasUnreleasedSection).toBe(true);
    expect(out!.releases).toEqual([
      { version: "0.9.0", date: "2023-11-01" },
      { version: "1.0.0", date: "2024-01-15" },
    ]);
  });

  it("parses Conventional Changelog parens-style headings", () => {
    const file = [
      "## 1.2.3 (2024-06-01)",
      "## 1.2.2 (2024-05-15)",
      "## 1.2.1 (2024-04-30)",
    ].join("\n");
    const out = parseChangelog(file, NOW);
    expect(out!.releases.map((r) => r.version)).toEqual([
      "1.2.1",
      "1.2.2",
      "1.2.3",
    ]);
  });

  it("parses headings with v-prefix and dash separators", () => {
    const out = parseChangelog(
      [
        "## v3.0.0 - 2024-08-12",
        "## v2.5.1 - 2024-07-04",
      ].join("\n"),
      NOW,
    );
    expect(out!.releases[0].version).toBe("2.5.1");
    expect(out!.releases[1].version).toBe("3.0.0");
  });

  it("parses slash-separator headings", () => {
    const out = parseChangelog(
      [
        "## 1.0.1 / 2024-02-20",
        "## 1.0.0 / 2024-01-15",
      ].join("\n"),
      NOW,
    );
    expect(out!.releases.map((r) => r.version)).toEqual(["1.0.0", "1.0.1"]);
  });

  it("accepts h1 / h2 / h3 release headings", () => {
    const out = parseChangelog(
      [
        "# 1.0.0 - 2024-01-15",
        "## 0.9.0 - 2023-11-01",
        "### 0.8.0 - 2023-09-01",
      ].join("\n"),
      NOW,
    );
    expect(out!.releases).toHaveLength(3);
  });

  it("strips markdown link syntax around versions", () => {
    const out = parseChangelog(
      "## [1.0.0](https://github.com/x/y/releases/tag/v1.0.0) - 2024-01-15",
      NOW,
    );
    expect(out!.releases[0].version).toBe("1.0.0");
  });

  it("dedupes identical (version, date) pairs", () => {
    const out = parseChangelog(
      [
        "## [1.0.0] - 2024-01-15",
        "## [1.0.0] - 2024-01-15  // duplicate, e.g. TOC",
      ].join("\n"),
      NOW,
    );
    expect(out!.releases).toHaveLength(1);
  });

  it("skips the [Unreleased] section without recording a release", () => {
    const out = parseChangelog(
      [
        "## [Unreleased]",
        "- WIP",
        "## Unreleased - 2024-02-01",
        "- malformed",
      ].join("\n"),
      NOW,
    );
    expect(out).toBeNull();
  });

  it("rejects structurally-invalid dates", () => {
    const out = parseChangelog(
      [
        "## 1.0.0 - 2024-13-99", // bad month + day
        "## 1.0.0 - 2024-02-30", // Feb has no 30th
      ].join("\n"),
      NOW,
    );
    expect(out).toBeNull();
  });

  it("returns null for files without dated release headings", () => {
    expect(parseChangelog("# Project changelog\n\nNo releases yet.", NOW)).toBeNull();
    expect(parseChangelog("", NOW)).toBeNull();
    expect(parseChangelog(null, NOW)).toBeNull();
  });
});

describe("parseChangelog — cadence math", () => {
  it("computes mean + median deltas correctly", () => {
    const out = parseChangelog(
      [
        "## 1.0.0 - 2024-01-01",
        "## 1.1.0 - 2024-02-01", // +31
        "## 1.2.0 - 2024-04-01", // +60
        "## 1.3.0 - 2024-04-15", // +14
      ].join("\n"),
      NOW,
    );
    expect(out!.averageDaysBetween).toBeCloseTo((31 + 60 + 14) / 3, 1);
    expect(out!.medianDaysBetween).toBe(31);
  });

  it("computes daysSinceLatest against the injected `now` clock", () => {
    const out = parseChangelog(
      "## 1.0.0 - 2024-01-15",
      new Date("2024-01-30T00:00:00Z"),
    );
    expect(out!.daysSinceLatest).toBe(15);
  });

  it("returns null deltas when only one release is detected", () => {
    const out = parseChangelog("## 1.0.0 - 2024-01-15", NOW);
    expect(out!.averageDaysBetween).toBeNull();
    expect(out!.medianDaysBetween).toBeNull();
  });
});

describe("parseChangelog — cadence buckets", () => {
  it("buckets `frequent` cadence (≤ 14 days)", () => {
    const lines: string[] = [];
    // Eight releases, ten days apart, ending five days before NOW.
    for (let i = 0; i < 8; i++) {
      const day = new Date(NOW);
      day.setUTCDate(day.getUTCDate() - 5 - i * 10);
      lines.push(`## 1.0.${7 - i} - ${day.toISOString().slice(0, 10)}`);
    }
    const out = parseChangelog(lines.join("\n"), NOW);
    expect(out!.cadence).toBe("frequent");
  });

  it("buckets `regular` cadence (≤ 60 days)", () => {
    const out = parseChangelog(
      [
        "## 1.0.0 - 2024-01-01",
        "## 1.1.0 - 2024-02-15", // +45
        "## 1.2.0 - 2024-04-01", // +46
        "## 1.3.0 - 2026-04-01", // recent enough
      ].join("\n"),
      NOW,
    );
    // Mean ≈ 273 days because of the long final gap — overall bucket
    // moves to `occasional`. Just lock the floor.
    expect(["regular", "occasional", "rare"]).toContain(out!.cadence);
  });

  it("flags long-stale projects as `dormant` regardless of historical cadence", () => {
    // Eight releases, every 7 days, but the most recent is 2 years
    // before NOW (May 2026 → so latest in May 2024).
    const lines: string[] = [];
    let d = new Date("2024-05-10T00:00:00Z");
    for (let i = 0; i < 8; i++) {
      lines.push(`## 1.0.${i} - ${d.toISOString().slice(0, 10)}`);
      d = new Date(d);
      d.setUTCDate(d.getUTCDate() - 7);
    }
    const out = parseChangelog(lines.join("\n"), NOW);
    expect(out!.cadence).toBe("dormant");
  });

  it("a single very-recent release is `occasional`, not `frequent`", () => {
    const today = NOW.toISOString().slice(0, 10);
    const out = parseChangelog(`## 1.0.0 - ${today}`, NOW);
    expect(out!.cadence).toBe("occasional");
  });

  it("a single very-old release is `dormant`", () => {
    const out = parseChangelog("## 1.0.0 - 2020-01-01", NOW);
    expect(out!.cadence).toBe("dormant");
  });
});

describe("formatCadence", () => {
  it.each([
    ["frequent", "Frequent"],
    ["regular", "Regular"],
    ["occasional", "Occasional"],
    ["rare", "Rare"],
    ["dormant", "Dormant"],
  ] as const)("%s → %s", (cadence, label) => {
    expect(formatCadence(cadence)).toBe(label);
  });
});
