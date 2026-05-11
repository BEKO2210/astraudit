/**
 * localStorage audit cache.
 *
 * What we cache: the GitHub-fetched RepoBundle, NOT the final
 * AuditResult. This way:
 * - We skip the slow part (network) on repeat audits.
 * - The audit engine always runs in the current code path, so any
 *   audit-rule improvements we ship apply immediately to cached
 *   bundles without users needing to clear the cache.
 *
 * Constraints honored:
 * - 100% client-side: lives in localStorage only.
 * - Bounded: per-entry size cap and total entry cap so a single
 *   monorepo can't fill localStorage.
 * - TTL invalidation: 24 hours from `cachedAt`. (`pushedAt`-based
 *   invalidation was considered but lives at the App layer — Re-audit
 *   from the UI calls `removeBundle(coords)` before the fresh fetch
 *   so the next read is a cache miss. See `App.tsx#startAudit` with
 *   `forceFresh`.)
 */

import type { RepoBundle, RepoCoordinates } from "../../types/github";

const VERSION = "v1";
const CACHE_PREFIX = `astraudit:bundle:${VERSION}:`;
const INDEX_KEY = `astraudit:bundle-index:${VERSION}`;
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRY_SIZE = 1_500_000; // ~1.5 MB JSON
const MAX_TOTAL_ENTRIES = 30;

export interface CacheStatsEntry {
  fullName: string;
  cachedAt: string;
  sizeApprox: number;
}

export interface CacheStats {
  count: number;
  sizeKB: number;
  entries: CacheStatsEntry[];
}

interface CachedBundleEntry {
  bundle: RepoBundle;
  cachedAt: string;
}

interface IndexEntry {
  key: string;
  fullName: string;
  cachedAt: string;
  sizeApprox: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function makeKey(coords: RepoCoordinates): string {
  return `${CACHE_PREFIX}${coords.owner.toLowerCase()}/${coords.repo.toLowerCase()}`;
}

function readIndex(): IndexEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IndexEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(entries: IndexEntry[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function upsertIndex(entry: IndexEntry): void {
  const list = readIndex().filter((e) => e.key !== entry.key);
  list.unshift(entry);
  // Trim to MAX_TOTAL_ENTRIES, removing the oldest also from storage.
  const overflow = list.splice(MAX_TOTAL_ENTRIES);
  for (const removed of overflow) {
    try {
      localStorage.removeItem(removed.key);
    } catch {
      // ignore
    }
  }
  writeIndex(list);
}

function pruneOldest(): boolean {
  const list = readIndex();
  if (list.length === 0) return false;
  const oldest = list.pop();
  if (!oldest) return false;
  try {
    localStorage.removeItem(oldest.key);
  } catch {
    // ignore
  }
  writeIndex(list);
  return true;
}

export function readBundle(coords: RepoCoordinates): RepoBundle | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(makeKey(coords));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBundleEntry;
    const cachedTime = new Date(parsed.cachedAt).getTime();
    if (!cachedTime || Date.now() - cachedTime > TTL_MS) {
      removeBundle(coords);
      return null;
    }
    return parsed.bundle;
  } catch {
    return null;
  }
}

export function writeBundle(coords: RepoCoordinates, bundle: RepoBundle): void {
  if (!isBrowser()) return;
  const payload: CachedBundleEntry = {
    bundle,
    cachedAt: new Date().toISOString(),
  };
  let json: string;
  try {
    json = JSON.stringify(payload);
  } catch {
    return;
  }
  if (json.length > MAX_ENTRY_SIZE) {
    // Bundle too large (very deep tree) — skip cache silently.
    return;
  }

  const key = makeKey(coords);
  let attempts = 0;
  while (attempts < 3) {
    try {
      localStorage.setItem(key, json);
      upsertIndex({
        key,
        fullName: bundle.metadata.fullName,
        cachedAt: payload.cachedAt,
        sizeApprox: json.length,
      });
      return;
    } catch {
      if (!pruneOldest()) return;
      attempts++;
    }
  }
}

export function removeBundle(coords: RepoCoordinates): void {
  if (!isBrowser()) return;
  const key = makeKey(coords);
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  const list = readIndex().filter((e) => e.key !== key);
  writeIndex(list);
}

export function clearAll(): void {
  if (!isBrowser()) return;
  for (const entry of readIndex()) {
    try {
      localStorage.removeItem(entry.key);
    } catch {
      // ignore
    }
  }
  try {
    localStorage.removeItem(INDEX_KEY);
  } catch {
    // ignore
  }
}

export function getStats(): CacheStats {
  const entries = readIndex();
  const sizeBytes = entries.reduce((sum, e) => sum + (e.sizeApprox ?? 0), 0);
  return {
    count: entries.length,
    sizeKB: Math.round(sizeBytes / 1024),
    entries: entries.map((e) => ({
      fullName: e.fullName,
      cachedAt: e.cachedAt,
      sizeApprox: e.sizeApprox,
    })),
  };
}

export function bundleAge(coords: RepoCoordinates): number | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(makeKey(coords));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBundleEntry;
    const cachedTime = new Date(parsed.cachedAt).getTime();
    if (!cachedTime) return null;
    return Date.now() - cachedTime;
  } catch {
    return null;
  }
}
