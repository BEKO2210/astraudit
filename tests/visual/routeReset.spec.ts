/**
 * Phase 5.1 — Scroll & focus reset on route changes.
 *
 * The trigger flow this spec covers is exactly the bug report that
 * kicked off the phase: a visitor scrolls to the very bottom of the
 * home page to reach the footer link, clicks "Datenschutz", and is
 * deposited halfway down the legal page because the browser preserves
 * scroll position across hash changes. Phase 5.1's `DocPage` effect
 * resets scrollY to 0 *and* moves keyboard focus to the page's <h1>
 * so screen-reader users hear the new context.
 *
 * We also exercise the cross-navigation case (Datenschutz → Impressum
 * via the in-page nav link) and the in-app rule book route (`#/rules`)
 * because all three ultimately mount a fresh DocPage and should all
 * benefit from the same effect.
 */

import { expect, test } from "@playwright/test";

test.describe("Route-change scroll & focus reset", () => {
  test("clicking the footer Datenschutz link lands the user at the top of the page", async ({
    page,
  }) => {
    await page.goto("/");

    // Scroll to the very bottom — that's where the footer (and the
    // Datenschutz link) lives in the real flow.
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    // Click the footer Datenschutz link.
    await page.getByRole("link", { name: "Datenschutz" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Datenschutzerklärung", level: 1 }),
    ).toBeVisible();

    // The new page must be at the top.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // Focus must be on the page's H1 so a screen-reader user is told
    // they've landed somewhere new.
    const focusedTag = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    const focusedText = await page.evaluate(
      () => document.activeElement?.textContent,
    );
    expect(focusedTag).toBe("H1");
    expect(focusedText).toContain("Datenschutzerklärung");
  });

  test("cross-navigating from Datenschutz to Impressum also resets scroll + focus", async ({
    page,
  }) => {
    await page.goto("/#/datenschutz");
    await expect(
      page.getByRole("heading", { name: "Datenschutzerklärung", level: 1 }),
    ).toBeVisible();

    // Scroll deep into the legal text.
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    // Click the in-page "Impressum →" cross-link in the doc-page header.
    await page.getByRole("link", { name: /Impressum/ }).first().click();
    await expect(
      page.getByRole("heading", { name: "Impressum", level: 1 }),
    ).toBeVisible();

    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const focusedText = await page.evaluate(
      () => document.activeElement?.textContent,
    );
    expect(focusedText).toContain("Impressum");
  });

  test("rule book is reset the same way (Phase 4.5 + 5.1 integration)", async ({
    page,
  }) => {
    // Pre-condition: make sure the route resolver actually handles the
    // rule-book slug (Phase 4.5 wired it). Then run the same flow as
    // above to confirm the doc-page effect fires here too.
    await page.goto("/");
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.getByRole("link", { name: "Rule book" }).click();
    await expect(
      page.getByRole("heading", { name: "Astraudit rule book", level: 1 }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
