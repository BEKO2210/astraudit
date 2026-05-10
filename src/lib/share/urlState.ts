/**
 * URL-hash state for shareable audit links.
 *
 * Pure client-side, zero backend. The hash is the only source of
 * cross-session state — copy/paste a URL with `#/audit/owner/repo` and
 * a fresh page load will reproduce the same audit. We deliberately
 * encode only the repo coordinates, NOT the audit result, so
 * audit-rule improvements apply on every visit.
 */

import type { RepoCoordinates } from "../../types/github";
import { parseRepoInput } from "../github/parseRepoInput";

const AUDIT_PREFIX = "#/audit/";
const COMPARE_PREFIX = "#/compare/";

export type ParsedHash =
  | { kind: "audit"; coords: RepoCoordinates }
  | { kind: "compare"; left: RepoCoordinates; right: RepoCoordinates };

/** Parse `#/audit/...` or `#/compare/...+.../...` into a structured route. */
export function parseShareHash(hash: string | null | undefined): ParsedHash | null {
  if (!hash) return null;

  if (hash.startsWith(COMPARE_PREFIX)) {
    const rest = hash.slice(COMPARE_PREFIX.length);
    const idx = rest.indexOf("+");
    if (idx <= 0 || idx === rest.length - 1) return null;
    const leftRaw = rest.slice(0, idx);
    const rightRaw = rest.slice(idx + 1);
    const a = parseRepoInput(leftRaw);
    const b = parseRepoInput(rightRaw);
    if (!a.ok || !a.coords || !b.ok || !b.coords) return null;
    return { kind: "compare", left: a.coords, right: b.coords };
  }

  if (hash.startsWith(AUDIT_PREFIX)) {
    const rest = hash.slice(AUDIT_PREFIX.length);
    if (!rest) return null;
    const parsed = parseRepoInput(rest);
    if (!parsed.ok || !parsed.coords) return null;
    return { kind: "audit", coords: parsed.coords };
  }

  return null;
}

/** Build the hash fragment for a given audit. */
export function formatShareHash(coords: RepoCoordinates): string {
  return `${AUDIT_PREFIX}${coords.owner}/${coords.repo}`;
}

/** Build the hash fragment for a side-by-side comparison. */
export function formatCompareHash(
  left: RepoCoordinates,
  right: RepoCoordinates,
): string {
  return `${COMPARE_PREFIX}${left.owner}/${left.repo}+${right.owner}/${right.repo}`;
}

/**
 * Build a fully-qualified URL the user can paste anywhere. Falls back
 * to a placeholder origin when called server-side (e.g. in unit tests).
 */
export function formatShareUrl(
  coords: RepoCoordinates,
  base?: string,
): string {
  const origin =
    base ??
    (typeof window !== "undefined" && window.location
      ? `${window.location.origin}${window.location.pathname}${window.location.search}`
      : "https://astraudit.example/");
  const url = new URL(origin);
  url.hash = formatShareHash(coords);
  return url.toString();
}

/**
 * Push or replace the audit hash in the URL bar without scrolling. Use
 * push=true on a fresh submit (so the back button returns to the empty
 * state); replace=true when the hash should reflect a re-derive of the
 * existing state (cache hit, hashchange handler).
 */
export function applyAuditHash(
  coords: RepoCoordinates,
  options: { push?: boolean } = {},
): void {
  if (typeof window === "undefined") return;
  const hash = formatShareHash(coords);
  if (window.location.hash === hash) return;
  const target = `${window.location.pathname}${window.location.search}${hash}`;
  if (options.push) {
    window.history.pushState(null, "", target);
  } else {
    window.history.replaceState(null, "", target);
  }
}

/** Clear the audit hash without affecting the search part of the URL. */
export function clearAuditHash(options: { push?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  if (!window.location.hash) return;
  if (
    !window.location.hash.startsWith(AUDIT_PREFIX) &&
    !window.location.hash.startsWith(COMPARE_PREFIX)
  )
    return;
  const target = `${window.location.pathname}${window.location.search}`;
  if (options.push) {
    window.history.pushState(null, "", target);
  } else {
    window.history.replaceState(null, "", target);
  }
}

/** Push or replace the compare hash. */
export function applyCompareHash(
  left: RepoCoordinates,
  right: RepoCoordinates,
  options: { push?: boolean } = {},
): void {
  if (typeof window === "undefined") return;
  const hash = formatCompareHash(left, right);
  if (window.location.hash === hash) return;
  const target = `${window.location.pathname}${window.location.search}${hash}`;
  if (options.push) {
    window.history.pushState(null, "", target);
  } else {
    window.history.replaceState(null, "", target);
  }
}
