/**
 * Parse the `?rules=` URL flag — Roadmap Monat 5.
 *
 * Accepts a query string (or a full URL search component) and
 * extracts the set of opt‑in rule packs the visitor wants enabled.
 * Unknown / mistyped tokens are silently dropped so a typo never
 * crashes the audit — the active set is always a subset of the
 * canonical `RULE_PACK_IDS`.
 *
 * Examples (assume known ids = a11y, i18n, ts, monorepo):
 *   "?rules=a11y,i18n"   → { a11y, i18n }
 *   "?rules=ts"          → { ts }
 *   "?rules=a11y%2Cts"   → { a11y, ts }   (URL‑encoded comma)
 *   "?rules="            → ∅
 *   ""                   → ∅
 *   "?rules=a11y,wat"    → { a11y }       (wat dropped silently)
 */

import { NO_PACKS, RULE_PACK_IDS, type EnabledPacks, type RulePackId } from "./types";

const KNOWN: ReadonlySet<RulePackId> = new Set(RULE_PACK_IDS);

function isKnown(token: string): token is RulePackId {
  return (KNOWN as ReadonlySet<string>).has(token);
}

/**
 * Read the active rule packs out of a `URLSearchParams`. Centralised
 * here so the parsing logic is unit‑testable without touching
 * `window.location`.
 */
export function parseRulePacksFromSearch(
  search: URLSearchParams | string | null | undefined,
): EnabledPacks {
  if (search == null) return NO_PACKS;
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const raw = params.get("rules");
  if (!raw) return NO_PACKS;
  const enabled = new Set<RulePackId>();
  for (const token of raw.split(",")) {
    const trimmed = token.trim().toLowerCase();
    if (trimmed && isKnown(trimmed)) {
      enabled.add(trimmed);
    }
  }
  return enabled;
}

/**
 * Convenience: read the active packs straight off the current
 * window location. Safe to call during SSR / tests — falls back to
 * the empty set when `window` is undefined.
 */
export function readEnabledPacks(): EnabledPacks {
  if (typeof window === "undefined") return NO_PACKS;
  return parseRulePacksFromSearch(window.location.search);
}

/**
 * Serialise the enabled packs back to a comma‑separated string, in
 * the canonical order defined by `RULE_PACK_IDS`. Used to mint
 * shareable URLs and to update the location bar after a settings
 * toggle (M5.5).
 *
 * Returns `null` when the set is empty so callers can omit the
 * `?rules=` param entirely rather than emitting an empty value.
 */
export function serialiseEnabledPacks(packs: EnabledPacks): string | null {
  if (packs.size === 0) return null;
  // Iterate in the canonical order so two equivalent sets always
  // produce identical strings (URL deduping, share-link stability).
  const ordered = RULE_PACK_IDS.filter((id) => packs.has(id));
  return ordered.join(",");
}
