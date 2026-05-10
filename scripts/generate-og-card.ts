/**
 * Phase 5.12 — OG card image generator.
 *
 * Renders `scripts/og-card-template.html` at 1200×630 in headless
 * Chromium and screenshots the result to `public/og-card.png`. The
 * PNG is committed to the repo so deploys don't need network access
 * to Google Fonts or Playwright at build time. Re-run this script
 * any time the template changes.
 *
 * Why a real PNG and not an SVG-only OG image:
 *   - Twitter / Facebook / Slack / LinkedIn crawlers all support
 *     PNG; SVG is hit-or-miss (LinkedIn rejects, older Slack
 *     clients distort).
 *   - PNG is large (~50 KB) but only loaded once per shared link.
 *
 * Run:
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx tsx scripts/generate-og-card.ts
 */

import { readFileSync, writeFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const TEMPLATE = resolve(process.cwd(), "scripts/og-card-template.html");
const LOGO_PATH = resolve(process.cwd(), "public/Logo_bg_removed.png");
const OUT_PATH = join(process.cwd(), "public/og-card.png");

async function main(): Promise<void> {
  const html = readFileSync(TEMPLATE, "utf8");

  // Inline the original logo as a base64 data URL so the headless
  // browser can resolve it without a base href. The template uses
  // `{{LOGO_DATA_URL}}` as the placeholder.
  const logoBuf = readFileSync(LOGO_PATH);
  const logoDataUrl = `data:image/png;base64,${logoBuf.toString("base64")}`;
  const filledHtml = html.replace("{{LOGO_DATA_URL}}", logoDataUrl);

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.setContent(filledHtml, { waitUntil: "networkidle" });
    // Belt-and-suspenders wait so Inter / JetBrains Mono swap in
    // before the screenshot — without this the headline can render
    // in the system fallback font on a cold machine.
    await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());

    const buf = await page.screenshot({
      type: "png",
      fullPage: false,
      omitBackground: false,
    });
    writeFileSync(OUT_PATH, buf);
  } finally {
    await browser.close();
  }

  const rawSize = statSync(OUT_PATH).size;

  // Compress in place via pngquant (palette-quantised + stripped of
  // ancillary chunks). Drops the file from ~700 KB to ~180 KB while
  // staying lossless-perceptual at our typical render scale.
  // Skip if pngquant isn't installed locally (CI image always has
  // it, dev machines may not).
  try {
    execFileSync(
      "pngquant",
      ["--quality=72-92", "--strip", "--speed", "1", "--output", OUT_PATH, "--force", OUT_PATH],
      { stdio: "ignore" },
    );
  } catch (err) {
    console.warn(
      `pngquant unavailable, skipping compression — install via 'apt-get install pngquant' or 'brew install pngquant'`,
    );
    void err;
  }

  const finalSize = statSync(OUT_PATH).size;
  console.log(
    `OG card written: ${OUT_PATH} (${(finalSize / 1024).toFixed(1)} KB${
      finalSize !== rawSize
        ? `, compressed from ${(rawSize / 1024).toFixed(1)} KB`
        : ""
    })`,
  );
}

main().catch((err) => {
  console.error("OG card generation failed:", err);
  process.exit(1);
});
