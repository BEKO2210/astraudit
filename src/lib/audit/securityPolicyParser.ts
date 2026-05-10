/**
 * SECURITY.md parser — Phase 3.4.
 *
 * The audit already detects whether a SECURITY.md file is present.
 * This module turns the *content* into an actionable quality signal:
 * does the file actually give a reporter a channel they can use, or
 * is it a placeholder that scores cheap "we have a security policy"
 * points without delivering one?
 *
 * Pre-build research (2026-05-10):
 *   - OpenSSF Scorecard · *Security-Policy* check awards points
 *     across three signals:
 *       · 6/10 — at least one valid contact channel (email OR
 *         http/https URL) is present.
 *       · 3/10 — substantive free-form text (not just bullet points
 *         of links).
 *       · 1/10 — security-specific terminology ("vulnerability",
 *         "disclosure") AND a timeline reference ("30 days",
 *         "90 days", "within … hours").
 *     We mirror that scheme exactly because it's the most-cited
 *     industry baseline.
 *     https://github.com/ossf/scorecard/blob/main/docs/checks.md
 *   - Common reporting channels seen in the wild: a private email
 *     (`security@org`), GitHub Security Advisories
 *     (`/security/advisories`), HackerOne (`hackerone.com`),
 *     Bugcrowd (`bugcrowd.com`), Open Bug Bounty, encrypted PGP keys
 *     (`-----BEGIN PGP PUBLIC KEY BLOCK-----` or `keys.openpgp.org`).
 *
 * The parser returns null only on a literal empty / whitespace-only
 * input — anything else returns a structured assessment so the UI can
 * grade the policy.
 */

export type SecurityPolicyQuality =
  | "placeholder" /* file exists but no contact channel */
  | "basic" /*       at least one channel              */
  | "good" /*        channel + substantive prose       */
  | "complete"; /*   channel + prose + timeline        */

export type ContactChannelKind =
  | "email"
  | "ghsa" /* GitHub Security Advisories */
  | "hackerone"
  | "bugcrowd"
  | "openbugbounty"
  | "pgp"
  | "url"; /* generic security-reporting URL */

export interface ContactChannel {
  kind: ContactChannelKind;
  /** As-extracted token (`security@example.com`, full URL, etc.). */
  value: string;
}

export interface ParsedSecurityPolicy {
  /** Total word count over the prose (markdown stripped). */
  words: number;
  /** Number of distinct contact channels we recognised. */
  channels: ContactChannel[];
  /** True when the prose contains both vulnerability terms AND a
   *  measurable timeline reference. */
  hasTimeline: boolean;
  /** True when at least one vulnerability-handling keyword shows up. */
  hasVulnTerminology: boolean;
  /** True when we matched a "supported versions" table heading or
   *  similar structural cue (most security policies use one). */
  mentionsSupportedVersions: boolean;
  /** OpenSSF-style coarse grade. */
  quality: SecurityPolicyQuality;
}

/* -------------------------------------------------------------------------- */
/* Patterns                                                                    */
/* -------------------------------------------------------------------------- */

// Email anywhere in the document — broad enough to catch
// `security@example.org` or `<a href="mailto:…">…</a>`.
const EMAIL_RE = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// GitHub Security Advisory references (URL OR phrase).
const GHSA_URL = /https?:\/\/(?:www\.)?github\.com\/[^/\s)]+\/[^/\s)]+\/security\/advisories[^\s)]*/gi;
const GHSA_PHRASE = /\bgithub\s+security\s+advisor(?:y|ies)\b/i;

// HackerOne, Bugcrowd, Open Bug Bounty.
const HACKERONE_URL = /https?:\/\/(?:www\.)?hackerone\.com\/[^\s)]+/gi;
const BUGCROWD_URL = /https?:\/\/(?:www\.)?bugcrowd\.com\/[^\s)]+/gi;
const OPENBB_URL = /https?:\/\/(?:www\.)?openbugbounty\.org\/[^\s)]+/gi;

// PGP markers — either an inline armored block or a public-key URL.
const PGP_BLOCK = /-----BEGIN PGP PUBLIC KEY BLOCK-----/;
const PGP_URL =
  /https?:\/\/(?:keys\.openpgp\.org|keybase\.io|pgp\.mit\.edu)[^\s)]*/gi;

// Generic "report security issue" URL — matches a URL whose path
// contains a security-reporting keyword. Used as a fallback when none
// of the named services hit.
const GENERIC_SEC_URL =
  /https?:\/\/[^\s)]+(?:security|vuln|disclosure|report)[^\s)]*/gi;

const VULN_TERMS = /\b(vulnerab|disclosure|exploit|advisory|advisories|CVE|patch)\w*/i;

// Timeline references: "30 days", "within 24 hours", "5 business days".
const TIMELINE_RE =
  /\b(?:within\s+)?\d+\s+(?:business\s+)?(?:hour|day|week|month)s?\b/i;

const SUPPORTED_VERSIONS_RE = /supported\s+versions?/i;

/* -------------------------------------------------------------------------- */
/* Markdown → prose                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Strip enough markdown to make a fair word count and to keep regex
 * matchers from getting tripped up by formatting characters. The
 * stripping is intentionally lighter than the full prose extractor in
 * `readability.ts` — for security policies we want the URL contents
 * to survive the strip so the contact-channel matchers can find them.
 */
