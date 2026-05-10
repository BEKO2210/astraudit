import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetForTests,
  defaultTtl,
  dismissAll,
  dismissToast,
  isPaused,
  MAX_VISIBLE,
  pauseAll,
  pushToast,
  resumeAll,
  subscribeToasts,
  updateToast,
  type Toast,
} from "../../../src/lib/ui/toastStore";

beforeEach(() => {
  __resetForTests();
  vi.useFakeTimers({ shouldAdvanceTime: false });
});

afterEach(() => {
  vi.useRealTimers();
});

function snapshot(): Toast[] {
  let last: Toast[] = [];
  const off = subscribeToasts((t) => {
    last = t;
  });
  off();
  return last;
}

describe("pushToast", () => {
  it("adds a toast and emits to subscribers", () => {
    const seen: number[] = [];
    const off = subscribeToasts((t) => seen.push(t.length));
    expect(seen[0]).toBe(0);
    pushToast({ tone: "info", message: "hello" });
    expect(seen.at(-1)).toBe(1);
    off();
  });

  it("returns a monotonic id per push", () => {
    const a = pushToast({ tone: "info", message: "a" });
    const b = pushToast({ tone: "info", message: "b" });
    expect(b).toBeGreaterThan(a);
  });

  it("uses the per-tone default TTL", () => {
    pushToast({ tone: "success", message: "ok" });
    pushToast({ tone: "error", message: "no" });
    pushToast({ tone: "loading", message: "wait" });
    const toasts = snapshot();
    expect(toasts.find((t) => t.message === "ok")?.ttl).toBe(defaultTtl("success"));
    expect(toasts.find((t) => t.message === "no")?.ttl).toBe(defaultTtl("error"));
    expect(toasts.find((t) => t.message === "wait")?.ttl).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe("auto-dismiss timer", () => {
  it("removes a toast after its TTL elapses", () => {
    pushToast({ tone: "info", message: "x", ttl: 1500 });
    expect(snapshot()).toHaveLength(1);
    vi.advanceTimersByTime(1499);
    expect(snapshot()).toHaveLength(1);
    vi.advanceTimersByTime(2);
    expect(snapshot()).toHaveLength(0);
  });

  it("loading toasts persist (Infinity TTL)", () => {
    pushToast({ tone: "loading", message: "spin" });
    vi.advanceTimersByTime(60_000);
    expect(snapshot()).toHaveLength(1);
  });
});

describe("pauseAll / resumeAll", () => {
  it("freezes the timer and resumes from the remaining time", () => {
    pushToast({ tone: "info", message: "x", ttl: 1000 });
    vi.advanceTimersByTime(400);
    pauseAll();
    expect(isPaused()).toBe(true);

    // While paused, the toast does NOT expire even after a long wait.
    vi.advanceTimersByTime(5000);
    expect(snapshot()).toHaveLength(1);

    resumeAll();
    expect(isPaused()).toBe(false);
    // 600 ms remaining when paused.
    vi.advanceTimersByTime(599);
    expect(snapshot()).toHaveLength(1);
    vi.advanceTimersByTime(2);
    expect(snapshot()).toHaveLength(0);
  });

  it("is idempotent (double pause / resume)", () => {
    pushToast({ tone: "info", message: "x", ttl: 1000 });
    pauseAll();
    pauseAll();
    expect(isPaused()).toBe(true);
    resumeAll();
    resumeAll();
    expect(isPaused()).toBe(false);
  });
});

describe("dismissToast / dismissAll", () => {
  it("dismissToast removes one toast and clears its timer", () => {
    const id = pushToast({ tone: "info", message: "a", ttl: 1000 });
    pushToast({ tone: "info", message: "b", ttl: 1000 });
    dismissToast(id);
    expect(snapshot()).toHaveLength(1);
    expect(snapshot()[0].message).toBe("b");
  });

  it("dismissAll wipes the stack and pending timers", () => {
    pushToast({ tone: "info", message: "a", ttl: 1000 });
    pushToast({ tone: "info", message: "b", ttl: 1000 });
    dismissAll();
    expect(snapshot()).toEqual([]);
    vi.advanceTimersByTime(2000);
    expect(snapshot()).toEqual([]);
  });
});

describe("updateToast", () => {
  it("updates message + tone in place and resets the timer", () => {
    const id = pushToast({ tone: "loading", message: "uploading" });
    vi.advanceTimersByTime(10_000);
    expect(snapshot()).toHaveLength(1);

    updateToast(id, { tone: "success", message: "uploaded", ttl: 500 });
    const t = snapshot()[0];
    expect(t.tone).toBe("success");
    expect(t.message).toBe("uploaded");
    vi.advanceTimersByTime(501);
    expect(snapshot()).toHaveLength(0);
  });

  it("ignores updates for unknown ids", () => {
    pushToast({ tone: "info", message: "x" });
    updateToast(999, { message: "nope" });
    expect(snapshot()[0].message).toBe("x");
  });
});

describe("MAX_VISIBLE export", () => {
  it("is the documented value", () => {
    expect(MAX_VISIBLE).toBe(4);
  });
});
