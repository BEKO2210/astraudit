import { githubFetch, GithubError, NotFoundError } from "./githubClient";
import type { BranchProtectionSignals } from "../../types/github";

/**
 * Phase 7.0.3 — branch protection probe.
 *
 * The endpoint is `/repos/{owner}/{repo}/branches/{branch}/protection`.
 * It returns rich JSON when the caller has admin scope on the repo
 * AND protection is configured; 404 when either is missing.
 *
 * The audit runs unauthenticated by default (or with a visitor's
 * `public_repo` PAT, which is never an admin scope). So in practice
 * we expect 404 for nearly every audit, and the function returns the
 * `"unknown"` shape. That's the honest answer — see SCOPE.md and
 * ROADMAP.md § 7.0.3 for the contract.
 *
 * We deliberately do NOT swallow rate-limit errors here; if the
 * surrounding audit hit the rate limit, the higher-level fetchers
 * have already failed and `loadRepoBundle` will surface that. This
 * function only swallows the expected "I can't see this data" path.
 */
const RAW_PROTECTION_SHAPE_REQUIRED_REVIEWS = "required_pull_request_reviews";
const RAW_PROTECTION_SHAPE_STATUS_CHECKS = "required_status_checks";

interface RawProtection {
  enabled?: boolean;
  enforce_admins?: { enabled: boolean } | boolean;
  required_linear_history?: { enabled: boolean } | boolean;
  allow_force_pushes?: { enabled: boolean } | boolean;
  allow_deletions?: { enabled: boolean } | boolean;
  [RAW_PROTECTION_SHAPE_REQUIRED_REVIEWS]?: {
    required_approving_review_count?: number | null;
  };
  [RAW_PROTECTION_SHAPE_STATUS_CHECKS]?: { strict?: boolean } | null;
}

/** Normalise GitHub's `{ enabled: boolean } | boolean | undefined`
 *  shape to a plain boolean. The endpoint inconsistently wraps some
 *  fields and returns the bare boolean for others — historical API
 *  shape, documented but unevenly applied. */
function readBoolean(
  field: { enabled: boolean } | boolean | undefined,
): boolean {
  if (typeof field === "boolean") return field;
  if (field && typeof field === "object") return !!field.enabled;
  return false;
}

export async function fetchBranchProtection(
  owner: string,
  repo: string,
  branch: string,
  signal?: AbortSignal,
): Promise<BranchProtectionSignals> {
  // `branch` is a free-form ref name — `main`, `master`, `dev`, …
  // Encode it so a slash-bearing branch (`releases/v1`) reaches the
  // right endpoint. Other call-sites use plain interpolation, but
  // protection-probe branches are user-controlled enough to deserve
  // the safety belt.
  const safeBranch = encodeURIComponent(branch);
  try {
    const raw = await githubFetch<RawProtection>(
      `/repos/${owner}/${repo}/branches/${safeBranch}/protection`,
      { signal },
    );
    const reviews = raw[RAW_PROTECTION_SHAPE_REQUIRED_REVIEWS];
    const statusChecks = raw[RAW_PROTECTION_SHAPE_STATUS_CHECKS];
    return {
      status: "observed",
      branch,
      requiredReviews:
        reviews?.required_approving_review_count == null
          ? null
          : Math.max(0, Number(reviews.required_approving_review_count)),
      requiredStatusChecks: statusChecks != null,
      enforceAdmins: readBoolean(raw.enforce_admins),
      requireLinearHistory: readBoolean(raw.required_linear_history),
      allowForcePushes: readBoolean(raw.allow_force_pushes),
      allowDeletions: readBoolean(raw.allow_deletions),
    };
  } catch (err) {
    if (err instanceof NotFoundError) {
      // 404 == either "no protection configured" or "caller can't
      // read protection". From the public surface we can't tell;
      // the honest answer is `unknown`.
      return { status: "unknown", branch, reason: "not-set" };
    }
    if (err instanceof GithubError && err.status === 403) {
      // 403 typically means the caller's token lacks admin scope.
      // Distinguish from rate-limit (which is rethrown by the
      // higher-level audit pipeline already).
      return { status: "unknown", branch, reason: "gated" };
    }
    // Any other failure (network, 5xx, unexpected shape) — degrade
    // gracefully to `unknown` rather than crashing the audit. The
    // audit must work entirely client-side and survive transient
    // upstream errors. Rate-limit errors are intentionally not
    // matched here so they propagate up.
    if (err instanceof Error && err.name === "RateLimitError") {
      throw err;
    }
    return { status: "unknown", branch, reason: "error" };
  }
}
