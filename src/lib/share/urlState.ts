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
  | {
      kind: "audit";
      coords: RepoCoordinates;
      /**
       * Roadmap M4.4 — optional finding ID to scroll/focus on
       * page load. Comes from `?focus=<id>` after the repo
       * coordinates, e.g. `#/audit/owner/repo?focus=sec-no-license`.
       */
      focus?: string;
    }
  | { kind: "compare"; left: RepoCoordinates; right: RepoCoordinates };

/**
 * Split the part of the hash AFTER the prefix into the repo coords
 * portion and the query-style suffix that may contain `?focus=…`.
 * Hash payloads use `?` as a URLSearchParams delimiter even though
 * the whole thing lives inside the fragment.
 */
function splitCoordsAndQuery(rest: string): {
  coordsRaw: string;
  query: URLSearchParams;
} {
  const qIdx = rest.indexOf("?");
  if (qIdx === -1) {
    return { coordsRaw: rest, query: new URLSearchParams() };
  }
  return {
    coordsRaw: rest.slice(0, qIdx),
    query: new URLSearchParams(rest.slice(qIdx + 1)),
  };
}

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
    const { coordsRaw, query } = splitCoordsAndQuery(rest);
    const parsed = parseRepoInput(coordsRaw);
    if (!parsed.ok || !parsed.coords) return null;
    const focus = query.get("focus");
    return focus
      ? { kind: "audit", coords: parsed.coords, focus }
      : { kind: "audit", coords: parsed.coords };
  }

  return null;
}

/** Build the hash fragment for a given audit, optionally with a focus target. */
export function formatShareHash(
  coords: RepoCoordinates,
  options: { focus?: string | null } = {},
): string {
  const base = `${AUDIT_PREFIX}${coords.owner}/${coords.repo}`;
  if (options.focus) {
    return `${base}?focus=${encodeURIComponent(options.focus)}`;
  }
  return base;
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
 * Roadmap M4.4 — accepts an optional `focus` to mint a deep link
 * straight to a single finding.
 */
export function formatShareUrl(
  coords: RepoCoordinates,
  base?: string,
  options: { focus?: string | null } = {},
): string {
  const origin =
    base ??
    (typeof window !== "undefined" && window.location
      ? `${window.location.origin}${window.location.pathname}${window.location.search}`
      : "https://astraudit.example/");
  const url = new URL(origin);
  url.hash = formatShareHash(coords, { focus: options.focus });
  return url.toString();
}

/**
 * Roadmap M4.4 — canonical DOM id format for a finding card. Used
 * by the deep-link consumer (App.tsx scrollIntoView) and the deep-
 * link producer (FindingCard's "copy link" affordance) so the
 * format never drifts between writer and reader.
 */
export function findingElementId(findingId: string): string {
  return `finding-${findingId}`;
}

/**
 * Push or replace the audit hash in the URL bar without scrolling. Use
 * push=true on a fresh submit (so the back button returns to the empty
 * state); replace=true when the hash should reflect a re-derive of the
 * existing state (cache hit, hashchange handler).
 */
export function applyAuditHash(
  coords: RepoCoordinates,
  options: { push?: boolean; focus?: string | null } = {},
): void {
  if (typeof window === "undefined") return;
  const hash = formatShareHash(coords, { focus: options.focus });
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
