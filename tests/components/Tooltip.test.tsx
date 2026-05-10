/**
 * Tests for the Phase 2.8.8 Tooltip primitive.
 *
 * The contract we're locking down:
 *   - Bubble carries `role="tooltip"` (WAI-ARIA APG).
 *   - Bubble id is wired to the trigger's `aria-describedby` only when
 *     the consumer opts in via `describe`. Default is no SR redundancy.
 *   - The wrapper carries the placement attribute so CSS can flip the
 *     bubble between `top` and `bottom`.
 *   - The bubble is rendered in the DOM at all times (CSS handles
 *     visibility) — needed so screen readers can resolve the id, and
 *     so the bubble's own :hover keeps it open per WCAG 1.4.13.
 *   - Print rule hides every bubble.
 *   - Reduced-motion users get instant show/hide.
 *
 * We render via react-dom/server (no jsdom) — same pattern as the
 * other component tests in this suite. CSS contract is verified by
 * string-matching globals.css.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Tooltip } from "../../src/components/ui/Tooltip";

const GLOBALS_CSS = readFileSync(
  resolve(__dirname, "..", "..", "src/styles/globals.css"),
  "utf-8",
);

describe("<Tooltip />", () => {
  it("renders the bubble with role=tooltip and the label text", () => {
    const html = renderToStaticMarkup(
      <Tooltip label="Save audit as PDF">
        <button type="button">PDF</button>
      </Tooltip>,
    );
    expect(html).toContain('role="tooltip"');
    expect(html).toContain("Save audit as PDF");
  });

  it("does not wire aria-describedby by default (avoid SR redundancy)", () => {
    const html = renderToStaticMarkup(
      <Tooltip label="Copy">
        <button type="button" aria-label="Copy">
          icon
        </button>
      </Tooltip>,
    );
    expect(html).not.toMatch(/aria-describedby="tt-/);
  });

  it("wires aria-describedby when describe={true} and id matches the bubble", () => {
    const html = renderToStaticMarkup(
      <Tooltip label="Hold Shift to copy raw" describe>
        <button type="button" aria-label="Copy">
          icon
        </button>
      </Tooltip>,
    );
    const idMatch = html.match(/id="(tt-[^"]+)"/);
    expect(idMatch, "tooltip element should have an id").not.toBeNull();
    const id = idMatch![1];
    expect(html).toContain(`aria-describedby="${id}"`);
  });

  it("renders the placement attribute (default top, override bottom)", () => {
    const top = renderToStaticMarkup(
      <Tooltip label="x">
        <button type="button">a</button>
      </Tooltip>,
    );
    expect(top).toContain('data-tt-placement="top"');

    const bottom = renderToStaticMarkup(
      <Tooltip label="x" placement="bottom">
        <button type="button">a</button>
      </Tooltip>,
    );
    expect(bottom).toContain('data-tt-placement="bottom"');
  });

  it("keeps the bubble in the DOM at render time (CSS handles visibility)", () => {
    const html = renderToStaticMarkup(
      <Tooltip label="hint">
        <button type="button">a</button>
      </Tooltip>,
    );
    expect(html).toContain("tt-bubble");
    expect(html).toContain("tt-wrap");
  });
});

describe("Tooltip CSS contract (globals.css)", () => {
  it("declares the tt-wrap and tt-bubble base classes", () => {
    expect(GLOBALS_CSS).toMatch(/\.tt-wrap\s*\{/);
    expect(GLOBALS_CSS).toMatch(/\.tt-bubble\s*\{/);
  });

  it("uses :focus-within so keyboard focus alone reveals the bubble", () => {
    expect(GLOBALS_CSS).toContain(".tt-wrap:focus-within > .tt-bubble");
  });

  it("keeps the bubble visible while the bubble itself is hovered (WCAG 1.4.13 Hoverable)", () => {
    expect(GLOBALS_CSS).toContain(".tt-bubble:hover");
  });

  it("hides the bubble when data-tt-dismissed is set (WCAG 1.4.13 Dismissible)", () => {
    expect(GLOBALS_CSS).toMatch(
      /\.tt-wrap\[data-tt-dismissed="true"\]\s*>\s*\.tt-bubble/,
    );
  });

  it("respects prefers-reduced-motion by removing the transition", () => {
    const reducedBlock = GLOBALS_CSS.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\}\s*\}/g,
    );
    expect(reducedBlock).not.toBeNull();
    const joined = (reducedBlock ?? []).join("\n");
    expect(joined).toMatch(/\.tt-bubble\s*\{[^}]*transition:\s*none/);
  });

  it("hides every bubble when printing", () => {
    const printBlocks = GLOBALS_CSS.match(
      /@media\s+print\s*\{[\s\S]*?\}\s*\}/g,
    );
    expect(printBlocks).not.toBeNull();
    const joined = (printBlocks ?? []).join("\n");
    expect(joined).toMatch(/\.tt-bubble\s*\{[^}]*display:\s*none/);
  });

  it("provides a forced-colors override using system tokens", () => {
    const fcMatch = GLOBALS_CSS.match(
      /@media\s*\(forced-colors:\s*active\)\s*\{[\s\S]*?\}\s*\}/g,
    );
    expect(fcMatch).not.toBeNull();
    const joined = (fcMatch ?? []).join("\n");
    expect(joined).toMatch(/\.tt-bubble[\s\S]*background:\s*Canvas/);
    expect(joined).toMatch(/\.tt-bubble[\s\S]*color:\s*CanvasText/);
  });
});
