/**
 * Phase 5.6 — error-view mapping contract.
 *
 * Locks down:
 *  1. Each GitHub error class maps to a coherent view (right kind,
 *     title, message, and primary CTA).
 *  2. Anonymous rate-limit gets the "Open Settings" primary action
 *     (the actionable path: add a token); authenticated rate-limit
 *     gets "Retry" (the wait-and-try path).
 *  3. Generic GithubError 5xx is treated as transient (retryable);
 *     4xx is treated as terminal (only "Try a different repository").
 *  4. AbortError is dignified, not raw.
 *  5. The reset countdown formatter handles the edge cases (missing,
 *     past, sub-minute, multi-minute) correctly.
 */

import { describe, expect, it } from "vitest";
import {
  emptyRepoView,
  formatResetCountdown,
  mapAuditError,
} from "../../../src/lib/github/auditErrorView";
import {
  GithubError,
  InvalidTokenError,
  NotFoundError,
  RateLimitError,
  TooLargeError,
} from "../../../src/lib/github/githubClient";

describe("mapAuditError", () => {
  it("maps anonymous rate-limit to the open-settings actionable path", () => {
    const view = mapAuditError(
      new RateLimitError({ unauthenticated: true, resetAtSeconds: 9999 }),
    );
    expect(view.kind).toBe("rate-limit-anon");
    expect(view.title).toBe("GitHub rate limit reached");
    expect(view.unauthenticated).toBe(true);
    expect(view.resetAtSeconds).toBe(9999);
    expect(view.actions[0].kind).toBe("open-settings");
    expect(view.message).toMatch(/personal access token/i);
    expect(view.message).toMatch(/never transmits them/i);
  });

  it("maps authenticated rate-limit to retry, NOT open-settings", () => {
    const view = mapAuditError(
      new RateLimitError({ unauthenticated: false, resetAtSeconds: 1000 }),
    );
    expect(view.kind).toBe("rate-limit");
    expect(view.actions[0].kind).toBe("retry");
    expect(view.actions[1]?.kind).toBe("open-settings");
    expect(view.unauthenticated).toBe(false);
  });

  it("maps NotFound to a 'try a different repo' terminal state", () => {
    const view = mapAuditError(new NotFoundError());
    expect(view.kind).toBe("not-found");
    expect(view.actions).toHaveLength(1);
    expect(view.actions[0].kind).toBe("reset");
    // No retry — refetching a 404 will never recover.
    expect(view.actions.find((a) => a.kind === "retry")).toBeUndefined();
    expect(view.message).toMatch(/private repositories/i);
  });

  it("maps TooLarge to a sized-down explanation", () => {
    const view = mapAuditError(new TooLargeError());
    expect(view.kind).toBe("too-large");
    expect(view.message).toMatch(/in-browser audit/i);
    expect(view.actions[0].kind).toBe("reset");
  });

  it("treats GithubError 5xx as transient → retry primary", () => {
    const view = mapAuditError(new GithubError("Bad Gateway", 502));
    expect(view.kind).toBe("github");
    expect(view.title).toBe("GitHub is having a moment");
    expect(view.actions[0].kind).toBe("retry");
  });

  it("treats GithubError 4xx as terminal → reset primary, NO retry", () => {
    const view = mapAuditError(new GithubError("Forbidden", 403));
    expect(view.kind).toBe("github");
    expect(view.title).toBe("GitHub error");
    expect(view.actions).toHaveLength(1);
    expect(view.actions[0].kind).toBe("reset");
  });

  it("dignifies AbortError instead of leaking the raw name", () => {
    const err = Object.assign(new Error("aborted"), { name: "AbortError" });
    const view = mapAuditError(err);
    expect(view.kind).toBe("abort");
    expect(view.title).toBe("Audit cancelled");
    // No retry — the user clicked away on purpose.
    expect(view.actions[0].kind).toBe("reset");
  });

  it("falls back to network kind for unknown errors with a Retry primary", () => {
    const view = mapAuditError(new Error("ECONNRESET"));
    expect(view.kind).toBe("network");
    expect(view.actions[0].kind).toBe("retry");
    expect(view.message).toBe("ECONNRESET");
  });

  it("survives non-Error throwables without crashing", () => {
    expect(() => mapAuditError("string")).not.toThrow();
    expect(() => mapAuditError(undefined)).not.toThrow();
    expect(() => mapAuditError(null)).not.toThrow();
    expect(mapAuditError(undefined).kind).toBe("network");
  });

  // Phase 7.x — the bug that prompted this work: a 401 from GitHub
  // (revoked / expired / wrong-scope PAT) used to fall through the
  // generic GithubError path and emit "GitHub responded with 401 -
  // try a different repository". That's both unhelpful and
  // misleading; the issue is the credential, not the repo.
  it("InvalidTokenError (with token in scope) routes to 'Open Settings' as the primary CTA", () => {
    const view = mapAuditError(new InvalidTokenError({ unauthenticated: false }));
    expect(view.kind).toBe("invalid-token");
    expect(view.title).toMatch(/PAT/i);
    expect(view.actions[0].kind).toBe("open-settings");
    expect(view.message).toMatch(/invalid|expired|revoked/i);
    expect(view.message).toMatch(/Settings/);
  });

  it("InvalidTokenError (no token in scope) does NOT route to Settings (nothing to clear)", () => {
    const view = mapAuditError(new InvalidTokenError({ unauthenticated: true }));
    expect(view.kind).toBe("invalid-token");
    expect(view.actions[0].kind).not.toBe("open-settings");
    expect(view.message).toMatch(/proxy|transient|hiccup/i);
  });
});