function stripMarkdownLite(md: string): string {
  let t = md;
  // Fenced code blocks (often a PGP key block — preserve a marker).
  t = t.replace(/```[\s\S]*?```/g, (m) =>
    /BEGIN PGP PUBLIC KEY BLOCK/.test(m) ? "-----BEGIN PGP PUBLIC KEY BLOCK-----" : " ",
  );
  t = t.replace(/~~~[\s\S]*?~~~/g, " ");
  // HTML tags, but preserve href/mailto values.
  t = t.replace(/<a\s[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, "$1 $2");
  t = t.replace(/<[^>]+>/g, " ");
  // Plain link `[text](url)` — keep both sides separated by a space so
  // the URL is preserved AND the visible label still contributes to the
  // word count.
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$2 $1");
  // Inline code spans.
  t = t.replace(/`[^`\n]*`/g, " ");
  // Bare emphasis / strong / strikethrough markers.
  t = t.replace(/(\*\*|__)(.+?)\1/g, "$2");
  t = t.replace(/(\*|_)(.+?)\1/g, "$2");
  t = t.replace(/~~(.+?)~~/g, "$1");
  // Heading markers.
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  // List markers.
  t = t.replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, "");
  // Blockquote markers.
  t = t.replace(/^\s{0,3}>\s?/gm, "");
  return t;
}

function countWords(text: string): number {
  const matches = text.match(/[A-Za-z][A-Za-z'']*/g);
  return matches ? matches.length : 0;
}

/* -------------------------------------------------------------------------- */
/* Channel extraction                                                          */
/* -------------------------------------------------------------------------- */

function extractChannels(text: string): ContactChannel[] {
  const seen = new Map<string, ContactChannel>();

  const push = (kind: ContactChannelKind, value: string) => {
    const key = `${kind}:${value.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, { kind, value });
  };

  // Order matters — more specific URLs first so they're not later
  // double-counted as generic security URLs.
  for (const m of text.matchAll(GHSA_URL)) push("ghsa", m[0]);
  if (!Array.from(seen.values()).some((c) => c.kind === "ghsa")) {
    if (GHSA_PHRASE.test(text)) push("ghsa", "GitHub Security Advisories");
  }
  for (const m of text.matchAll(HACKERONE_URL)) push("hackerone", m[0]);
  for (const m of text.matchAll(BUGCROWD_URL)) push("bugcrowd", m[0]);
  for (const m of text.matchAll(OPENBB_URL)) push("openbugbounty", m[0]);

  for (const m of text.matchAll(PGP_URL)) push("pgp", m[0]);
  if (PGP_BLOCK.test(text)) push("pgp", "Inline PGP key");

  // Emails — but skip any obvious example placeholders.
  for (const m of text.matchAll(EMAIL_RE)) {
    const v = m[0];
    if (/example\.(com|org|net)$/i.test(v)) continue;
    if (/^(?:you|your-?email|me|name)@/i.test(v)) continue;
    push("email", v);
  }

  // Generic URL fallback — only add when no channel has been found yet
  // and the URL isn't already one of the named services.
  if (Array.from(seen.values()).length === 0) {
    for (const m of text.matchAll(GENERIC_SEC_URL)) push("url", m[0]);
  }

  return Array.from(seen.values());
}

/* -------------------------------------------------------------------------- */
/* Top-level                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Parse a SECURITY.md (or equivalent) file. Returns null only on a
 * literal empty input — anything else returns a structured assessment.
 */
export function parseSecurityPolicy(
  content: string | null | undefined,
): ParsedSecurityPolicy | null {
  if (!content || !content.trim()) return null;

  const stripped = stripMarkdownLite(content);
  const words = countWords(stripped);
  const channels = extractChannels(stripped);
  const hasVulnTerminology = VULN_TERMS.test(stripped);
  const hasTimeline = hasVulnTerminology && TIMELINE_RE.test(stripped);
  const mentionsSupportedVersions = SUPPORTED_VERSIONS_RE.test(stripped);

  let quality: SecurityPolicyQuality;
  if (channels.length === 0) {
    quality = "placeholder";
  } else if (words >= 80 && hasTimeline) {
    quality = "complete";
  } else if (words >= 40 && hasVulnTerminology) {
    quality = "good";
  } else {
    quality = "basic";
  }

  return {
    words,
    channels,
    hasTimeline,
    hasVulnTerminology,
    mentionsSupportedVersions,
    quality,
  };
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                  */
/* -------------------------------------------------------------------------- */

const KIND_LABEL: Record<ContactChannelKind, string> = {
  email: "Email",
  ghsa: "GitHub Security Advisories",
  hackerone: "HackerOne",
  bugcrowd: "Bugcrowd",
  openbugbounty: "Open Bug Bounty",
  pgp: "PGP",
  url: "Web form",
};

/** Short, human-readable label for a channel kind. */
export function formatChannelKind(kind: ContactChannelKind): string {
  return KIND_LABEL[kind];
}

/** Coarse description for the UI quality pill. */
export function formatPolicyQuality(quality: SecurityPolicyQuality): string {
  switch (quality) {
    case "placeholder":
      return "placeholder";
    case "basic":
      return "basic";
    case "good":
      return "substantive";
    case "complete":
      return "complete with timeline";
  }
}
