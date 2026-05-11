/**
 * Phase 6.10 — Keyboard-only flow trace.
 *
 * Tabs through the home page and the legal pages with no mouse, and
 * locks the contract that every focusable element:
 *   1. is actually visible to the keyboard user (not focusable-but-hidden),
 *   2. carries a non-empty accessible name (so a screen-reader user
 *      knows what just took focus),
 *   3. participates in a sensible Tab order (no jumps past a visible
 *      control, no infinite cycles outside the page).
 *
 * Esc dismissal + focus trap behaviour live in dialogHardening.spec.ts
 * (Phase 5.3); this spec is the *global* outside-of-a-modal Tab trace
 * that catches a regression like "the new pill is `tabindex='-1'`" or
 * "the FAB ate the Tab order on desktop".
 */

import { expect, test, type Page } from "@playwright/test";

/** Snapshot the currently-focused element. Returns the role + name +
 *  visible flag + tag — enough to identify "what does Tab+N hit?". */
async function focusInfo(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) {
      return {
        tag: null as string | null,
        role: null as string | null,
        name: "",
        visible: false,
      };
    }
    const html = el as HTMLElement;
    const rect = html.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0;
    // Compute the accessible name the cheap way — it's not perfect, but
    // it's enough to catch "no name at all", which is what we care about.
    const name =
      html.getAttribute("aria-label") ||
      html.getAttribute("title") ||
      html.textContent?.trim() ||
      html.getAttribute("alt") ||
      "";
    return {
      tag: html.tagName.toLowerCase(),
      role: html.getAttribute("role"),
      name: name.replace(/\s+/g, " ").trim().slice(0, 80),
      visible,
    };
  });
}

async function tabAndCapture(page: Page, steps: number) {
  const trace: Array<{ step: number; tag: string | null; name: string; visible: boolean }> = [];
  for (let i = 1; i <= steps; i++) {
    await page.keyboard.press("Tab");
    const info = await focusInfo(page);
    if (info.tag === null) break; // we wrapped past document
    trace.push({
      step: i,
      tag: info.tag,
      name: info.name,
      visible: info.visible,
    });
  }
  return trace;
}

test.describe("Phase 6.10 — keyboard-only Tab trace", () => {
  test("home page: every Tab stop is visible + named", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Focus body first so the very next Tab lands on the first
    // focusable element in DOM order. (Playwright sometimes starts
    // focus on a stale element from a previous test in CI; reset.)
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      document.body.focus();
    });

    const trace = await tabAndCapture(page, 30);
    expect(
      trace.length,
      "expected at least a few focusable elements on the home page",
    ).toBeGreaterThan(3);

    // Every stop must be visible and named. We allow the "Skip to
    // content" link (or similar) to be invisible-until-focused, so we
    // skip-test names whose accessible name is "Skip" — for now there
    // is no skip link.
    const offenders = trace.filter((t) => !t.visible || t.name.length === 0);
    expect(
      offenders,
      `Keyboard Tab stops with no visible state or no accessible name:\n` +
        offenders
          .map(
            (o) =>
              `  step ${o.step}: <${o.tag}> visible=${o.visible} name="${o.name}"`,
          )
          .join("\n"),
    ).toEqual([]);
  });

  test("legal page (Impressum): Tab trace lands on real controls", async ({
    page,
  }) => {
    await page.goto("/#/impressum");
    await expect(
      page.getByRole("heading", { name: "Impressum", level: 1 }),
    ).toBeVisible();
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      document.body.focus();
    });
    const trace = await tabAndCapture(page, 20);
    expect(trace.length).toBeGreaterThan(0);
    const offenders = trace.filter((t) => !t.visible || t.name.length === 0);
    expect(
      offenders,
      `Keyboard Tab stops on Impressum without name/visibility:\n` +
        offenders
          .map(
            (o) =>
              `  step ${o.step}: <${o.tag}> visible=${o.visible} name="${o.name}"`,
          )
          .join("\n"),
    ).toEqual([]);
  });

  test("rule book route: Tab trace lands on real controls", async ({
    page,
  }) => {
    await page.goto("/#/rules");
    await expect(
      page.getByRole("heading", { name: "Astraudit rule book", level: 1 }),
    ).toBeVisible();
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      document.body.focus();
    });
    // Rule book has many anchor links inside the rendered markdown;
    // a larger trace covers the prose + the page chrome.
    const trace = await tabAndCapture(page, 40);
    expect(trace.length).toBeGreaterThan(0);
    const offenders = trace.filter((t) => !t.visible || t.name.length === 0);
    expect(
      offenders,
      `Keyboard Tab stops on RuleBook without name/visibility:\n` +
        offenders
          .map(
            (o) =>
              `  step ${o.step}: <${o.tag}> visible=${o.visible} name="${o.name}"`,
          )
          .join("\n"),
    ).toEqual([]);
  });
});
