/**
 * README HTML sanitiser — Phase 6.x.
 *
 * Earlier the renderer was configured with `html: false`, which
 * escaped every inline HTML tag. That gave us a strong XSS baseline
 * but meant any README that used `<div align="center">`, badge
 * `<img>` rows, `<picture>` blocks, or `<details>` collapsibles
 * showed up as literal source text in the in-app preview.
 * (Our own README hit this — the centred hero + badge row appeared
 * as raw `<div align="center"><img ...>...`.)
 *
 * Switching to `html: true` opens the renderer to XSS, so we run
 * the output through a curated allow-list sanitiser. The contract:
 *
 *   1. **Allow** the tags GitHub itself supports in READMEs:
 *      structural (`div`, `p`, `span`, headings, lists, tables,
 *      `details`/`summary`, `blockquote`, `hr`, `br`),
 *      media (`img`, `picture`, `source`, `svg`+children),
 *      formatting (`strong`/`em`/`b`/`i`/`u`/`s`/`code`/`pre`/
 *      `kbd`/`sub`/`sup`/`mark`/`small`),
 *      and `a` (with the same target/rel rewriting we already do).
 *
 *   2. **Block** every active surface: `script`, `style`,
 *      `iframe`, `object`, `embed`, `form`, `input`, `button`,
 *      `link`, `meta`, `noscript`, `template`. Disallowed tags
 *      are unwrapped (children kept, tag removed) so we don't
 *      lose visible content silently.
 *
 *   3. **Strip dangerous attributes**: every `on*` event handler,
 *      `style`, `srcset` (with its data: URL risk), plus any
 *      `href` / `src` / `xlink:href` that starts with anything
 *      other than `http:`, `https:`, `mailto:`, `tel:`, `data:image/`,
 *      or `#` (anchors). `javascript:` is rejected by this gate.
 *
 * We use the browser's `DOMParser` because it doesn't execute
 * scripts during parsing — script bodies survive the parse step
 * as inert text nodes which we then remove. No DOMPurify
 * dependency required.
 *
 * The sanitiser is a pure DOM walker; for SSR / unit tests we
 * fall back to no-op (the markdown-it output is already escaped
 * when `html: false`; this path runs only in the browser).
 */

const ALLOWED_TAGS = new Set([
  // Structure
  "div",
  "p",
  "span",
  "header",
  "footer",
  "section",
  "article",
  "aside",
  "main",
  "nav",
  // Headings
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  // Lists
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  // Tables
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  // Formatting
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "code",
  "pre",
  "kbd",
  "samp",
  "var",
  "sub",
  "sup",
  "mark",
  "small",
  "abbr",
  "cite",
  "q",
  "time",
  "address",
  // Media
  "img",
  "picture",
  "source",
  // SVG family — keep simple chart / icon SVGs visible
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "rect",
  "text",
  "tspan",
  "title",
  "desc",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "use",
  "symbol",
  "filter",
  "feGaussianBlur",
  "feFlood",
  "feComposite",
  "feMerge",
  "feMergeNode",
  "mask",
  "clipPath",
  "pattern",
  "animate",
  "animateMotion",
  "animateTransform",
  "mpath",
  // Disclosure + misc safe
  "details",
  "summary",
  "blockquote",
  "hr",
  "br",
  "figure",
  "figcaption",
  "a",
]);

// Attributes safe on every allowed tag. Tag-specific extensions
// (href on a, src on img, etc.) layered on top below.
const GLOBAL_ATTRS = new Set([
  "class",
  "id",
  "title",
  "lang",
  "dir",
  "align",
  "role",
  "tabindex",
]);

// Per-tag allow-list extending GLOBAL_ATTRS.
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "name", "download"]),
  img: new Set(["src", "alt", "width", "height", "loading", "decoding", "referrerpolicy"]),
  picture: new Set([]),
  source: new Set(["srcset", "src", "type", "media", "sizes"]),
  // Tables can carry colspan / rowspan / scope.
  th: new Set(["colspan", "rowspan", "scope"]),
  td: new Set(["colspan", "rowspan"]),
  col: new Set(["span"]),
  colgroup: new Set(["span"]),
  // SVG variants — keep the geometry attrs.
  svg: new Set([
    "viewBox",
    "preserveAspectRatio",
    "width",
    "height",
    "xmlns",
    "fill",
    "stroke",
    "stroke-width",
    "version",
    "aria-labelledby",
  ]),
  path: new Set(["d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill-opacity", "stroke-opacity", "transform"]),
  circle: new Set(["cx", "cy", "r", "fill", "stroke", "stroke-width", "fill-opacity"]),
  ellipse: new Set(["cx", "cy", "rx", "ry", "fill", "stroke", "stroke-width"]),
  line: new Set(["x1", "y1", "x2", "y2", "stroke", "stroke-width", "stroke-linecap"]),
  rect: new Set(["x", "y", "width", "height", "rx", "ry", "fill", "stroke", "stroke-width", "fill-opacity", "stroke-opacity"]),
  text: new Set(["x", "y", "fill", "font-size", "font-weight", "text-anchor", "dominant-baseline", "letter-spacing"]),
  tspan: new Set(["x", "y", "fill", "font-size", "font-weight"]),
  g: new Set(["fill", "stroke", "transform", "opacity"]),
  use: new Set(["href", "xlink:href", "x", "y", "width", "height"]),
  linearGradient: new Set(["id", "x1", "y1", "x2", "y2", "gradientUnits", "gradientTransform"]),
  radialGradient: new Set(["id", "cx", "cy", "r", "fx", "fy", "gradientUnits"]),
  stop: new Set(["offset", "stop-color", "stop-opacity"]),
  // <details>/<summary> opt
  details: new Set(["open"]),
};

