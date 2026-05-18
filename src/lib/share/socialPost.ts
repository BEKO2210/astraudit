/**
 * Pre-formatted social post templates — Roadmap M8.3.
 *
 * Pure renderer for "share this audit" posts across the four
 * networks the project's audience overlaps with. Each platform
 * gets a tuned variant — char-limit aware (X / Bluesky are tight,
 * Mastodon + LinkedIn relax), URL/hashtag conventions per host.
 *
 * The component (M8.3 UI slice) hands these renderings to
 * `navigator.clipboard.writeText` and/or to each platform's
 * intent-URL endpoint so the visitor lands on a pre-composed
 * post they can edit before publishing.
 */

export type SocialPlatform = "twitter" | "mastodon" | "bluesky" | "linkedin";

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  "twitter",
  "mastodon",
  "bluesky",
  "linkedin",
] as const;

export interface SocialPostInput {
  fullName: string;
  totalScore: number;
  maxScore: number;
  grade: string;
  /** Optional short verdict — included when there's char budget. */
  verdict?: string | null;
  /** Canonical Astraudit dashboard URL for this audit. */
  auditUrl: string;
  /** Optional repo HTML URL — added as the "Repo:" link line. */
  repoUrl?: string;
}

export interface SocialPost {
  platform: SocialPlatform;
  /** Final post body (potentially truncated for the platform). */
  text: string;
  /** Effective character length — useful for the UI's "98/280" hint. */
  length: number;
  /** Hard char limit per platform; null when effectively unlimited. */
  limit: number | null;
  /** A platform "intent" URL the visitor can open to land in the
   *  compose box pre-filled with the text. Null for LinkedIn (the
   *  share endpoint doesn't accept body text). */
  intentUrl: string | null;
}

const LIMITS: Record<SocialPlatform, number | null> = {
  twitter: 280,
  bluesky: 300,
  mastodon: 500,
  linkedin: null,
};

function shorten(input: string, maxLen: number, suffix = "…"): string {
  if (input.length <= maxLen) return input;
  return `${input.slice(0, maxLen - suffix.length).trimEnd()}${suffix}`;
}

/** Encode a fragment URL for intent links (preserves the `#`). */
function encodeForIntent(url: string): string {
  return encodeURIComponent(url);
}

interface ComposeOptions {
  includeHashtags: boolean;
  includeVerdict: boolean;
}

function compose(input: SocialPostInput, options: ComposeOptions): string {
  const score = `${Math.round(input.totalScore)}/${Math.round(input.maxScore)}`;
  const grade = input.grade;
  const head = `Astraudit · ${input.fullName} — ${score} (${grade})`;
  const verdict =
    options.includeVerdict && input.verdict
      ? `\n\n${input.verdict.trim()}`
      : "";
  const url = `\n\n${input.auditUrl}`;
  const tags = options.includeHashtags
    ? `\n\n#opensource #devtools #github`
    : "";
  return `${head}${verdict}${url}${tags}`;
}

function renderTwitter(input: SocialPostInput): SocialPost {
  // 280 chars, URLs cost 23 (t.co rule of thumb). The script trims
  // the verdict before tagging on hashtags so the link survives.
  const limit = LIMITS.twitter!;
  let post = compose(input, { includeHashtags: false, includeVerdict: true });
  if (post.length > limit) {
    post = compose(input, { includeHashtags: false, includeVerdict: false });
  }
  if (post.length > limit) {
    post = shorten(post, limit);
  }
  return {
    platform: "twitter",
    text: post,
    length: post.length,
    limit,
    intentUrl: `https://twitter.com/intent/tweet?text=${encodeForIntent(post)}`,
  };
}

function renderMastodon(input: SocialPostInput): SocialPost {
  const limit = LIMITS.mastodon!;
  let post = compose(input, { includeHashtags: true, includeVerdict: true });
  if (post.length > limit) post = shorten(post, limit);
  return {
    platform: "mastodon",
    text: post,
    length: post.length,
    limit,
    // Mastodon's intent isn't host-bound; the common "toot.io" style
    // share dialog accepts ?text= against any host the user chooses.
    intentUrl: `https://mastodonshare.com/?text=${encodeForIntent(post)}`,
  };
}

function renderBluesky(input: SocialPostInput): SocialPost {
  const limit = LIMITS.bluesky!;
  let post = compose(input, { includeHashtags: false, includeVerdict: true });
  if (post.length > limit) {
    post = compose(input, { includeHashtags: false, includeVerdict: false });
  }
  if (post.length > limit) post = shorten(post, limit);
  return {
    platform: "bluesky",
    text: post,
    length: post.length,
    limit,
    intentUrl: `https://bsky.app/intent/compose?text=${encodeForIntent(post)}`,
  };
}

function renderLinkedIn(input: SocialPostInput): SocialPost {
  // LinkedIn shareArticle doesn't accept body text — the URL is the
  // payload + a separate `summary` query the platform ignores in
  // most regions. We still produce a full post body the visitor can
  // copy + paste manually after the share dialog opens.
  const post = compose(input, { includeHashtags: true, includeVerdict: true });
  const intent =
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeForIntent(input.auditUrl)}`;
  return {
    platform: "linkedin",
    text: post,
    length: post.length,
    limit: null,
    intentUrl: intent,
  };
}

const RENDERERS: Record<
  SocialPlatform,
  (input: SocialPostInput) => SocialPost
> = {
  twitter: renderTwitter,
  mastodon: renderMastodon,
  bluesky: renderBluesky,
  linkedin: renderLinkedIn,
};

export function renderSocialPost(
  platform: SocialPlatform,
  input: SocialPostInput,
): SocialPost {
  return RENDERERS[platform](input);
}

export function renderAllSocialPosts(input: SocialPostInput): SocialPost[] {
  return SOCIAL_PLATFORMS.map((p) => RENDERERS[p](input));
}
