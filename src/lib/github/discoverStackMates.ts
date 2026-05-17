/**
 * Stack‑mate discovery — Roadmap M4.1.
 *
 * Given a base repo's signal (primary language, topics, star tier),
 * fetch a small ranked list of "similar" public repos via GitHub's
 * Search API. The compare UI (later slice of M4.1) wires these into
 * a one‑click "audit a stack‑mate alongside this repo" affordance.
 *
 * Why a separate module instead of folding it into the audit
 * engine: discovery is *exploration*, the audit is *verdict*. They
 * are unrelated code paths that happen to share fetcher plumbing.
 * Keeping them apart means a future caller (extension, CLI, MCP
 * client) can use one without paying for the other.
 *
 * Anti‑goals (deliberately not implemented):
 *   - No "what should I depend on" recommendations. We surface
 *     candidates, never opinions.
 *   - No silent ranking that excludes a repo for opaque reasons —
 *     every result carries its `reasons[]` array.
 *   - No fork detection beyond GitHub's own `fork` flag. The signal
 *     is honest about that.
 */

import { githubFetch } from "./githubClient";

/**
 * The base‑repo signal that drives the discovery query. Callers
 * typically derive this from a `RepoMetadata`, but the function
 * accepts the plain shape so unit tests + non‑audit callers don't
 * have to fabricate a full metadata record.
 */
export interface StackMateBase {
  /** `owner/repo` — used to exclude self from results. */
  fullName: string;
  /** Primary language from GitHub's linguist; null if unknown. */
  language: string | null;
  /** Topic labels the repo declares. */
  topics: string[];
  /** Star count — drives the "similar star tier" filter. */
  stars: number;
}

export interface StackMate {
  fullName: string;
  htmlUrl: string;
  description: string | null;
  stars: number;
  language: string | null;
  topics: string[];
  /** 0–1 similarity score, deterministic given the inputs. */
  similarity: number;
  /** Human‑readable bullet list explaining the ranking. */
  reasons: string[];
}

export interface DiscoverOptions {
  /** Maximum candidates to return after ranking. Default 5. */
  limit?: number;
  signal?: AbortSignal;
  tokenOverride?: string | null;
  /**
   * Optional injection point for tests. When provided, replaces
   * the real `githubFetch` call. Keeps the production code path
   * the same.
   */
  fetcher?: (path: string) => Promise<RawSearchResponse>;
}

/**
 * Subset of GitHub's `/search/repositories` response that we
 * actually use. Keeping it minimal isolates this module from
 * upstream field additions.
 */
interface RawSearchItem {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  fork: boolean;
  archived: boolean;
}
interface RawSearchResponse {
  total_count: number;
  items: RawSearchItem[];
}

/**
 * Star‑tier window — candidates with stars in `[base/3, base*3]`
 * land in the search query, ensuring we don't drown a hobby repo
 * in Kubernetes‑class neighbours or vice versa. Clamps protect the
 * boundary cases (a zero‑star base or a single‑star base produces
 * a sensible `1..3` window).
 */
function starTierWindow(stars: number): { min: number; max: number } {
  const safe = Math.max(1, stars);
  const min = Math.max(1, Math.floor(safe / 3));
  const max = Math.max(min + 1, Math.ceil(safe * 3));
  return { min, max };
}

/**
 * GitHub Search has a 256‑character query limit. We never approach
 * it (a 4‑topic query maxes out around 120), but the topic count
 * still gets capped at 4 so the query stays readable in logs.
 */
const MAX_TOPICS_IN_QUERY = 4;

export function buildSearchQuery(base: StackMateBase): string {
  const parts: string[] = [];
  if (base.language) {
    // GitHub Search accepts `language:"Go"` for multi‑word names —
    // safer to always quote even single‑word ones.
    parts.push(`language:${JSON.stringify(base.language)}`);
  }
  if (base.topics.length > 0) {
    const top = base.topics.slice(0, MAX_TOPICS_IN_QUERY);
    // OR over the topics: more matches = higher recall, the
    // post‑fetch ranker handles precision.
    const expr = top.map((t) => `topic:${t}`).join(" OR ");
    parts.push(`(${expr})`);
  }
  const { min, max } = starTierWindow(base.stars);
  parts.push(`stars:${min}..${max}`);
  parts.push("archived:false");
  parts.push("fork:false");
  parts.push(`-repo:${base.fullName}`);
  return parts.join(" ");
}

