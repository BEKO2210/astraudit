/**
 * Phase 5.12 — SEO + social-card meta-tag contract.
 *
 * The OG / Twitter / JSON-LD set is what shapes every shared
 * Astraudit link's preview in PR reviews, Slack, Discord, Bluesky,
 * Twitter/X, LinkedIn, Notion, etc. None of those crawlers run
 * JavaScript, so the static `index.html` is the entire surface.
 *
 * This test reads `index.html` directly (not the built dist —
 * Vite's transforms preserve the head verbatim) and asserts every
 * required tag is present + carries the expected value. A build
 * that drops a tag or an absolute URL fails CI.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const INDEX = readFileSync(resolve(ROOT, "index.html"), "utf8");

const ABSOLUTE_URL_PREFIX = "https://beko2210.github.io/astraudit/";

describe("index.html — basic meta", () => {
  it("declares charset + viewport + theme-color", () => {
    expect(INDEX).toMatch(/<meta\s+charset="UTF-8"/i);
    expect(INDEX).toMatch(/name="viewport"[^>]*width=device-width/i);
    expect(INDEX).toMatch(/name="theme-color"[^>]*content="#05070d"/);
  });

  it("declares a non-empty <title>", () => {
    const m = /<title>(.+?)<\/title>/.exec(INDEX);
    expect(m?.[1]).toBeTruthy();
    expect(m![1]).toContain("Astraudit");
  });

  it("declares a meta description ≥ 120 chars (search-result body) and ≤ 320", () => {
    const m = /<meta\s+name="description"\s+content="([^"]+)"/.exec(INDEX);
    expect(m?.[1]).toBeTruthy();
    const desc = m![1];
    // Google truncates at ~160 chars but indexes more; 120 is a
    // sensible floor (don't waste the snippet) and 320 a hard ceiling.
    expect(desc.length).toBeGreaterThanOrEqual(120);
    expect(desc.length).toBeLessThanOrEqual(320);
  });

  it("declares a canonical URL pointing at the production origin", () => {
    expect(INDEX).toMatch(
      new RegExp(`<link\\s+rel="canonical"\\s+href="${ABSOLUTE_URL_PREFIX}"`),
    );
  });
});

describe("index.html — Open Graph (Facebook / LinkedIn / Slack / Discord / Bluesky)", () => {
  const required = [
    "og:type",
    "og:site_name",
    "og:title",
    "og:description",
    "og:url",
    "og:image",
    "og:image:width",
    "og:image:height",
    "og:image:alt",
    "og:locale",
  ];

  for (const prop of required) {
    it(`declares ${prop}`, () => {
      const re = new RegExp(
        `<meta\\s+property="${prop.replace(/:/g, "\\:")}"\\s+content="[^"]+"`,
      );
      expect(INDEX).toMatch(re);
    });
  }

  it("og:image is an absolute URL pointing at og-card.png", () => {
    const m = /<meta\s+property="og:image"\s+content="([^"]+)"/.exec(INDEX);
    expect(m?.[1]).toBe(`${ABSOLUTE_URL_PREFIX}og-card.png`);
  });

  it("og:image dimensions match the recommended 1200x630", () => {
    const w = /<meta\s+property="og:image:width"\s+content="(\d+)"/.exec(INDEX);
    const h = /<meta\s+property="og:image:height"\s+content="(\d+)"/.exec(INDEX);
    expect(w?.[1]).toBe("1200");
    expect(h?.[1]).toBe("630");
  });

  it("og:type is 'website' (not 'article')", () => {
    expect(INDEX).toMatch(/<meta\s+property="og:type"\s+content="website"/);
  });
});

describe("index.html — Twitter / X Card", () => {
  const required = [
    "twitter:card",
    "twitter:title",
    "twitter:description",
    "twitter:image",
    "twitter:image:alt",
  ];

  for (const name of required) {
    it(`declares ${name}`, () => {
      const re = new RegExp(
        `<meta\\s+name="${name.replace(/:/g, "\\:")}"\\s+content="[^"]+"`,
      );
      expect(INDEX).toMatch(re);
    });
  }

  it("twitter:card is 'summary_large_image' (the wide preview)", () => {
    expect(INDEX).toMatch(
      /<meta\s+name="twitter:card"\s+content="summary_large_image"/,
    );
  });
});

describe("index.html — JSON-LD WebApplication", () => {
  let parsed: Record<string, unknown>;

  it("contains a <script type='application/ld+json'> block", () => {
    const m = /<script\s+type="application\/ld\+json">([\s\S]+?)<\/script>/.exec(
      INDEX,
    );
    expect(m?.[1]).toBeTruthy();
    parsed = JSON.parse(m![1].trim());
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("WebApplication");
  });

  it("declares name + url + description", () => {
    expect(parsed.name).toBe("Astraudit");
    expect(parsed.url).toBe(ABSOLUTE_URL_PREFIX);
    expect((parsed.description as string).length).toBeGreaterThan(60);
  });

  it("declares a free Offer (price: 0)", () => {
    const offer = parsed.offers as Record<string, unknown>;
    expect(offer["@type"]).toBe("Offer");
    expect(String(offer.price)).toBe("0");
    expect(offer.priceCurrency).toBe("USD");
  });

  it("declares a non-trivial featureList", () => {
    const list = parsed.featureList as string[];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(3);
  });
});

describe("public/ assets — robots.txt + sitemap.xml + og-card.png", () => {
  it("public/robots.txt exists and Allow's everything", () => {
    const path = resolve(ROOT, "public/robots.txt");
    expect(existsSync(path)).toBe(true);
    const txt = readFileSync(path, "utf8");
    expect(txt).toMatch(/^User-agent:\s*\*/m);
    expect(txt).toMatch(/^Allow:\s*\//m);
    expect(txt).toMatch(
      new RegExp(
        `^Sitemap:\\s*${ABSOLUTE_URL_PREFIX.replace(/[/.]/g, "\\$&")}sitemap\\.xml`,
        "m",
      ),
    );
  });

  it("public/sitemap.xml exists and lists all four canonical routes", () => {
    const path = resolve(ROOT, "public/sitemap.xml");
    expect(existsSync(path)).toBe(true);
    const xml = readFileSync(path, "utf8");
    expect(xml).toMatch(/<urlset[\s>]/);
    for (const route of ["/", "#/rules", "#/impressum", "#/datenschutz"]) {
      expect(xml).toContain(`${ABSOLUTE_URL_PREFIX}${route === "/" ? "" : route}`);
    }
  });

  it("public/og-card.png exists and is a real PNG of reasonable size", () => {
    const path = resolve(ROOT, "public/og-card.png");
    expect(existsSync(path)).toBe(true);
    const buf = readFileSync(path);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
    // Sanity bound — too tiny means generation failed. ≤ 2 MB is the
    // practical OG-image ceiling many crawlers honor.
    expect(buf.length).toBeGreaterThan(20_000);
    expect(buf.length).toBeLessThan(2_000_000);
  });
});
