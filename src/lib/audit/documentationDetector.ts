import type { ImportantFile } from "../../types/github";

export interface ReadmeSignals {
  exists: boolean;
  length: number;
  mentionsInstall: boolean;
  mentionsUsage: boolean;
  mentionsApi: boolean;
  mentionsExamples: boolean;
  mentionsScreenshot: boolean;
  hasBadges: boolean;
  hasHeadings: boolean;
  /**
   * Phase 7.0.2 — when documentation lives somewhere other than the
   * README itself, the README can be intentionally thin without that
   * being a finding. We recognise three external surfaces:
   *
   *   - GitHub Wiki on the same repo (probed via `repo.has_wiki`
   *     metadata; the Wiki content itself isn't fetched, since
   *     wikis live in a separate git repo and Astraudit's tree
   *     fetch doesn't see them — but presence-of-wiki is itself a
   *     signal).
   *   - A recognised external docs host linked from the README
   *     (readthedocs / mintlify / gitbook / docs.rs / pkg.go.dev
   *     / godoc.org / `docs.*` subdomains).
   *   - A `docs/` or `documentation/` folder in the repo tree
   *     (handled at the classifier level, not here).
   *
   * `externalDocsHost` is the human-readable label of whichever
   * external surface was detected first; `null` when none.
   */
  hasExternalDocs: boolean;
  externalDocsHost: string | null;
}

const INSTALL_PATTERNS = [
  /\binstall(ation)?\b/i,
  /\bsetup\b/i,
  /\bgetting started\b/i,
  /\bquick(start| start)\b/i,
];
const USAGE_PATTERNS = [/\busage\b/i, /\bhow to use\b/i, /\bexample\b/i];
const API_PATTERNS = [/\bapi\b/i, /\bcli\b/i, /\boptions\b/i];
const EXAMPLE_PATTERNS = [/\bexample\b/i, /\bdemo\b/i, /\bsample\b/i];
const SCREENSHOT_PATTERNS = [/\bscreenshot\b/i, /\bdemo\b/i, /!\[/];

/**
 * Hosts that count as legitimate external documentation surfaces.
 * Each entry is a hostname substring + a friendly label for the
 * dashboard copy. Phase 7.0.2.
 *
 * NOTE: this list is intentionally narrow. We only allow hosts that
 * are obviously dedicated documentation platforms (or the canonical
 * doc-host of the language's ecosystem). A repo that links to its
 * own marketing site doesn't count — we'd happily nudge them to
 * write a proper README anyway.
 */
/**
 * Phase 7.x — recognised external documentation hosts. Each entry
 * has a `host` (matched by hostname, optionally as a subdomain) and
 * an OPTIONAL `pathPrefix` for cases where only a sub-path of a
 * generic deploy host counts as docs.
 *
 * Without `pathPrefix`, any URL on that hostname (apex or any
 * subdomain) counts. With `pathPrefix`, the URL's pathname must
 * also start with the prefix.
 *
 * The two patterns:
 *   - Dedicated docs hosts (Read the Docs, Mintlify, GitBook,
 *     docs.rs, pkg.go.dev, etc.) — host-only entries.
 *   - Generic deploy hosts where only a `/docs` sub-path counts
 *     (Vercel, Netlify, Deno's manual) — host + pathPrefix entries.
 *     Without the pathPrefix, every Vercel marketing site would
 *     false-positive as "has docs".
 */
const EXTERNAL_DOC_HOSTS: Array<{
  host: string;
  pathPrefix?: string;
  label: string;
}> = [
  // Multi-language documentation platforms.
  { host: "readthedocs.io", label: "Read the Docs" },
  { host: "readthedocs.org", label: "Read the Docs" },
  { host: "mintlify.com", label: "Mintlify" },
  { host: "gitbook.com", label: "GitBook" },
  { host: "gitbook.io", label: "GitBook" },
  { host: "vitepress.dev", label: "VitePress" },
  { host: "docusaurus.io", label: "Docusaurus" },
  // Generic deploy hosts where a `/docs` sub-path is the only
  // signal we trust. Restored after Codex flagged that the
  // host-only refactor lost these (b048cc9 review).
  { host: "vercel.app", pathPrefix: "/docs", label: "Vercel-hosted docs" },
  { host: "netlify.app", pathPrefix: "/docs", label: "Netlify-hosted docs" },
  { host: "deno.land", pathPrefix: "/manual", label: "Deno manual" },
  // Language-ecosystem canonical hosts.
  { host: "docs.rs", label: "docs.rs" },
  { host: "pkg.go.dev", label: "pkg.go.dev" },
  { host: "godoc.org", label: "GoDoc" },
  { host: "rubydoc.info", label: "RubyDoc.info" },
  { host: "hexdocs.pm", label: "HexDocs" },
  { host: "pydoc.io", label: "PyDoc" },
];

/**
 * Generic URL extractor. Matches `https?://...` URLs and bare
 * `www.foo.bar` URLs in any text content. We deliberately don't try
 * to validate the URL here — we just extract candidate substrings
 * and let the `URL` parser below decide which ones are real.
 *
 * Phase 7.x — the previous implementation built a per-host regex
 * from the data in EXTERNAL_DOC_HOSTS, which tripped CodeQL's
 * `js/regex/missing-regexp-anchor` rule on every host entry
 * (the heuristic flags any hostname-shaped string used in a regex
 * unless it's bracketed by `^` / `$` anchors). The new approach
 * never feeds host strings into a regex at all: we extract URLs
 * generically, parse each one with the `URL` constructor, and
 * compare hostnames as plain strings against a Set.
 */
const URL_RE = /https?:\/\/[^\s)\]"']+|\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s)\]"']*)?/gi;

