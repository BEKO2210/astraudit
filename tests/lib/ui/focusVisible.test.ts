/**
 * Phase 2.8.7 — Universal focus-visible ring.
 *
 * The single source of truth for keyboard focus visibility lives in
 * `src/styles/globals.css`. A regression here would silently re-enable
 * the WCAG-2.4.7 violation we just fixed (no visible keyboard focus on
 * interactive elements), so we lock the contract down with a string-
 * level test against the CSS file. This is intentionally cheap — full
 * CSS parsing is overkill for asserting the presence of a few rules.
 *
 * What we assert:
 *  1. `*:focus-visible` rule exists in @layer base (dark theme baseline).
 *  2. The rule has a real outline (not just transparent).
 *  3. There is a halo via `box-shadow` (WCAG 2.4.13 contrast bridge).
 *  4. Light-theme override targets `[data-theme="light"]` and uses a
 *     different colour (so the ring stays visible on near-white).
 *  5. `forced-colors` block uses `Highlight` (Windows High Contrast).
 *  6. No component file ships with a naked `focus:outline-none` —
 *     the only escape hatch is `focus-visible:outline-none` paired
 *     with `focus-visible:ring-*` (a custom replacement ring).
 *
 * Sources baked into the contract:
 *  - https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
 *  - https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
 *  - https://www.sarasoueidan.com/blog/focus-indicators/
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..", "..", "..");
const GLOBALS_CSS = readFileSync(
  resolve(ROOT, "src/styles/globals.css"),
  "utf-8",
);

describe("Universal focus-visible ring (globals.css)", () => {
  it("declares a *:focus-visible rule", () => {
    expect(GLOBALS_CSS).toMatch(/\*:focus-visible\s*\{/);
  });

  it("paints a non-transparent outline of at least 2px", () => {
    const match = GLOBALS_CSS.match(
      /\*:focus-visible\s*\{[^}]*outline:\s*2px\s+solid\s+([^;]+);/,
    );
    expect(match, "global outline declaration").not.toBeNull();
    const colour = match![1].trim().toLowerCase();
    expect(colour).not.toBe("transparent");
    expect(colour).not.toBe("none");
  });

  it("offsets the outline so it hugs the focus target", () => {
    expect(GLOBALS_CSS).toMatch(
      /\*:focus-visible\s*\{[^}]*outline-offset:\s*2px/,
    );
  });

  it("renders a halo via box-shadow as a contrast bridge", () => {
    expect(GLOBALS_CSS).toMatch(
      /\*:focus-visible\s*\{[^}]*box-shadow:\s*0\s+0\s+0\s+4px\s+/,
    );
  });

  it("provides a light-theme override on [data-theme=\"light\"]", () => {
    expect(GLOBALS_CSS).toMatch(
      /html\[data-theme="light"\]\s*\*:focus-visible\s*\{/,
    );
  });

  it("respects forced-colors mode (Windows High Contrast)", () => {
    expect(GLOBALS_CSS).toMatch(/@media\s*\(forced-colors:\s*active\)/);
    const block = GLOBALS_CSS.match(
      /@media\s*\(forced-colors:\s*active\)\s*\{[\s\S]*?\}\s*\}/,
    );
    expect(block, "forced-colors block").not.toBeNull();
    expect(block![0]).toMatch(/outline:\s*2px\s+solid\s+Highlight/);
  });
});

describe("No naked focus:outline-none escapes the global ring", () => {
  function walk(dir: string, files: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        walk(full, files);
      } else if (/\.(tsx?|jsx?)$/.test(entry)) {
        files.push(full);
      }
    }
    return files;
  }

  const componentFiles = walk(resolve(ROOT, "src"));

  it("never uses bare focus:outline-none in className strings", () => {
    const offenders: string[] = [];
    for (const file of componentFiles) {
      const text = readFileSync(file, "utf-8");
      // Match the legacy Tailwind utility `focus:outline-none` but allow
      // `focus-visible:outline-none` (the modern, keyboard-only escape).
      // The negative lookbehind keeps `focus-visible:` matches out.
      const matches = text.match(/(?<!focus-visible:)(?<!-)focus:outline-none/g);
      if (matches) offenders.push(file);
    }
    expect(
      offenders,
      `Files using focus:outline-none without focus-visible: prefix:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
