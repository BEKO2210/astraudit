#!/usr/bin/env tsx
/**
 * Roadmap M4.5 — emit per‑locale `index.html` shells.
 *
 * GitHub Pages serves whichever physical file matches the URL path,
 * so `https://beko2210.github.io/astraudit/de/` resolves to
 * `dist/de/index.html`. By writing one shell per locale we get real
 * locale URLs (good for hreflang + Lighthouse SEO) without any
 * client‑side 404 redirect dance.
 *
 * Each shell is a byte‑for‑byte copy of the Vite‑built
 * `dist/index.html` with a few SEO‑critical tags swapped for the
 * target locale:
 *   - `<html lang>`
 *   - `<title>` + `<meta name="description">`
 *   - `<meta property="og:locale">` + `<meta property="og:title">`
 *     + `<meta property="og:description">`
 *   - `<meta name="twitter:title">` + `<meta name="twitter:description">`
 *   - `<link rel="canonical">` (points to the localized URL)
 *   - A fresh `<link rel="alternate" hreflang="..">` block listing
 *     every locale variant + `x-default` (which points to the
 *     canonical English root).
 *
 * The inline `<script>` blocks (JSON‑LD + theme loader) stay
 * byte‑identical so the CSP `script-src` SHA‑256 hashes remain
 * valid in every shell.
 *
 * The root `dist/index.html` also gets the hreflang block appended
 * so search engines crawling the canonical URL find the variants.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Locale = "en" | "de" | "ja";

const LOCALES: readonly Locale[] = ["en", "de", "ja"] as const;

/**
 * Per‑locale SEO metadata. Kept here (not in the runtime i18n
 * catalog) because these strings end up in static HTML at build
 * time — pulling them through the runtime catalog would force a
 * runtime React render just to populate `<title>`.
 */
const SEO: Record<
  Locale,
  {
    htmlLang: string;
    ogLocale: string;
    title: string;
    description: string;
    ogDescription: string;
    twitterDescription: string;
  }
> = {
  en: {
    htmlLang: "en",
    ogLocale: "en_US",
    title: "Astraudit · Understand any public GitHub repository",
    description:
      "Astraudit maps, scores, and explains a public GitHub repo's structure, security posture, maintenance signals, and onboarding path — entirely in your browser. Free forever, no backend, no signup.",
    ogDescription:
      "Maps, scores, and explains a public GitHub repo's structure, security posture, maintenance signals, and onboarding path — entirely in your browser.",
    twitterDescription:
      "Maps, scores, and explains a public GitHub repo's structure, security posture, maintenance signals, and onboarding path — in your browser.",
  },
  de: {
    htmlLang: "de",
    ogLocale: "de_DE",
    title: "Astraudit · Verstehe jedes öffentliche GitHub‑Repository",
    description:
      "Astraudit kartiert, bewertet und erklärt Struktur, Security‑Posture, Maintenance‑Signale und Onboarding‑Pfad eines öffentlichen GitHub‑Repos — komplett im Browser. Für immer kostenlos, kein Backend, keine Anmeldung.",
    ogDescription:
      "Kartiert, bewertet und erklärt Struktur, Security‑Posture, Maintenance‑Signale und Onboarding‑Pfad eines öffentlichen GitHub‑Repos — komplett im Browser.",
    twitterDescription:
      "Kartiert, bewertet und erklärt Struktur, Security‑Posture, Maintenance‑Signale und Onboarding‑Pfad eines öffentlichen GitHub‑Repos — im Browser.",
  },
  ja: {
    htmlLang: "ja",
    ogLocale: "ja_JP",
    title: "Astraudit · あらゆる公開 GitHub リポジトリを理解する",
    description:
      "Astraudit は公開 GitHub リポジトリの構造、セキュリティ姿勢、メンテナンスシグナル、オンボーディングパスをブラウザだけでマッピング・スコアリング・解説します。永久無料、バックエンド不要、登録不要。",
    ogDescription:
      "公開 GitHub リポジトリの構造、セキュリティ姿勢、メンテナンスシグナル、オンボーディングパスをブラウザだけでマッピング・スコアリング・解説します。",
    twitterDescription:
      "公開 GitHub リポジトリの構造、セキュリティ姿勢、メンテナンスシグナル、オンボーディングパスをブラウザで解説します。",
  },
};

const SITE_ORIGIN = "https://beko2210.github.io";
const BASE_PATH = "/astraudit/";

