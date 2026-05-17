/**
 * Batch‑audit orchestrator — Roadmap M6.2.
 *
 * Drives N audits sequentially through a single audit pipeline
 * (loadRepoBundle → worker.runAudit) on behalf of the leaderboard.
 * Sequential — not parallel — for two reasons:
 *   1. GitHub's secondary rate limit punishes concurrent requests
 *      to the same host. A single-flight queue keeps us well
 *      below the threshold even with the public 5000/h budget.
 *   2. The audit worker is single-threaded by design; running
 *      audits concurrently on the same worker would serialise
 *      anyway.
 *
 * Rate‑limit strategy
 * - Pre‑flight: `probeRateLimit()` once before the loop. If the
 *   remaining budget can't cover the estimated request cost
 *   (`requestsPerAudit * hits.length`), emit a `rate-limit-low`
 *   progress event so the UI can warn the visitor *before* the
 *   first audit fires.
 * - Mid‑batch: a thrown `RateLimitError` aborts the current
 *   audit and emits a `rate-limit-hit` event with the reset
 *   timestamp. The orchestrator stops here (does NOT auto‑resume
 *   on a fresh budget) because a multi‑hour wait is something
 *   the user should approve, not something the orchestrator
 *   silently sits on.
 * - Abort: the caller's AbortSignal propagates into every fetch
 *   + worker postMessage; aborting mid‑batch returns the
 *   partial result immediately.
 *
 * Testability
 * The orchestrator accepts an injected `auditOne` function so
 * tests don't need a worker or a network round‑trip. Production
 * callers pass a closure that wraps `loadRepoBundle` +
 * worker.postMessage.
 */

import type { AuditResult } from "../../types/audit";
import type { RateLimitProbe } from "../github/githubClient";
import { RateLimitError } from "../github/githubClient";
import type { SearchHit } from "./searchRepos";

/** Per‑hit row of the batch result. Always exactly one of
 *  `audit` / `error` is populated. */
export type BatchRow =
  | { hit: SearchHit; status: "ok"; audit: AuditResult }
  | { hit: SearchHit; status: "error"; error: BatchErrorReason };

export type BatchErrorReason =
  | { kind: "rate-limit"; resetAtSeconds: number | null }
  | { kind: "aborted" }
  | { kind: "unknown"; message: string };

/** Final result of a batch run. */
export interface BatchResult {
  /** Every hit, in input order. Missing entries (when the run
   *  aborted partway through) are NOT padded — callers can compare
   *  `rows.length` to `hits.length` to see how far we got. */
  rows: BatchRow[];
  /** True when the batch stopped early due to abort or rate limit. */
  stoppedEarly: boolean;
  /** Why we stopped, if `stoppedEarly`. */
  stopReason: BatchErrorReason | null;
}

/** Progress event variants. */
export type BatchProgress =
  | { kind: "preflight"; probe: RateLimitProbe | null; willLikelyHitLimit: boolean }
  | { kind: "audit-start"; index: number; total: number; hit: SearchHit }
  | { kind: "audit-done"; index: number; total: number; hit: SearchHit; audit: AuditResult }
  | { kind: "audit-error"; index: number; total: number; hit: SearchHit; reason: BatchErrorReason }
  | { kind: "rate-limit-hit"; resetAtSeconds: number | null }
  | { kind: "complete"; rows: BatchRow[] };

export type ProgressHandler = (event: BatchProgress) => void;

/**
 * Audit one repository. Production callers compose this from
 * `loadRepoBundle` + the worker postMessage round‑trip; tests
 * pass an in‑memory fake.
 */
export type AuditOne = (hit: SearchHit, signal?: AbortSignal) => Promise<AuditResult>;

