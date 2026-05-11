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
const EXTERNAL_DOC_HOSTS: Array<{ host: string; label: string }> = [
  // Multi-language documentation platforms (all host-only — no
  // trailing slashes; the regex below already enforces a URL
  // boundary after the host).
  { host: "readthedocs.io", label: "Read the Docs" },
  { host: "readthedocs.org", label: "Read the Docs" },
  { host: "mintlify.com", label: "Mintlify" },
  { host: "gitbook.com", label: "GitBook" },
  { host: "gitbook.io", label: "GitBook" },
  { host: "vitepress.dev", label: "VitePress" },
  { host: "docusaurus.io", label: "Docusaurus" },
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

/** Set of known docs hostnames, indexed for O(1) host-suffix lookup. */
const KNOWN_DOC_HOSTS = new Map<string, { host: string; label: string }>(
  EXTERNAL_DOC_HOSTS.map((entry) => [entry.host.toLowerCase(), entry]),
);

function detectExternalDocsLink(
  content: string,
): { host: string; label: string } | null {
  // Scan every URL-shaped substring, parse it as a URL, and check
  // whether its hostname ends with a known docs host. The
  // `endsWith` check is what closes the lookalike attack:
  // `https://evil.com.readthedocs.io.attacker.com/` parses with
  // hostname `evil.com.readthedocs.io.attacker.com`, which does
  // NOT end with `readthedocs.io` (it ends with `attacker.com`).
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
    const host = url.hostname.toLowerCase();
    // Exact match first (covers `readthedocs.io` → `readthedocs.io`
    // and `docs.rs` → `docs.rs`).
    const direct = KNOWN_DOC_HOSTS.get(host);
    if (direct) return direct;
    // Subdomain match: `myproject.readthedocs.io` → `readthedocs.io`.
    // We require the apex to be a known host AND the boundary to be
    // a `.` so `evil.readthedocs.io.attacker.com` doesn't false-match.
    for (const [knownHost, entry] of KNOWN_DOC_HOSTS) {
      if (host.endsWith(`.${knownHost}`)) return entry;
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
