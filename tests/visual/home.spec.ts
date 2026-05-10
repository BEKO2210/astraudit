/**
 * Phase 4.1 — visual regression: home / empty state.
 *
 * The home page is the audit's primary entry point and the most-likely
 * surface for a stray CSS regression to land on (every header, hero,
 * theme-toggle, footer, and pill style flows through it). We snapshot
 * it in both themes — the existing semantic-token system means a
 * single inverted variable can ripple silently across the whole UI.
 */

import { expect, test } from "@playwright/test";

const FOOTER_YEAR_MASK = '[role="contentinfo"], footer';

test.describe("Home page", () => {
  test("dark theme renders the hero, input, and footer", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot("home-dark.png", {
      fullPage: true,
      // The footer carries `new Date().getFullYear()` and the auth pill
      // contains live token-prefix data. Mask both so they can't churn
      // a baseline.
      mask: [
        page.locator(FOOTER_YEAR_MASK),
        page.locator('[aria-label*="Theme"]'),
        page.locator('[aria-label="Open settings"]'),
      ],
    });
  });

  test("light theme renders the hero, input, and footer", async ({ page }) => {
    // Force light via the data attribute since the theme toggle reads
    // it on first paint. We set it before the app boots so the user
    // gets a flicker-free light theme.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("astraudit:theme:v1", "light");
      } catch {
        /* noop */
      }
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot("home-light.png", {
      fullPage: true,
      mask: [
        page.locator(FOOTER_YEAR_MASK),
        page.locator('[aria-label*="Theme"]'),
        page.locator('[aria-label="Open settings"]'),
      ],
    });
  });
});
