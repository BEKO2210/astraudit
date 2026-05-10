/**
 * CODEOWNERS parser — Phase 3.3.
 *
 * The audit already detects whether a CODEOWNERS file is present.
 * This parser turns presence into an *ownership-density* signal:
 * how many rules, how many distinct owners, what kind of owners, how
 * much of the repo tree is actually covered, and whether the config
 * has the well-known weak-spot of a single fallback owner masquerading
 * as broad coverage.
 *
 * Pre-build research (2026-05-10):
 *   - GitHub Docs · *About code owners* — confirmed line format
 *     (`pattern owner1 owner2 …`), three valid owner types
 *     (`@user`, `@org/team`, `user@example.com`), full-line + inline
 *     `#` comments, gitignore-style globs (`*` not crossing slashes,
 *     `**` crossing them, `/` prefix anchoring to root, `/` suffix
 *     meaning directory). NO support for negation (`!`), character
 *     ranges (`[ ]`), or escaping `#`. "Last matching pattern takes
 *     precedence." https://docs.github.com/articles/about-code-owners
 *   - GitLab CODEOWNERS reference — extends the GitHub format with
 *     section headers (`[Name]`, `[Name][5]`, `^[Name]`), role-based
 *     owners (`@@developer`), and negation (`!pattern`). We tolerate
 *     GitLab sections (skip them gracefully) so the parser doesn't
 *     fail on hybrid configs, but we don't *enforce* GitLab-only
 *     semantics. https://docs.gitlab.com/ee/user/project/codeowners/reference.html
 *
 * Design notes:
 *   - We bundle a tiny CODEOWNERS-tuned glob matcher rather than
 *     pulling minimatch (~80 KB) for one feature. The matcher
 *     supports the documented subset (`*`, `**`, `/` anchoring,
 *     `/` directory match) and is < 50 LOC.
 *   - "Last match wins" is implemented exactly: we walk the rule
 *     list bottom-up and stop at the first hit, mirroring GitHub's
 *     precedence rule. Coverage % is deliberately conservative —
 *     it counts only files (blobs), not directories, so it doesn't
 *     over-credit a `/docs/` rule that just owns the folder.
 */

export type OwnerKind = "user" | "team" | "email" | "role" | "unknown";

export interface CodeownersOwner {
  /** Raw token as it appeared in the file (`@octocat`, `@org/web`, `a@b`). */
  raw: string;
  kind: OwnerKind;
}

export interface CodeownersRule {
  pattern: string;
  owners: CodeownersOwner[];
  /** 1-indexed line number, useful for surfaced findings. */
  line: number;
}

export interface ParsedCodeowners {
  rules: CodeownersRule[];
  /** Unique owners across every rule, sorted by raw token. */
  owners: CodeownersOwner[];
  ownerCounts: Record<OwnerKind, number>;
  /** Number of GitLab `[Section]` headers we skipped — surfaced so a
   *  GitLab repo's CODEOWNERS doesn't look mysteriously empty. */
  gitlabSectionCount: number;
  /** Whether the file has at least one rule whose pattern matches every
   *  path (`*` or `**` at the top level). */
  hasFallback: boolean;
  /** Most-frequent owner — pulled out as a quick "who runs this repo"
   *  signal. Null when the file has no rules at all. */
  topOwner: CodeownersOwner | null;
  /** % of repo blobs (0–100, one decimal) covered by at least one
   *  pattern, assuming GitHub's "last match wins" precedence. Computed
   *  lazily by `computeCoverage` below — null until then. */
  coveragePercent: number | null;
  /** Total blobs we measured against. */
  blobsConsidered: number;
}

/* -------------------------------------------------------------------------- */

const SECTION_HEADER = /^\^?\[[^\]]+\](?:\[\d+\])?$/;

/**
 * Classify a single owner token into one of five buckets.
 */
