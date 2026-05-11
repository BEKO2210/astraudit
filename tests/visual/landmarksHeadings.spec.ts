/**
 * Phase 6.9 — Screen-reader landmark + heading structure invariants.
 *
 * A full VoiceOver + NVDA pass is inherently manual (those screen
 * readers exist outside the browser sandbox). What we CAN automate is
 * the structural backbone every screen-reader user relies on:
 *
 *   1. **Exactly one `<h1>`** per page — multiple H1s confuse SRs
 *      about what page they landed on. Phase 4.5 split the legal
 *      pages out for this reason.
 *   2. **No skipped heading levels** within a single section — an H1
 *      directly followed by an H4 reads as "missing structure".
 *   3. **Exactly one `<main>` landmark** per page — duplicates make
 *      SR landmark-jump unreliable.
 *   4. **No ambiguous link text** ("here", "click", "more") that
 *      can't be understood out of context.
 *
 * These are SR contracts, but they cost nothing at runtime, so we
 * lock them as a Playwright DOM probe. If the screen-reader pass
 * later surfaces something else, convert it to a case here.
 */

import { expect, test, type Page } from "@playwright/test";

interface PageProbe {
  route: string;
  label: string;
  heading: string;
  /** Allow N <main> landmarks. Default 1. */
  expectedMains?: number;
}

const PAGES: PageProbe[] = [
  { route: "/", label: "home", heading: "" },
  { route: "/#/impressum", label: "impressum", heading: "Impressum" },
  {
    route: "/#/datenschutz",
    label: "datenschutz",
    heading: "Datenschutzerklärung",
  },
  { route: "/#/rules", label: "rules", heading: "Astraudit rule book" },
];

async function structuralInvariants(page: Page) {
  return await page.evaluate(() => {
    const h1s = Array.from(document.querySelectorAll("h1")).map((h) =>
      (h.textContent ?? "").trim().slice(0, 60),
    );
    const mains = document.querySelectorAll("main").length;
    const headings = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
    ).map((h) => ({
      level: parseInt(h.tagName.slice(1), 10),
      text: (h.textContent ?? "").trim().slice(0, 60),
    }));
    // Heading-level jumps: any place where (current - previous) > 1
    // is a "skipped level" — `h1` → `h3` reads as missing structure.
    const skips: Array<{ from: number; to: number; text: string }> = [];
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1];
      const cur = headings[i];
      if (cur.level - prev.level > 1) {
        skips.push({ from: prev.level, to: cur.level, text: cur.text });
      }
    }
    // Ambiguous link text — case-insensitive match against a small
    // blocklist. We allow these inside markdown prose (.readme-prose
    // / .legal-prose) because the surrounding paragraph carries the
    // context an SR user would also hear when reading the page top
    // to bottom.
    const AMBIGUOUS = ["click here", "here", "click", "more", "read more"];
    const ambiguous = Array.from(document.querySelectorAll("a")).flatMap(
      (a) => {
        const text = (a.textContent ?? "").trim().toLowerCase();
        if (!AMBIGUOUS.includes(text)) return [];
        if (a.closest(".readme-prose, .legal-prose")) return [];
        return [text];
      },
    );
    return { h1s, mains, skips, ambiguous };
  });
}

test.describe("Phase 6.9 — landmark + heading structure invariants", () => {
  for (const probe of PAGES) {
    test(`${probe.label}: exactly one H1, one main, no level skips, no ambiguous links`, async ({
      page,
    }) => {
      await page.goto(probe.route);
      if (probe.heading) {
        await expect(
          page.getByRole("heading", { name: probe.heading, level: 1 }),
        ).toBeVisible();
      } else {
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      }
      const inv = await structuralInvariants(page);

      expect(
        inv.h1s.length,
        `expected exactly one <h1> on ${probe.label}, got ${inv.h1s.length}: ${JSON.stringify(inv.h1s)}`,
      ).toBe(1);

      expect(
        inv.mains,
        `expected exactly ${probe.expectedMains ?? 1} <main> landmark(s) on ${probe.label}, got ${inv.mains}`,
      ).toBe(probe.expectedMains ?? 1);

      expect(
        inv.skips,
        `${probe.label}: heading-level skip(s) found:\n` +
          inv.skips
            .map((s) => `  h${s.from} → h${s.to} ("${s.text}")`)
            .join("\n"),
      ).toEqual([]);

      expect(
        inv.ambiguous,
        `${probe.label}: ambiguous link text outside prose containers:\n  ${inv.ambiguous.join(", ")}`,
      ).toEqual([]);
    });
  }
});
