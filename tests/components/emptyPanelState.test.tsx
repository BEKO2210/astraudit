/**
 * Tests for the Phase 5.5 `<EmptyPanelState />` primitive + the
 * panels that were rewritten to use it.
 *
 * The primitive replaces the old "panel renders with empty body"
 * (RecommendationsPanel) and "panel returns null silently"
 * (OnboardingPanel) anti-patterns with a coherent shared
 * component. We lock down:
 *   1. The primitive renders title + icon + description as expected.
 *   2. Description is genuinely optional (no <p> when omitted).
 *   3. RecommendationsPanel falls back to the celebratory empty
 *      state when given an empty recommendations array.
 *   4. OnboardingPanel does the same for an empty steps array
 *      (replacing the old `return null`).
 *   5. Both empty paths still render a real glass card (so the
 *      surrounding layout doesn't reflow when data toggles).
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Sparkles } from "lucide-react";
import { EmptyPanelState } from "../../src/components/ui/EmptyPanelState";
import { RecommendationsPanel } from "../../src/components/RecommendationsPanel";
import { OnboardingPanel } from "../../src/components/OnboardingPanel";

describe("<EmptyPanelState />", () => {
  it("renders the title + icon + glass card chrome", () => {
    const html = renderToStaticMarkup(
      <EmptyPanelState icon={Sparkles} title="Nothing to see here" />,
    );
    expect(html).toContain("Nothing to see here");
    expect(html).toContain("glass");
    expect(html).toMatch(/<svg/); // the lucide icon survived
  });

  it("includes the description when provided", () => {
    const html = renderToStaticMarkup(
      <EmptyPanelState
        icon={Sparkles}
        title="X"
        description="A specific reason why."
      />,
    );
    expect(html).toContain("A specific reason why.");
  });

  it("omits the description <p> when not provided", () => {
    const html = renderToStaticMarkup(
      <EmptyPanelState icon={Sparkles} title="X" />,
    );
    // `<path` (lucide SVG) starts with `<p`, so we can't use a bare
    // `not.toContain("<p")`. Match only an actual paragraph-element
    // opening tag — i.e. `<p` followed by space, `>`, or `/`.
    expect(html).not.toMatch(/<p[\s>/]/);
  });

  it("applies the accent class to the icon", () => {
    const html = renderToStaticMarkup(
      <EmptyPanelState
        icon={Sparkles}
        title="X"
        accentClass="text-aurora-mint"
      />,
    );
    expect(html).toContain("text-aurora-mint");
  });
});

describe("RecommendationsPanel — empty path", () => {
  it("renders the celebratory empty state when given no recommendations", () => {
    const html = renderToStaticMarkup(
      <RecommendationsPanel recommendations={[]} />,
    );
    expect(html).toContain("No recommended next steps");
    // The celebratory message mentions the rule-based detectors so
    // users know the empty state is meaningful, not a render bug.
    expect(html).toContain("rule-based detectors");
  });

  it("does NOT render the Copy-all button on the empty path", () => {
    // The old implementation rendered Copy-all even with no items;
    // it'd copy the empty string. The new path omits it.
    const html = renderToStaticMarkup(
      <RecommendationsPanel recommendations={[]} />,
    );
    expect(html).not.toContain("Copy all steps");
  });

  it("still shows the empty-state card chrome (not literally nothing)", () => {
    const html = renderToStaticMarkup(
      <RecommendationsPanel recommendations={[]} />,
    );
    expect(html).toContain("glass");
    expect(html.length).toBeGreaterThan(200);
  });
});

describe("OnboardingPanel — empty path", () => {
  it("renders a coherent empty state instead of returning null", () => {
    // The old behaviour was `return null` — the section silently
    // disappeared. Now users get an explicit explanation.
    const html = renderToStaticMarkup(<OnboardingPanel steps={[]} />);
    expect(html).toContain("No automated onboarding steps detected");
    expect(html).toContain("README");
  });

  it("falls back to the README pointer when there's no detected stack", () => {
    const html = renderToStaticMarkup(<OnboardingPanel steps={[]} />);
    expect(html).toContain("install instructions");
  });
});