/**
 * Compute the similarity score + the reasons that drove it. Kept
 * pure so the unit test asserts numeric stability + the audit UI
 * can re‑render the reasons without re‑fetching.
 */
export function rankCandidate(
  base: StackMateBase,
  cand: RawSearchItem,
): { similarity: number; reasons: string[] } {
  const reasons: string[] = [];

  // Language match — the biggest signal. A polyglot repo without a
  // primary language gets credit only if neither side has one.
  let langScore = 0;
  if (base.language && cand.language === base.language) {
    langScore = 0.5;
    reasons.push(`Same primary language (${base.language})`);
  } else if (!base.language && !cand.language) {
    langScore = 0.2;
    reasons.push("Both repos have no primary language");
  }

  // Topic overlap — Jaccard index over the topic sets.
  let topicScore = 0;
  const candTopics = cand.topics ?? [];
  if (base.topics.length + candTopics.length > 0) {
    const baseSet = new Set(base.topics.map((t) => t.toLowerCase()));
    const candSet = new Set(candTopics.map((t) => t.toLowerCase()));
    const overlap = [...baseSet].filter((t) => candSet.has(t));
    const union = new Set<string>([...baseSet, ...candSet]);
    if (overlap.length > 0) {
      const jaccard = overlap.length / union.size;
      topicScore = 0.4 * jaccard;
      reasons.push(
        `Shares ${overlap.length} topic${overlap.length === 1 ? "" : "s"} (${overlap.slice(0, 3).join(", ")})`,
      );
    }
  }

  const baseScore = langScore + topicScore;

  // Star‑tier closeness is a *modifier*, not a primary signal: a
  // Rails repo at 50 K stars isn't a stack‑mate of a Vite repo at
  // 70 K just because both are popular. Only add the star bonus
  // when we already have a language or topic match — otherwise the
  // ranker would surface unrelated repos with similar star counts.
  let starBonus = 0;
  if (baseScore > 0 && base.stars > 0 && cand.stargazers_count > 0) {
    const ratio = Math.abs(
      Math.log10(cand.stargazers_count) - Math.log10(base.stars),
    );
    const closeness = Math.max(0, 1 - ratio / 1.0); // 1 decade away → 0
    starBonus = 0.1 * closeness;
    if (closeness > 0.5) {
      reasons.push("Similar star tier");
    }
  }

  return {
    similarity: Math.min(1, Math.max(0, baseScore + starBonus)),
    reasons,
  };
}

/**
 * Filter out results the caller almost certainly didn't want:
 *   - self (already excluded from the query, but defensive)
 *   - archived (already excluded; defensive)
 *   - forks (already excluded; defensive)
 *
 * Defensive duplication is cheap and keeps a future query‑syntax
 * tweak from accidentally surfacing junk.
 */
function isCandidateUsable(
  base: StackMateBase,
  item: RawSearchItem,
): boolean {
  if (item.full_name.toLowerCase() === base.fullName.toLowerCase()) return false;
  if (item.archived) return false;
  if (item.fork) return false;
  return true;
}

export async function discoverStackMates(
  base: StackMateBase,
  options: DiscoverOptions = {},
): Promise<StackMate[]> {
  const limit = options.limit ?? 5;
  const query = buildSearchQuery(base);
  // `per_page=30` gives the ranker a pool to choose from without
  // costing a second page of API calls. GitHub Search rate limit
  // is 30 req/min unauthenticated, much higher with a token.
  const path =
    `/search/repositories?per_page=30&sort=stars&order=desc&q=` +
    encodeURIComponent(query);

  const raw = options.fetcher
    ? await options.fetcher(path)
    : await githubFetch<RawSearchResponse>(path, {
        signal: options.signal,
        tokenOverride: options.tokenOverride,
      });

  const ranked: StackMate[] = [];
  for (const item of raw.items) {
    if (!isCandidateUsable(base, item)) continue;
    const { similarity, reasons } = rankCandidate(base, item);
    // A zero‑similarity result has nothing to say — drop it rather
    // than padding the list.
    if (similarity <= 0) continue;
    ranked.push({
      fullName: item.full_name,
      htmlUrl: item.html_url,
      description: item.description,
      stars: item.stargazers_count,
      language: item.language,
      topics: item.topics ?? [],
      similarity,
      reasons,
    });
  }

  ranked.sort((a, b) => b.similarity - a.similarity);
  return ranked.slice(0, limit);
}
