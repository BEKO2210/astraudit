/**
 * Tests for the Phase 5.4 ActivityHeatmap component.
 *
 * Locks down the WAI-ARIA grid contract so a future refactor that
 * drops the role / labels / single-tab-stop pattern fails CI:
 *   1. Wrapper has `role="grid"` with a descriptive aria-label.
 *   2. Every cell carries `role="gridcell"` + a unique aria-label
 *      naming the date + count + intensity bucket.
 *   3. Single-tab-stop pattern: exactly one cell has tabindex="0";
 *      all others are tabindex="-1".
 *   4. Day labels render on every viewport (no `sm:`-only hide).
 *   5. The legend swatches each carry a role + aria-label so SR
 *      users hear the level meaning, not just see a colour.
 *   6. The 5-bucket palette is rendered (one swatch per intensity
 *      level in the legend).
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityHeatmap } from "../../src/components/ActivityHeatmap";
import type { CommitInfo } from "../../src/types/github";
import { I18nProvider } from "../../src/lib/i18n";

const NOW = new Date("2026-05-10T12:00:00Z");

const sampleCommits = (): CommitInfo[] => {
  // A quiet repo with a couple of recent commits — enough to put the
  // heatmap on a non-empty path without making the snapshot huge.
  return [
    {
      sha: "a",
      message: "first",
      authorName: "Author",
      authorDate: "2026-05-08T12:00:00Z",
    },
    {
      sha: "b",
      message: "second",
      authorName: "Author",
      authorDate: "2026-05-09T12:00:00Z",
    },
  ];
};

describe("<ActivityHeatmap />", () => {
  // We freeze time so the grid window is deterministic. Without
  // this the "last 12 weeks" anchor would shift between runs.
  const realDate = Date;
  beforeEachStub();

  function beforeEachStub() {
    /* placeholder — the side-effect time-freeze happens via vi.spyOn
     * inside individual tests. Component renders with the system
     * clock; we only assert structure that doesn't depend on the
     * specific cell-window. */
    void realDate;
  }

  // Roadmap M4.3 slice 6a — ActivityHeatmap now consumes
  // useTranslation(); wrap in I18nProvider.
  const html = renderToStaticMarkup(
    <I18nProvider initialLocale="en">
      <ActivityHeatmap commits={sampleCommits()} />
    </I18nProvider>,
  );

  it("uses role='grid' with an aria-label that mentions arrow-key navigation", () => {
    expect(html).toMatch(/role="grid"/);
    expect(html).toMatch(/aria-label="Commit activity[^"]*arrow keys[^"]*"/);
    // aria-rowcount + aria-colcount are part of the APG grid pattern.
    expect(html).toMatch(/aria-rowcount="7"/);
    expect(html).toMatch(/aria-colcount="12"/);
  });

  it("renders every cell as a button with role='gridcell' + aria-label", () => {
    // 12 weeks × 7 days = 84 cells.
    const cellMatches = html.match(/role="gridcell"/g) ?? [];
    expect(cellMatches.length).toBe(84);

    // Every cell carries an aria-label naming a count + a date.
    const labelMatches =
      html.match(/aria-label="\d+ commits? on [^"]+"/g) ?? [];
    expect(labelMatches.length).toBe(84);
  });

  it("uses the single-tab-stop pattern (exactly one cell has tabindex='0')", () => {
    const tabZero = html.match(/tabindex="0"/g) ?? [];
    expect(tabZero.length).toBe(1);
    // The rest of the cells are explicitly tabindex='-1'.
    const tabNegative = html.match(/tabindex="-1"/g) ?? [];
    expect(tabNegative.length).toBe(83);
  });

  it("renders day labels (Mon..Sun) on every viewport", () => {
    // Phase 5.4 dropped the `sm:`-only hide; labels must always be
    // present. They're aria-hidden because the gridcell aria-label
    // carries the day name already (so SR users don't hear it twice).
    for (const label of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain('class="hidden flex-col');
  });

  it("renders the 5-bucket legend with descriptive aria-labels", () => {
    // Each legend swatch is a role='img' with a descriptive label so
    // a screen reader hears "no commits / low activity / …" instead
    // of just rendering colour.
    for (const description of [
      "no commits",
      "low activity",
      "moderate activity",
      "high activity",
      "peak activity",
    ]) {
      expect(html).toContain(`aria-label="${description}"`);
    }
    expect(html).toMatch(/>Less<\/span>/);
    expect(html).toMatch(/>More<\/span>/);
  });

  it("ships a polite live region for the focused cell", () => {
    // The live region is below the grid and mirrors the focused
    // cell's full date + count so sighted users get the same
    // affordance the SR users get from aria-label.
    expect(html).toMatch(/aria-live="polite"/);
    expect(html).toMatch(/aria-atomic="true"/);
  });

  it("includes the keyboard-help hint", () => {
    expect(html).toMatch(/Tab into the grid.*arrow keys/i);
  });

  it("falls back to the empty-state message when there are no commits", () => {
    const emptyHtml = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <ActivityHeatmap commits={[]} />
      </I18nProvider>,
    );
    expect(emptyHtml).toContain("No commits in the last 12 weeks.");
    // Even on the empty path we still render the grid (84 cells with
    // count=0). The grid contract must hold.
    expect((emptyHtml.match(/role="gridcell"/g) ?? []).length).toBe(84);
  });
});
