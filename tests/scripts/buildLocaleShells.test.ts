/**
 * Roadmap M4.5 — unit test for the per-locale HTML shell builder.
 *
 * Exercises the pure `localizeShell` transform without touching the
 * filesystem so we can verify it sets the right `<html lang>`, swaps
 * the SEO‑critical meta tags, and injects the hreflang block. The
 * actual file emission happens during `npm run build`.
 */

import { describe, expect, it } from "vitest";
import {
  LOCALES,
  SEO,
  canonicalFor,
  hreflangBlock,
  localizeShell,
} from "../../scripts/build-locale-shells";

const FIXTURE = `<!doctype html>
<html lang="en" class="bg-ink-950">
  <head>
    <meta charset="UTF-8" />
    <title>Astraudit · Understand any public GitHub repository</title>
    <meta name="description" content="Astraudit maps, scores, and explains a public GitHub repo's structure, security posture, maintenance signals, and onboarding path — entirely in your browser. Free forever, no backend, no signup." />
    <link rel="canonical" href="https://beko2210.github.io/astraudit/" />
    <meta property="og:title" content="Astraudit · Understand any public GitHub repository" />
    <meta property="og:description" content="Maps, scores, and explains a public GitHub repo's structure, security posture, maintenance signals, and onboarding path — entirely in your browser." />
    <meta property="og:url" content="https://beko2210.github.io/astraudit/" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:title" content="Astraudit · Understand any public GitHub repository" />
    <meta name="twitter:description" content="Maps, scores, and explains a public GitHub repo's structure, security posture, maintenance signals, and onboarding path — in your browser." />
  </head>
  <body><div id="root"></div></body>
</html>`;

describe("localizeShell (M4.5)", () => {
  it("sets <html lang> to the target locale", () => {
    for (const locale of LOCALES) {
      const out = localizeShell(FIXTURE, locale);
      expect(out).toContain(`<html lang="${SEO[locale].htmlLang}"`);
    }
  });

  it("swaps <title> + meta description for the localized copy", () => {
    const de = localizeShell(FIXTURE, "de");
    expect(de).toContain(`<title>${SEO.de.title}</title>`);
    expect(de).toContain(`content="${SEO.de.description}"`);
    const ja = localizeShell(FIXTURE, "ja");
    expect(ja).toContain(`<title>${SEO.ja.title}</title>`);
    expect(ja).toContain(`content="${SEO.ja.description}"`);
  });

  it("rewrites canonical + og:url to the locale's URL", () => {
    for (const locale of LOCALES) {
      const out = localizeShell(FIXTURE, locale);
      const expected = canonicalFor(locale);
      expect(out).toContain(`rel="canonical" href="${expected}"`);
      expect(out).toContain(`property="og:url" content="${expected}"`);
    }
  });

  it("sets og:locale per locale", () => {
    expect(localizeShell(FIXTURE, "en")).toContain(`og:locale" content="en_US"`);
    expect(localizeShell(FIXTURE, "de")).toContain(`og:locale" content="de_DE"`);
    expect(localizeShell(FIXTURE, "ja")).toContain(`og:locale" content="ja_JP"`);
  });

  it("injects the hreflang block before </head>", () => {
    const out = localizeShell(FIXTURE, "de");
    expect(out).toContain('rel="alternate" hreflang="en"');
    expect(out).toContain('rel="alternate" hreflang="de"');
    expect(out).toContain('rel="alternate" hreflang="ja"');
    expect(out).toContain('rel="alternate" hreflang="x-default"');
    // The block sits before the closing head tag.
    expect(out.indexOf("hreflang=")).toBeLessThan(out.indexOf("</head>"));
  });

  it("English root is the x-default target", () => {
    expect(hreflangBlock()).toContain(
      `rel="alternate" hreflang="x-default" href="${canonicalFor("en")}"`,
    );
  });
});
