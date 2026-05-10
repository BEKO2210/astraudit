/**
 * Activity heatmap — Phase 5.4 overhaul.
 *
 * Switches from a passive `<span>`-grid with HTML `title` tooltips
 * to a real WAI-ARIA `role="grid"` widget:
 *
 *   - Each cell is a focusable `<button role="gridcell">` carrying
 *     an explicit `aria-label="N commits on YYYY-MM-DD"` so screen
 *     readers announce the data, not just the colour.
 *   - The grid uses the *single tab-stop* pattern: only the
 *     currently-active cell has `tabindex="0"`; the others are
 *     `tabindex="-1"`. Arrow keys move focus inside the grid;
 *     Home / End / PageUp / PageDown jump to row + column edges.
 *     This sidesteps WCAG 2.5.8's per-cell target-size question
 *     (the grid is one composite widget, not 84 separate
 *     interactive controls) and makes the data keyboard-reachable.
 *   - A live region below the grid mirrors the focused cell's
 *     date + count so a sighted user gets the same affordance the
 *     SR user already had.
 *   - Day labels (Mon..Sun) now show on every viewport, not just
 *     `sm:`+ — they're the only way to know which row a cell is
 *     in without a tooltip.
 *   - Empty cells get a more contrasty colour in light mode (was
 *     barely visible against the page background).
 *
 * Pre-build research (2026-05-10):
 *   - WAI-ARIA APG · *Grid Pattern* — single tab stop, arrow-key
 *     navigation, Home/End/PageUp/PageDown semantics.
 *     https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 *   - Phase 2.8.8 found that the `title` attribute is unreliable
 *     for keyboard, mobile, and screen-reader users. The new
 *     focused-cell live region is the accessible replacement.
 */

import { Activity } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  buildHeatmapGrid,
  DAYS_PER_WEEK,
  HEATMAP_WEEKS,
  intensityBucket,
  type DayCell,
} from "../lib/audit/activityHeatmap";
import type { CommitInfo } from "../types/github";

interface ActivityHeatmapProps {
  commits: CommitInfo[];
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

const INTENSITY_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  // Phase 5.4 — bumped the empty bucket so it stays visible in light
  // mode (was `bg-white/[0.04]` which read near-invisible against the
  // near-white background). The class includes both dark + light
  // tokens, the existing globals.css overrides handle the swap.
  0: "bg-white/[0.06] dark:bg-white/[0.04]",
  1: "bg-aurora-mint/25",
  2: "bg-aurora-mint/45",
  3: "bg-aurora-mint/65",
  4: "bg-aurora-mint/85",
};

const INTENSITY_DESCRIPTION: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "no commits",
  1: "low activity",
  2: "moderate activity",
  3: "high activity",
  4: "peak activity",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Group cells column-major (one column per week, 7 rows per column). */
function groupByColumn(cells: DayCell[]): DayCell[][] {
  const cols: DayCell[][] = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    cols.push(cells.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK));
  }
  return cols;
}

function formatDateLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function ActivityHeatmap({ commits }: ActivityHeatmapProps) {
  const grid = useMemo(() => buildHeatmapGrid(commits), [commits]);
  const columns = useMemo(() => groupByColumn(grid.cells), [grid.cells]);

  const monthBands = useMemo(() => {
    let lastMonth = "";
    return columns.map((col) => {
      const first = col[0]?.date;
      if (!first) return "";
      const month = new Date(`${first}T00:00:00Z`).toLocaleString(undefined, {
        month: "short",
      });
      if (month === lastMonth) return "";
      lastMonth = month;
      return month;
    });
  }, [columns]);

  // Active cell — drives the single-tab-stop pattern and the live
  // region announcement. Default to the most-recent cell so users
  // who Tab into the grid land on "today".
  const [active, setActive] = useState<{ col: number; row: number }>(() => ({
    col: HEATMAP_WEEKS - 1,
    row: DAYS_PER_WEEK - 1,
  }));
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const focusCell = useCallback((col: number, row: number) => {
    const key = `${col}:${row}`;
    cellRefs.current.get(key)?.focus();
  }, []);

  const handleCellKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, col: number, row: number) => {
      let nextCol = col;
      let nextRow = row;
      switch (event.key) {
        case "ArrowLeft":
          nextCol = Math.max(0, col - 1);
          break;
        case "ArrowRight":
          nextCol = Math.min(HEATMAP_WEEKS - 1, col + 1);
          break;
        case "ArrowUp":
          nextRow = Math.max(0, row - 1);
          break;
        case "ArrowDown":
          nextRow = Math.min(DAYS_PER_WEEK - 1, row + 1);
          break;
        case "Home":
          nextCol = 0;
          break;
        case "End":
          nextCol = HEATMAP_WEEKS - 1;
          break;
        case "PageUp":
          nextRow = 0;
          break;
        case "PageDown":
          nextRow = DAYS_PER_WEEK - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      if (nextCol !== col || nextRow !== row) {
        setActive({ col: nextCol, row: nextRow });
        focusCell(nextCol, nextRow);
      }
    },
    [focusCell],
  );

  const activeCell = columns[active.col]?.[active.row];
  const liveRegionText = activeCell
    ? `${formatDateLabel(activeCell.date)}: ${activeCell.count} commit${activeCell.count === 1 ? "" : "s"}.`
    : "";

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 print:break-inside-avoid">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-aurora-mint" />
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Activity heatmap
          </h4>
        </div>
        <p className="text-[11px] text-slate-500">
          {grid.total === 0 ? (
            "No commits in the last 12 weeks."
          ) : (
            <>
              <span className="text-slate-300">{grid.total}</span> commits across{" "}
              <span className="text-slate-300">{grid.uniqueDays}</span> active{" "}
              {grid.uniqueDays === 1 ? "day" : "days"} · last 12 weeks
            </>
          )}
        </p>
      </div>

      <div className="mt-3 inline-flex w-full justify-center overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex shrink-0 gap-1.5">
          {/* Day labels — visible on every viewport now (was `sm:`-only). */}
          <div className="flex flex-col gap-[3px] pt-4">
            {DAY_LABELS.map((label, idx) => (
              <span
                key={label}
                aria-hidden="true"
                className={`h-[12px] w-7 text-[9px] uppercase tracking-[0.12em] text-slate-500 ${
                  idx % 2 === 1 ? "" : "opacity-60"
                }`}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Grid columns + month bands. */}
          <div className="flex flex-col gap-[3px]">
            <div className="flex h-3.5 gap-[3px]" aria-hidden="true">
              {monthBands.map((label, idx) => (
                <span
                  key={idx}
                  className="w-[12px] text-[9px] uppercase tracking-[0.1em] text-slate-500"
                >
                  {label}
                </span>
              ))}
            </div>
            <div
              role="grid"
              aria-label={`Commit activity, last 12 weeks. ${grid.total} commits across ${grid.uniqueDays} active days. Use arrow keys to inspect days; Home, End, PageUp, PageDown jump to edges.`}
              aria-rowcount={DAYS_PER_WEEK}
              aria-colcount={HEATMAP_WEEKS}
              className="flex gap-[3px]"
            >
              {columns.map((col, cIdx) => (
                <div
                  key={cIdx}
                  role="presentation"
                  className="flex flex-col gap-[3px]"
                >
                  {col.map((cell, rIdx) => {
                    const isActive = active.col === cIdx && active.row === rIdx;
                    const bucket = intensityBucket(
                      cell.count,
                      Math.max(1, grid.max),
                    );
                    return (
                      <button
                        key={cell.date}
                        type="button"
                        ref={(el) => {
                          if (el) cellRefs.current.set(`${cIdx}:${rIdx}`, el);
                          else cellRefs.current.delete(`${cIdx}:${rIdx}`);
                        }}
                        role="gridcell"
                        aria-rowindex={rIdx + 1}
                        aria-colindex={cIdx + 1}
                        aria-label={`${cell.count} commit${cell.count === 1 ? "" : "s"} on ${formatDateLabel(cell.date)}, ${INTENSITY_DESCRIPTION[bucket]}`}
                        tabIndex={isActive ? 0 : -1}
                        onFocus={() => setActive({ col: cIdx, row: rIdx })}
                        onClick={() => setActive({ col: cIdx, row: rIdx })}
                        onKeyDown={(e) => handleCellKeyDown(e, cIdx, rIdx)}
                        className={`block h-[12px] w-[12px] rounded-[3px] border-0 p-0 transition focus-visible:ring-2 focus-visible:ring-aurora-mint focus-visible:ring-offset-1 focus-visible:ring-offset-ink-900 ${INTENSITY_CLASS[bucket]}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live region — mirrors the focused cell's date + count so
          sighted users get the same affordance SR users have. */}
      <p
        aria-live="polite"
        aria-atomic="true"
        className="mt-2 min-h-[1.25rem] text-[11px] text-slate-400"
      >
        {liveRegionText}
      </p>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <p className="text-slate-500">
          Tab into the grid, then use arrow keys to inspect any day.
        </p>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {([0, 1, 2, 3, 4] as const).map((i) => (
            <span
              key={i}
              aria-label={INTENSITY_DESCRIPTION[i]}
              role="img"
              className={`h-2.5 w-2.5 rounded-[2px] ${INTENSITY_CLASS[i]}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
