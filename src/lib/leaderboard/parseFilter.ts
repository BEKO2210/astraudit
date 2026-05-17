/**
 * Leaderboard filter parser — Roadmap M6.1.
 *
 * Reads filter tokens from the URL search component (the same
 * place `?rules=` lives for the rule packs) and turns them into
 * a typed `LeaderboardFilter`. Unknown tokens are silently
 * dropped so a typo never crashes the leaderboard view.
 *
 * Supported tokens:
 *   ?lang=typescript        → filter.language = "typescript"
 *   ?topic=cli              → filter.topic = "cli"
 *   ?minStars=5000          → filter.minStars = 5000
 *   ?q=stars:>10000+web     → filter.rawQuery passthrough
 *
 * All four are optional; an empty search string yields a default
 * filter (≥1000 stars, no language/topic) — the "top 100 starred
 * public repos" homepage of the leaderboard.
 */

import type { LeaderboardFilter } from "./searchRepos";

/**
 * Pure parser over a search-params-shaped input. Accepts strings,
 * URLSearchParams instances, or null/undefined so callers don't
 * have to special-case the absence of a query string.
 */
export function parseLeaderboardFilter(
  search: URLSearchParams | string | null | undefined,
): LeaderboardFilter {
  if (search == null) return {};
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const out: LeaderboardFilter = {};

  const lang = params.get("lang")?.trim();
  if (lang) out.language = lang;

  const topic = params.get("topic")?.trim().toLowerCase();
  if (topic) out.topic = topic;

  const minStarsRaw = params.get("minStars");
  if (minStarsRaw) {
    const n = Number(minStarsRaw);
    if (Number.isFinite(n) && n >= 0) {
      out.minStars = Math.floor(n);
    }
  }

  const rawQuery = params.get("q")?.trim();
  if (rawQuery) out.rawQuery = rawQuery;

  return out;
}

/**
 * Read the current location's search params and parse them. Safe
 * to call during SSR / tests — falls back to the empty filter
 * when `window` is undefined.
 */
export function readLeaderboardFilter(): LeaderboardFilter {
  if (typeof window === "undefined") return {};
  return parseLeaderboardFilter(window.location.search);
}

/**
 * Serialise a filter back into a query-string fragment (without
 * the leading `?`). Returns `null` when every field is empty so
 * callers can omit the search component entirely.
 *
 * Round-trip stable with `parseLeaderboardFilter` — feeding the
 * serialised value back yields the same filter object.
 */
export function serialiseLeaderboardFilter(
  filter: LeaderboardFilter,
): string | null {
  const params = new URLSearchParams();
  if (filter.language) params.set("lang", filter.language);
  if (filter.topic) params.set("topic", filter.topic);
  if (filter.minStars != null) params.set("minStars", String(filter.minStars));
  if (filter.rawQuery) params.set("q", filter.rawQuery);
  const out = params.toString();
  return out.length > 0 ? out : null;
}
