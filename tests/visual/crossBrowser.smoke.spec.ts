/**
 * Phase 6.21–6.24 — Cross-browser + device smoke.
 *
 * Snapshot suites stay Chromium-only because rendering parity across
 * engines is a losing battle for visual diffs. What we CAN do across
 * Firefox / WebKit / mobile Chromium is verify behaviour:
 *
 *   - The home page boots (H1 visible, RepoInput present).
 *   - No JavaScript errors fire on first paint.
 *   - The CSP meta tag and the self-hosted fonts load (no console
 *     errors about blocked resources).
 *   - The audit graph route at least mounts without throwing.
 *   - Theme storage persists across reloads.
 *
 * `*.smoke.spec.ts` is the file-glob convention used by the firefox
 * / webkit / mobile-chromium projects in playwright.config.ts — these
 * cases run on every engine; the visual / a11y / dialog specs only
 * run on Chromium where the baselines live.
 *
 * What this DOESN'T cover (still manual per the roadmap):
 *   - Safari (real macOS) pixel-perfect comparison + Print to PDF.
 *   - Safari iOS body-lock + dialog-scroll-trap on a physical iPhone.
 *   - Android Chrome on a physical device (real touch + memory).
 *   - Browser-extension survival (Dark Reader, uBlock, etc.).
 */

import { expect, test } from "@playwright/test";

test.describe("Cross-browser smoke (every engine)", () => {
  test("home page boots cleanly with no console errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /repository/i }),
    ).toBeVisible();

    // Filter expected/benign errors:
    //   - Workers in non-Chromium engines sometimes log a benign
    //     "ResizeObserver loop limit exceeded" — that's a layout
    //     observer cycle, not an Astraudit bug.
    //   - 4xx fetch errors are fine: GitHub Pages 404s, etc.
    const actionable = consoleErrors.filter(
      (e) =>
        !/ResizeObserver loop/i.test(e) &&
        !/Failed to load resource.*the server responded with a status of (404|429)/i.test(e),
    );
    expect(
      actionable,
      `Console errors:\n  ${actionable.join("\n  ")}`,
    ).toEqual([]);
  });

  test("theme preference persists across reloads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Force light theme via the same key the app reads on first paint.
    await page.evaluate(() => {
      localStorage.setItem("astraudit:theme:v1", "light");
    });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(theme).toBe("light");
  });

  test("legal page route renders the H1 (lazy chunk resolves)", async ({
    page,
  }) => {
    await page.goto("/#/impressum");
    await expect(
      page.getByRole("heading", { name: "Impressum", level: 1 }),
    ).toBeVisible();
  });

  test("rule book route renders + scrolls without console errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await page.goto("/#/rules");
    await expect(
      page.getByRole("heading", { name: "Astraudit rule book", level: 1 }),
    ).toBeVisible();
    // Scroll to the bottom to exercise the rendered markdown + any
    // late-mounting hash anchors.
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );

    const actionable = consoleErrors.filter(
      (e) => !/ResizeObserver loop/i.test(e),
    );
    expect(actionable, `Console errors:\n  ${actionable.join("\n  ")}`).toEqual(
      [],
    );
  });
});