/** Build the canonical absolute URL for a given locale's root. */
function canonicalFor(locale: Locale): string {
  // English lives at the un‑prefixed root so the canonical short URL
  // stays canonical; explicit /en/ exists too but isn't canonical.
  const seg = locale === "en" ? "" : `${locale}/`;
  return `${SITE_ORIGIN}${BASE_PATH}${seg}`;
}

/**
 * Build the `<link rel="alternate" hreflang>` block listing every
 * locale variant plus the canonical `x-default`.
 */
function hreflangBlock(): string {
  const lines = LOCALES.map(
    (l) => `    <link rel="alternate" hreflang="${l}" href="${canonicalFor(l)}" />`,
  );
  lines.push(`    <link rel="alternate" hreflang="x-default" href="${canonicalFor("en")}" />`);
  return `    <!-- Roadmap M4.5 — hreflang variants -->\n${lines.join("\n")}\n`;
}

/** Replace the first occurrence of a literal substring (throws if missing). */
function mustReplace(src: string, needle: string, replacement: string): string {
  const idx = src.indexOf(needle);
  if (idx < 0) {
    throw new Error(
      `build-locale-shells: expected substring not found in dist/index.html: ${needle.slice(0, 60)}…`,
    );
  }
  return src.slice(0, idx) + replacement + src.slice(idx + needle.length);
}

/** Apply per-locale meta tag swaps. Mutates and returns the HTML. */
export function localizeShell(rawHtml: string, locale: Locale): string {
  const seo = SEO[locale];
  let html = rawHtml;

  // <html lang="…">  — the Vite output ships lang="en"
  html = html.replace(/<html\s+lang="[^"]*"/, `<html lang="${seo.htmlLang}"`);

  // <title>
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${seo.title}</title>`,
  );

  // <meta name="description" content="..." />
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${seo.description}" />`,
  );

  // <link rel="canonical" href="…" />
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonicalFor(locale)}" />`,
  );

  // og:title / og:description / og:url / og:locale
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${seo.title}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${seo.ogDescription}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonicalFor(locale)}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:locale" content="${seo.ogLocale}" />`,
  );

  // twitter:title / twitter:description
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${seo.title}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${seo.twitterDescription}" />`,
  );

  // Inject the hreflang block right before </head> so it appears in
  // every shell (including the canonical root) so crawlers can find
  // the variants from any entry point.
  html = mustReplace(html, "</head>", `${hreflangBlock()}  </head>`);

  return html;
}

export { SEO, LOCALES, canonicalFor, hreflangBlock };

function main(): void {
  const distDir = path.resolve(__dirname, "../dist");
  const rootHtmlPath = path.join(distDir, "index.html");
  if (!fs.existsSync(rootHtmlPath)) {
    throw new Error(
      `build-locale-shells: ${rootHtmlPath} not found. Run \`npm run build\` first.`,
    );
  }
  const raw = fs.readFileSync(rootHtmlPath, "utf8");

  // Sanity check: the canonical Vite output should still have the
  // English defaults so our replace patterns match.
  if (!raw.includes('<html lang="en"')) {
    throw new Error(
      'build-locale-shells: dist/index.html does not contain <html lang="en"> — refusing to patch.',
    );
  }

  // Emit /astraudit/<locale>/index.html for every locale. Even EN
  // gets its explicit /en/ shell so a hreflang link pointing there
  // resolves with a real 200 instead of a 404.
  for (const locale of LOCALES) {
    const dir = path.join(distDir, locale);
    fs.mkdirSync(dir, { recursive: true });
    const out = localizeShell(raw, locale);
    fs.writeFileSync(path.join(dir, "index.html"), out, "utf8");
  }

  // Rewrite the root index.html with the hreflang block + canonical
  // EN metadata (it was already EN, but we re‑run the localizer so
  // the hreflang injection is identical to the locale shells).
  const rootOut = localizeShell(raw, "en");
  fs.writeFileSync(rootHtmlPath, rootOut, "utf8");

  // Friendly summary so the build log shows the work.
  const written = LOCALES.map((l) => `dist/${l}/index.html`).join(", ");
  // eslint-disable-next-line no-console
  console.log(
    `build-locale-shells: wrote ${written} + appended hreflang block to dist/index.html`,
  );
}

// Only run the build when invoked as a CLI; importers (tests) just
// get the exported pure helpers above.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
