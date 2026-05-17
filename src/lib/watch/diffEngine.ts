/**
 * Watch‑repo diff engine — Roadmap M7.1.3.
 *
 * Pure compare between an old baseline snapshot and a fresh one
 * for a single watched repository. Produces the set of events
 * the inbox (M7.1.4) surfaces. No side effects — the
 * background loop persists the events itself via eventStore.
 */
import type { WatchSnapshot, WatchedRepo } from "./watchStore";

export type WatchEventKind =
  | "score-up"
  | "score-down"
  | "findings-up"
  | "findings-down"
  | "grade-changed";

export interface WatchEvent {
  fullName: string;
  kind: WatchEventKind;
  occurredAt: string;
  /** Score before/after (or finding count before/after, or grade before/after). */
  before: string | number | null;
  after: string | number | null;
  /** Signed delta for the numeric kinds; null for grade-changed. */
  delta: number | null;
}

/** Minimum absolute score change before we emit a score event. */
const SCORE_NOISE_FLOOR = 0;
const FINDINGS_NOISE_FLOOR = 0;

/**
 * Compare an existing `WatchedRepo` baseline against the fresh
 * snapshot just produced by re-auditing it. Returns the list of
 * events the change generated. Empty list when nothing of
 * interest moved.
 */
export function diffWatchSnapshot(
  entry: WatchedRepo,
  next: WatchSnapshot,
  now: number = Date.now(),
): WatchEvent[] {
  const events: WatchEvent[] = [];
  const occurredAt = new Date(now).toISOString();
  const fullName = entry.fullName;

  // First‑ever check has no baseline → no events. updateAfterCheck
  // (called by the loop) seeds the baseline so subsequent runs
  // can diff. Returning [] here is the spec.
  if (
    entry.lastScore == null &&
    entry.lastFindingCount == null &&
    entry.lastGrade == null
  ) {
    return events;
  }

  // Score delta — only when both sides are numeric. Direction
  // tag (up vs. down) is the score's: a higher score is better,
  // so an up-tick is good news.
  if (entry.lastScore != null) {
    const delta = next.totalScore - entry.lastScore;
    if (Math.abs(delta) > SCORE_NOISE_FLOOR) {
      events.push({
        fullName,
        kind: delta > 0 ? "score-up" : "score-down",
        occurredAt,
        before: entry.lastScore,
        after: next.totalScore,
        delta,
      });
    }
  }

  // Findings count — a higher count is worse news; flip the
  // direction tag so the UI tone reads "more findings = bad,
  // fewer = good".
  if (entry.lastFindingCount != null) {
    const delta = next.findingCount - entry.lastFindingCount;
    if (Math.abs(delta) > FINDINGS_NOISE_FLOOR) {
      events.push({
        fullName,
        kind: delta > 0 ? "findings-up" : "findings-down",
        occurredAt,
        before: entry.lastFindingCount,
        after: next.findingCount,
        delta,
      });
    }
  }

  // Grade label change — surfaced as a single event regardless
  // of direction; the inbox renders before/after side-by-side.
  if (entry.lastGrade != null && entry.lastGrade !== next.grade) {
    events.push({
      fullName,
      kind: "grade-changed",
      occurredAt,
      before: entry.lastGrade,
      after: next.grade,
      delta: null,
    });
  }

  return events;
}
