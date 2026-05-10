/**
 * Phase 6.1 — Popover edge containment.
 *
 * Locks the contract that every popover-shaped surface (Tooltip,
 * ExportMenu's overflow caret menu, the "Link copied" pill on
 * ShareButton, the FAB speed-dial label cluster) stays fully
 * on-screen at the WCAG 1.4.10 reflow viewport (320 px) and at the
 * common Android (360 px) and tablet portrait (768 px) widths.
 *
 * The Tooltip primitive ships viewport-edge detection (Phase 5.x —
 * see src/components/ui/Tooltip.tsx) that swaps `data-tt-align` to
 * `left` / `right` / `center` based on the measured rect. This test
 * verifies the resulting bubble actually clears both edges of the
 * viewport.
 *
 * We probe the home page only — every Tooltip on the dashboard uses
 * the same primitive, and the home page already has Tooltip-backed
 * triggers (ThemeToggle in the Hero header) anchored at the right
 * edge where overflow is most likely.
 */

import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 320, height: 568, label: "320 (WCAG 1.4.10 Reflow)" },
  { width: 360, height: 640, label: "360 (typical Android)" },
  { width: 768, height: 1024, label: "768 (iPad portrait)" },
];

for (const vp of VIEWPORTS) {
  test.describe(`Popover edge containment at ${vp.label}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("every visible Tooltip bubble clears both viewport edges when shown", async ({
      page,
    }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Collect every .tt-wrap on the page. Each one wraps a single
      // interactive trigger; hovering it makes the .tt-bubble visible.
      const triggerCount = await page.locator(".tt-wrap").count();
      expect(
        triggerCount,
        "Home page should expose at least one Tooltip-wrapped trigger (ThemeToggle in Hero).",
      ).toBeGreaterThan(0);

      const overflows: Array<{
        index: number;
        label: string;
        left: number;
        right: number;
        viewport: number;
      }> = [];

      for (let i = 0; i < triggerCount; i++) {
        const wrap = page.locator(".tt-wrap").nth(i);
        // Some Tooltips are inside print:hidden / sm:hidden trees so
        // they're DOM-present but not visible at this viewport. Skip
        // those — there's nothing to assert about an invisible bubble.
        if (!(await wrap.isVisible())) continue;

        // Force the bubble visible the same way a user would: hover
        // the wrapper. Tooltip's measureEdge() runs on `pointerenter`
        // and writes data-tt-align before the bubble transitions in.
        await wrap.hover({ force: true });
        const bubble = wrap.locator(".tt-bubble");
        // The transition is 120 ms; give it a beat to settle, then
        // measure.
        await page.waitForTimeout(160);

        const rect = await bubble.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width };
        });
        const label = await bubble.textContent();

        // Tolerance: the Tooltip primitive uses an 8 px safety margin
        // on the right edge (see Tooltip.measureEdge). We allow a
        // sub-pixel slack here because Chromium's getBoundingClientRect
        // rounds to fractional pixels.
        if (rect.left < -0.5 || rect.right > vp.width + 0.5) {
          overflows.push({
            index: i,
            label: (label ?? "").trim().slice(0, 40),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            viewport: vp.width,
          });
        }

        // Move the pointer off so the next hover is a fresh enter.
        await page.mouse.move(0, 0);
        await page.waitForTimeout(50);
      }

      expect(
        overflows,
        `Tooltips that overflowed the ${vp.width} px viewport:\n` +
          overflows
            .map(
              (o) =>
                `  - "${o.label}" at left=${o.left} right=${o.right} (viewport=${o.viewport})`,
            )
            .join("\n"),
      ).toEqual([]);
    });
  });
}
