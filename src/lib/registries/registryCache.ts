/**
 * localStorage cache for public-registry lookups — Phase 3.8.
 *
 * Modeled on the existing `auditCache.ts` (24h TTL, bounded entry
 * count). Per-package response payloads are tiny (well under 1 KB
 * normalised), so we don't bother with the per-entry size cap.
 *
 * Constraints:
 *   - 100% client-side, browser-only.
 *   - Per-package TTL of 24 hours. Registry data moves slowly and we
 *     never want to spam these public endpoints from a static page.
 *   - Bounded total entry count (200) so a monorepo with thousands of
 *     deps can't fill localStorage.
 */

import type { RegistryEcosystem, RegistryMetadata } from "./types";

const VERSION = "v1";
const PREFIX = `astraudit:registry:${VERSION}:`;
const INDEX_KEY = `astraudit:registry-index:${VERSION}`;
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

interface CachedEntry {
  metadata: RegistryMetadata;
  cachedAt: string;
}

interface IndexEntry {
  key: string;
  cachedAt: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function keyFor(ecosystem: RegistryEcosystem, name: string): string {
  return `${PREFIX}${ecosystem}:${name.toLowerCase()}`;
}

function readIndex(): IndexEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IndexEntry[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(index: IndexEntry[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    // best-effort
  }
}

/**
 * Read a cached entry. Returns null on miss / stale / parse error.
 * Stale entries are evicted lazily on read.
 */
export function readCached(
  ecosystem: RegistryEcosystem,
  name: string,
): RegistryMetadata | null {
  if (!isBrowser()) return null;
  const key = keyFor(ecosystem, name);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    const cachedAt = new Date(parsed.cachedAt).getTime();
    if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > TTL_MS) {
      // Stale — drop both the entry and its index slot.
      localStorage.removeItem(key);
      writeIndex(readIndex().filter((e) => e.key !== key));
      return null;
    }
    return parsed.metadata;
  } catch {
    return null;
  }
}

/** Write a cached entry, evicting the oldest if we'd exceed the cap. */
export function writeCached(metadata: RegistryMetadata): void {
  if (!isBrowser()) return;
  const key = keyFor(metadata.ecosystem, metadata.name);
  const now = new Date().toISOString();
  const entry: CachedEntry = { metadata, cachedAt: now };

  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Quota or other storage error — silently skip caching.
    return;
  }

  // Update the index with bounded eviction.
  const index = readIndex().filter((e) => e.key !== key);
  index.push({ key, cachedAt: now });
  index.sort((a, b) => a.cachedAt.localeCompare(b.cachedAt));
  while (index.length > MAX_ENTRIES) {
    const evicted = index.shift();
    if (evicted) {
      try {
        localStorage.removeItem(evicted.key);
      } catch {
        // best-effort
      }
    }
  }
  writeIndex(index);
}

/** Manual cache reset — exposed so the Settings dialog can clear it. */
export function clearAllRegistryCache(): void {
  if (!isBrowser()) return;
  for (const entry of readIndex()) {
    try {
      localStorage.removeItem(entry.key);
    } catch {
      // best-effort
    }
  }
  try {
    localStorage.removeItem(INDEX_KEY);
  } catch {
    // best-effort
  }
}
