/**
 * Phase 5.2 — Interactive control audit guard.
 *
 * Scans every visible <button> and <a href> on the home page + the
 * three doc pages and asserts each one clears WCAG 2.5.8's
 * 24×24 CSS-pixel target-size floor. Pure runtime check, so a
 * future change that drops a control under that floor will fail CI
 * before the PR ever reaches a reviewer.
 *
 * Why a Playwright spec rather than a static AST scan: the actual
 * pixel size depends on padding, line-height, icon size, and
 * inherited typography — all variables that only resolve at the
 * browser. A grep-based check would either miss real problems or
 * flag a thousand false positives. Walking the live DOM is the
 * only honest answer.
 *
 * What we INTENTIONALLY skip:
 *   - Inline links inside markdown / prose paragraphs (WCAG 2.5.8
 *     spacing exception — they sit on lines of their own and
 *     don't compete with adjacent targets).
 *   - Controls that are off-screen / `hidden` / `visibility:hidden`
 *     at the time of audit (they'll be re-tested when their
 *     section becomes visible in another spec).
 *   - The React Flow viewport's pan/zoom buttons (rendered by the
 *     library, not us — we accept the library's defaults).
 */

import { expect, test } from "@playwright/test";

const MIN_SIZE = 24;

interface Offender {
  page: string;
  selector: string;
  text: string;
  width: number;
  height: number;
}

async function findUnderTargets(page: import("@playwright/test").Page) {
  return await page.evaluate(
    ({ floor }) => {
      const out: Array<{
        selector: string;
        text: string;
        width: number;
        height: number;
      }> = [];
      const targets = document.querySelectorAll<HTMLElement>(
        'button, a[href], [role="button"]',
      );
      for (const el of Array.from(targets)) {
        // Skip non-rendered elements.
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        // Skip the React Flow built-in zoom/pan controls — we don't
        // own those styles.
        if (el.closest(".react-flow__controls")) continue;
        // Skip inline anchors inside prose paragraphs (WCAG 2.5.8
        // spacing exception).
        const tag = el.tagName;
        if (tag === "A" && el.closest(".legal-prose, .readme-prose, p")) {
          continue;
        }

        const rect = el.getBoundingClientRect();
        // Some controls (e.g. the StickyScoreBar buttons before the
        // user scrolls) have width === 0 because they're outside
        // their parent's clip. Skip those — they aren't visible.
        if (rect.width === 0 || rect.height === 0) continue;

        if (rect.width < floor || rect.height < floor) {
          out.push({
            selector: el.outerHTML.slice(0, 120),
            text: (el.textContent ?? "").trim().slice(0, 60),
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
          });
        }
      }
      return out;
    },
    { floor: MIN_SIZE },
  );
}

const ROUTES: Array<{ path: string; label: string }> = [
  { path: "/", label: "home" },
  { path: "/#/impressum", label: "impressum" },
  { path: "/#/datenschutz", label: "datenschutz" },
  { path: "/#/rules", label: "rules" },
];

test.describe("WCAG 2.5.8 target-size guard", () => {
  for (const route of ROUTES) {
    test(`${route.label}: every visible interactive control clears 24×24 px`, async ({
      page,
    }) => {
      await page.goto(route.path);
      // Make sure the page is fully laid out before measuring.
      await page.waitForLoadState("networkidle");

      const offenders: Offender[] = (await findUnderTargets(page)).map((o) => ({
        ...o,
        page: route.label,
      }));

      expect(
        offenders,
        offenders.length === 0
          ? ""
          : `Found ${offenders.length} sub-${MIN_SIZE}×${MIN_SIZE} control(s) on ${route.label}:\n` +
              offenders
                .map(
                  (o) =>
                    `  - ${o.width}×${o.height} px · "${o.text}" · ${o.selector}`,
                )
                .join("\n"),
      ).toEqual([]);
    });
  }
});
