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

export interface ParsedHash {
  coords: RepoCoordinates;
}

/** Parse `#/audit/owner/repo` (or its tail) into coordinates. */
export function parseShareHash(hash: string | null | undefined): ParsedHash | null {
  if (!hash) return null;
  if (!hash.startsWith(AUDIT_PREFIX)) return null;
  const rest = hash.slice(AUDIT_PREFIX.length);
  if (!rest) return null;
  const parsed = parseRepoInput(rest);
  if (!parsed.ok || !parsed.coords) return null;
  return { coords: parsed.coords };
}

/** Build the hash fragment for a given audit. */
export function formatShareHash(coords: RepoCoordinates): string {
  return `${AUDIT_PREFIX}${coords.owner}/${coords.repo}`;
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
  if (!window.location.hash.startsWith(AUDIT_PREFIX)) return;
  const target = `${window.location.pathname}${window.location.search}`;
  if (options.push) {
    window.history.pushState(null, "", target);
  } else {
    window.history.replaceState(null, "", target);
  }
}
