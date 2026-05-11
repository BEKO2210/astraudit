/**
 * Phase 6.14 — axe-core *best-practice* rule sweep.
 *
 * The Phase 4.2 CI gate (`a11y.spec.ts`) fires only on
 * `serious` + `critical` violations from the four WCAG tag families.
 * `best-practice` is the looser ruleset axe ships — it catches things
 * like:
 *   - duplicate landmarks even when each is correctly labelled,
 *   - empty headings,
 *   - `aria-label` content drift from visible text
 *     (`label-content-name-mismatch`),
 *   - `<svg>` without an accessible name when no aria-hidden,
 *   - region without a name when it's a child of a landmark.
 *
 * Some best-practice rules have a high false-positive rate
 * (duplicate landmarks where each one is genuinely distinct, e.g.
 * an outer <main> + a <nav> region landing on different layouts).
 * We don't want to fail CI on them — but we DO want a snapshot of
 * the count so a regression doubling the number can't slip through.
 *
 * The contract: every probed page has ≤ N best-practice violations.
 * To raise/lower a cap, change the number AND comment the why.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function bestPracticeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["best-practice"])
    // Color-contrast is on a separate WCAG tag set already; skip here
    // to keep the run focused on layout / semantic rules.
    .disableRules(["color-contrast"])
    .analyze();
  return results.violations;
}

interface Budget {
  route: string;
  label: string;
  heading: string;
  cap: number;
}

// Snapshots captured Phase 6.14. To decrement, fix the offender(s)
// and lower the cap in the same PR.
const BUDGETS: Budget[] = [
  // Home heading text wraps across spans; match by level only.
  { route: "/", label: "home", heading: "", cap: 2 },
  { route: "/#/impressum", label: "impressum", heading: "Impressum", cap: 2 },
  {
    route: "/#/datenschutz",
    label: "datenschutz",
    heading: "Datenschutzerklärung",
    cap: 2,
  },
  {
    route: "/#/rules",
    label: "rules",
    heading: "Astraudit rule book",
    cap: 2,
  },
];

test.describe("Phase 6.14 — axe-core best-practice snapshot", () => {
  for (const b of BUDGETS) {
    test(`${b.label}: best-practice violations stay ≤ ${b.cap}`, async ({
      page,
    }) => {
      await page.goto(b.route);
      // Wait for any H1 so the page is fully laid out (legal routes
      // are lazy-loaded via Suspense after Phase 6.16). When a
      // heading text is specified, also assert its presence.
      if (b.heading) {
        await expect(
          page.getByRole("heading", { name: b.heading, level: 1 }),
        ).toBeVisible();
      } else {
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      }
      const violations = await bestPracticeViolations(page);
      expect(
        violations.length,
        violations.length === 0
          ? ""
          : `${b.label}: ${violations.length} best-practice violation(s) ` +
              `(cap ${b.cap}):\n` +
              violations.map((v) => `  - ${v.id}: ${v.help}`).join("\n"),
      ).toBeLessThanOrEqual(b.cap);
    });
  }
});
