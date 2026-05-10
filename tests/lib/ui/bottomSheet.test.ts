/**
 * Phase 2.8.10 — Mobile bottom-sheet dialogs.
 *
 * The contract we lock down:
 *   1. CSS rule `.bottom-sheet-card` exists, scoped under
 *      `@media (max-width: 639.98px)` (Tailwind's `sm` breakpoint).
 *      Above that the class must be a no-op so desktop centred dialogs
 *      keep their existing layout.
 *   2. Sheet caps height at `92svh` (small-viewport units, NOT `vh` —
 *      `vh` clips under mobile chrome, `dvh` causes layout thrash).
 *   3. `padding-bottom` honours `env(safe-area-inset-bottom)` with a
 *      fallback so the iOS home indicator never sits over the primary
 *      action.
 *   4. The sheet rounds only the *top* corners (matches the M3 spec).
 *   5. A drag-handle pill is rendered via `::before` so users get the
 *      "this came from below" visual cue.
 *   6. Reduced-motion users get the scrim blur stripped (motion-sensitive
 *      users complain about full-screen blur).
 *   7. All five candidate dialogs (Settings, History, Compare, Shortcuts,
 *      Badge) use the class. CommandPalette is top-pinned and stays
 *      excluded.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..", "..", "..");
const GLOBALS_CSS = readFileSync(
  resolve(ROOT, "src/styles/globals.css"),
  "utf-8",
);

function readComponent(name: string): string {
  return readFileSync(resolve(ROOT, "src/components", name), "utf-8");
}

describe("bottom-sheet CSS contract (globals.css)", () => {
  it("scopes the sheet rules under @media (max-width: 639.98px)", () => {
    const block = GLOBALS_CSS.match(
      /@media\s*\(max-width:\s*639\.98px\)\s*\{[\s\S]*?\.bottom-sheet-card/,
    );
    expect(block, "bottom-sheet block missing or wrong breakpoint").not.toBeNull();
  });

  it("uses small-viewport units (svh) for max-height", () => {
    expect(GLOBALS_CSS).toMatch(/\.bottom-sheet-card\s*\{[^}]*max-height:\s*92svh/);
  });

  it("honours env(safe-area-inset-bottom) with a fallback", () => {
    expect(GLOBALS_CSS).toMatch(
      /padding-bottom:\s*calc\(\s*1\.25rem\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\s*\)/,
    );
  });

  it("rounds only the top corners on mobile", () => {
    expect(GLOBALS_CSS).toMatch(
      /\.bottom-sheet-card\s*\{[^}]*border-bottom-left-radius:\s*0/,
    );
    expect(GLOBALS_CSS).toMatch(
      /\.bottom-sheet-card\s*\{[^}]*border-bottom-right-radius:\s*0/,
    );
  });

  it("renders a drag-handle pill via ::before", () => {
    expect(GLOBALS_CSS).toMatch(
      /\.bottom-sheet-card::before\s*\{[\s\S]*?width:\s*36px[\s\S]*?height:\s*4px/,
    );
  });

  it("provides a light-theme handle override", () => {
    expect(GLOBALS_CSS).toMatch(
      /html\[data-theme="light"\]\s*\.bottom-sheet-card::before\s*\{[^}]*background:\s*rgba\(15, ?23, ?42/,
    );
  });

  it("disables backdrop-filter for prefers-reduced-motion users", () => {
    expect(GLOBALS_CSS).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.bottom-sheet-card[^}]*backdrop-filter:\s*none/,
    );
  });

  it("uses negative margins to hug viewport edges (cancels parent p-4)", () => {
    expect(GLOBALS_CSS).toMatch(/\.bottom-sheet-card\s*\{[^}]*margin:\s*0\s+-1rem\s+-1rem/);
    expect(GLOBALS_CSS).toMatch(/\.bottom-sheet-card\s*\{[^}]*width:\s*calc\(100%\s*\+\s*2rem\)/);
  });
});

describe("bottom-sheet wiring (components)", () => {
  const targets = [
    "SettingsDialog.tsx",
    "HistoryDialog.tsx",
    "CompareDialog.tsx",
    "ShortcutsDialog.tsx",
    "BadgeDialog.tsx",
  ];

  for (const file of targets) {
    it(`${file} carries the bottom-sheet-card class on its dialog card`, () => {
      const src = readComponent(file);
      expect(
        src.includes("bottom-sheet-card"),
        `${file} should add the bottom-sheet-card class`,
      ).toBe(true);
      // Sanity-check it's on the same element as glass-strong (the card).
      expect(src).toMatch(/bottom-sheet-card[^"']*glass-strong/);
    });
  }

  it("CommandPalette is top-pinned and explicitly NOT a bottom sheet", () => {
    const src = readComponent("CommandPalette.tsx");
    expect(src).not.toContain("bottom-sheet-card");
    // The palette uses items-start + pt-[8vh] / sm:pt-[15vh] — opening
    // it as a bottom sheet would jar against that pinned-top affordance.
    expect(src).toMatch(/items-start/);
  });
});
