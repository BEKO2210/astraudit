/**
 * Phase 6.29 — Rate-limit end-to-end contract.
 *
 * Real-quota verification (drain the anon 60/h bucket and run the
 * dashboard against a real exhausted limit) lives in the maintainer's
 * pre-release manual smoke. This unit test locks the
 * transport-layer half of the same contract:
 *
 *   1. A `403` response with `x-ratelimit-remaining: 0` becomes a
 *      `RateLimitError`, NOT the generic `GithubError(403)` that
 *      would render "GitHub returned 403" copy.
 *   2. The error carries `resetAtSeconds` from the
 *      `x-ratelimit-reset` header so `ErrorState`'s countdown can
 *      tick.
 *   3. `unauthenticated` is `true` when no token is in scope —
 *      flipping the renderer to the "Open Settings" primary CTA
 *      instead of the "Retry" default.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GithubError,
  NotFoundError,
  RateLimitError,
  githubFetch,
} from "../../../src/lib/github/githubClient";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(
  status: number,
  body: object,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("githubFetch — rate-limit detection", () => {
  it("maps 403 + remaining=0 to RateLimitError with reset + unauthenticated", async () => {
    const reset = Math.floor(Date.now() / 1000) + 600;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(403, { message: "API rate limit exceeded" }, {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(reset),
      }),
    );

    let caught: unknown = null;
    try {
      await githubFetch<unknown>("/anything");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RateLimitError);
    expect((caught as RateLimitError).resetAtSeconds).toBe(reset);
    // In the unit-test environment there is no localStorage-backed
    // token, so the call is treated as unauthenticated.
    expect((caught as RateLimitError).unauthenticated).toBe(true);
  });

  it("maps 403 with remaining > 0 to a generic GithubError (not a rate-limit)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        403,
        { message: "Resource not accessible" },
        { "x-ratelimit-remaining": "59" },
      ),
    );
    let caught: unknown = null;
    try {
      await githubFetch<unknown>("/restricted");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(GithubError);
    expect(caught).not.toBeInstanceOf(RateLimitError);
    expect((caught as GithubError).status).toBe(403);
  });

  it("treats a 403 with no reset header as RateLimitError with null reset", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(403, { message: "rate limit" }, {
        "x-ratelimit-remaining": "0",
        // reset header deliberately absent
      }),
    );
    let caught: unknown = null;
    try {
      await githubFetch<unknown>("/anything");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RateLimitError);
    expect((caught as RateLimitError).resetAtSeconds).toBeNull();
  });

  it("maps 404 to NotFoundError (covers the share-URL-fuzz manual-test corner)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(404, { message: "Not Found" }),
    );
    let caught: unknown = null;
    try {
      await githubFetch<unknown>("/nope");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(NotFoundError);
  });
});