function classifyOwner(raw: string): OwnerKind {
  if (raw.startsWith("@@")) return "role"; // GitLab role-based
  if (raw.startsWith("@")) {
    return raw.includes("/") ? "team" : "user";
  }
  if (/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(raw)) return "email";
  return "unknown";
}

/**
 * Strip a trailing inline `#…` comment from a line, preserving the
 * `#` only if it is part of an owner token (e.g. `#1234`-style emails
 * — rare but seen in the wild).
 */
function stripInlineComment(line: string): string {
  // `#` after whitespace is always a comment; `#` mid-token is
  // preserved (no real-world CODEOWNERS file uses `#` inside a
  // pattern, but hashes inside owner tokens are imaginable).
  const m = line.match(/^(.*?)\s+#.*$/);
  return m ? m[1] : line;
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Parse a raw CODEOWNERS file into rules + ownership stats. Returns
 * null only on a literal empty / whitespace-only input — any malformed
 * line is silently skipped so a single typo doesn't drop the entire
 * signal.
 */
export function parseCodeowners(
  content: string | null | undefined,
): ParsedCodeowners | null {
  if (!content || !content.trim()) return null;

  const rules: CodeownersRule[] = [];
  let gitlabSectionCount = 0;
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (SECTION_HEADER.test(trimmed)) {
      gitlabSectionCount += 1;
      continue;
    }

    const cleaned = stripInlineComment(trimmed);
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const pattern = tokens[0];
    const ownerTokens = tokens.slice(1);
    if (ownerTokens.length === 0) {
      // Pattern with no owner — GitLab uses this to *unassign* a path,
      // which is a real signal. Keep the rule with empty owners.
    }
    const owners = ownerTokens.map((t) => ({ raw: t, kind: classifyOwner(t) }));

    rules.push({ pattern, owners, line: i + 1 });
  }

  // Aggregate owner stats.
  const ownerMap = new Map<string, CodeownersOwner>();
  const ownerFreq = new Map<string, number>();
  const counts: Record<OwnerKind, number> = {
    user: 0,
    team: 0,
    email: 0,
    role: 0,
    unknown: 0,
  };
  for (const r of rules) {
    for (const o of r.owners) {
      if (!ownerMap.has(o.raw)) {
        ownerMap.set(o.raw, o);
        counts[o.kind] += 1;
      }
      ownerFreq.set(o.raw, (ownerFreq.get(o.raw) ?? 0) + 1);
    }
  }
  const owners = Array.from(ownerMap.values()).sort((a, b) =>
    a.raw.localeCompare(b.raw),
  );

  let topOwner: CodeownersOwner | null = null;
  if (owners.length > 0) {
    let bestRaw = owners[0].raw;
    let bestCount = ownerFreq.get(bestRaw) ?? 0;
    for (const [raw, count] of ownerFreq) {
      if (count > bestCount) {
        bestRaw = raw;
        bestCount = count;
      }
    }
    topOwner = ownerMap.get(bestRaw) ?? null;
  }

  const hasFallback = rules.some(
    (r) => r.pattern === "*" || r.pattern === "**" || r.pattern === "/*",
  );

  return {
    rules,
    owners,
    ownerCounts: counts,
    gitlabSectionCount,
    hasFallback,
    topOwner,
    coveragePercent: null,
    blobsConsidered: 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Glob matching                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Convert a CODEOWNERS pattern to a regex. The matcher implements the
 * documented subset (no negation, no character ranges) — anything
 * unfamiliar collapses to a regex that simply never matches.
 */
function patternToRegex(rawPattern: string): RegExp {
  let pattern = rawPattern;

  // Anchored to root if it starts with `/`.
  let anchored = pattern.startsWith("/");
  if (anchored) pattern = pattern.slice(1);

  // Trailing `/` means "this directory and everything inside it".
  let dirMatch = pattern.endsWith("/");
  if (dirMatch) pattern = pattern.slice(0, -1);

  // Empty pattern (just `/`) — matches everything.
  if (!pattern) {
    return /^.*$/;
  }

  let body = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        body += ".*";
        i += 1;
        // Eat a trailing `/` after `**` so `**/x` matches `x` at root too.
        if (pattern[i + 1] === "/") i += 1;
      } else {
        body += "[^/]*";
      }
    } else if (c === "?") {
      body += "[^/]";
    } else if (/[.+^$(){}|\\\[\]]/.test(c)) {
      body += "\\" + c;
    } else if (c === "/") {
      body += "/";
    } else {
      body += c;
    }
  }

  // `pattern/` and `pattern` (no slash, no glob) → match the dir or any
  // file with that basename. Keep the trailing-slash semantics simple:
  // a directory rule matches anything below the prefix.
  if (dirMatch) {
    body += "(?:/.*)?";
  } else if (!rawPattern.includes("/")) {
    // Plain pattern without slashes (e.g. `*.js`) — match the basename
    // anywhere in the tree. Equivalent to a leading `**/`.
    return new RegExp("(?:^|/)" + body + "$");
  }

  return new RegExp((anchored ? "^" : "(?:^|/)") + body + "$");
}

