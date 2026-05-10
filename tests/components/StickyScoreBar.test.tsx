/**
 * Tests for the sticky score bar.
 *
 * The IntersectionObserver wiring is hard to exercise without a DOM
 * runtime, so the assertions focus on:
 *  - Exposed constants (height + CSS var name) — used in CSS and on
 *    other components, so a regression here would affect layout.
 *  - The component renders without throwing in node SSR.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { __test, StickyScoreBar } from "../../src/components/StickyScoreBar";
import { runAudit } from "../../src/lib/audit/auditEngine";
import { makeBundle } from "../fixtures/builders";

beforeAll(() => {
  // SSR doesn't have IntersectionObserver, our component should
  // gracefully bail out via the typeof check.
  vi.stubGlobal("IntersectionObserver", undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StickyScoreBar exported constants", () => {
  it("exposes a CSS variable name and bar height", () => {
    expect(__test.STICKY_OFFSET_VAR).toBe("--sticky-offset");
    expect(__test.BAR_HEIGHT_PX).toBe(48);
  });
});

describe("StickyScoreBar render", () => {
  it("renders without throwing in SSR (IntersectionObserver absent)", () => {
    const result = runAudit(
      makeBundle({
        paths: ["README.md", "package.json", "LICENSE"],
        readmeContent: "# Demo\n## Installation\nnpm install",
      }),
    );
    const html = renderToStaticMarkup(<StickyScoreBar result={result} />);
    expect(html.startsWith("<div")).toBe(true);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Audit summary"');
    // Hidden-state aria + data attributes on initial render.
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("-translate-y-full");
    expect(html).toContain("pointer-events-none");
  });
});
