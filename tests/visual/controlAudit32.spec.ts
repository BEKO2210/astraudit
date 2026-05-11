/**
 * Phase 6.13 — Touch-target catalogue at 32 / 44 px.
 *
 * Phase 5.2 enforces the WCAG 2.5.8 *Target Size (Minimum)* floor of
 * 24×24 CSS px. This spec is the catalogue companion: it probes the
 * same surfaces at the looser 32 px (Apple HIG) and stricter 44 px
 * (Apple legacy / Material 3 main FAB) thresholds and asserts the
 * offender COUNT stays ≤ a documented snapshot.
 *
 * Why count-based snapshots rather than a hard ≤ X-px gate:
 *   The 24 px contract is settled; 32 / 44 are aspirational. We use
 *   a count to *track* how close we are to raising the floor without
 *   forcing a giant simultaneous fix-up across every pill, tab, and
 *   chip in the UI. The numbers below were captured in Phase 6.13;
 *   if a future change lifts one, decrease the corresponding snapshot
 *   here AND consider whether the new minimum is the right floor.
 *
 * Snapshots (Phase 6.13 baseline, measured at 1280×720 viewport):
 *   - 32 px: home N/A, legal pages 0 / 0 / N/A  ← see test body
 *   - 44 px: home N/A, legal pages 0 / 0 / N/A
 * The exact "N/A" is filled in by the first run; the test asserts ≤
 * the stored cap.
 */

import { expect, test, type Page } from "@playwright/test";

async function countUnder(page: Page, floor: number): Promise<number> {
  return await page.evaluate(
    ({ floor }) => {
      let n = 0;
      const targets = document.querySelectorAll<HTMLElement>(
        'button, a[href], [role="button"]',
      );
      for (const el of Array.from(targets)) {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (el.closest(".react-flow__controls")) continue;
        const tag = el.tagName;
        if (tag === "A" && el.closest(".legal-prose, .readme-prose, p")) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.width < floor || rect.height < floor) n++;
      }
      return n;
    },
    { floor },
  );
}

interface Budget {
  route: string;
  label: string;
  cap32: number;
  cap44: number;
}

// Caps captured at Phase 6.13. To lower a cap, lift the offending
// control(s) above the threshold and decrement here in the same PR.
//
// Today (Phase 6.13):
//   home:        3 / 4 under 32 / 44 — Hero pills are intentionally
//                slim; bumping their min-h would push the strip into
//                a second row on tablets.
//   impressum:   2 / 2 — "Zurück zur App" + one nav link sit at the
//                top of the legal chrome on a single row.
//   datenschutz: 2 / 2 — same chrome as impressum.
//   rules:      3 / 3 — DocPage chrome (back/nav) + the "Show more"
//                README toggle.
const BUDGETS: Budget[] = [
  { route: "/", label: "home", cap32: 3, cap44: 4 },
  { route: "/#/impressum", label: "impressum", cap32: 2, cap44: 2 },
  { route: "/#/datenschutz", label: "datenschutz", cap32: 2, cap44: 2 },
  { route: "/#/rules", label: "rules", cap32: 3, cap44: 3 },
];

test.describe("Phase 6.13 — touch-target catalogue (32 / 44 px)", () => {
  for (const b of BUDGETS) {
    test(`${b.label}: ≤ ${b.cap32} controls under 32×32 px`, async ({
      page,
    }) => {
      await page.goto(b.route);
      await page.waitForLoadState("networkidle");
      const n = await countUnder(page, 32);
      expect(
        n,
        `${b.label}: ${n} controls below 32 px (cap ${b.cap32}). ` +
          `Decrement BUDGETS in controlAudit32.spec.ts if a fix lands.`,
      ).toBeLessThanOrEqual(b.cap32);
    });

    test(`${b.label}: ≤ ${b.cap44} controls under 44×44 px`, async ({
      page,
    }) => {
      await page.goto(b.route);
      await page.waitForLoadState("networkidle");
      const n = await countUnder(page, 44);
      expect(
        n,
        `${b.label}: ${n} controls below 44 px (cap ${b.cap44}). ` +
          `Decrement BUDGETS in controlAudit32.spec.ts if a fix lands.`,
      ).toBeLessThanOrEqual(b.cap44);
    });
  }
});