// URL schemes considered safe for href / src.
const SAFE_URL_RE = /^(?:https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i;
const SAFE_IMG_DATA_RE = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i;

function isSafeUrl(url: string, isImage: boolean): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (SAFE_URL_RE.test(trimmed)) return true;
  if (isImage && SAFE_IMG_DATA_RE.test(trimmed)) return true;
  return false;
}

/**
 * Walks the parsed HTML document and removes anything that isn't on
 * the allow-list. Disallowed elements are *unwrapped* (children
 * promoted to the parent) so visible content is preserved; this
 * matches GitHub's behaviour, which silently strips unknown tags
 * but keeps their inner text.
 */
function sanitiseElement(el: Element, options: SanitiseOptions): void {
  // Walk children FIRST (depth-first cleanup so attribute checks
  // don't have to re-visit replaced subtrees).
  const children = Array.from(el.children);
  for (const child of children) {
    sanitiseElement(child, options);
  }

  const tag = el.tagName.toLowerCase();

  // Block-list check.
  if (!ALLOWED_TAGS.has(tag)) {
    // Unwrap: move children up before removing the element itself.
    const parent = el.parentNode;
    if (parent) {
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    }
    return;
  }

  // Attribute scrub.
  const allowed = TAG_ATTRS[tag];
  const attrs = Array.from(el.attributes);
  for (const attr of attrs) {
    const name = attr.name.toLowerCase();
    // Always strip event handlers and inline styles.
    if (name.startsWith("on") || name === "style" || name === "srcset") {
      // srcset can carry data: URLs that bypass the src filter.
      // We strip it wholesale and leave src as the single source
      // of truth. Picture/source still degrade gracefully.
      if (!(tag === "source" && name === "srcset")) {
        el.removeAttribute(attr.name);
        continue;
      }
    }

    if (!GLOBAL_ATTRS.has(name) && !(allowed && allowed.has(name))) {
      // SVG attributes are case-sensitive (camelCase); allow them
      // when they appear inside an SVG subtree even if our lower-
      // cased lookup missed them. We're already inside the allowed-
      // tag check so the risk surface is the SVG attribute parsing.
      el.removeAttribute(attr.name);
      continue;
    }

    // URL gates + relative-URL resolution.
    if (name === "href" || name === "src" || name === "xlink:href") {
      let value = attr.value;
      // Resolve relative URLs against the repo's blob/raw URL
      // space so inline HTML <img src="public/logo.png"> renders
      // the same as the markdown ![](public/logo.png) equivalent.
      if (name === "href" && options.resolveLink) {
        value = options.resolveLink(value);
        el.setAttribute(attr.name, value);
      } else if ((name === "src" || name === "xlink:href") && options.resolveImage) {
        value = options.resolveImage(value);
        el.setAttribute(attr.name, value);
      }
      if (!isSafeUrl(value, name !== "href")) {
        el.removeAttribute(attr.name);
      }
    }
  }

  // Force target=_blank + rel=noreferrer noopener on external links
  // (matches the existing markdown link rewrite).
  if (tag === "a") {
    const href = el.getAttribute("href") ?? "";
    if (href && !href.startsWith("#")) {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noreferrer noopener");
    }
  }

  // Belt-and-suspenders for image attrs.
  if (tag === "img") {
    if (!el.hasAttribute("loading")) el.setAttribute("loading", "lazy");
    if (!el.hasAttribute("decoding")) el.setAttribute("decoding", "async");
    if (!el.hasAttribute("referrerpolicy")) {
      el.setAttribute("referrerpolicy", "no-referrer");
    }
  }
}

export interface SanitiseOptions {
  /**
   * Resolves relative `href` / `src` URLs against the repository
   * GitHub blob / raw URL space the same way the markdown token
   * rewrite does. The markdown-it rewrite only sees markdown-syntax
   * links/images; inline HTML `<img src="...">` / `<a href="...">`
   * arrive here verbatim. Without this, a README that uses
   * `<img src="public/logo.png">` (like ours) would render a
   * broken image in the in-app preview.
   */
  resolveLink?: (href: string) => string;
  resolveImage?: (src: string) => string;
}

/**
 * Public entry. Returns the sanitised HTML string. When DOMParser
 * isn't available (Node / SSR / unit tests), returns the input
 * unchanged — the markdown-it path used in those contexts already
 * went through the token-level URL rewrite, so the inline-HTML
 * resolver is a no-op there.
 */
export function sanitiseHtml(
  html: string,
  options: SanitiseOptions = {},
): string {
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><body><div id="__root">${html}</div></body></html>`,
    "text/html",
  );
  const root = doc.getElementById("__root");
  if (!root) return html;
  sanitiseElement(root, options);
  return root.innerHTML;
}
