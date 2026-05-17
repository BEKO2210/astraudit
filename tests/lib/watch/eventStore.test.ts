/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __test,
  appendEvents,
  clearAllEvents,
  listEvents,
  markAllEventsRead,
  markEventRead,
  purgeExpiredEvents,
  unreadCount,
  type WatchEventRecord,
} from "../../../src/lib/watch/eventStore";
import type { WatchEvent } from "../../../src/lib/watch/diffEngine";

function evt(
  occurredAt: string,
  overrides: Partial<WatchEvent> = {},
): WatchEvent {
  return {
    fullName: "a/b",
    kind: "score-up",
    occurredAt,
    before: 80,
    after: 90,
    delta: 10,
    ...overrides,
  };
}

beforeEach(() => clearAllEvents());
afterEach(() => clearAllEvents());

describe("appendEvents + listEvents (M7.1.3)", () => {
  it("returns nothing when there's nothing to append", () => {
    expect(appendEvents([])).toEqual([]);
    expect(listEvents()).toEqual([]);
  });

  it("persists and lists events newest first", () => {
    appendEvents([
      evt("2026-05-01T00:00:00Z"),
      evt("2026-05-10T00:00:00Z"),
      evt("2026-05-15T00:00:00Z"),
    ]);
    const list = listEvents();
    expect(list).toHaveLength(3);
    expect(list[0]?.event.occurredAt).toBe("2026-05-15T00:00:00Z");
    expect(list[2]?.event.occurredAt).toBe("2026-05-01T00:00:00Z");
  });

  it("seeds new records as unread", () => {
    appendEvents([evt("2026-05-15T00:00:00Z")]);
    expect(unreadCount()).toBe(1);
  });

  it("caps the total stored events at MAX_EVENTS (oldest evicted)", () => {
    const batch: WatchEvent[] = [];
    const base = Date.now();
    for (let i = 0; i < __test.MAX_EVENTS + 10; i++) {
      batch.push(evt(new Date(base - i * 1000).toISOString()));
    }
    appendEvents(batch);
    expect(listEvents()).toHaveLength(__test.MAX_EVENTS);
  });
});

describe("markEventRead + markAllEventsRead", () => {
  it("flips the read flag on a single entry", () => {
    appendEvents([evt("2026-05-15T00:00:00Z")]);
    const id = listEvents()[0]!.id;
    markEventRead(id);
    expect(unreadCount()).toBe(0);
  });

  it("is a no-op for an unknown id", () => {
    appendEvents([evt("2026-05-15T00:00:00Z")]);
    markEventRead("nope");
    expect(unreadCount()).toBe(1);
  });

  it("marks every entry read at once", () => {
    appendEvents([
      evt("2026-05-10T00:00:00Z"),
      evt("2026-05-15T00:00:00Z"),
    ]);
    expect(unreadCount()).toBe(2);
    markAllEventsRead();
    expect(unreadCount()).toBe(0);
  });
});

describe("purgeExpiredEvents", () => {
  function rec(occurredAt: string): WatchEventRecord {
    return { id: occurredAt, event: evt(occurredAt), read: false };
  }
  it("drops events older than the TTL", () => {
    const now = Date.now();
    const stale = rec(new Date(now - __test.EVENT_TTL_MS - 1).toISOString());
    const fresh = rec(new Date(now - 1000).toISOString());
    expect(purgeExpiredEvents([stale, fresh])).toEqual([fresh]);
  });

  it("drops events with an unparseable occurredAt", () => {
    const bad = rec("not-a-date");
    expect(purgeExpiredEvents([bad])).toEqual([]);
  });
});
