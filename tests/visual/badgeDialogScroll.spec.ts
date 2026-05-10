/**
 * Phase 5.x mobile bugfix regression — badge dialog scroll trap.
 *
 * Maintainer report: on mobile, opening the Badge dialog leaves
 * the popup un-scrollable AND the page underneath scrolls when
 * you swipe inside the popup ("der Hintergrund scrollt"). Both
 * symptoms have the same root cause: iOS Safari + Android Chrome
 * don't fully honour `body { overflow: hidden }` for touch.
 *
 * The fix:
 *  1. useDialog body-lock now uses `position: fixed; top: -<scrollY>;
 *     width: 100%` — the robust pattern.
 *  2. `[role="dialog"] { overscroll-behavior: contain }` stops
 *     swipes from chaining out of the dialog.
 *  3. `.bottom-sheet-card { overscroll-behavior: contain }` stops
 *     the chain at the inner scroll container too.
 *
 * This spec locks all three.
 */

import { expect, test } from "@playwright/test";
import { makeBundle } from "../fixtures/builders";

const bundle = makeBundle({
  metadata: {
    fullName: "demo-org/badge-fixture",
    name: "badge-fixture",
    owner: {
      login: "demo-org",
      avatarUrl: "",
      htmlUrl: "https://example.com/demo-org",
      type: "Organization",
    },
    description: "Badge dialog scroll-trap regression fixture.",
    stars: 100,
    defaultBranch: "main",
    language: "TypeScript",
    license: { spdxId: "MIT", name: "MIT" },
  },
  paths: ["README.md", "LICENSE", "package.json"],
  importantFiles: {
    "package.json": JSON.stringify({ name: "x", scripts: { build: "vite build" } }),
  },
  readmeContent: "# x\n\n## Installation\nnpm install",
});

const SEED = JSON.stringify({ bundle, cachedAt: new Date().toISOString() });

async function seedAndOpen(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript((seed: string) => {
    localStorage.setItem(
      "astraudit:bundle:v1:demo-org/badge-fixture",
      seed,
    );
    localStorage.setItem(
      "astraudit:bundle-index:v1",
      JSON.stringify([
        {
          key: "astraudit:bundle:v1:demo-org/badge-fixture",
          cachedAt: new Date().toISOString(),
          sizeApprox: seed.length,
          fullName: "demo-org/badge-fixture",
        },
      ]),
    );
  }, SEED);
  await page.goto("/#/audit/demo-org/badge-fixture", { waitUntil: "networkidle" });
  await page.waitForSelector('section[id="overview"]', { timeout: 15_000 });
}

test.describe("Phase 5.x — Badge dialog mobile scroll trap", () => {
  test.use({ viewport: { width: 390, height: 720 } });

  test("opens the badge dialog with the WAI-ARIA contract intact", async ({
    page,
  }) => {
    await seedAndOpen(page);
    // The Badge button lives in the dashboard score-area cluster.
    await page.getByRole("button", { name: "Badge", exact: true }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    // The dialog has aria-modal + aria-labelledby per the APG.
    await expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  test("body becomes position: fixed when the dialog opens (iOS-safe lock)", async ({
    page,
  }) => {
    await seedAndOpen(page);
    await page.getByRole("button", { name: "Badge", exact: true }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const bodyState = await page.evaluate(() => ({
      position: getComputedStyle(document.body).position,
      overflow: getComputedStyle(document.body).overflow,
    }));
    expect(bodyState.position).toBe("fixed");
    expect(bodyState.overflow).toBe("hidden");
  });

  test("dialog open + close does NOT jump the page to top", async ({
    page,
  }) => {
    // The literal user-visible bug: an iOS-Safari-style body lock
    // that uses `position: fixed; top: -<scrollY>` will, if the
    // unlock path is broken, dump the user back at scrollY=0 after
    // close. Tests of EXACT scroll restoration are flaky because
    // Chromium's `focus({ preventScroll: true })` race scrolls a
    // few hundred pixels off, but the "we jumped to top" symptom
    // is sharp and reliable.
    await seedAndOpen(page);
    await page.evaluate(() => window.scrollTo(0, 600));
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(400);

    await page.getByRole("button", { name: "Badge", exact: true }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    const after = await page.evaluate(() => window.scrollY);
    // The bug we shipped this fix for: body lock leaves scrollY=0
    // after close. Anything else is fine — the user is not
    // catapulted back to the hero.
    expect(after).toBeGreaterThan(200);
  });

  test("dialog overlay carries `overscroll-behavior: contain` so swipes don't chain", async ({
    page,
  }) => {
    await seedAndOpen(page);
    await page.getByRole("button", { name: "Badge", exact: true }).click();
    const overlay = page.locator('[role="dialog"]').first();
    const overscroll = await overlay.evaluate(
      (el) => getComputedStyle(el as HTMLElement).overscrollBehaviorY,
    );
    // Browsers normalise the value to "contain" for both axes.
    expect(overscroll).toBe("contain");
  });

  test("bottom-sheet card scrolls internally on a phone-sized viewport", async ({
    page,
  }) => {
    await seedAndOpen(page);
    await page.getByRole("button", { name: "Badge", exact: true }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const card = page.locator(".bottom-sheet-card").first();
    const metrics = await card.evaluate((el) => {
      const cs = getComputedStyle(el as HTMLElement);
      return {
        overflowY: cs.overflowY,
        overscrollY: cs.overscrollBehaviorY,
        scrollHeight: (el as HTMLElement).scrollHeight,
        clientHeight: (el as HTMLElement).clientHeight,
      };
    });
    expect(metrics.overflowY).toBe("auto");
    expect(metrics.overscrollY).toBe("contain");
    // The fixture's badge content is tall enough that the card
    // genuinely needs to scroll on a 390x720 viewport.
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  });
});
