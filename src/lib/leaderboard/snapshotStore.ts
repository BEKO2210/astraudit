/**
 * Leaderboard snapshot persistence — Roadmap M6.4.
 *
 * Persists the last few leaderboard runs per filter so that
 * reopening `#/leaderboard` shows last‑known rows instantly
 * (without burning API budget on every visit). Also feeds M6.5's
 * trend arrows by exposing per‑fingerprint history.
 *
 * Storage choice: localStorage (not IndexedDB). Snapshot payloads
 * are small — only the fields the table renders, not the full
 * AuditResult — so ~50 KB per snapshot at 100 rows. The existing
 * `auditCache` uses localStorage too, so this keeps the storage
 * surface uniform + survives the same private-mode SecurityError
 * fallback.
 *
 * TTL: snapshots older than 7 days are purged on every read so
 * stale data never confuses the UI. History per fingerprint is
 * capped at HISTORY_PER_FINGERPRINT.
 */

import type { LeaderboardFilter } from "./searchRepos";
import { serialiseLeaderboardFilter } from "./parseFilter";

const STORAGE_KEY = "astraudit:leaderboard:v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const HISTORY_PER_FINGERPRINT = 5;
const MAX_TOTAL_SNAPSHOTS = 40;

/** Compact row shape — only what the leaderboard table renders. */
export interface SnapshotRow {
  fullName: string;
  owner: string;
  name: string;
  htmlUrl: string;
  description: string | null;
  stars: number;
  pushedAt: string;
  /** Audit outcome — null when the per‑audit call failed. */
  totalScore: number | null;
  maxScore: number | null;
  grade: string | null;
}

export interface SnapshotRecord {
  /** Stable per-snapshot id (timestamp + random suffix). */
  id: string;
  /** Stable fingerprint of the filter that produced these rows. */
  fingerprint: string;
  /** ISO‑8601 capture time. */
  savedAt: string;
  rows: SnapshotRow[];
}

interface PersistedRoot {
  snapshots: SnapshotRecord[];
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Stable fingerprint of a LeaderboardFilter so two equivalent
 * filters always produce the same key (URLSearchParams order is
 * deterministic via the canonical serialiser).
 */
export function fingerprint(filter: LeaderboardFilter): string {
  const ser = serialiseLeaderboardFilter(filter);
  return ser ?? "__default__";
}

function readRoot(): PersistedRoot {
  if (!isBrowser()) return { snapshots: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { snapshots: [] };
    const parsed = JSON.parse(raw) as PersistedRoot;
    if (!parsed || !Array.isArray(parsed.snapshots)) return { snapshots: [] };
    return parsed;
  } catch {
    // Corrupted entry — wipe + restart fresh. The cache is not
    // load‑bearing, so dropping it is safer than crashing.
    return { snapshots: [] };
  }
}

function writeRoot(root: PersistedRoot): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  } catch {
    // QuotaExceededError or SecurityError (private mode) — drop
    // silently. Worst case the user re‑runs the batch.
  }
}

/**
 * Purge snapshots older than `maxAgeMs`. Returns the kept list.
 * Pure on a passed-in array so tests can exercise it without IO.
 */
export function purgeExpired(
  snapshots: SnapshotRecord[],
  maxAgeMs: number = TTL_MS,
  now: number = Date.now(),
): SnapshotRecord[] {
  return snapshots.filter((s) => {
    const t = Date.parse(s.savedAt);
    if (Number.isNaN(t)) return false;
    return now - t < maxAgeMs;
  });
}

/**
 * Cap snapshot history per fingerprint + overall. Newest entries
 * win — older ones for the same fingerprint are dropped first.
 */
export function capHistory(
  snapshots: SnapshotRecord[],
  perFingerprint: number = HISTORY_PER_FINGERPRINT,
  total: number = MAX_TOTAL_SNAPSHOTS,
): SnapshotRecord[] {
  // Group by fingerprint (preserves insertion order — newest last).
  const byFp = new Map<string, SnapshotRecord[]>();
  for (const s of snapshots) {
    const arr = byFp.get(s.fingerprint) ?? [];
    arr.push(s);
    byFp.set(s.fingerprint, arr);
  }
  const trimmedByFp: SnapshotRecord[] = [];
  for (const arr of byFp.values()) {
    const sorted = [...arr].sort(
      (a, b) => Date.parse(a.savedAt) - Date.parse(b.savedAt),
    );
    trimmedByFp.push(...sorted.slice(-perFingerprint));
  }
  // Global cap: keep newest `total` across all fingerprints.
  trimmedByFp.sort((a, b) => Date.parse(a.savedAt) - Date.parse(b.savedAt));
  return trimmedByFp.slice(-total);
}

/** Save a snapshot for the given filter. Returns the stored record. */
export function saveSnapshot(
  filter: LeaderboardFilter,
  rows: SnapshotRow[],
): SnapshotRecord {
  const fp = fingerprint(filter);
  const record: SnapshotRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fingerprint: fp,
    savedAt: new Date().toISOString(),
    rows,
  };
  const root = readRoot();
  const next = capHistory(
    purgeExpired([...root.snapshots, record]),
  );
  writeRoot({ snapshots: next });
  return record;
}

/** Latest snapshot for the given filter, or null when none exists. */
export function loadLatestSnapshot(
  filter: LeaderboardFilter,
): SnapshotRecord | null {
  const fp = fingerprint(filter);
  const root = readRoot();
  const live = purgeExpired(root.snapshots);
  // Mutating side effect: if we dropped anything, persist the
  // smaller list so subsequent visits don't re-parse expired rows.
  if (live.length !== root.snapshots.length) {
    writeRoot({ snapshots: live });
  }
  const matching = live
    .filter((s) => s.fingerprint === fp)
    .sort((a, b) => Date.parse(a.savedAt) - Date.parse(b.savedAt));
  return matching.length > 0 ? matching[matching.length - 1]! : null;
}

/**
 * Snapshot history for a filter, oldest → newest. Used by M6.5
 * to compute Δ‑score arrows between the latest two runs.
 */
export function loadSnapshotHistory(
  filter: LeaderboardFilter,
): SnapshotRecord[] {
  const fp = fingerprint(filter);
  const root = readRoot();
  const live = purgeExpired(root.snapshots);
  return live
    .filter((s) => s.fingerprint === fp)
    .sort((a, b) => Date.parse(a.savedAt) - Date.parse(b.savedAt));
}

/** Test-only: clear everything. */
export function clearAllSnapshots(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* see writeRoot */
  }
}

export const __test = {
  STORAGE_KEY,
  TTL_MS,
  HISTORY_PER_FINGERPRINT,
  MAX_TOTAL_SNAPSHOTS,
};
