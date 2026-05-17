/**
 * Locale URL prefix helpers — Roadmap M4.5.
 *
 * Astraudit is served from a fixed Vite `base` (e.g. `/astraudit/` on
 * GitHub Pages, `/` in local dev). After the base, we accept an
 * optional locale segment: `/astraudit/de/`, `/astraudit/ja/`,
 * `/astraudit/en/`. The default (English) is also served from the
 * un‑prefixed root so we don't break the canonical share URL.
 *
 * Hash routes (`#/audit/owner/repo`, `#/scope`, …) live AFTER the
 * locale prefix, so a deep link looks like
 *   `/astraudit/de/#/audit/owner/repo`
 *
 * These helpers operate on the `pathname` (without the leading host)
 * and accept the Vite `base` so unit tests can pin a known value.
 */

import { LOCALES, type Locale } from "./types";

/**
 * Compile‑time guard: the Vite base is always `import.meta.env.BASE_URL`.
 * Always ends with `/` and starts with `/` per Vite's contract.
 */
function readBase(): string {
  // Vite injects BASE_URL at build time. Tests / SSR pin it via the
  // explicit `base` argument on each helper.
  const raw = import.meta.env.BASE_URL || "/";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

/**
 * Strip the Vite base prefix off a pathname so the remaining string
 * starts with the locale segment (or is empty for the root).
 */
function stripBase(pathname: string, base: string): string {
  if (!pathname.startsWith(base)) return pathname.replace(/^\/+/, "");
  return pathname.slice(base.length);
}

/**
 * Return the locale the URL pathname encodes, or `null` if the path
 * has no locale prefix (i.e. canonical root). Unknown segments also
 * return `null` so a typo'd `/astraudit/xx/` falls through to default.
 */
export function getLocaleFromPath(
  pathname: string,
  base: string = readBase(),
): Locale | null {
  const rest = stripBase(pathname, base);
  // Pathnames look like `de/`, `de`, `de/sub`, or `` for root.
  // Match the first segment only.
  const seg = rest.split("/", 1)[0] ?? "";
  return (LOCALES as readonly string[]).includes(seg) ? (seg as Locale) : null;
}

/**
 * Build the new pathname for a target locale, preserving anything
 * that came after the optional current locale prefix. The default
 * (English) renders with no prefix so the canonical short URL stays
 * canonical; pass `forceExplicitDefault: true` to opt into `/en/`
 * (e.g. when emitting an `<link rel="alternate" hreflang="en">` tag).
 */
export function pathForLocale(
  target: Locale,
  pathname: string,
  base: string = readBase(),
  options: { forceExplicitDefault?: boolean } = {},
): string {
  const rest = stripBase(pathname, base);
  const segments = rest.split("/").filter(Boolean);
  // Drop a locale segment if present, so we always rebuild fresh.
  if (
    segments.length > 0 &&
    (LOCALES as readonly string[]).includes(segments[0]!)
  ) {
    segments.shift();
  }
  // English at the root URL is the canonical form for the SPA.
  // hreflang link emission overrides this via forceExplicitDefault.
  const includePrefix = options.forceExplicitDefault || target !== "en";
  const localeSeg = includePrefix ? `${target}/` : "";
  const trailing = segments.length > 0 ? segments.join("/") : "";
  // Always keep the trailing `/` after the locale so GitHub Pages
  // serves the matching `dist/<locale>/index.html` directly. Without
  // it, GH Pages 301s `/astraudit/de` → `/astraudit/de/` which would
  // drop the URL hash on some browsers.
  return `${base}${localeSeg}${trailing}${trailing ? "" : ""}`;
}

/**
 * Build the full canonical absolute URL for a given locale. Used by
 * the `<link rel="alternate" hreflang>` emitter so search engines
 * can crawl the variant pages without executing JS.
 */
export function absoluteUrlForLocale(
  target: Locale,
  origin: string,
  pathname: string,
  base: string = readBase(),
  options: { forceExplicitDefault?: boolean } = {},
): string {
  const path = pathForLocale(target, pathname, base, options);
  return `${origin}${path}`;
}
