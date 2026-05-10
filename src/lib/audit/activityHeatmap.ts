/**
 * Bucket commit dates into a fixed-window per-day grid for the
 * Activity Heatmap. Pure functions — no DOM, no time-zone surprises.
 *
 * The grid covers the most recent 12 weeks (84 days), aligned to a
 * Monday-start week so the rightmost column is the current week and
 * the topmost row is Monday.
 */

import type { CommitInfo } from "../../types/github";

export const HEATMAP_WEEKS = 12;
export const DAYS_PER_WEEK = 7;
export const HEATMAP_DAYS = HEATMAP_WEEKS * DAYS_PER_WEEK; // 84

export interface DayCell {
  /** YYYY-MM-DD in UTC. */
  date: string;
  /** 0 = Monday, 6 = Sunday. */
  dow: number;
  count: number;
}

/** YYYY-MM-DD for a Date in UTC. */
export function toIsoDay(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday-indexed day of week (0..6) for a Date interpreted in UTC. */
export function monIndex(date: Date): number {
  // getUTCDay returns 0..6 with Sunday = 0; we want Monday = 0.
  const d = date.getUTCDay();
  return (d + 6) % DAYS_PER_WEEK;
}

/** Count commits per ISO day from a list of commits. */
export function countCommitsByDay(commits: CommitInfo[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of commits) {
    if (!c.authorDate) continue;
    const t = new Date(c.authorDate);
    if (Number.isNaN(t.getTime())) continue;
    const key = toIsoDay(t);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/**
 * Build a fixed-size grid covering exactly HEATMAP_DAYS days ending
 * on the last day in `commits` (or `now` if commits is empty). The
 * window is clamped to the last 12 weeks.
 */
export function buildHeatmapGrid(
  commits: CommitInfo[],
  now: Date = new Date(),
): {
  cells: DayCell[];
  startDate: string;
  endDate: string;
  total: number;
  max: number;
  uniqueDays: number;
} {
  const counts = countCommitsByDay(commits);

  // End on today (UTC). The visual is "the last 12 weeks ending now".
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Align end to the *Sunday* of the current week so the grid columns
  // are full Monday..Sunday weeks. We pad the right column with future
  // days when needed; cells without an iso date <= today are zero.
  const endDow = monIndex(end); // 0..6 with Mon=0, Sun=6
  const sundayOfThisWeek = new Date(end);
  sundayOfThisWeek.setUTCDate(end.getUTCDate() + (DAYS_PER_WEEK - 1 - endDow));

  // Start = sunday-of-this-week minus (HEATMAP_DAYS - 1) days.
  const start = new Date(sundayOfThisWeek);
  start.setUTCDate(sundayOfThisWeek.getUTCDate() - (HEATMAP_DAYS - 1));

  const cells: DayCell[] = [];
  let total = 0;
  let max = 0;
  let uniqueDays = 0;
  for (let i = 0; i < HEATMAP_DAYS; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const iso = toIsoDay(d);
    const count = d.getTime() > end.getTime() ? 0 : (counts.get(iso) ?? 0);
    cells.push({ date: iso, dow: monIndex(d), count });
    total += count;
    if (count > max) max = count;
    if (count > 0) uniqueDays++;
  }

  return {
    cells,
    startDate: toIsoDay(start),
    endDate: toIsoDay(sundayOfThisWeek),
    total,
    max,
    uniqueDays,
  };
}

/** Map a per-cell count to one of 5 intensity buckets (0..4). */
export function intensityBucket(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  // Normalize against max so a quiet repo's "1 commit" still shows.
  const ratio = count / Math.max(1, max);
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}
