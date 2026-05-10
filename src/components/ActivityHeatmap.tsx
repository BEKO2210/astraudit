import { Activity } from "lucide-react";
import { useMemo } from "react";
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

const INTENSITY_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-white/[0.04]",
  1: "bg-aurora-mint/25",
  2: "bg-aurora-mint/45",
  3: "bg-aurora-mint/65",
  4: "bg-aurora-mint/85",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Group cells into 12 columns of 7 rows each (column-major). */
function groupByColumn(cells: DayCell[]): DayCell[][] {
  const cols: DayCell[][] = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    cols.push(cells.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK));
  }
  return cols;
}

function formatDateLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

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

      <div
        className="mt-3 inline-flex w-full justify-center overflow-x-auto pb-1 scrollbar-thin"
        role="img"
        aria-label={`Commit activity heatmap. ${grid.total} commits across ${grid.uniqueDays} active days in the last 12 weeks.`}
      >
        <div className="flex shrink-0 gap-1.5">
          {/* Day labels column */}
          <div className="hidden flex-col gap-[3px] pt-4 sm:flex">
            {DAY_LABELS.map((label, idx) => (
              <span
                key={label}
                className={`h-[12px] w-7 text-[9px] uppercase tracking-[0.12em] text-slate-500 ${
                  idx % 2 === 1 ? "" : "opacity-0"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
          {/* Grid columns (one per week) */}
          <div className="flex flex-col gap-[3px]">
            <div className="flex h-3.5 gap-[3px]">
              {monthBands.map((label, idx) => (
                <span
                  key={idx}
                  className="w-[12px] text-[9px] uppercase tracking-[0.1em] text-slate-500"
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {columns.map((col, cIdx) => (
                <div key={cIdx} className="flex flex-col gap-[3px]">
                  {col.map((cell) => (
                    <span
                      key={cell.date}
                      title={`${formatDateLabel(cell.date)} — ${cell.count} commit${cell.count === 1 ? "" : "s"}`}
                      data-count={cell.count}
                      className={`h-[12px] w-[12px] rounded-[3px] transition ${
                        INTENSITY_CLASS[intensityBucket(cell.count, Math.max(1, grid.max))]
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-slate-500">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-[2px] ${INTENSITY_CLASS[i]}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