/**
 * Match a parsed URL against an EXTERNAL_DOC_HOSTS entry.
 *
 *   1. Hostname must match: either `url.hostname === entry.host`
 *      (apex) or `url.hostname.endsWith("." + entry.host)`
 *      (subdomain).
 *      The leading-dot check is what closes the lookalike attack:
 *      `evil.com.readthedocs.io.attacker.com` does NOT end with
 *      `.readthedocs.io` because the rightmost host segment is
 *      `attacker.com`.
 *   2. When the entry carries a `pathPrefix`, `url.pathname` must
 *      also start with it. Without this, every Vercel-deployed
 *      marketing site would false-positive as "has docs".
 */
function urlMatchesEntry(
  url: URL,
  entry: (typeof EXTERNAL_DOC_HOSTS)[number],
): boolean {
  const host = url.hostname.toLowerCase();
  const expectedHost = entry.host.toLowerCase();
  const hostMatches =
    host === expectedHost || host.endsWith(`.${expectedHost}`);
  if (!hostMatches) return false;
  if (!entry.pathPrefix) return true;
  // Pathname comparison is case-sensitive on Linux/macOS, which
  // matches GitHub's hosting convention for `/docs/` paths.
  return url.pathname.startsWith(entry.pathPrefix);
}

function detectExternalDocsLink(
  content: string,
): { host: string; label: string } | null {
  // Scan every URL-shaped substring, parse it with the `URL`
  // constructor (no regex on the host data), and check each
  // candidate against every known docs entry.
  const matches = content.match(URL_RE);
  if (!matches) return null;
  for (const candidate of matches) {
    let url: URL;
    try {
      // Bare `www.` URLs aren't valid input for `new URL(...)`
      // unless we prepend a scheme. Normalise here so the lookup
      // path is uniform.
      const normalised = /^https?:\/\//i.test(candidate)
        ? candidate
        : `https://${candidate}`;
      url = new URL(normalised);
    } catch {
      continue;
    }
    for (const entry of EXTERNAL_DOC_HOSTS) {
      if (urlMatchesEntry(url, entry)) {
        return { host: entry.host, label: entry.label };
      }
    }
  }
  return null;
}

/**
 * Recognised "docs subdomain" pattern: `https://docs.foo.com/...`.
 * Catches projects that host their own docs on a dedicated subdomain
 * (Tailwind, Vue, React, Next.js, Astro all do this).
 *
 * Phase 7.x — anchored to a URL boundary after the host so a
 * lookalike like `https://docsXevil.com/` can't satisfy the
 * `docs\.` prefix by accident; the `\.` after `docs` forces a real
 * subdomain label.
 */
const DOCS_SUBDOMAIN_RE =
  /https?:\/\/docs\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#\s)\]"']|$)/i;

export interface AnalyzeReadmeOptions {
  /**
   * `repo.has_wiki` from the GitHub repo metadata. When true and the
   * README is thin, the analyser flags external-docs presence so
   * downstream findings can soften their tone. Defaults to `false`
   * (treat as "no wiki") when unspecified — preserves legacy
   * behaviour for callers that don't yet plumb metadata through.
   */
  hasWiki?: boolean;
}

export function analyzeReadme(
  readme: ImportantFile | null,
  options: AnalyzeReadmeOptions = {},
): ReadmeSignals {
  if (!readme || !readme.content) {
    return {
      exists: !!readme,
      length: readme?.size ?? 0,
      mentionsInstall: false,
      mentionsUsage: false,
      mentionsApi: false,
      mentionsExamples: false,
      mentionsScreenshot: false,
      hasBadges: false,
      hasHeadings: false,
      // Wiki-only documentation is still real documentation. We
      // surface it even when the README itself is empty so the
      // dashboard doesn't shout "no docs" at a project whose
      // entire documentation lives in the wiki.
      hasExternalDocs: !!options.hasWiki,
      externalDocsHost: options.hasWiki ? "GitHub Wiki" : null,
    };
  }

  const content = readme.content;
  const length = content.length;

  let externalDocsHost: string | null = null;
  const hosted = detectExternalDocsLink(content);
  if (hosted) {
    externalDocsHost = hosted.label;
  } else if (DOCS_SUBDOMAIN_RE.test(content)) {
    externalDocsHost = "dedicated docs subdomain";
  } else if (options.hasWiki) {
    externalDocsHost = "GitHub Wiki";
  }

  return {
    exists: true,
    length,
    mentionsInstall: INSTALL_PATTERNS.some((re) => re.test(content)),
    mentionsUsage: USAGE_PATTERNS.some((re) => re.test(content)),
    mentionsApi: API_PATTERNS.some((re) => re.test(content)),
    mentionsExamples: EXAMPLE_PATTERNS.some((re) => re.test(content)),
    mentionsScreenshot: SCREENSHOT_PATTERNS.some((re) => re.test(content)),
    hasBadges: /\[!\[/.test(content) || /img.shields.io/.test(content),
    hasHeadings: /^#{1,3} /m.test(content),
    hasExternalDocs: externalDocsHost !== null,
    externalDocsHost,
  };
}
