/**
 * Phase 5.3 — Dialog hardening Playwright spec.
 *
 * Locks down the WAI-ARIA APG modal-dialog contract for every
 * dialog in the app: focus trap, focus restore, body scroll lock,
 * Esc dismissal, aria-labelledby. The audit found that none of
 * those four runtime behaviours were enforced consistently before
 * this phase — every dialog had Esc, none had focus trap or scroll
 * lock, focus restore was implicit (and unreliable). This spec is
 * the contract guard so a regression here fails CI.
 *
 * We test the Settings dialog as the canonical case (it has
 * multiple focusable descendants and an explicit initial-focus
 * target via `useDialog({ initialFocusRef })`). The other dialogs
 * use the same hook; locking down one is enough to lock down all.
 */

import { expect, test } from "@playwright/test";

test.describe("Dialog hardening (WAI-ARIA APG)", () => {
  test("Settings dialog: opens with focus inside, restores on close, locks scroll", async ({
    page,
  }) => {
    await page.goto("/");

    // Capture the trigger element so we can assert focus restore.
    const triggerLocator = page.getByRole("button", {
      name: /Settings/,
    });
    await triggerLocator.click();

    // 1. The dialog mounted and is visible.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // 2. The dialog has an accessible name (aria-labelledby points
    //    at a real element with text content).
    const accessibleName = await dialog.getAttribute("aria-label");
    const labelledBy = await dialog.getAttribute("aria-labelledby");
    expect(
      accessibleName || labelledBy,
      "dialog must have aria-label or aria-labelledby",
    ).toBeTruthy();
    if (labelledBy) {
      // useId() produces ids like `:r2:` that need CSS-escaping —
      // use document.getElementById in evaluate() instead of a CSS
      // selector to dodge the issue entirely.
      const labelText = await page.evaluate(
        (id) => document.getElementById(id)?.textContent ?? "",
        labelledBy,
      );
      expect(labelText.trim().length).toBeGreaterThan(0);
    }

    // 3. Initial focus is inside the dialog (the input ref).
    const focusedInsideAfterOpen = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(document.activeElement) ?? false;
    });
    expect(focusedInsideAfterOpen).toBe(true);

    // 4. Body scroll is locked while the dialog is open.
    const bodyOverflow = await page.evaluate(() =>
      getComputedStyle(document.body).overflow,
    );
    expect(bodyOverflow).toBe("hidden");

    // 5. Esc closes the dialog.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 6. Body scroll lock is released after close.
    const bodyOverflowAfter = await page.evaluate(() =>
      getComputedStyle(document.body).overflow,
    );
    expect(bodyOverflowAfter).not.toBe("hidden");

    // 7. Focus is restored to the trigger.
    const restoredText = await page.evaluate(
      () => document.activeElement?.textContent?.trim() ?? "",
    );
    expect(restoredText).toContain("Settings");
  });

  test("Settings dialog: focus trap cycles inside (Tab + Shift-Tab)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Settings/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Tab around several times, asserting focus stays inside the
    // dialog every step. We tab forward through enough times that
    // a naive implementation would have escaped to the body by
    // now.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const stillInside = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(document.activeElement) ?? false;
      });
      expect(stillInside, `Tab #${i + 1} escaped the dialog`).toBe(true);
    }

    // Shift+Tab back also stays inside.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Shift+Tab");
      const stillInside = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(document.activeElement) ?? false;
      });
      expect(stillInside, `Shift+Tab #${i + 1} escaped the dialog`).toBe(true);
    }

    await page.keyboard.press("Escape");
  });

  test("Backdrop click also closes + restores focus", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Settings/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Click the backdrop (top-left corner of the overlay, which is
    // the dialog wrapper itself, not the inner card).
    await dialog.click({ position: { x: 5, y: 5 } });
    await expect(dialog).toBeHidden();

    const restoredText = await page.evaluate(
      () => document.activeElement?.textContent?.trim() ?? "",
    );
    expect(restoredText).toContain("Settings");
  });
});
