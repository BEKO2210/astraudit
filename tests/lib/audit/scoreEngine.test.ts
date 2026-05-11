/**
 * Tests for Phase 7.0.5's `effectiveMaxScore` denominator helper.
 *
 * The whole point of 7.0.5 is that `unknown` (public surface lacks
 * the data) and `not-applicable` (file/pattern doesn't belong on
 * this stack) should NEVER read as `missing`. The contract:
 *
 *   - `unknown`:        score 0 → no credit, denominator 0 → no penalty.
 *   - `not-applicable`: score 0 → no credit, denominator 0 → no penalty.
 *   - any other status: full `max` rolls into the denominator.
 *
 * Downstream consumers (`auditEngine.maxScore`, the score-ring UI,
 * the exporters) read `effectiveMaxScore` so the displayed
 * percentage stays honest as soon as 7.0.3 + per-stack rule packs
 * start emitting the new states.
 */

import { describe, expect, it } from "vitest";
import type { CategoryScore } from "../../../src/types/audit";
import {
  effectiveMaxScore,
  totalScore,
} from "../../../src/lib/audit/scoreEngine";

function cat(
  key: string,
  status: CategoryScore["status"],
  score: number,
  max: number,
): CategoryScore {
  return {
    key: key as CategoryScore["key"],
    label: key,
    score,
    max,
    status,
    summary: "",
    evidence: [],
  };
}

describe("effectiveMaxScore", () => {
  it("returns the legacy fixed sum when no n/a + no unknown categories are emitted", () => {
    // Every legacy status counts its `max` into the denominator
    // unchanged, so a v1.0-era audit still sees 100 / 100.
    const categories: CategoryScore[] = [
      cat("documentation", "strong", 15, 15),
      cat("structure", "partial", 10, 15),
      cat("quality", "weak", 5, 15),
      cat("security", "missing", 0, 15),
      cat("maintenance", "not-detected", 0, 15),
      cat("dx", "info", 7, 10),
      cat("ecosystem", "strong", 9, 10),
      cat("ci", "partial", 3, 5),
    ];
    expect(effectiveMaxScore(categories)).toBe(100);
  });

  it("drops `not-applicable` categories out of the denominator entirely", () => {
    // A `not-applicable` category contributes 0 to the numerator
    // AND removes its `max` from the denominator. A stack where DX
    // is N/A (e.g. a pure spec repo with no source code) gets a
    // 90-max denominator, not 100, so a strong-everywhere project
    // still scores 100%.
    const categories: CategoryScore[] = [
      cat("documentation", "strong", 15, 15),
      cat("dx", "not-applicable", 0, 10),
    ];
    expect(effectiveMaxScore(categories)).toBe(15);
    // totalScore is unchanged — it's just the score column.
    expect(totalScore(categories)).toBe(15);
  });

  it("drops `unknown` categories out of the denominator (no penalty, no credit)", () => {
    // `unknown` ≠ `missing`. A category whose public surface lacks
    // the data (branch protection, transitive CVE counts) gets 0/0
    // — the audit reports the state honestly without penalising
    // the repo for an answer we can't see.
    const categories: CategoryScore[] = [
      cat("documentation", "strong", 15, 15),
      cat("security", "unknown", 0, 15),
    ];
    expect(effectiveMaxScore(categories)).toBe(15);
    expect(totalScore(categories)).toBe(15);
  });

  it("supports multiple n/a + unknown categories at once", () => {
    // A polyglot repo where DX is N/A and Security is Unknown
    // should see both drop out of the denominator. The remaining
    // 70 points are what the audit actually scored against.
    const categories: CategoryScore[] = [
      cat("documentation", "strong", 15, 15),
      cat("structure", "strong", 15, 15),
      cat("quality", "strong", 15, 15),
      cat("security", "unknown", 0, 15),
      cat("maintenance", "strong", 15, 15),
      cat("dx", "not-applicable", 0, 10),
      cat("ecosystem", "strong", 10, 10),
      cat("ci", "strong", 5, 5),
    ];
    expect(effectiveMaxScore(categories)).toBe(75);
    expect(totalScore(categories)).toBe(75);
  });

  it("never falls below 0 even if every category is unknown or n/a", () => {
    // Pathological case: a degenerate audit where literally
    // nothing could be scored. The denominator goes to 0 so the
    // dashboard's `score/max` lands at 0/0. Downstream code that
    // does `score / max` needs to guard against this — that's the
    // consumer's contract, not this helper's job.
    const categories: CategoryScore[] = [
      cat("documentation", "unknown", 0, 15),
      cat("dx", "not-applicable", 0, 10),
    ];
    expect(effectiveMaxScore(categories)).toBe(0);
  });
});
