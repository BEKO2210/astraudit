/**
 * Tests for the Phase 4.6 CONTRIBUTING.md.
 *
 * The guide is the onboarding contract for new contributors —
 * silently dropping a section (or shipping a doc that contradicts
 * the actual codebase) would chase away the people we want most.
 * We lock down the structural contract here so a regression is
 * caught in CI rather than by a confused first-time contributor.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CONTRIBUTING = readFileSync(
  resolve(__dirname, "..", "..", "CONTRIBUTING.md"),
  "utf-8",
);

describe("CONTRIBUTING.md", () => {
  it("declares the four operating constraints", () => {
    expect(CONTRIBUTING).toContain("Browser-only");
    expect(CONTRIBUTING).toContain("Free, forever");
    expect(CONTRIBUTING).toContain("Public repositories only");
    expect(CONTRIBUTING).toContain("Rule-based");
  });

  it("walks contributors through the canonical sections", () => {
    for (const heading of [
      "Quick start",
      "Repo layout",
      "Adding a new finding-emitting rule",
      "Adding a new panel detector",
      "Writing tests with the fixture builders",
      "Running every CI gate locally",
      "Updating the rule book",
      "Pull request workflow",
      "Review expectations",
      "Reporting security issues",
    ]) {
      expect(CONTRIBUTING).toContain(heading);
    }
  });

  it("references the CI gates by command so contributors can copy/paste", () => {
    expect(CONTRIBUTING).toContain("npm run typecheck");
    expect(CONTRIBUTING).toContain("npm test");
    expect(CONTRIBUTING).toContain("npx playwright test");
    expect(CONTRIBUTING).toContain("npx lhci autorun");
    expect(CONTRIBUTING).toContain("npm run build");
  });

  it("points at the fixture builders + the rule book", () => {
    expect(CONTRIBUTING).toContain("tests/fixtures/builders.ts");
    expect(CONTRIBUTING).toContain("docs/RULES.md");
  });

  it("uses the actual Finding shape (description, evidence string, affectedFiles, confidence)", () => {
    // Guards against the doc drifting from src/types/finding.ts.
    expect(CONTRIBUTING).toContain("description:");
    expect(CONTRIBUTING).toContain("evidence:");
    expect(CONTRIBUTING).toContain("recommendation:");
    expect(CONTRIBUTING).toContain("affectedFiles:");
    expect(CONTRIBUTING).toContain("confidence:");
  });

  it("links to the rule book and the security email", () => {
    expect(CONTRIBUTING).toContain("docs/RULES.md");
    expect(CONTRIBUTING).toContain("belkis.aslani@gmail.com");
  });
});
