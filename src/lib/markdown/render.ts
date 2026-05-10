/**
 * README Markdown rendering.
 *
 * Safety choices:
 * - markdown-it is created with `html: false`, so any inline HTML in
 *   the source markdown is escaped and rendered as text. Combined with
 *   the fact that we never run scripts, this gives us a strong XSS
 *   baseline without pulling in DOMPurify.
 * - All `<a>` tags are forced to open in a new tab with
 *   `rel="noreferrer noopener"`.
 * - Relative URLs are resolved against the repository's GitHub
 *   `blob/<branch>/` URL for links and the
 *   `raw.githubusercontent.com/<branch>/` URL for images, so the
 *   preview behaves the same way as it would on github.com.
 * - Images get `loading="lazy"` and a max-width so they cannot push
 *   the layout out of bounds (Phase mobile-safety from earlier).
 */

import MarkdownIt from "markdown-it";

export interface RenderOptions {
  owner: string;
  repo: string;
  branch: string;
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  breaks: false,
});

function isAbsoluteUrl(url: string): boolean {
  return /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url) || url.startsWith("#");
}

function joinPath(base: string, target: string): string {
  let path = target;
  if (path.startsWith("./")) path = path.slice(2);
  while (path.startsWith("../")) path = path.slice(3);
  while (path.startsWith("/")) path = path.slice(1);
  return `${base}/${path}`;
}

function resolveLink(url: string, opts: RenderOptions): string {
  if (!url) return url;
  if (url.startsWith("#")) return url;
  if (isAbsoluteUrl(url)) return url;
  const blobBase = `https://github.com/${opts.owner}/${opts.repo}/blob/${encodeURIComponent(opts.branch)}`;
  return joinPath(blobBase, url);
}

function resolveImage(url: string, opts: RenderOptions): string {
  if (!url) return url;
  if (isAbsoluteUrl(url)) return url;
  const rawBase = `https://raw.githubusercontent.com/${opts.owner}/${opts.repo}/${encodeURIComponent(opts.branch)}`;
  return joinPath(rawBase, url);
}

function rewriteAttrs(
  tokens: ReturnType<MarkdownIt["parse"]>,
  opts: RenderOptions,
): void {
  for (const token of tokens) {
    if (token.children) rewriteAttrs(token.children, opts);
    if (token.type === "link_open") {
      const hrefIndex = token.attrIndex("href");
      const original = hrefIndex >= 0 && token.attrs ? token.attrs[hrefIndex][1] : "";
      if (hrefIndex >= 0 && token.attrs) {
        token.attrs[hrefIndex][1] = resolveLink(original, opts);
      }
      // In-page anchors stay in the current view; everything else opens externally.
      if (!original.startsWith("#")) {
        token.attrSet("target", "_blank");
        token.attrSet("rel", "noreferrer noopener");
      }
    } else if (token.type === "image") {
      const srcIndex = token.attrIndex("src");
      if (srcIndex >= 0 && token.attrs) {
        token.attrs[srcIndex][1] = resolveImage(token.attrs[srcIndex][1], opts);
      }
      token.attrSet("loading", "lazy");
      token.attrSet("decoding", "async");
      token.attrSet("referrerpolicy", "no-referrer");
    }
  }
}

export function renderReadmeMarkdown(
  source: string,
  opts: RenderOptions,
): string {
  const env: Record<string, unknown> = {};
  const tokens = md.parse(source, env);
  rewriteAttrs(tokens, opts);
  return md.renderer.render(tokens, md.options, env);
}

/**
 * Truncate the source so we render a preview that ends on a paragraph
 * boundary close to `maxChars`, never mid-word.
 */
export function truncateMarkdown(source: string, maxChars: number): { content: string; truncated: boolean } {
  const trimmed = source.replace(/\r\n/g, "\n");
  if (trimmed.length <= maxChars) return { content: trimmed, truncated: false };

  // Try to cut at the next blank line after maxChars.
  const tail = trimmed.slice(maxChars);
  const breakIndex = tail.indexOf("\n\n");
  let cut = breakIndex >= 0 ? maxChars + breakIndex : maxChars;
  // Hard cap: don't extend more than 50% past the soft limit.
  cut = Math.min(cut, Math.round(maxChars * 1.5));

  let preview = trimmed.slice(0, cut).trimEnd();

  // Don't end inside an open code fence.
  const fenceCount = (preview.match(/```/g) ?? []).length;
  if (fenceCount % 2 === 1) {
    preview += "\n```";
  }

  return { content: preview, truncated: true };
}
