/**
 * Smoke tests for the SpeedDialFAB.
 *
 * Hard runtime tests (open/close, focus management, click-outside)
 * would need jsdom; we keep the assertions to render-time invariants:
 *  - aria-haspopup, aria-expanded on the main FAB
 *  - menu role + aria-hidden when closed
 *  - mini items get tabIndex=-1 when collapsed
 *  - hidden=true short-circuits the render
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Award, Share2 } from "lucide-react";
import { SpeedDialFAB } from "../../src/components/SpeedDialFAB";

const actions = [
  { id: "share", label: "Share", icon: Share2, onClick: () => {} },
  { id: "badge", label: "Badge", icon: Award, onClick: () => {} },
];

describe("<SpeedDialFAB />", () => {
  it("renders the main FAB with menu disclosure attributes", () => {
    const html = renderToStaticMarkup(<SpeedDialFAB actions={actions} />);
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Open Quick actions menu");
  });

  it("marks the menu as hidden initially", () => {
    const html = renderToStaticMarkup(<SpeedDialFAB actions={actions} />);
    expect(html).toContain('role="menu"');
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders mini items with tabindex=-1 while collapsed", () => {
    const html = renderToStaticMarkup(<SpeedDialFAB actions={actions} />);
    // Two menu items, both tabIndex={-1}
    const matches = html.match(/role="menuitem"/g) ?? [];
    expect(matches.length).toBe(actions.length);
    expect(html).toContain('tabindex="-1"');
  });

  it("propagates the custom ariaLabel", () => {
    const html = renderToStaticMarkup(
      <SpeedDialFAB actions={actions} ariaLabel="Compare actions" />,
    );
    expect(html).toContain("Compare actions menu");
    expect(html).toContain("Open Compare actions menu");
  });

  it("renders nothing when hidden=true", () => {
    const html = renderToStaticMarkup(
      <SpeedDialFAB actions={actions} hidden />,
    );
    expect(html).toBe("");
  });

  it("renders nothing when actions is empty", () => {
    const html = renderToStaticMarkup(<SpeedDialFAB actions={[]} />);
    expect(html).toBe("");
  });

  it("hides the cluster on sm: screens via Tailwind class", () => {
    const html = renderToStaticMarkup(<SpeedDialFAB actions={actions} />);
    // Mobile-first sm:hidden + print:hidden on the wrapper.
    expect(html).toContain("sm:hidden");
    expect(html).toContain("print:hidden");
  });
});
