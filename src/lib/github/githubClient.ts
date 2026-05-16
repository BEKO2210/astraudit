import { isGithubUrl, loadToken } from "../auth/tokenStore";

const GITHUB_API = "https://api.github.com";
const GITHUB_RAW = "https://raw.githubusercontent.com";

/**
 * Optional per-call token override. The browser path (SPA) leaves
 * this undefined and `loadToken()` reads from localStorage; the
 * Node path (CLI / MCP server) passes the token through `ApiOptions`
 * so each fetch carries the right credential without ever mutating
 * a process-global. See `bin/mcp-server.ts` for the consumer.
 */
function withAuthHeader(
  headers: Record<string, string>,
  url: string,
  tokenOverride?: string | null,
): Record<string, string> {
  if (!isGithubUrl(url)) return headers;
  const token = tokenOverride ?? loadToken();
  if (!token) return headers;
  if (headers.Authorization || headers.authorization) return headers;
  return { ...headers, Authorization: `Bearer ${token}` };
}

export class GithubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GithubError";
    this.status = status;
  }
}

export class RateLimitError extends GithubError {
  /**
   * UNIX seconds at which the rate-limit window resets. Captured from
   * GitHub's `x-ratelimit-reset` header so the UI can show a countdown
   * ("resets in 23 minutes") instead of just "try again later".
   * Null when the response didn't carry the header (some auth-failure
   * 403s don't).
   */
  resetAtSeconds: number | null;
  /** True when the request was sent without a token. Lets the UI
   *  recommend "Open Settings → add a PAT" specifically, instead of
   *  the unhelpful "wait for reset" message that authenticated users
   *  also get.  */
  unauthenticated: boolean;
  constructor(
    options: { resetAtSeconds?: number | null; unauthenticated?: boolean } = {},
  ) {
    super("GitHub API rate limit reached. Please try again later.", 403);
    this.name = "RateLimitError";
    this.resetAtSeconds = options.resetAtSeconds ?? null;
    this.unauthenticated = options.unauthenticated ?? false;
  }
}

export class NotFoundError extends GithubError {
  constructor() {
    super("Repository not found or not public.", 404);
    this.name = "NotFoundError";
  }
}

/**
 * Phase 7.x — 401-specific error. GitHub returns 401 when the
 * Authorization header is bad: revoked token, expired fine-grained
 * PAT, typo when pasting, or a token that lacks `public_repo` /
 * `Read public repositories`. The old generic "GitHub error - try
 * a different repository" copy was actively misleading on this path
 * — the issue is the credential, not the repo. We surface it as a
 * distinct kind so the UI can route the user to Settings instead.
 */
export class InvalidTokenError extends GithubError {
  /** True when no token was in scope when the 401 fired — almost
   *  never happens (public reads work unauthenticated), but a
   *  misconfigured proxy or a GitHub-side glitch can produce it.
   *  Drives a slightly different message ("GitHub rejected the
   *  unauthenticated request") vs the common case ("your stored
   *  GitHub PAT is invalid or expired"). */
  unauthenticated: boolean;
  constructor(options: { unauthenticated?: boolean } = {}) {
    super(
      options.unauthenticated
        ? "GitHub returned 401 even without a token in scope."
        : "Your stored GitHub PAT is invalid, expired, or was revoked.",
      401,
    );
    this.name = "InvalidTokenError";
    this.unauthenticated = options.unauthenticated ?? false;
  }
}

export class TooLargeError extends GithubError {
  constructor() {
    super("This repository is too large for a browser-only audit.", 413);
    this.name = "TooLargeError";
  }
}

export interface ApiOptions {
  acceptRaw?: boolean;
  signal?: AbortSignal;
  /**
   * Optional GitHub PAT to authenticate this specific request.
   * When undefined the browser path falls back to `loadToken()`
   * (localStorage); the MCP / CLI paths pass the token explicitly
   * so concurrent invocations stay isolated.
   */
  tokenOverride?: string | null;
}

async function readBody(response: Response, raw: boolean): Promise<unknown> {
  if (raw) {
    return await response.text();
  }
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function githubFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
  const baseHeaders: Record<string, string> = {
    Accept: options.acceptRaw
      ? "application/vnd.github.raw"
      : "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const headers = withAuthHeader(baseHeaders, url, options.tokenOverride);

  let response: Response;
  try {
    response = await fetch(url, { headers, signal: options.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw err;
    }
    throw new GithubError(
      "Could not reach GitHub. Check your connection and try again.",
      0,
    );
  }

  if (response.status === 404) {
    throw new NotFoundError();
  }
  if (response.status === 401) {
    // Phase 7.x — 401 means the credential is bad, not that the repo
    // is missing. Throw the dedicated error so the UI routes the
    // user to Settings instead of "try a different repository".
    throw new InvalidTokenError({
      unauthenticated: !(options.tokenOverride ?? loadToken()),
    });
  }
  if (response.status === 403) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      const resetHeader = response.headers.get("x-ratelimit-reset");
      const resetAtSeconds = resetHeader ? Number(resetHeader) : null;
      throw new RateLimitError({
        resetAtSeconds:
          resetAtSeconds && Number.isFinite(resetAtSeconds)
            ? resetAtSeconds
            : null,
        unauthenticated: !(options.tokenOverride ?? loadToken()),
      });
    }
    throw new GithubError(
      "GitHub returned 403. The repository may be access-restricted.",
      403,
    );
  }
  if (response.status === 451) {
    throw new GithubError(
      "This repository is unavailable for legal reasons.",
      451,
    );
  }
  if (!response.ok) {
    throw new GithubError(
      `GitHub responded with ${response.status}.`,
      response.status,
    );
  }

  return (await readBody(response, !!options.acceptRaw)) as T;
}

export async function githubFetchSafe<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T | null> {
  try {
    return await githubFetch<T>(path, options);
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    if (err instanceof NotFoundError) return null;
    if (err instanceof GithubError) return null;
    throw err;
  }
}

export async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  signal?: AbortSignal,
  tokenOverride?: string | null,
): Promise<string | null> {
  const url = `${GITHUB_RAW}/${owner}/${repo}/${branch}/${path}`;
  try {
    const headers = withAuthHeader({}, url, tokenOverride);
    const response = await fetch(url, { signal, headers });
    if (!response.ok) return null;
    return await response.text();
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return null;
  }
}

/**
 * Probe-only call: ask api.github.com for the rate-limit status. Useful
 * for the Settings dialog to confirm a token is valid. Returns null on
 * any error so the UI can stay calm.
 */
export interface RateLimitProbe {
  limit: number;
  remaining: number;
  used: number;
  resetSeconds: number;
  authenticated: boolean;
}

export async function probeRateLimit(): Promise<RateLimitProbe | null> {
  try {
    const headers = withAuthHeader(
      {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      `${GITHUB_API}/rate_limit`,
    );
    const response = await fetch(`${GITHUB_API}/rate_limit`, { headers });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      resources?: { core?: { limit: number; remaining: number; used: number; reset: number } };
    };
    const core = json.resources?.core;
    if (!core) return null;
    const now = Math.floor(Date.now() / 1000);
    return {
      limit: core.limit,
      remaining: core.remaining,
      used: core.used,
      resetSeconds: Math.max(0, core.reset - now),
      authenticated: core.limit > 60,
    };
  } catch {
    return null;
  }
}
