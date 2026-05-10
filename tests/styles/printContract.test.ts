/**
 * Phase 5.7 — print stylesheet contract.
 *
 * The print path is hard to unit-test (jsdom doesn't honour
 * @media print, and Playwright snapshot suites only catch *visual*
 * regressions in the printable preview). To catch "someone removed
 * the rule" regressions cheaply, this test reads `globals.css`
 * directly and asserts the contract:
 *   - the dialog hide-rule, the heatmap grayscale ramp, and the
 *     per-card break protection live inside an `@media print` block;
 *   - the Phase 3+ section IDs (insights / topic-checks / registry)
 *     are wired into the page-break rules;
 *   - the per-cell `data-heat-level` mapping covers all 5 buckets.
 *
 * Why a string-level test and not a parsed-CSS test:
 *   - Pulling in a full CSS parser (postcss / cssom) for one
 *     contract check is overkill — the rules are short and the
 *     anchors are unambiguous (`section[id="topic-checks"]`,
 *     `[data-heat-level="3"]`).
 *   - String-level grep is what a maintainer would do anyway when
 *     reasoning about which rules apply.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS = readFileSync(
  resolve(__dirname, "../../src/styles/globals.css"),
  "utf8",
);

/** Extract every `@media print { ... }` block (handles nested braces
 *  by walking, since regex can't balance braces). */
function printBlocks(css: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < css.length) {
    const start = css.indexOf("@media print", i);
    if (start < 0) break;
    const open = css.indexOf("{", start);
    if (open < 0) break;
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") depth -= 1;
      j += 1;
    }
    out.push(css.slice(open + 1, j - 1));
    i = j;
  }
  return out;
}

const ALL_PRINT = printBlocks(CSS).join("\n");

describe("globals.css — Phase 5.7 print contract", () => {
  it("at least one @media print block exists", () => {
    expect(printBlocks(CSS).length).toBeGreaterThan(0);
  });

  it("hides every dialog (modal chrome) in print", () => {
    expect(ALL_PRINT).toMatch(/\[role="dialog"\]/);
  });

  it("hides the React Flow canvas in print", () => {
    expect(ALL_PRINT).toMatch(/\.react-flow/);
  });

  it("page-breaks before each major Phase 3+ section", () => {
    expect(ALL_PRINT).toMatch(/section\[id="topic-checks"\]/);
    expect(ALL_PRINT).toMatch(/section\[id="registry"\]/);
    expect(ALL_PRINT).toMatch(/break-before:\s*page/);
  });

  it("avoids breaking inside the score / story / insights blocks", () => {
    expect(ALL_PRINT).toMatch(/section\[id="insights"\]/);
    expect(ALL_PRINT).toMatch(/section\[id="story"\]/);
    expect(ALL_PRINT).toMatch(/section\[id="score"\]/);
    expect(ALL_PRINT).toMatch(/break-inside:\s*avoid/);
  });

  it("avoids breaking inside per-card primitives via the `data-print-card` opt-in", () => {
    expect(ALL_PRINT).toMatch(/\[data-print-card\]/);
  });

  it("maps every heatmap intensity bucket (0..4) to a print-friendly grayscale", () => {
    for (const level of [0, 1, 2, 3, 4]) {
      expect(ALL_PRINT).toMatch(
        new RegExp(`\\[data-heat-level="${level}"\\]`),
      );
    }
  });

  it("forces print backgrounds with print-color-adjust so highlights survive", () => {
    expect(ALL_PRINT).toMatch(/print-color-adjust:\s*exact/);
  });

  it("hides skeleton shimmers in print (no animated placeholders on paper)", () => {
    expect(ALL_PRINT).toMatch(/\.skeleton-shimmer/);
  });
});

/** CSS with every `@media print { ... }` block removed — i.e. only
 *  the on-screen rules. Used to assert that a rule lives OUTSIDE a
 *  print block (the dual of `ALL_PRINT`). */
function nonPrintCss(css: string): string {
  const blocks = printBlocks(css);
  let stripped = css;
  for (const block of blocks) {
    // We don't try to remove the `@media print { … }` wrapper line
    // exactly; just removing each block's body is sufficient since
    // the assertions look for substring matches and the wrapper line
    // doesn't contain `.print-only`.
    stripped = stripped.replace(block, "");
  }
  return stripped;
}

const NON_PRINT = nonPrintCss(CSS);

describe("globals.css — print-only escape hatch", () => {
  it("declares a `.print-only` rule that defaults to display: none on screen", () => {
    // The screen rule must live OUTSIDE every @media print block —
    // otherwise it'd never apply on-screen and the print-only
    // affordance would leak into the dashboard.
    expect(NON_PRINT).toMatch(/\.print-only[\s\S]{0,80}display:\s*none/);
  });

  it("flips `.print-only` to display: block inside @media print", () => {
    expect(ALL_PRINT).toMatch(/\.print-only[\s\S]{0,80}display:\s*block/);
  });
});
