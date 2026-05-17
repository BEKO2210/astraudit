/**
 * Watched‑repos store — Roadmap M7.1.
 *
 * Persists the list of repositories the visitor has explicitly
 * marked as "watch this". Each entry carries the last observed
 * Astraudit snapshot (score, grade, finding count) so that the
 * background refresh loop (M7.2 — next slice) can emit a diff
 * event whenever any of those values change between two checks.
 *
 * Storage: localStorage at `astraudit:watch:v1`. Same shape +
 * SecurityError tolerance as auditCache + snapshotStore — the
 * watch list is a UX nicety, never load‑bearing.
 *
 * Cap: at most MAX_WATCHED entries. Adding past the cap evicts
 * the oldest by `addedAt`. The dashboard surfaces no error for
 * the eviction — the visitor still sees their newest entries.
 */

import type { RepoCoordinates } from "../../types/github";

const STORAGE_KEY = "astraudit:watch:v1";
const MAX_WATCHED = 50;
const DEFAULT_INTERVAL_HOURS = 24 * 7; // weekly

export interface WatchedRepo {
  owner: string;
  repo: string;
  fullName: string;
  /** ISO‑8601 when the entry was added. */
  addedAt: string;
  /** ISO‑8601 of the last automated check, null until M7.2 runs. */
  lastCheckedAt: string | null;
  /** Snapshot at last check — surfaced as the baseline for diff events. */
  lastScore: number | null;
  lastMaxScore: number | null;
  lastGrade: string | null;
  lastFindingCount: number | null;
  /** Per‑repo poll interval; defaults to weekly. */
  intervalHours: number;
}

/** Snapshot fields the watch entry stores between checks. */
export interface WatchSnapshot {
  totalScore: number;
  maxScore: number;
  grade: string;
  findingCount: number;
}

interface PersistedRoot {
  watched: WatchedRepo[];
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readRoot(): PersistedRoot {
  if (!isBrowser()) return { watched: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { watched: [] };
    const parsed = JSON.parse(raw) as PersistedRoot;
    if (!parsed || !Array.isArray(parsed.watched)) return { watched: [] };
    return parsed;
  } catch {
    return { watched: [] };
  }
}

function writeRoot(root: PersistedRoot): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  } catch {
    // Quota / private‑mode SecurityError — swallow.
  }
}

function keyFor(coords: RepoCoordinates): string {
  return `${coords.owner.toLowerCase()}/${coords.repo.toLowerCase()}`;
}

function matches(entry: WatchedRepo, coords: RepoCoordinates): boolean {
  return keyFor({ owner: entry.owner, repo: entry.repo }) === keyFor(coords);
}

/**
 * Storage order is insertion order (oldest first, newest last)
 * so eviction can `shift()` the front without ambiguity even
 * when several entries land in the same millisecond.
 *
 * `listWatched()` reverses for display so the visitor sees
 * newest first.
 */
function reverseForDisplay(list: WatchedRepo[]): WatchedRepo[] {
  return [...list].reverse();
}

/**
 * Add a repository to the watch list. Idempotent: re-adding an
 * existing entry refreshes its baseline snapshot (if one is
 * passed) but preserves `addedAt`.
 *
 * Returns the resulting entry.
 */
export function watchRepo(
  coords: RepoCoordinates,
  snapshot?: WatchSnapshot,
  options: { intervalHours?: number } = {},
): WatchedRepo {
  const root = readRoot();
  const existing = root.watched.find((w) => matches(w, coords));
  if (existing) {
    if (snapshot) {
      existing.lastScore = snapshot.totalScore;
      existing.lastMaxScore = snapshot.maxScore;
      existing.lastGrade = snapshot.grade;
      existing.lastFindingCount = snapshot.findingCount;
      existing.lastCheckedAt = new Date().toISOString();
    }
    if (options.intervalHours != null) {
      existing.intervalHours = options.intervalHours;
    }
    writeRoot(root);
    return existing;
  }
  const entry: WatchedRepo = {
    owner: coords.owner,
    repo: coords.repo,
    fullName: `${coords.owner}/${coords.repo}`,
    addedAt: new Date().toISOString(),
    lastCheckedAt: snapshot ? new Date().toISOString() : null,
    lastScore: snapshot?.totalScore ?? null,
    lastMaxScore: snapshot?.maxScore ?? null,
    lastGrade: snapshot?.grade ?? null,
    lastFindingCount: snapshot?.findingCount ?? null,
    intervalHours: options.intervalHours ?? DEFAULT_INTERVAL_HOURS,
  };
  const next = [...root.watched, entry];
  // Cap: oldest sits at index 0 thanks to insertion-order
  // storage; drop from the front until we're within MAX_WATCHED.
  while (next.length > MAX_WATCHED) next.shift();
  writeRoot({ watched: next });
  return entry;
}

/** Remove a repository from the watch list. No-op when absent. */
export function unwatchRepo(coords: RepoCoordinates): void {
  const root = readRoot();
  const next = root.watched.filter((w) => !matches(w, coords));
  if (next.length === root.watched.length) return;
  writeRoot({ watched: next });
}

/** Is the given repo currently watched? */
export function isWatched(coords: RepoCoordinates): boolean {
  return readRoot().watched.some((w) => matches(w, coords));
}

/** List every watched repo, newest first. */
export function listWatched(): WatchedRepo[] {
  return reverseForDisplay(readRoot().watched);
}

/** Look up the stored snapshot baseline for a single repo. */
export function getWatched(coords: RepoCoordinates): WatchedRepo | null {
  return readRoot().watched.find((w) => matches(w, coords)) ?? null;
}

/**
 * Update the stored baseline after the background loop has
 * audited the repo afresh. Skipped silently when the entry is
 * no longer in the list (visitor unwatched mid-check).
 */
export function updateAfterCheck(
  coords: RepoCoordinates,
  snapshot: WatchSnapshot,
): void {
  const root = readRoot();
  const entry = root.watched.find((w) => matches(w, coords));
  if (!entry) return;
  entry.lastScore = snapshot.totalScore;
  entry.lastMaxScore = snapshot.maxScore;
  entry.lastGrade = snapshot.grade;
  entry.lastFindingCount = snapshot.findingCount;
  entry.lastCheckedAt = new Date().toISOString();
  writeRoot(root);
}

/**
 * Decide whether `entry` is due for a refresh given the current
 * wall clock + its `intervalHours`. Pure on the entry so the
 * background loop is trivially unit‑testable.
 */
export function isDueForRefresh(
  entry: WatchedRepo,
  now: number = Date.now(),
): boolean {
  if (!entry.lastCheckedAt) return true;
  const last = Date.parse(entry.lastCheckedAt);
  if (Number.isNaN(last)) return true;
  const intervalMs = Math.max(1, entry.intervalHours) * 60 * 60 * 1000;
  return now - last >= intervalMs;
}

/** Test-only: wipe every entry. */
export function clearAllWatched(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* see writeRoot */
  }
}

export const __test = {
  STORAGE_KEY,
  MAX_WATCHED,
  DEFAULT_INTERVAL_HOURS,
};
