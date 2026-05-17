/**
 * Leaderboard trend computation — Roadmap M6.5.
 *
 * Pure diff between two snapshots: per‑repo Δ‑score plus a
 * direction tag (up / down / same / new / dropped). Consumed by
 * the leaderboard table to render trend pills next to each row.
 *
 * Design constraints
 * - Stateless. Takes plain row arrays (works for both live
 *   `BatchRow` and persisted `SnapshotRow` shapes) and returns
 *   a Map keyed by `fullName`.
 * - Side‑effect free → trivially unit‑testable without the IDB /
 *   localStorage layer underneath.
 * - Tolerates missing or null scores — error rows in the latest
 *   batch never crash the diff, they simply don't appear in the
 *   trends map.
 */

export type TrendDirection = "up" | "down" | "same" | "new" | "dropped";

export interface Trend {
  /** Score delta (latest − previous). `null` for `new` rows. */
  delta: number | null;
  direction: TrendDirection;
  /** Optional previous score so the UI can show "70 → 78". */
  previousScore: number | null;
  /** Latest score, mirrored for UI convenience. */
  latestScore: number | null;
}

/** Minimal shape every trend input has to satisfy. */
export interface TrendInputRow {
  fullName: string;
  totalScore: number | null;
}

/** Threshold below which a delta is treated as `same` (rounding noise). */
const SAME_EPSILON = 0;

/**
 * Compute per‑repo trends between two row sets. The output is a
 * Map keyed by `fullName` so callers can look up by row in O(1).
 *
 * Rows that exist in `latest` but not in `previous` are `new`;
 * rows in `previous` but not `latest` are `dropped`. Either side
 * may carry a null score (error row, snapshot pre‑M6.5) — null
 * scores propagate to `delta: null` and `direction: "same"` so
 * the UI shows nothing rather than an obviously wrong arrow.
 */
export function computeTrends(
  latest: readonly TrendInputRow[],
  previous: readonly TrendInputRow[],
): Map<string, Trend> {
  const prevByName = new Map<string, TrendInputRow>();
  for (const row of previous) prevByName.set(row.fullName, row);

  const out = new Map<string, Trend>();
  const seenInLatest = new Set<string>();

  for (const row of latest) {
    seenInLatest.add(row.fullName);
    const prior = prevByName.get(row.fullName);
    if (!prior) {
      out.set(row.fullName, {
        delta: null,
        direction: "new",
        previousScore: null,
        latestScore: row.totalScore,
      });
      continue;
    }
    if (row.totalScore == null || prior.totalScore == null) {
      out.set(row.fullName, {
        delta: null,
        direction: "same",
        previousScore: prior.totalScore,
        latestScore: row.totalScore,
      });
      continue;
    }
    const delta = row.totalScore - prior.totalScore;
    const direction: TrendDirection =
      delta > SAME_EPSILON ? "up" : delta < -SAME_EPSILON ? "down" : "same";
    out.set(row.fullName, {
      delta,
      direction,
      previousScore: prior.totalScore,
      latestScore: row.totalScore,
    });
  }

  for (const row of previous) {
    if (seenInLatest.has(row.fullName)) continue;
    out.set(row.fullName, {
      delta: null,
      direction: "dropped",
      previousScore: row.totalScore,
      latestScore: null,
    });
  }

  return out;
}

/** Convenience: aggregate counts for a sticky summary chip. */
export interface TrendSummary {
  up: number;
  down: number;
  same: number;
  newRepos: number;
  dropped: number;
}

export function summariseTrends(trends: Map<string, Trend>): TrendSummary {
  const out: TrendSummary = { up: 0, down: 0, same: 0, newRepos: 0, dropped: 0 };
  for (const trend of trends.values()) {
    switch (trend.direction) {
      case "up":
        out.up += 1;
        break;
      case "down":
        out.down += 1;
        break;
      case "same":
        out.same += 1;
        break;
      case "new":
        out.newRepos += 1;
        break;
      case "dropped":
        out.dropped += 1;
        break;
    }
  }
  return out;
}