/* -------------------------------------------------------------------------- */
/* Coverage                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Apply `parsed.rules` to a list of repo-relative file paths and
 * mutate the parsed object in place with the coverage percentage.
 *
 * Implements GitHub's "last matching pattern wins" precedence: for each
 * path we walk the rule list from the bottom and stop at the first
 * match — that hit owns the path. A path is *covered* when any rule
 * matches AND the matching rule has at least one owner (an empty-owner
 * rule explicitly *unassigns*, per the GitLab convention we tolerate).
 */
export function computeCoverage(
  parsed: ParsedCodeowners,
  blobPaths: Iterable<string>,
): ParsedCodeowners {
  const allPaths: string[] = [];
  for (const p of blobPaths) allPaths.push(p);
  if (allPaths.length === 0 || parsed.rules.length === 0) {
    parsed.coveragePercent = 0;
    parsed.blobsConsidered = allPaths.length;
    return parsed;
  }

  // Pre-compile the regexes once.
  const compiled = parsed.rules.map((r) => ({
    re: patternToRegex(r.pattern),
    hasOwner: r.owners.length > 0,
  }));

  let covered = 0;
  for (const raw of allPaths) {
    // Normalise the path: GitHub stores tree paths without a leading
    // slash; our regex emits both `^…` and `(?:^|/)…`. Test the bare
    // path; the regex internally handles the `(?:^|/)` prefix.
    const path = raw.replace(/^\/+/, "");
    let matched = false;
    let matchHasOwner = false;
    for (let i = compiled.length - 1; i >= 0; i--) {
      if (compiled[i].re.test(path)) {
        matched = true;
        matchHasOwner = compiled[i].hasOwner;
        break;
      }
    }
    if (matched && matchHasOwner) covered += 1;
  }

  parsed.coveragePercent = Math.round((covered / allPaths.length) * 1000) / 10;
  parsed.blobsConsidered = allPaths.length;
  return parsed;
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                  */
/* -------------------------------------------------------------------------- */

export type OwnershipShape =
  | "single-owner"
  | "narrow"
  | "balanced"
  | "broad"
  | "empty";

/**
 * Coarse bucket for the UI label. The thresholds are chosen so that:
 *   - `empty`         — no rules at all,
 *   - `single-owner`  — exactly one distinct owner,
 *   - `narrow`        — 2–3 owners,
 *   - `balanced`      — 4–9 owners,
 *   - `broad`         — ≥ 10 owners.
 * These match the bus-factor heuristics most engineering blogs cite.
 */
export function ownershipShape(parsed: ParsedCodeowners): OwnershipShape {
  if (parsed.rules.length === 0) return "empty";
  const n = parsed.owners.length;
  if (n <= 1) return "single-owner";
  if (n <= 3) return "narrow";
  if (n <= 9) return "balanced";
  return "broad";
}
