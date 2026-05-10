/**
 * Tests for the view-transition class constant.
 *
 * The constant ships in tailwind.config.ts as two keyframes
 * (`view-enter` for motion-safe, `fade-in` for motion-reduce). The
 * variant pair is the contract every view component depends on, so
 * a regression here would silently swap behaviour for users with
 * prefers-reduced-motion. We assert the literal value to make any
 * accidental change visible.
 */

import { describe, expect, it } from "vitest";
import { VIEW_ENTER_CLASS } from "../../../src/lib/ui/transitions";

describe("VIEW_ENTER_CLASS", () => {
  it("opts into view-enter for motion-safe users", () => {
    expect(VIEW_ENTER_CLASS).toContain("motion-safe:animate-view-enter");
  });

  it("falls back to fade-in for prefers-reduced-motion: reduce users", () => {
    expect(VIEW_ENTER_CLASS).toContain("motion-reduce:animate-fade-in");
  });

  it("never declares an unguarded animate-* utility", () => {
    // Naked animate-foo would fire regardless of motion preference.
    const naked = VIEW_ENTER_CLASS.match(/(?<!motion-(?:safe|reduce):)animate-/g);
    expect(naked).toBeNull();
  });
});