describe("emptyRepoView", () => {
  it("produces a coherent 'this repo is empty' view with a reset CTA", () => {
    const view = emptyRepoView();
    expect(view.kind).toBe("empty");
    expect(view.title).toBe("Empty repository");
    expect(view.actions[0].kind).toBe("reset");
    expect(view.message).toMatch(/empty/i);
  });
});

// Phase 6.26 — every mapped error view must have a non-empty title +
// message + at least one action. Catches "oops, forgot to set the
// CTA" or a copy edit that left an empty string.
describe("AuditErrorView shape contract", () => {
  const fixtures: Array<{ name: string; err: unknown }> = [
    { name: "RateLimit anon", err: new RateLimitError({ unauthenticated: true }) },
    { name: "RateLimit auth", err: new RateLimitError({ unauthenticated: false }) },
    { name: "NotFound", err: new NotFoundError("nope") },
    { name: "TooLarge", err: new TooLargeError("too big") },
    { name: "GithubError 5xx", err: new GithubError("server", 500) },
    { name: "GithubError 4xx", err: new GithubError("forbidden", 403) },
    { name: "InvalidToken auth", err: new InvalidTokenError({ unauthenticated: false }) },
    { name: "InvalidToken anon", err: new InvalidTokenError({ unauthenticated: true }) },
    { name: "AbortError", err: Object.assign(new Error("abort"), { name: "AbortError" }) },
    { name: "unknown string", err: "raw string thrown" },
    { name: "unknown null", err: null },
  ];

  for (const { name, err } of fixtures) {
    it(`${name}: non-empty title + message + ≥1 action`, () => {
      const view = mapAuditError(err);
      expect(view.title, `${name}: empty title`).not.toBe("");
      expect(view.message, `${name}: empty message`).not.toBe("");
      expect(view.actions.length, `${name}: no actions`).toBeGreaterThan(0);
      expect(view.actions[0].label).not.toBe("");
    });
  }
});

describe("formatResetCountdown", () => {
  const NOW = 1_700_000_000_000; // wall-clock fixture (ms)

  it("returns null when the timestamp is missing", () => {
    expect(formatResetCountdown(null, NOW)).toBeNull();
    expect(formatResetCountdown(undefined, NOW)).toBeNull();
  });

  it("returns null when the reset is in the past", () => {
    expect(
      formatResetCountdown(Math.floor(NOW / 1000) - 5, NOW),
    ).toBeNull();
  });

  it("formats sub-minute deltas in seconds", () => {
    expect(formatResetCountdown(Math.floor(NOW / 1000) + 30, NOW)).toBe(
      "Resets in 30 sec",
    );
  });

  it("formats multi-minute deltas in minutes (rounded UP)", () => {
    // 90s should round UP to 2 min so we never tell the user "1 min"
    // and have them re-try too early into the next 60s.
    expect(formatResetCountdown(Math.floor(NOW / 1000) + 90, NOW)).toBe(
      "Resets in 2 min",
    );
    // Exactly 5 min stays at 5.
    expect(formatResetCountdown(Math.floor(NOW / 1000) + 300, NOW)).toBe(
      "Resets in 5 min",
    );
    // 5 min + 1 sec rounds up to 6.
    expect(formatResetCountdown(Math.floor(NOW / 1000) + 301, NOW)).toBe(
      "Resets in 6 min",
    );
  });
});

describe("RateLimitError construction", () => {
  it("captures both fields independently", () => {
    const e = new RateLimitError({
      resetAtSeconds: 12345,
      unauthenticated: true,
    });
    expect(e.resetAtSeconds).toBe(12345);
    expect(e.unauthenticated).toBe(true);
    expect(e.status).toBe(403);
    expect(e.name).toBe("RateLimitError");
  });

  it("defaults both fields when constructed without arguments", () => {
    const e = new RateLimitError();
    expect(e.resetAtSeconds).toBeNull();
    expect(e.unauthenticated).toBe(false);
  });
});