export interface BatchOptions {
  hits: SearchHit[];
  auditOne: AuditOne;
  signal?: AbortSignal;
  onProgress?: ProgressHandler;
  /** Pre‑flight probe — defaults to a no‑op that returns null. */
  probeRateLimit?: () => Promise<RateLimitProbe | null>;
  /** Rough estimate of API calls one audit costs; default 12 (M1+M2 era). */
  requestsPerAudit?: number;
}

const DEFAULT_REQUESTS_PER_AUDIT = 12;

function emit(handler: ProgressHandler | undefined, event: BatchProgress): void {
  if (!handler) return;
  try {
    handler(event);
  } catch {
    // Never let a UI handler crash the batch.
  }
}

function isAbortError(err: unknown): boolean {
  return (err as { name?: string } | null)?.name === "AbortError";
}

function classifyError(err: unknown): BatchErrorReason {
  if (err instanceof RateLimitError) {
    return { kind: "rate-limit", resetAtSeconds: err.resetAtSeconds };
  }
  if (isAbortError(err)) return { kind: "aborted" };
  const message = err instanceof Error ? err.message : String(err);
  return { kind: "unknown", message };
}

/**
 * Run the batch. Resolves with a `BatchResult` even when the run
 * is interrupted by an abort or rate‑limit; callers should
 * inspect `stoppedEarly` + `stopReason` rather than relying on a
 * rejected promise.
 */
export async function runBatchAudit(opts: BatchOptions): Promise<BatchResult> {
  const {
    hits,
    auditOne,
    signal,
    onProgress,
    probeRateLimit,
    requestsPerAudit = DEFAULT_REQUESTS_PER_AUDIT,
  } = opts;
  const rows: BatchRow[] = [];

  // ----- Pre‑flight -----
  let probe: RateLimitProbe | null = null;
  if (probeRateLimit) {
    try {
      probe = await probeRateLimit();
    } catch {
      probe = null;
    }
  }
  const estimatedCost = hits.length * requestsPerAudit;
  const willLikelyHitLimit =
    probe != null && probe.remaining < estimatedCost;
  emit(onProgress, { kind: "preflight", probe, willLikelyHitLimit });

  if (signal?.aborted) {
    emit(onProgress, { kind: "complete", rows });
    return { rows, stoppedEarly: true, stopReason: { kind: "aborted" } };
  }

  // ----- Main loop -----
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i]!;
    if (signal?.aborted) {
      emit(onProgress, { kind: "complete", rows });
      return { rows, stoppedEarly: true, stopReason: { kind: "aborted" } };
    }
    emit(onProgress, {
      kind: "audit-start",
      index: i,
      total: hits.length,
      hit,
    });
    try {
      const audit = await auditOne(hit, signal);
      const row: BatchRow = { hit, status: "ok", audit };
      rows.push(row);
      emit(onProgress, {
        kind: "audit-done",
        index: i,
        total: hits.length,
        hit,
        audit,
      });
    } catch (err) {
      const reason = classifyError(err);
      rows.push({ hit, status: "error", error: reason });
      emit(onProgress, {
        kind: "audit-error",
        index: i,
        total: hits.length,
        hit,
        reason,
      });
      // Rate‑limit + abort short‑circuit the batch. Per‑audit
      // unknown failures (a 404, a malformed bundle, …) are kept
      // as error rows and the loop continues so one bad repo
      // doesn't kill the whole leaderboard refresh.
      if (reason.kind === "rate-limit") {
        emit(onProgress, {
          kind: "rate-limit-hit",
          resetAtSeconds: reason.resetAtSeconds,
        });
        emit(onProgress, { kind: "complete", rows });
        return { rows, stoppedEarly: true, stopReason: reason };
      }
      if (reason.kind === "aborted") {
        emit(onProgress, { kind: "complete", rows });
        return { rows, stoppedEarly: true, stopReason: reason };
      }
    }
  }

  emit(onProgress, { kind: "complete", rows });
  return { rows, stoppedEarly: false, stopReason: null };
}

export const __test = { DEFAULT_REQUESTS_PER_AUDIT, classifyError };
