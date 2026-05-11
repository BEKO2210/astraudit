/**
 * Phase 4.1 — visual regression: legal pages.
 * Phase 6.5 — extended with light-theme parity coverage.
 *
 * The German Impressum + Datenschutzerklärung + the RuleBook share
 * the `LegalPage` chrome and the `.legal-prose` / `.readme-prose`
 * typography stack. A regression in either the shared chrome or in
 * a global heading rule could silently break readability, so we
 * snapshot each page in BOTH themes — the existing semantic-token
 * system means a single inverted variable can ripple silently
 * across the whole UI.
 */

import { expect, test } from "@playwright/test";

const LEGAL_ROUTES = [
  {
    path: "/#/impressum",
    heading: "Impressum",
    slug: "impressum",
  },
  {
    path: "/#/datenschutz",
    heading: "Datenschutzerklärung",
    slug: "datenschutz",
  },
  {
    path: "/#/rules",
    heading: "Astraudit rule book",
    slug: "rules",
  },
] as const;

test.describe("Legal pages — dark theme", () => {
  for (const route of LEGAL_ROUTES) {
    test(`${route.heading} renders correctly`, async ({ page }) => {
      await page.goto(route.path);
      await expect(
        page.getByRole("heading", { name: route.heading, level: 1 }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot(`${route.slug}.png`, {
        fullPage: true,
        mask: [page.locator("footer")],
      });
    });
  }
});

test.describe("Legal pages — light theme (Phase 6.5 parity sweep)", () => {
  for (const route of LEGAL_ROUTES) {
    test(`${route.heading} renders correctly in light mode`, async ({
      page,
    }) => {
      // Force light via the data attribute before the app boots so the
      // user gets a flicker-free light theme. Same trick as home.spec.ts.
      await page.addInitScript(() => {
        try {
          localStorage.setItem("astraudit:theme:v1", "light");
        } catch {
          /* noop */
        }
      });
      await page.goto(route.path);
      await expect(
        page.getByRole("heading", { name: route.heading, level: 1 }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot(`${route.slug}-light.png`, {
        fullPage: true,
        mask: [page.locator("footer")],
      });
    });
  }
});
