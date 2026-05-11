/**
 * Phase 6.11 — Forced-colours mode (Windows High Contrast / Firefox
 * forced colours).
 *
 * `forced-colors: active` users have a system-defined palette that
 * overrides author colours. CSS keywords like `CanvasText`,
 * `Canvas`, `LinkText`, `Highlight`, etc. map to those system
 * values. Author backgrounds disappear; gradient backgrounds become
 * one of the system surfaces; SVG fills hardcoded to RGB stay
 * exactly as the author wrote them (a known accessibility hole).
 *
 * Phase 5.3 added `forced-colors: active` rules for tooltips and
 * focus-visible outlines. This spec is the wider verification:
 *
 *   1. Take a Playwright screenshot with `forcedColors: 'active'`
 *      emulated. Lock it as a baseline so a regression that hides
 *      every aurora-coloured affordance can't ship silently.
 *   2. Run axe-core in the same emulated mode and assert no new
 *      WCAG-tagged violations land.
 *
 * Why a single home-page snapshot is enough: every dashboard panel
 * inherits from the same `.glass` + `text-*` + `bg-*` token chain.
 * If the home page paints cleanly in forced-colors mode, the
 * dashboard inherits the same correctness.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Phase 6.11 — forced-colors: active fallback", () => {
  test("home: renders sensibly with forced-colors emulated", async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot("home-forced-colors.png", {
      fullPage: true,
      mask: [page.locator("footer")],
    });
  });

  test("home: no new axe violations in forced-colors mode", async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      // color-contrast is meaningless under forced-colors: the system
      // palette is presumed accessible by definition. Skip it.
      .disableRules(["color-contrast"])
      .analyze();
    const actionable = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(
      actionable,
      `forced-colors home page: ${actionable.length} serious/critical violation(s):\n` +
        actionable.map((v) => `  - ${v.id}: ${v.help}`).join("\n"),
    ).toEqual([]);
  });

  test("rule book: renders sensibly with forced-colors emulated", async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/#/rules");
    await expect(
      page.getByRole("heading", { name: "Astraudit rule book", level: 1 }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("rules-forced-colors.png", {
      fullPage: true,
      mask: [page.locator("footer")],
    });
  });
});
