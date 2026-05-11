/**
 * Phase 7.0.3 — branch-protection probe tests.
 *
 * The fetcher's contract is narrow:
 *
 *   1. 200 + valid body → `{ status: "observed", … }` with the
 *      protection details unpacked.
 *   2. 404 (most audits — no admin scope) → `{ status: "unknown",
 *      reason: "not-set" }`.
 *   3. 403 that isn't rate-limit → `{ status: "unknown",
 *      reason: "gated" }`.
 *   4. Rate-limit error → re-thrown (the audit pipeline already
 *      knows how to surface it).
 *   5. Network / 5xx error → `{ status: "unknown", reason: "error" }`.
 *
 * These tests stub `fetch` directly so we never hit the real GitHub
 * API. Each case mirrors what the real endpoint returns according
 * to the v2022-11-28 docs.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBranchProtection } from "../../../src/lib/github/fetchBranchProtection";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockResponse(status: number, body: unknown): Response {
  return new Response(
    body === undefined ? null : JSON.stringify(body),
    {
      status,
      headers: { "content-type": "application/json" },
    },
  );
}

describe("fetchBranchProtection", () => {
  it("returns `observed` with parsed fields when the endpoint succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(200, {
        required_pull_request_reviews: {
          required_approving_review_count: 2,
        },
        required_status_checks: { strict: true },
        enforce_admins: { enabled: true },
        required_linear_history: { enabled: false },
        allow_force_pushes: { enabled: false },
        allow_deletions: { enabled: false },
      }),
    );
    const out = await fetchBranchProtection("octocat", "hello", "main");
    expect(out).toEqual({
      status: "observed",
      branch: "main",
      requiredReviews: 2,
      requiredStatusChecks: true,
      enforceAdmins: true,
      requireLinearHistory: false,
      allowForcePushes: false,
      allowDeletions: false,
    });
  });

  it("normalises bare-boolean `enforce_admins` to the right shape", async () => {
    // Some legacy responses send `enforce_admins: true` instead of
    // `{ enabled: true }`. Our `readBoolean` helper normalises both.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(200, {
        enforce_admins: true,
        allow_force_pushes: false,
      }),
    );
    const out = await fetchBranchProtection("octocat", "hello", "main");
    if (out.status !== "observed") throw new Error("expected observed");
    expect(out.enforceAdmins).toBe(true);
    expect(out.allowForcePushes).toBe(false);
  });

  it("maps 404 to `unknown` with `not-set` reason", async () => {
    // The most-frequent outcome: a regular-PAT (or unauthenticated)
    // audit can't read protection, so 404 collapses to unknown.
    // Astraudit deliberately doesn't try to distinguish "no
    // protection configured" from "caller can't read protection" —
    // both look identical from the public surface.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(404, { message: "Branch not protected" }),
    );
    const out = await fetchBranchProtection("octocat", "hello", "main");
    expect(out).toEqual({
      status: "unknown",
      branch: "main",
      reason: "not-set",
    });
  });

  it("maps 403 (non-rate-limit) to `unknown` with `gated` reason", async () => {
    // A 403 that isn't `x-ratelimit-remaining: 0` means the caller's
    // token lacks the scope to read protection. We surface this as
    // `gated` so a downstream UI can distinguish "no protection
    // visible" from "we couldn't ask".
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Resource not accessible" }), {
        status: 403,
        headers: {
          "content-type": "application/json",
          // remaining > 0 → not a rate-limit
          "x-ratelimit-remaining": "60",
        },
      }),
    );
    const out = await fetchBranchProtection("octocat", "hello", "main");
    expect(out).toEqual({
      status: "unknown",
      branch: "main",
      reason: "gated",
    });
  });

  it("never throws on a network failure — degrades to `unknown` / `error`", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("network failure"),
    );
    const out = await fetchBranchProtection("octocat", "hello", "main");
    expect(out.status).toBe("unknown");
    if (out.status === "unknown") {
      expect(out.reason).toBe("error");
      expect(out.branch).toBe("main");
    }
  });

  it("encodes slash-bearing branch names safely (`releases/v1`)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockResponse(200, {}));
    await fetchBranchProtection("octocat", "hello", "releases/v1");
    const url = String(fetchSpy.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("/branches/releases%2Fv1/protection");
  });
});
