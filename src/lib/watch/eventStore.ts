/**
 * Watch-event store — Roadmap M7.1.3.
 *
 * Persists `WatchEvent`s produced by the background refresh loop
 * so the visitor sees them in the inbox (M7.1.4) on next visit.
 * Same localStorage posture as watchStore + auditCache:
 * SecurityError / QuotaExceededError are swallowed silently.
 *
 * Cap: MAX_EVENTS in total (oldest evicted first); TTL drops
 * events older than EVENT_TTL_MS on every read.
 */
import type { WatchEvent } from "./diffEngine";

const STORAGE_KEY = "astraudit:watch-events:v1";
const MAX_EVENTS = 200;
const EVENT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface WatchEventRecord {
  /** Stable id (occurredAt + random suffix) — used by markRead. */
  id: string;
  event: WatchEvent;
  /** Acknowledgement flag flipped by the inbox UI. */
  read: boolean;
}

interface PersistedRoot {
  events: WatchEventRecord[];
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readRoot(): PersistedRoot {
  if (!isBrowser()) return { events: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { events: [] };
    const parsed = JSON.parse(raw) as PersistedRoot;
    if (!parsed || !Array.isArray(parsed.events)) return { events: [] };
    return parsed;
  } catch {
    return { events: [] };
  }
}

function writeRoot(root: PersistedRoot): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  } catch {
    // Quota / private‑mode — swallow.
  }
}

export function purgeExpiredEvents(
  records: WatchEventRecord[],
  maxAgeMs: number = EVENT_TTL_MS,
  now: number = Date.now(),
): WatchEventRecord[] {
  return records.filter((r) => {
    const t = Date.parse(r.event.occurredAt);
    if (Number.isNaN(t)) return false;
    return now - t < maxAgeMs;
  });
}

function newId(occurredAt: string): string {
  return `${occurredAt}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Append a batch of events. Caps + TTL applied. */
export function appendEvents(events: WatchEvent[]): WatchEventRecord[] {
  if (events.length === 0) return [];
  const root = readRoot();
  const added: WatchEventRecord[] = events.map((event) => ({
    id: newId(event.occurredAt),
    event,
    read: false,
  }));
  const next = purgeExpiredEvents([...root.events, ...added]);
  while (next.length > MAX_EVENTS) next.shift();
  writeRoot({ events: next });
  return added;
}

/** All events, newest first; expired ones swept on the way out. */
export function listEvents(): WatchEventRecord[] {
  const root = readRoot();
  const live = purgeExpiredEvents(root.events);
  if (live.length !== root.events.length) writeRoot({ events: live });
  return [...live].reverse();
}

export function unreadCount(): number {
  return listEvents().filter((r) => !r.read).length;
}

export function markEventRead(id: string): void {
  const root = readRoot();
  const entry = root.events.find((e) => e.id === id);
  if (!entry) return;
  entry.read = true;
  writeRoot(root);
}

export function markAllEventsRead(): void {
  const root = readRoot();
  let changed = false;
  for (const e of root.events) {
    if (!e.read) {
      e.read = true;
      changed = true;
    }
  }
  if (changed) writeRoot(root);
}

export function clearAllEvents(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* see writeRoot */
  }
}

export const __test = { STORAGE_KEY, MAX_EVENTS, EVENT_TTL_MS };
