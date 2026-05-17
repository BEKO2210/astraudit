/**
 * Astraudit MV3 service worker — Roadmap M3.2 (skeleton) + M3.3
 * (audit message handler).
 *
 * MV3 service workers are event-driven: the browser starts them on
 * an event, runs the handler, and tears the worker down again when
 * idle. We can't hold long-lived state in module scope — every
 * handler must assume cold start. The audit engine itself is pure
 * and re-import is cheap (the bundle inlines it), so cold starts
 * cost a one-off ~30 ms re-parse, not a re-fetch.
 *
 * Handlers:
 *   - chrome.runtime.onInstalled → install/update log
 *   - chrome.runtime.onStartup   → session-start log
 *   - chrome.action.onClicked    → open/focus single Astraudit tab
 *   - chrome.runtime.onMessage   → run an audit and reply
 *
 * The audit handler imports loadRepoBundle + runAudit from
 * src/audit-engine.ts (the M3.1 library entry) and packages the
 * result into the typed AuditResponse the content script renders.
 */

import { loadRepoBundle, runAudit } from "../../src/audit-engine";
import {
  GithubError,
  RateLimitError,
  NotFoundError,
  InvalidTokenError,
  TooLargeError,
} from "../../src/audit-engine";
import type {
  AuditRequest,
  AuditResponse,
  AuditFailureReason,
  TopFinding,
} from "./lib/messages";

const SITE_ORIGIN = "https://beko2210.github.io/astraudit/";

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[Astraudit] service worker installed:", details.reason);
});

chrome.runtime.onStartup?.addListener(() => {
  console.log("[Astraudit] browser session started");
});

chrome.action.onClicked.addListener(async () => {
  const existing = await chrome.tabs.query({ url: `${SITE_ORIGIN}*` });
  if (existing.length > 0 && existing[0].id != null) {
    await chrome.tabs.update(existing[0].id, { active: true });
    if (existing[0].windowId != null) {
      await chrome.windows.update(existing[0].windowId, { focused: true });
    }
    return;
  }
  await chrome.tabs.create({ url: SITE_ORIGIN });
});

// --- Audit message handler -----------------------------------------------

function classifyError(err: unknown): {
  reason: AuditFailureReason;
  message: string;
  resetIn?: number | null;
} {
  if (err instanceof RateLimitError) {
    const reset =
      err.resetAtSeconds != null
        ? Math.max(0, err.resetAtSeconds - Math.floor(Date.now() / 1000))
        : null;
    return {
      reason: "rate-limit",
      message: err.message,
      resetIn: reset,
    };
  }
  if (err instanceof NotFoundError) {
    return { reason: "not-found", message: err.message };
  }
  if (err instanceof InvalidTokenError) {
    return { reason: "invalid-token", message: err.message };
  }
  if (err instanceof TooLargeError) {
    return { reason: "too-large", message: err.message };
  }
  if (err instanceof GithubError) {
    return { reason: "other", message: err.message };
  }
  const fallback = (err as Error)?.message ?? "Unknown error";
  // Network errors carry a status of 0 from githubFetch; the message
  // already says so. We pick "network" if the message hints at it,
  // else "other".
  if (/network|connection|fetch/i.test(fallback)) {
    return { reason: "network", message: fallback };
  }
  return { reason: "other", message: fallback };
}

function pickTopFindings(findings: ReadonlyArray<{
  severity: TopFinding["severity"];
  title: string;
  category: string;
}>): TopFinding[] {
  // Severity rank: critical > high > medium > low > info. Within a
  // severity bucket, preserve detector order — the audit engine
  // already orders by category importance.
  const RANK: Record<TopFinding["severity"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  const ranked = [...findings].sort(
    (a, b) => RANK[a.severity] - RANK[b.severity],
  );
  return ranked.slice(0, 3).map((f) => ({
    severity: f.severity,
    title: f.title,
    category: f.category,
  }));
}

async function handleAudit(req: AuditRequest): Promise<AuditResponse> {
  try {
    const bundle = await loadRepoBundle({
      owner: req.owner,
      repo: req.repo,
    });
    const result = runAudit(bundle);
    return {
      ok: true,
      score: result.totalScore,
      max: result.maxScore,
      grade: result.grade,
      verdict: result.verdict,
      topFindings: pickTopFindings(result.findings),
      auditUrl: `${SITE_ORIGIN}#/audit/${req.owner}/${req.repo}`,
    };
  } catch (err) {
    const classified = classifyError(err);
    return { ok: false, ...classified };
  }
}

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) => {
    if (
      !message ||
      typeof message !== "object" ||
      (message as { type?: unknown }).type !== "audit"
    ) {
      return false;
    }
    const req = message as AuditRequest;
    if (typeof req.owner !== "string" || typeof req.repo !== "string") {
      sendResponse({
        ok: false,
        reason: "other",
        message: "Invalid audit request",
      } as AuditResponse);
      return false;
    }
    // Returning `true` from the listener tells Chrome to keep the
    // sendResponse channel open for an async reply.
    handleAudit(req)
      .then((res) => sendResponse(res))
      .catch((err) => {
        sendResponse({
          ok: false,
          reason: "other",
          message: (err as Error)?.message ?? "Audit handler crashed",
        } as AuditResponse);
      });
    return true;
  },
);

export {};
