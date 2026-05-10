/**
 * Single source of truth for "GitHub call blew up → what do we show
 * the user?" Replaces two near-identical 4-arm if-else ladders that
 * lived in `App.tsx` (one for the main audit, one for compare mode).
 *
 * Why centralize:
 *   1. Both call sites used to drift independently (the compare path
 *      forgot to handle TooLargeError; the main path used different
 *      titles than the compare path for the same underlying error).
 *   2. Every error needs a *recovery affordance*, not just a title.
 *      The previous ErrorState always offered "Try a different
 *      repository" — wrong for rate-limit (the right answer is "add
 *      a token") and for transient network failures (the right answer
 *      is "retry the same input"). Encoding the per-kind CTA next to
 *      the error mapping keeps the two from drifting.
 *   3. Rate-limit messaging needs the reset countdown, which only
 *      makes sense if computed at render time. We surface the raw
 *      `resetAtSeconds` in the view so the renderer can format it
 *      against the wall clock.
 */
import {
  GithubError,
  NotFoundError,
  RateLimitError,
  TooLargeError,
} from "./githubClient";

export type AuditErrorKind =
  | "rate-limit"
  | "rate-limit-anon"
  | "not-found"
  | "too-large"
  | "github"
  | "network"
  | "empty"
  | "abort"
  | "unknown";

export interface AuditErrorAction {
  kind: "open-settings" | "retry" | "reset" | "dismiss";
  label: string;
}

export interface AuditErrorView {
  kind: AuditErrorKind;
  title: string;
  message: string;
  /** Button labels + intents the renderer should surface. The order
   *  matters — index 0 is the primary action, the rest are
   *  secondaries. The renderer maps the kind to a real handler. */
  actions: AuditErrorAction[];
  /** UNIX seconds at which the GitHub rate-limit window resets.
   *  Only set for rate-limit errors that carried the reset header.
   *  Renderers compute "resets in X min" against `Date.now()`. */
  resetAtSeconds?: number | null;
  /** Was the request was sent without an authentication token?
   *  Lets the rate-limit copy say "add a token" vs "wait it out". */
  unauthenticated?: boolean;
}

export function mapAuditError(err: unknown): AuditErrorView {
  // AbortError is a control-flow signal, not a user-facing error.
  // Callers should usually short-circuit before reaching here, but we
  // keep a dignified mapping so an accidental render doesn't yell at
  // the user about "AbortError".
  if (err && (err as Error).name === "AbortError") {
    return {
      kind: "abort",
      title: "Audit cancelled",
      message: "The audit was cancelled before it finished.",
      actions: [{ kind: "reset", label: "Start over" }],
    };
  }

  if (err instanceof RateLimitError) {
    if (err.unauthenticated) {
      return {
        kind: "rate-limit-anon",
        title: "GitHub rate limit reached",
        message:
          "Anonymous requests are capped at 60/hour. Add a personal access token in Settings to bump this to 5,000/hour — Astraudit stores tokens in your browser only and never transmits them.",
        actions: [
          { kind: "open-settings", label: "Open Settings" },
          { kind: "retry", label: "Retry" },
        ],
        resetAtSeconds: err.resetAtSeconds,
        unauthenticated: true,
      };
    }
    return {
      kind: "rate-limit",
      title: "GitHub rate limit reached",
      message:
        "Your authenticated quota is exhausted. The window will reset shortly — retry then.",
      actions: [
        { kind: "retry", label: "Retry" },
        { kind: "open-settings", label: "Open Settings" },
      ],
      resetAtSeconds: err.resetAtSeconds,
      unauthenticated: false,
    };
  }

  if (err instanceof NotFoundError) {
    return {
      kind: "not-found",
      title: "Repository not found",
      message:
        "Astraudit could not find this repository. Check the spelling, or confirm it is public — private repositories aren't supported.",
      actions: [{ kind: "reset", label: "Try a different repository" }],
    };
  }

  if (err instanceof TooLargeError) {
    return {
      kind: "too-large",
      title: "Repository too large",
      message:
        "The repository's file tree exceeds the browser-only audit budget. Try a smaller repo, or run a partial audit on a sub-folder via fork.",
      actions: [{ kind: "reset", label: "Try a different repository" }],
    };
  }

  if (err instanceof GithubError) {
    const transient = err.status >= 500 || err.status === 0;
    return {
      kind: "github",
      title: transient ? "GitHub is having a moment" : "GitHub error",
      message: err.message,
      actions: transient
        ? [
            { kind: "retry", label: "Retry" },
            { kind: "reset", label: "Try a different repository" },
          ]
        : [{ kind: "reset", label: "Try a different repository" }],
    };
  }

  // Generic fall-through. We retry-by-default because most "Unknown
  // failure"s are transient (DNS hiccup, browser put the tab to
  // sleep, etc.) and a retry is cheap.
  const message = (err as Error)?.message ?? "Unknown failure.";
  return {
    kind: "network",
    title: "Network error",
    message,
    actions: [
      { kind: "retry", label: "Retry" },
      { kind: "reset", label: "Try a different repository" },
    ],
  };
}

/**
 * Map an "empty repository" branch (no tree entries) to the same
 * view shape so the renderer can reuse one component instead of
 * branching per error source.
 */
export function emptyRepoView(): AuditErrorView {
  return {
    kind: "empty",
    title: "Empty repository",
    message:
      "Astraudit couldn't find any analyzable files in this repository.",
    actions: [{ kind: "reset", label: "Try a different repository" }],
  };
}

/**
 * Format `resetAtSeconds` against the wall clock as a humane "in X
 * min" / "in X sec" string. Returns null if the timestamp is in the
 * past or absent — the renderer uses null to suppress the countdown
 * line entirely instead of saying "in 0 sec".
 */
export function formatResetCountdown(
  resetAtSeconds: number | null | undefined,
  nowMs: number = Date.now(),
): string | null {
  if (!resetAtSeconds || !Number.isFinite(resetAtSeconds)) return null;
  const deltaSec = resetAtSeconds - Math.floor(nowMs / 1000);
  if (deltaSec <= 0) return null;
  if (deltaSec < 60) return `Resets in ${deltaSec} sec`;
  const minutes = Math.ceil(deltaSec / 60);
  return `Resets in ${minutes} min`;
}
