const GITHUB_API = "https://api.github.com";
const GITHUB_RAW = "https://raw.githubusercontent.com";

export class GithubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GithubError";
    this.status = status;
  }
}

export class RateLimitError extends GithubError {
  constructor() {
    super("GitHub API rate limit reached. Please try again later.", 403);
    this.name = "RateLimitError";
  }
}

export class NotFoundError extends GithubError {
  constructor() {
    super("Repository not found or not public.", 404);
    this.name = "NotFoundError";
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
  const headers: Record<string, string> = {
    Accept: options.acceptRaw
      ? "application/vnd.github.raw"
      : "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

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
  if (response.status === 403) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      throw new RateLimitError();
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
): Promise<string | null> {
  const url = `${GITHUB_RAW}/${owner}/${repo}/${branch}/${path}`;
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    return await response.text();
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return null;
  }
}
