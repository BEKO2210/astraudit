/**
 * Phase 5.2 follow-up — mobile horizontal-overflow guard.
 *
 * The maintainer reported that on narrow Android-style viewports
 * (≈ 360 px wide) the home page allowed a sliver of horizontal
 * scrolling — the Hero's settings + history row was wider than the
 * available content area by 2 px. That shipped because none of our
 * existing specs ran at < 1280 px, so a real-world bug nobody on
 * a desktop noticed slipped through.
 *
 * This guard runs the same documents at 360 × 640 (typical Android)
 * and 320 × 568 (the smallest viewport iOS still supports — iPhone
 * SE 1st gen) and asserts `document.documentElement.scrollWidth ≤
 * window.innerWidth`. If a future change pushes anything outside
 * the viewport, CI will tell us before mobile users do.
 *
 * 320 × 568 is also the WCAG 1.4.10 *Reflow* contract — content
 * must not require horizontal scrolling at 320 CSS px wide.
 */

import { expect, test } from "@playwright/test";

const ROUTES = [
  { path: "/", label: "home" },
  { path: "/#/impressum", label: "impressum" },
  { path: "/#/datenschutz", label: "datenschutz" },
  { path: "/#/rules", label: "rules" },
];

const VIEWPORTS = [
  { width: 320, height: 568, label: "320 (WCAG 1.4.10 Reflow)" },
  { width: 360, height: 640, label: "360 (typical Android)" },
];

for (const vp of VIEWPORTS) {
  test.describe(`No horizontal overflow at ${vp.label}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`${route.label} fits the viewport width`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        const measure = await page.evaluate(() => ({
          docWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
        }));
        expect(
          measure.docWidth,
          `documentElement.scrollWidth was ${measure.docWidth}, viewport ${measure.viewportWidth}`,
        ).toBeLessThanOrEqual(measure.viewportWidth);
        expect(measure.bodyWidth).toBeLessThanOrEqual(measure.viewportWidth);
      });
    }
  });
}
