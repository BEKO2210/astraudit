/**
 * Tests for the date / relative-time formatters used by the
 * dashboard.
 *
 * `formatRelativeTime` is fine-grained ("just now", "30 seconds ago",
 * "2 hours ago", "3 days ago") and powers the audit-freshness chip
 * in the dashboard header. The chip is what makes "old score"
 * obvious to users — the bug was that they couldn't tell whether
 * the dashboard reflected the latest deploy or a 12 h-old cache.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  formatDate,
  formatRelative,
  formatRelativeTime,
} from "../../../src/lib/utils/formatDate";

const NOW = new Date("2026-05-10T12:00:00Z").getTime();
const minus = (s: number) => new Date(NOW - s * 1000).toISOString();

// `formatRelative` reads Date.now() directly and has no override hook.
// Pin the system clock so the "today" rollover doesn't flake the test
// once real wall-clock crosses midnight relative to the hardcoded NOW.
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterAll(() => {
  vi.useRealTimers();
});

describe("formatRelativeTime", () => {
  it("returns 'just now' for the last 5 seconds", () => {
    expect(formatRelativeTime(minus(0), NOW)).toBe("just now");
    expect(formatRelativeTime(minus(4), NOW)).toBe("just now");
  });

  it("returns 'N seconds ago' for sub-minute deltas", () => {
    expect(formatRelativeTime(minus(30), NOW)).toBe("30 seconds ago");
    expect(formatRelativeTime(minus(59), NOW)).toBe("59 seconds ago");
  });

  it("returns 'N minute(s) ago' for sub-hour deltas with correct singular", () => {
    expect(formatRelativeTime(minus(60), NOW)).toBe("1 minute ago");
    expect(formatRelativeTime(minus(60 * 5), NOW)).toBe("5 minutes ago");
  });

  it("returns 'N hour(s) ago' for sub-day deltas", () => {
    expect(formatRelativeTime(minus(60 * 60), NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(minus(60 * 60 * 12), NOW)).toBe("12 hours ago");
  });

  it("returns 'N day(s) ago' for sub-month deltas", () => {
    expect(formatRelativeTime(minus(60 * 60 * 24), NOW)).toBe("1 day ago");
    expect(formatRelativeTime(minus(60 * 60 * 24 * 5), NOW)).toBe("5 days ago");
  });

  it("returns 'N months ago' beyond 30 days", () => {
    expect(formatRelativeTime(minus(60 * 60 * 24 * 60), NOW)).toBe("2 months ago");
  });

  it("guards against bogus inputs", () => {
    expect(formatRelativeTime(null, NOW)).toBe("Unknown");
    expect(formatRelativeTime(undefined, NOW)).toBe("Unknown");
    expect(formatRelativeTime("not a date", NOW)).toBe("Unknown");
  });
});

describe("formatRelative (day-granularity legacy formatter)", () => {
  it("rounds sub-day deltas to 'today'", () => {
    expect(formatRelative(new Date(NOW - 1000).toISOString())).toBe("today");
  });
});

describe("formatDate", () => {
  it("returns an em-dash for empty input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
});
