/**
 * Watch refresh loop — Roadmap M7.1.3.
 *
 * Pure orchestrator that walks every watched repo, re‑audits the
 * ones whose `intervalHours` has elapsed, persists the diff
 * events, and seeds the new baseline. The actual fetch + worker
 * round‑trip is injected as `auditOne` so tests don't need any
 * IO.
 *
 * Design constraints (mirrors M6.2)
 * - Sequential single‑flight to stay below GitHub's secondary
 *   rate limit and keep the audit worker's queue at one job.
 * - Per‑repo unknown failures are swallowed + the loop
 *   continues — one broken repo can't kill the whole refresh.
 * - A thrown `RateLimitError` short‑circuits the loop and is
 *   surfaced via the progress callback so the caller can warn.
 * - An aborted signal short‑circuits before the next audit.
 *
 * Resolves with `RefreshSummary` even on rate‑limit / abort —
 * callers inspect the shape rather than try/catch.
 */
import type { WatchSnapshot, WatchedRepo } from "./watchStore";
import { isDueForRefresh, listWatched, updateAfterCheck } from "./watchStore";
import { appendEvents } from "./eventStore";
import { diffWatchSnapshot, type WatchEvent } from "./diffEngine";
import { RateLimitError } from "../github/githubClient";

export interface RefreshSummary {
  /** How many repos were checked successfully (audit returned). */
  refreshed: number;
  /** How many were skipped because their interval hadn't elapsed. */
  skipped: number;
  /** How many threw a per‑repo (non‑rate‑limit) error. */
  failed: number;
  /** Events produced this run, newest first. */
  events: WatchEvent[];
  /** True when the loop short‑circuited on a rate‑limit or abort. */
  stoppedEarly: boolean;
  stopReason: "rate-limit" | "aborted" | null;
}

export type RefreshAuditOne = (
  entry: WatchedRepo,
  signal?: AbortSignal,
) => Promise<WatchSnapshot>;

export type RefreshProgress =
  | { kind: "checking"; entry: WatchedRepo; index: number; total: number }
  | { kind: "diffed"; entry: WatchedRepo; events: WatchEvent[] }
  | { kind: "failed"; entry: WatchedRepo; message: string }
  | { kind: "rate-limit"; resetAtSeconds: number | null }
  | { kind: "complete"; summary: RefreshSummary };

export interface RefreshOptions {
  auditOne: RefreshAuditOne;
  signal?: AbortSignal;
  onProgress?: (event: RefreshProgress) => void;
  /** Provide a custom now for tests; defaults to `Date.now`. */
  now?: () => number;
  /** Provide the watched list directly; defaults to listWatched. */
  source?: () => WatchedRepo[];
}

function emit(
  handler: RefreshOptions["onProgress"],
  event: RefreshProgress,
): void {
  if (!handler) return;
  try {
    handler(event);
  } catch {
    /* user handler — never break the loop */
  }
}

export async function runWatchRefresh(
  opts: RefreshOptions,
): Promise<RefreshSummary> {
  const {
    auditOne,
    signal,
    onProgress,
    now = Date.now,
    source = listWatched,
  } = opts;
  const allEvents: WatchEvent[] = [];
  let refreshed = 0;
  let failed = 0;
  let skipped = 0;
  const watched = source();
  const due = watched.filter((entry) => isDueForRefresh(entry, now()));
  skipped = watched.length - due.length;

  for (let i = 0; i < due.length; i++) {
    if (signal?.aborted) {
      const summary: RefreshSummary = {
        refreshed,
        skipped,
        failed,
        events: allEvents,
        stoppedEarly: true,
        stopReason: "aborted",
      };
      emit(onProgress, { kind: "complete", summary });
      return summary;
    }
    const entry = due[i]!;
    emit(onProgress, {
      kind: "checking",
      entry,
      index: i,
      total: due.length,
    });
    try {
      const snapshot = await auditOne(entry, signal);
      const events = diffWatchSnapshot(entry, snapshot, now());
      updateAfterCheck({ owner: entry.owner, repo: entry.repo }, snapshot);
      if (events.length > 0) {
        appendEvents(events);
        allEvents.push(...events);
        emit(onProgress, { kind: "diffed", entry, events });
      }
      refreshed += 1;
    } catch (err) {
      if (err instanceof RateLimitError) {
        emit(onProgress, {
          kind: "rate-limit",
          resetAtSeconds: err.resetAtSeconds,
        });
        const summary: RefreshSummary = {
          refreshed,
          skipped,
          failed,
          events: allEvents,
          stoppedEarly: true,
          stopReason: "rate-limit",
        };
        emit(onProgress, { kind: "complete", summary });
        return summary;
      }
      const isAbort =
        (err as { name?: string } | null)?.name === "AbortError";
      if (isAbort) {
        const summary: RefreshSummary = {
          refreshed,
          skipped,
          failed,
          events: allEvents,
          stoppedEarly: true,
          stopReason: "aborted",
        };
        emit(onProgress, { kind: "complete", summary });
        return summary;
      }
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      emit(onProgress, { kind: "failed", entry, message });
    }
  }

  const summary: RefreshSummary = {
    refreshed,
    skipped,
    failed,
    events: allEvents,
    stoppedEarly: false,
    stopReason: null,
  };
  emit(onProgress, { kind: "complete", summary });
  return summary;
}
