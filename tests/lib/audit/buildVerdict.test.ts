/**
 * Regression: `buildVerdict` used to be a function of total score
 * alone, so a repo at 87/100 with weak Maintenance still received
 * the canned "Strong fundamentals: …, and active maintenance"
 * verdict. The new implementation reads the per-category mix and
 * names the categories that ARE strong (or weak), instead of
 * lying about the ones that aren't.
 */

import { describe, expect, it } from "vitest";
import { buildVerdict } from "../../../src/lib/audit/scoreEngine";
import type { CategoryScore } from "../../../src/types/audit";

const cat = (
  key: string,
  label: string,
  score: number,
  max: number,
): CategoryScore => ({
  key: key as CategoryScore["key"],
  label,
  score,
  max,
  status: "partial",
  summary: "",
  evidence: [],
});

describe("buildVerdict — category-aware", () => {
  it("falls back to legacy copy when no categories are supplied (back-compat)", () => {
    const verdict = buildVerdict(85, "Very Strong");
    expect(verdict).toMatch(/Strong fundamentals/);
  });

  it("at 80+ names the actually-strong categories instead of canned 'active maintenance'", () => {
    // The real-world audit-self case: Documentation / Structure /
    // Code Quality / Security / DX / Ecosystem / CI all strong;
    // Maintenance only 60%. The verdict must NOT claim "active
    // maintenance".
    const categories = [
      cat("documentation", "Documentation", 15, 15),
      cat("structure", "Structure", 13, 15),
      cat("quality", "Code Quality Signals", 14, 15),
      cat("security", "Security & Trust", 13, 15),
      cat("maintenance", "Maintenance", 9, 15),
      cat("dx", "Developer Experience", 9, 10),
      cat("ecosystem", "Ecosystem & Dependencies", 9, 10),
      cat("ci", "CI/CD & Automation", 5, 5),
    ];
    const verdict = buildVerdict(87, "Very Strong", categories);
    // Names at least one strong category by name.
    expect(verdict).toMatch(/documentation|code quality|structure|ci\/cd/i);
    // Crucially: does NOT claim "active maintenance".
    expect(verdict.toLowerCase()).not.toContain("active maintenance");
  });

  it("when 80+ AND categories include a weak one, says 'thinner on X'", () => {
    const categories = [
      cat("documentation", "Documentation", 15, 15),
      cat("structure", "Structure", 13, 15),
      cat("maintenance", "Maintenance", 4, 15), // genuinely weak
      cat("ci", "CI/CD & Automation", 5, 5),
    ];
    const verdict = buildVerdict(82, "Strong", categories);
    expect(verdict.toLowerCase()).toMatch(/thinner on .*maintenance/);
  });

  it("60-79 range names the weak categories explicitly", () => {
    const categories = [
      cat("documentation", "Documentation", 5, 15),
      cat("security", "Security & Trust", 4, 15),
      cat("structure", "Structure", 13, 15),
    ];
    const verdict = buildVerdict(65, "Workable", categories);
    expect(verdict.toLowerCase()).toMatch(/documentation|security/);
    expect(verdict.toLowerCase()).toMatch(/missing/);
  });

  it("≤45 still produces a clear 'too many signals missing' tone", () => {
    const verdict = buildVerdict(30, "Critical");
    expect(verdict).toMatch(/too many trust and quality signals/i);
  });

  it("90+ with three strong categories names them rather than the canned blurb", () => {
    const categories = [
      cat("documentation", "Documentation", 15, 15),
      cat("structure", "Structure", 14, 15),
      cat("quality", "Code Quality Signals", 14, 15),
      cat("security", "Security & Trust", 14, 15),
      cat("maintenance", "Maintenance", 14, 15),
    ];
    const verdict = buildVerdict(95, "Excellent", categories);
    expect(verdict).toMatch(/Mature, well-rounded engineering signals across/);
  });
});
