#!/usr/bin/env tsx
/**
 * Roadmap M2.1 (3/3) — renders the press one-pager Markdown to a
 * single A4 PDF. Headless Chrome via Playwright, inline-styled HTML,
 * inlined Inter font from the existing @fontsource/inter dependency
 * so the PDF reproduces identically offline.
 *
 * Input:  public/press/one-pager.md
 * Output: public/press/one-pager.pdf  (gitignored — re-render on demand)
 *
 * Run:
 *   npm run press:pdf
 *
 * Requires Playwright's chromium binary (one-time:
 *   `npx playwright install chromium`).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";
import MarkdownIt from "markdown-it";

const ROOT = process.cwd();
const SRC_MD = join(ROOT, "public/press/one-pager.md");
const OUT_PDF = join(ROOT, "public/press/one-pager.pdf");
mkdirSync(dirname(OUT_PDF), { recursive: true });

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

// A4 portrait, generous margins, Inter throughout. Aurora-violet
// from tailwind.config.ts (#7a5cff) is the only brand colour we
// commit to in print — keeps the PDF cheap to reproduce on a B/W
// printer (everything else is greyscale-safe).
function htmlTemplate(rendered: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Astraudit · One-Pager</title>
<style>
  @page {
    size: A4;
    margin: 18mm 16mm;
  }
  :root {
    --aurora: #7a5cff;
    --ink: #0a0e1a;
    --muted: #4a546b;
    --rule: #d4d9e5;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: Inter, -apple-system, "Segoe UI", system-ui, sans-serif;
    color: var(--ink);
    font-size: 10.5pt;
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
  }
  main {
    max-width: 100%;
  }
  h1 {
    font-size: 22pt;
    line-height: 1.15;
    margin: 0 0 2mm 0;
    color: var(--aurora);
    letter-spacing: -0.01em;
  }
  h2 {
    font-size: 13pt;
    line-height: 1.2;
    margin: 6mm 0 2mm 0;
    color: var(--ink);
    border-bottom: 1px solid var(--rule);
    padding-bottom: 1.5mm;
  }
  h3 {
    font-size: 11pt;
    margin: 4mm 0 1.5mm 0;
    color: var(--ink);
  }
  p {
    margin: 0 0 2.5mm 0;
  }
  ul, ol {
    margin: 0 0 3mm 0;
    padding-left: 5mm;
  }
  li {
    margin-bottom: 1.5mm;
  }
  a {
    color: var(--aurora);
    text-decoration: none;
    word-break: break-word;
  }
  /* Markdown-it wraps the lead quote in a blockquote — style it as a
     deck-style pull-quote so the one-line pitch reads as the hook. */
  blockquote {
    margin: 4mm 0 5mm 0;
    padding: 3mm 4mm;
    border-left: 3px solid var(--aurora);
    background: #f6f4ff;
    color: var(--ink);
    font-size: 11pt;
  }
  blockquote p { margin: 0; }
  strong { color: var(--ink); }
  code {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo,
      monospace;
    font-size: 9.5pt;
    background: #f1f2f7;
    padding: 0.5mm 1.5mm;
    border-radius: 1mm;
  }
  hr {
    border: none;
    border-top: 1px solid var(--rule);
    margin: 4mm 0;
  }
  /* Footer line — repeat the homepage URL on every printed page so
     a torn-out sheet still leads back to the site. */
  @page {
    @bottom-center {
      content: "beko2210.github.io/astraudit · MIT-licensed · 2026-05";
      font-family: Inter, sans-serif;
      font-size: 8pt;
      color: #6c7488;
    }
  }
</style>
</head>
<body>
  <main>${rendered}</main>
</body>
</html>`;
}

async function main(): Promise<void> {
  const source = readFileSync(SRC_MD, "utf8");
  const rendered = md.render(source);
  const html = htmlTemplate(rendered);

  console.log("Launching headless Chromium…");
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    // `setContent` with `waitUntil: "networkidle"` lets the (no-op)
    // network settle before the print — important when the template
    // grows to include a remote font CDN. Today everything is inline,
    // so the wait is cheap insurance.
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    writeFileSync(OUT_PDF, pdf);
    console.log(`  → ${OUT_PDF} (${(pdf.length / 1024).toFixed(1)} KB)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Press-PDF render failed:", err);
  process.exit(1);
});
