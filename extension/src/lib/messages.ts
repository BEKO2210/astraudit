/**
 * Strict message contract between the content script (page world)
 * and the service worker (extension world). Content scripts can't
 * safely import the audit engine (CSP / isolated‑world reasons),
 * so all heavy lifting routes through the SW; this file is the
 * only thing both sides agree on.
 *
 * Keep it dependency‑free — both the content script bundle and
 * the SW bundle import it.
 */

export interface AuditRequest {
  type: "audit";
  owner: string;
  repo: string;
}

/**
 * Reason taxonomy for failure responses. Closed enum so the
 * content script can render a precise message per case (and so
 * downstream telemetry / analytics never depends on free-text
 * matching against an open string).
 */
export type AuditFailureReason =
  | "not-found"
  | "rate-limit"
  | "invalid-token"
  | "too-large"
  | "network"
  | "other";

export interface TopFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  category: string;
}

export type AuditResponse =
  | {
      ok: true;
      score: number;
      max: number;
      grade: string;
      verdict: string;
      topFindings: TopFinding[];
      auditUrl: string;
    }
  | {
      ok: false;
      reason: AuditFailureReason;
      message: string;
      /** Optional seconds-until-reset for rate-limit cases. */
      resetIn?: number | null;
    };
