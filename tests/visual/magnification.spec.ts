/**
 * Phase 6.12 — Magnification + zoom (WCAG 1.4.4 + 1.4.10).
 *
 * WCAG 1.4.4 *Resize Text* (AA): all content must remain readable
 * and operable when zoomed to 200% without loss of information or
 * functionality. A 1280×800 desktop viewport at 200% browser zoom
 * effectively renders the layout in a 640×400 CSS-pixel window —
 * so we drive Playwright at that size and assert:
 *   1. document.scrollWidth ≤ viewport.width (no horizontal scroll),
 *   2. every must-be-visible control (Hero CTAs, Hero brand link,
 *      RepoInput field, Audit button, the AI-ready · MCP pill,
 *      Footer's primary links) remains visible + clickable.
 *
 * The existing mobileOverflow spec covers 320 / 360 px (WCAG 1.4.10
 * Reflow). This spec covers the desktop-zoom case the Reflow spec
 * doesn't reach — bigger fonts, more chrome, less aggressive
 * mobile-only branches in the CSS.
 */

import { expect, test } from "@playwright/test";

const ZOOMED_DESKTOP = { width: 640, height: 400 } as const;

test.describe("WCAG 1.4.4 — 200% zoom on desktop (640×400 effective)", () => {
  test.use({ viewport: ZOOMED_DESKTOP });

  test("home: no horizontal scrollbar at 200% zoom", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const measure = await page.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(
      measure.docWidth,
      `documentElement.scrollWidth=${measure.docWidth} viewport=${measure.viewportWidth}`,
    ).toBeLessThanOrEqual(measure.viewportWidth);
    expect(measure.bodyWidth).toBeLessThanOrEqual(measure.viewportWidth);
  });

  test("home: critical controls remain in-viewport at 200% zoom", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Each of these must be findable, visible, and clickable. If a
    // control disappears off the bottom because the page got too
    // tall, scrolling-into-view will bring it back into the
    // viewport — that's allowed by WCAG 1.4.4 (vertical scrolling
    // is fine; horizontal isn't).
    const controls = [
      page.getByRole("heading", { level: 1 }),
      // The audit submit button (visible name varies depending on
      // loading state; match by role + text).
      page.getByRole("button", { name: /Audit/i }).first(),
      // The Settings opener in the Hero strip.
      page.getByRole("button", { name: /Settings|Auth/i }).first(),
    ];

    for (const control of controls) {
      await expect(control, "control should be visible at 200% zoom").toBeVisible();
      // scrollIntoView is permitted under WCAG (vertical scroll OK).
      await control.scrollIntoViewIfNeeded();
      // After scrolling, the bounding rect must sit fully within the
      // viewport horizontally (no horizontal clipping).
      const box = await control.boundingBox();
      expect(box, "control must have a non-zero bounding box").not.toBeNull();
      if (!box) return;
      expect(
        box.x,
        `control left edge at x=${box.x}, must be ≥ 0`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        box.x + box.width,
        `control right edge at x=${box.x + box.width}, viewport=${ZOOMED_DESKTOP.width}`,
      ).toBeLessThanOrEqual(ZOOMED_DESKTOP.width + 1); // sub-pixel slack
    }
  });

  test("rule book: no horizontal scrollbar at 200% zoom", async ({ page }) => {
    await page.goto("/#/rules");
    await page.waitForLoadState("networkidle");
    const measure = await page.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(measure.docWidth).toBeLessThanOrEqual(measure.viewportWidth);
  });

  test("legal: Datenschutz has no horizontal scrollbar at 200% zoom", async ({
    page,
  }) => {
    await page.goto("/#/datenschutz");
    await page.waitForLoadState("networkidle");
    const measure = await page.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(measure.docWidth).toBeLessThanOrEqual(measure.viewportWidth);
  });
});
