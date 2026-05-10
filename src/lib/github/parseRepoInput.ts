import type { RepoCoordinates } from "../../types/github";

const SLUG_RE = /^[A-Za-z0-9_.\-]+$/;

export interface ParseResult {
  ok: boolean;
  coords?: RepoCoordinates;
  error?: string;
}

const INVALID_MESSAGE = "This does not look like a GitHub repository URL.";

export function parseRepoInput(rawInput: string): ParseResult {
  const input = (rawInput || "").trim();
  if (!input) {
    return { ok: false, error: INVALID_MESSAGE };
  }

  let candidate = input;
  candidate = candidate.replace(/^git@github\.com:/i, "");
  candidate = candidate.replace(/^https?:\/\//i, "");
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

  if (!SLUG_RE.test(owner) || !SLUG_RE.test(repo)) {
    return { ok: false, error: INVALID_MESSAGE };
  }

  if (owner.length > 100 || repo.length > 120) {
    return { ok: false, error: INVALID_MESSAGE };
  }

  return { ok: true, coords: { owner, repo } };
}
