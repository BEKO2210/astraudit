/**
 * Leaderboard search query layer — Roadmap M6.1.
 *
 * Wraps GitHub's `/search/repositories` endpoint with the narrow
 * surface the leaderboard needs: a typed filter, a stable sort
 * (stars descending), and per-page pagination capped at the API's
 * 100/page limit and 1000-result hard ceiling.
 *
 * Design constraints
 * - Pure data layer; no DOM, no React. Used by the batch
 *   orchestrator (M6.2) and by tests directly.
 * - Errors are NEVER swallowed — the orchestrator drives the
 *   retry / backoff / abort strategy; this layer only does one
 *   request per call and rethrows GithubError / RateLimitError
 *   as-is.
 * - Search results carry the same RepoCoordinates shape the rest
 *   of the audit pipeline already consumes, so downstream code
 *   can feed each hit into `loadRepoBundle()` without translation.
 */

import { githubFetch, type ApiOptions } from "../github/githubClient";

/**
 * Leaderboard filter contract. Every field is optional — when none
 * are set the search returns the all-time top starred public repos.
 * Defaults are deliberately conservative (≥1k stars, sorted by
 * stars desc) so a casually-typed `#/leaderboard` URL doesn't dump
 * a torrent of tiny repos into the UI.
 */
export interface LeaderboardFilter {
  /** Primary language filter (`language:typescript`). */
  language?: string;
  /** A specific topic to require (`topic:cli`). */
  topic?: string;
  /** Minimum stargazer count. Defaults to 1000 when undefined. */
  minStars?: number;
  /**
   * Free-form `q=` fragment appended to the constructed query.
   * Power-user escape hatch — kept out of the typed surface so the
   * common cases stay strictly typed. Caller is responsible for
   * escaping spaces / quoting.
   */
  rawQuery?: string;
}

/** Single row in the search result. Mirrors the audit pipeline's coords. */
export interface SearchHit {
  /** `owner/name` — the canonical key used everywhere else. */
  fullName: string;
  owner: string;
  name: string;
  htmlUrl: string;
  description: string | null;
  stars: number;
  language: string | null;
  topics: string[];
  archived: boolean;
  /** The repository's primary default branch — needed by `loadRepoBundle`. */
  defaultBranch: string;
  /** ISO‑8601 — surfaced in the leaderboard column. */
  pushedAt: string;
}

export interface SearchPage {
  hits: SearchHit[];
  /** `total_count` as reported by GitHub (capped by the API at 1000 results). */
  totalCount: number;
  /** True when this page is the last one the API will return. */
  isLastPage: boolean;
}

const SEARCH_MAX_PER_PAGE = 100;
const SEARCH_MAX_RESULTS = 1000;
const DEFAULT_MIN_STARS = 1000;

/**
 * Build the `q=` string for `/search/repositories`. Exported for
 * unit tests + so the orchestrator can fingerprint snapshots by
 * the exact query that produced them.
 */
export function buildSearchQuery(filter: LeaderboardFilter): string {
  const parts: string[] = [];
  const minStars = filter.minStars ?? DEFAULT_MIN_STARS;
  parts.push(`stars:>=${minStars}`);
  if (filter.language) {
    // Language strings often contain spaces (e.g. "Common Lisp") — wrap
    // in quotes so the API parses it as one token.
    parts.push(`language:"${filter.language}"`);
  }
  if (filter.topic) {
    parts.push(`topic:${filter.topic}`);
  }
  // Excluding archived defaults make for a more useful leaderboard;
  // a power-user `rawQuery: "archived:true"` still flips it back.
  parts.push("archived:false");
  if (filter.rawQuery) parts.push(filter.rawQuery);
  return parts.join(" ");
}

interface SearchApiItem {
  full_name: string;
  owner: { login: string };
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  topics?: string[];
  archived: boolean;
  default_branch: string;
  pushed_at: string;
}

interface SearchApiResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchApiItem[];
}

function toHit(item: SearchApiItem): SearchHit {
  return {
    fullName: item.full_name,
    owner: item.owner.login,
    name: item.name,
    htmlUrl: item.html_url,
    description: item.description,
    stars: item.stargazers_count,
    language: item.language,
    topics: item.topics ?? [],
    archived: item.archived,
    defaultBranch: item.default_branch,
    pushedAt: item.pushed_at,
  };
}

export interface SearchPageOptions {
  /** 1‑indexed page number; API caps the product `perPage * page` at 1000. */
  page?: number;
  /** Results per page; clamped to GitHub's 100/page hard cap. */
  perPage?: number;
  signal?: AbortSignal;
  tokenOverride?: string;
}

/**
 * Run one page of the leaderboard search. Returns the parsed hits
 * + pagination hints. Throws RateLimitError / NotFoundError /
 * GithubError on failure — callers (M6.2 orchestrator) decide the
 * retry strategy.
 */
export async function searchTopRepos(
  filter: LeaderboardFilter,
  options: SearchPageOptions = {},
): Promise<SearchPage> {
  const page = Math.max(1, options.page ?? 1);
  const perPage = Math.min(
    SEARCH_MAX_PER_PAGE,
    Math.max(1, options.perPage ?? SEARCH_MAX_PER_PAGE),
  );
  const q = buildSearchQuery(filter);

  // GitHub silently caps `(page - 1) * per_page + per_page` at 1000.
  // Pre-empting that here lets the orchestrator stop pagination
  // without a wasted request that would return an empty `items`.
  const isLastPage = page * perPage >= SEARCH_MAX_RESULTS;

  const url =
    `/search/repositories?q=${encodeURIComponent(q)}` +
    `&sort=stars&order=desc&per_page=${perPage}&page=${page}`;
  const apiOptions: ApiOptions = {
    signal: options.signal,
    tokenOverride: options.tokenOverride,
  };
  const response = await githubFetch<SearchApiResponse>(url, apiOptions);
  return {
    hits: response.items.map(toHit),
    totalCount: response.total_count,
    isLastPage: isLastPage || response.items.length < perPage,
  };
}

/**
 * Drain the search across pages until we've collected `limit`
 * hits (or run out). Intended for the simplest leaderboard
 * snapshot path; the M6.2 orchestrator may instead stream pages
 * to the UI as they arrive.
 */
export async function collectTopRepos(
  filter: LeaderboardFilter,
  limit: number,
  options: Omit<SearchPageOptions, "page" | "perPage"> = {},
): Promise<SearchHit[]> {
  const perPage = Math.min(SEARCH_MAX_PER_PAGE, limit);
  const out: SearchHit[] = [];
  let page = 1;
  while (out.length < limit) {
    const result = await searchTopRepos(filter, {
      ...options,
      page,
      perPage,
    });
    for (const hit of result.hits) {
      if (out.length >= limit) break;
      out.push(hit);
    }
    if (result.isLastPage || result.hits.length === 0) break;
    page += 1;
  }
  return out;
}

export const __test = { DEFAULT_MIN_STARS, SEARCH_MAX_PER_PAGE, SEARCH_MAX_RESULTS };
