/**
 * User-supplied GitHub Personal Access Token storage.
 *
 * Design rules (these are non-negotiable):
 * - The token never leaves the browser, except as an Authorization header
 *   to api.github.com or raw.githubusercontent.com.
 * - The token is never sent to any Astraudit-controlled endpoint
 *   (there isn't one — the project is fully static).
 * - The token is never logged, never written to URLs, never put in error
 *   messages, never sent to analytics (we don't have any).
 * - The token lives only in localStorage on the user's device. Clearing
 *   the browser's site data deletes it instantly.
 */

const STORAGE_KEY = "astraudit:github-pat:v1";
const STORAGE_META_KEY = "astraudit:github-pat-meta:v1";

const ALLOWED_HOSTS = new Set([
  "api.github.com",
  "raw.githubusercontent.com",
]);

export interface TokenMeta {
  prefix: string; // first 7 chars, e.g. "ghp_xxx" — for display only
  savedAt: string;
}

let cachedToken: string | null | undefined;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadToken(): string | null {
  if (cachedToken !== undefined) return cachedToken;
  if (!isBrowser()) {
    cachedToken = null;
    return null;
  }
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    cachedToken = v && v.length > 0 ? v : null;
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export function loadTokenMeta(): TokenMeta | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TokenMeta;
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  if (!isBrowser()) return;
  const trimmed = token.trim();
  if (!trimmed) {
    clearToken();
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, trimmed);
    const meta: TokenMeta = {
      prefix: trimmed.slice(0, 7),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
    cachedToken = trimmed;
  } catch {
    // Storage may be unavailable (private mode). Fail silently — the app
    // continues to work unauthenticated.
  }
}

export function clearToken(): void {
  cachedToken = null;
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_META_KEY);
  } catch {
    // Same fail-silent rationale.
  }
}

/**
 * Returns true only if the URL targets a GitHub host that is on the
 * explicit allow-list above. Used to decide whether the Authorization
 * header should be attached to a request.
 */
export function isGithubUrl(url: string): boolean {
  try {
    const u = new URL(url, "https://api.github.com");
    return ALLOWED_HOSTS.has(u.host);
  } catch {
    return false;
  }
}

/**
 * Looks like a GitHub PAT. Used purely for input validation in the UI;
 * the GitHub API is the source of truth.
 */
export function looksLikeGithubToken(value: string): boolean {
  const v = value.trim();
  if (v.length < 30 || v.length > 200) return false;
  return /^(ghp_|github_pat_|gho_|ghu_|ghs_|ghr_)/.test(v);
}
