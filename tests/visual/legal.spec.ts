/**
 * Phase 4.1 — visual regression: legal pages.
 *
 * The German Impressum + Datenschutzerklärung are content-stable but
 * use a separate `.legal-prose` typography stack. A regression in the
 * shared chrome (LegalPage) or in a global heading rule could silently
 * break readability of either, so we snapshot both as full-page.
 */

import { expect, test } from "@playwright/test";

test.describe("Legal pages", () => {
  test("Impressum renders correctly", async ({ page }) => {
    await page.goto("/#/impressum");
    await expect(
      page.getByRole("heading", { name: "Impressum", level: 1 }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("impressum.png", {
      fullPage: true,
      mask: [page.locator("footer")],
    });
  });

  test("Datenschutzerklärung renders correctly", async ({ page }) => {
    await page.goto("/#/datenschutz");
    await expect(
      page.getByRole("heading", { name: "Datenschutzerklärung", level: 1 }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("datenschutz.png", {
      fullPage: true,
      mask: [page.locator("footer")],
    });
  });
});
