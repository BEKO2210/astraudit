/**
 * Audit history + favorites — localStorage only.
 *
 * Two views over the same dataset:
 * - Recent: the last N entries by lastAuditedAt, capped (display-side).
 * - Favorites: entries where favorite=true, regardless of recency.
 *
 * Constraints honoured: no backend, no server tokens, nothing leaves
 * the browser. The store is keyed by lowercase `owner/repo` so
 * re-auditing the same repo updates the existing entry instead of
 * creating duplicates.
 */

import type { Grade } from "../../types/audit";
import type { RepoCoordinates } from "../../types/github";

export const HISTORY_STORAGE_KEY = "astraudit:history:v1";

export const RECENT_DISPLAY_LIMIT = 20;
const TOTAL_STORAGE_LIMIT = 200;

export interface HistoryEntry {
  fullName: string;
  owner: string;
  repo: string;
  avatarUrl?: string;
  score: number | null;
  grade: Grade | null;
  lastAuditedAt: string;
  favorite: boolean;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readAll(): HistoryEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: HistoryEntry[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded or storage disabled — fail silently.
  }
}

function entryKey(c: { owner: string; repo: string }): string {
  return `${c.owner.toLowerCase()}/${c.repo.toLowerCase()}`;
}

/** Sort: favorites first by lastAuditedAt desc, then non-favorites by lastAuditedAt desc. */
function sortEntries(list: HistoryEntry[]): HistoryEntry[] {
  return [...list].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return new Date(b.lastAuditedAt).getTime() - new Date(a.lastAuditedAt).getTime();
  });
}

export interface RecordInput {
  coords: RepoCoordinates;
  fullName: string;
  avatarUrl?: string;
  score: number | null;
  grade: Grade | null;
}

/**
 * Insert or update an entry. Preserves the favorite flag if the entry
 * already exists. Caps the total stored entries to TOTAL_STORAGE_LIMIT
 * by dropping the oldest non-favorite entries first.
 */
export function recordAudit(input: RecordInput): void {
  if (!isBrowser()) return;
  const all = readAll();
  const key = entryKey(input.coords);
  const existing = all.find((e) => entryKey(e) === key);
  const next: HistoryEntry = {
    fullName: input.fullName,
    owner: input.coords.owner,
    repo: input.coords.repo,
    avatarUrl: input.avatarUrl ?? existing?.avatarUrl,
    score: input.score,
    grade: input.grade,
    lastAuditedAt: new Date().toISOString(),
    favorite: existing?.favorite ?? false,
  };

  const without = all.filter((e) => entryKey(e) !== key);
  let combined = [next, ...without];

  if (combined.length > TOTAL_STORAGE_LIMIT) {
    // Drop the oldest non-favorite entries until we're back under cap.
    const sorted = sortEntries(combined);
    const trimmed: HistoryEntry[] = [];
    let dropped = 0;
    const overflow = combined.length - TOTAL_STORAGE_LIMIT;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (dropped >= overflow) {
        trimmed.unshift(sorted[i]);
      } else if (sorted[i].favorite) {
        trimmed.unshift(sorted[i]);
      } else {
        dropped++;
      }
    }
    // If we still couldn't drop enough (all favorites), drop the
    // oldest entries regardless.
    while (trimmed.length > TOTAL_STORAGE_LIMIT) {
      const oldestIdx = trimmed.reduce(
        (idx, e, i, arr) =>
          new Date(e.lastAuditedAt).getTime() <
          new Date(arr[idx].lastAuditedAt).getTime()
            ? i
            : idx,
        0,
      );
      trimmed.splice(oldestIdx, 1);
    }
    combined = trimmed;
  }

  writeAll(combined);
}

export function toggleFavorite(coords: RepoCoordinates): void {
  if (!isBrowser()) return;
  const all = readAll();
  const key = entryKey(coords);
  const found = all.find((e) => entryKey(e) === key);
  if (!found) return;
  found.favorite = !found.favorite;
  writeAll(all);
}

export function removeEntry(coords: RepoCoordinates): void {
  if (!isBrowser()) return;
  const all = readAll();
  const key = entryKey(coords);
  writeAll(all.filter((e) => entryKey(e) !== key));
}

export function listHistory(): HistoryEntry[] {
  return sortEntries(readAll()).slice(0, RECENT_DISPLAY_LIMIT);
}

export function listFavorites(): HistoryEntry[] {
  return sortEntries(readAll().filter((e) => e.favorite));
}

export function getEntry(coords: RepoCoordinates): HistoryEntry | null {
  const all = readAll();
  const key = entryKey(coords);
  return all.find((e) => entryKey(e) === key) ?? null;
}

export function clearAll(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface HistoryStats {
  total: number;
  favorites: number;
}

export function getStats(): HistoryStats {
  const all = readAll();
  return {
    total: all.length,
    favorites: all.filter((e) => e.favorite).length,
  };
}
