/**
 * Smoke tests for the celebratory empty state.
 *
 * Focus on the accessibility contract that the research called out
 * specifically: live region semantics, redundant announcement for
 * screen readers that ignore role=status content updates, motion-safe
 * animation classes (so prefers-reduced-motion users get static art),
 * and the conditional Compare CTA.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyFindingsCelebration } from "../../src/components/EmptyFindingsCelebration";

describe("<EmptyFindingsCelebration />", () => {
  const baseProps = {
    repoFullName: "facebook/react",
    score: 81,
    max: 100,
  };

  it("renders a polite live region with the success announcement", () => {
    const html = renderToStaticMarkup(<EmptyFindingsCelebration {...baseProps} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
  });

  it("includes a sr-only sentence for assistive tech that ignores role=status", () => {
    const html = renderToStaticMarkup(<EmptyFindingsCelebration {...baseProps} />);
    expect(html).toContain("sr-only");
    expect(html).toContain("All clear for facebook/react");
    expect(html).toContain("Score 81 of 100");
  });

  it("shows the score chip with explicit aria-label for screen readers", () => {
    const html = renderToStaticMarkup(<EmptyFindingsCelebration {...baseProps} />);
    expect(html).toContain('aria-label="Score 81 of 100"');
    expect(html).toContain(">81/100<");
  });

  it("wraps every animation in motion-safe so prefers-reduced-motion users see static art", () => {
    const html = renderToStaticMarkup(<EmptyFindingsCelebration {...baseProps} />);
    // Every animate-* utility on this card lives behind motion-safe:.
    const naked = html.match(/(?<!motion-safe:)animate-/g);
    expect(naked).toBeNull();
  });

  it("hides every decorative sparkle from assistive tech", () => {
    const html = renderToStaticMarkup(<EmptyFindingsCelebration {...baseProps} />);
    // The decorative wrapper carries aria-hidden so the four icons
    // inside don't surface to a screen reader.
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders the Compare CTA only when onOpenCompare is provided", () => {
    const without = renderToStaticMarkup(
      <EmptyFindingsCelebration {...baseProps} />,
    );
    expect(without).not.toContain("Compare against another repo");

    const withCta = renderToStaticMarkup(
      <EmptyFindingsCelebration {...baseProps} onOpenCompare={() => {}} />,
    );
    expect(withCta).toContain("Compare against another repo");
  });

  it("never uses the phrase 'No findings' (research: celebratory != generic empty)", () => {
    const html = renderToStaticMarkup(<EmptyFindingsCelebration {...baseProps} />);
    expect(html).not.toContain("No findings");
    expect(html).toContain("All clear");
  });
});
