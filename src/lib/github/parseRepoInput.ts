import type { RepoCoordinates } from "../../types/github";

const SLUG_RE = /^[A-Za-z0-9_\-]+(?:\.[A-Za-z0-9_\-]+)*$/;

export interface ParseResult {
  ok: boolean;
  coords?: RepoCoordinates;
  error?: string;
}

const INVALID_MESSAGE = "This does not look like a GitHub repository URL.";

/**
 * Hosts that look like a code-forge URL but aren't `github.com`. We
 * call them out with a specific error so the user understands *why*
 * the input is being rejected (rather than the generic "does not look
 * like a GitHub URL", which is confusing when the URL is clearly a
 * GitLab repo). Phase 6.31.
 */
const NON_GITHUB_HOSTS: Array<{
  pattern: RegExp;
  label: string;
}> = [
  { pattern: /^gist\.github\.com\b/i, label: "GitHub Gist" },
  { pattern: /^gitlab\.com\b/i, label: "GitLab" },
  { pattern: /^bitbucket\.org\b/i, label: "BitBucket" },
  { pattern: /^codeberg\.org\b/i, label: "Codeberg" },
  { pattern: /^sourcehut\.org\b/i, label: "SourceHut" },
  { pattern: /^git\.sr\.ht\b/i, label: "SourceHut" },
  { pattern: /^git\.io\b/i, label: "git.io shortlink" },
  { pattern: /^bit\.ly\b/i, label: "bit.ly shortlink" },
  { pattern: /^tinyurl\.com\b/i, label: "TinyURL shortlink" },
];

export function parseRepoInput(rawInput: string): ParseResult {
  const input = (rawInput || "").trim();
  if (!input) {
    return { ok: false, error: INVALID_MESSAGE };
  }

  let candidate = input;
  // Strip query string and fragment first — `?tab=readme` and `#readme`
  // are common on copy-pasted GitHub URLs and shouldn't reach the
  // segment splitter, which would otherwise read "react?tab=readme"
  // as the repo name.
  candidate = candidate.replace(/[?#].*$/, "");
  candidate = candidate.replace(/^git@github\.com:/i, "");
  candidate = candidate.replace(/^https?:\/\//i, "");
  // After protocol strip, surface specific errors for known non-GitHub
  // hosts so the user understands the failure mode.
  for (const host of NON_GITHUB_HOSTS) {
    if (host.pattern.test(candidate)) {
      return {
        ok: false,
        error: `Astraudit only audits GitHub repositories. ${host.label} URLs aren't supported.`,
      };
    }
  }
  candidate = candidate.replace(/^github\.com\//i, "");
  candidate = candidate.replace(/^www\.github\.com\//i, "");
  candidate = candidate.replace(/\.git$/i, "");
  candidate = candidate.replace(/^\/+|\/+$/g, "");

  const segments = candidate.split("/").filter(Boolean);
  if (segments.length < 2) {
    return { ok: false, error: INVALID_MESSAGE };
  }

  const owner = segments[0];
  const repo = segments[1];

  // GitHub's own rules: owner cannot contain a `.` (org and user
  // slugs are letters/digits/hyphens only). repo names allow `.`.
  // This also blocks `gist.github.com/USER/HASH` slipping past the
  // host check above when an exotic scheme prefix gets normalised
  // weirdly.
  if (owner.includes(".")) {
    return { ok: false, error: INVALID_MESSAGE };
  }

  if (!SLUG_RE.test(owner) || !SLUG_RE.test(repo)) {
    return { ok: false, error: INVALID_MESSAGE };
  }

  if (owner.length > 100 || repo.length > 120) {
    return { ok: false, error: INVALID_MESSAGE };
  }

  return { ok: true, coords: { owner, repo } };
}
