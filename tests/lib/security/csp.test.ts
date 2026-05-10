/**
 * Phase 6.32 — CSP hash-drift guard.
 *
 * The Content-Security-Policy meta tag in index.html allow-lists the two
 * inline <script> blocks (JSON-LD + the pre-paint theme loader) by their
 * SHA-256 hash. If anyone edits either script body — even a whitespace
 * change — the hash silently drifts and the browser blocks execution at
 * runtime. The dashboard would render dark for everyone, light-mode
 * users would see a flash, and search engines would silently lose the
 * structured-data card.
 *
 * This test re-computes both hashes from the live source and asserts
 * the meta tag carries them. A byte-level edit makes the test red and
 * the fix is mechanical: copy the new hash into the meta tag.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const INDEX_HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

function sha256(body: string): string {
  return (
    "sha256-" + crypto.createHash("sha256").update(body, "utf8").digest("base64")
  );
}

function stripHtmlComments(html: string): string {
  // HTML comments may contain the literal `<script>` substring inside
  // explanatory prose (e.g. the CSP comment block above the meta tag).
  // We strip them before scanning so the script-tag regex never matches
  // text that the browser itself ignores.
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function extractInlineScripts(html: string): { type: string; body: string }[] {
  // Match <script ...>BODY</script> where the opening tag has no `src=`
  // attribute (= inline). Capture the optional type for the assertions.
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  const out: { type: string; body: string }[] = [];
  const cleaned = stripHtmlComments(html);
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const attrs = m[1];
    if (/\bsrc\s*=/.test(attrs)) continue; // external script
    const typeMatch = attrs.match(/\btype\s*=\s*"([^"]+)"/);
    out.push({ type: typeMatch?.[1] ?? "", body: m[2] });
  }
  return out;
}

function extractCspMeta(html: string): string | null {
  const re =
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i;
  const m = html.match(re);
  return m?.[1] ?? null;
}

describe("index.html — Content-Security-Policy", () => {
  const csp = extractCspMeta(INDEX_HTML);
  const inlineScripts = extractInlineScripts(INDEX_HTML);

  it("ships a meta http-equiv CSP tag", () => {
    expect(csp, "CSP meta tag missing from index.html").not.toBeNull();
  });

  it("has exactly two inline <script> blocks (JSON-LD + theme loader)", () => {
    // If this count changes, the CSP script-src hash list must change too.
    // Bump the expected count and add the new hash to index.html and the
    // assertions below.
    expect(inlineScripts.map((s) => s.type)).toEqual([
      "application/ld+json",
      "",
    ]);
  });

  it("allow-lists every inline script by its current SHA-256 hash", () => {
    expect(csp).not.toBeNull();
    for (const script of inlineScripts) {
      const expected = sha256(script.body);
      expect(
        csp,
        `CSP missing hash for inline ${script.type || "no-type"} script.\n` +
          `Edit index.html and replace the stale hash with: '${expected}'`,
      ).toContain(expected);
    }
  });

  it("locks core directives (script-src/object-src/base-uri/connect-src)", () => {
    expect(csp).not.toBeNull();
    // No 'unsafe-inline' / 'unsafe-eval' on script-src — the whole point
    // of hash allow-listing is to keep these off.
    expect(csp!).toMatch(/script-src 'self'/);
    expect(csp!).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp!).not.toMatch(/script-src[^;]*'unsafe-eval'/);
    // Plugins blocked entirely.
    expect(csp!).toMatch(/object-src 'none'/);
    // <base> hijacking blocked.
    expect(csp!).toMatch(/base-uri 'self'/);
    // GitHub API + raw content + same-origin only.
    expect(csp!).toMatch(/connect-src 'self' https:\/\/api\.github\.com/);
    expect(csp!).toMatch(/https:\/\/raw\.githubusercontent\.com/);
  });

  it("does not allow any third-party origin for styles or fonts (Phase 6.33: self-hosted)", () => {
    expect(csp).not.toBeNull();
    // Fonts ship from /assets/ via @fontsource; Google Fonts allow-list
    // was dropped together with the CDN preconnect.
    expect(csp!).not.toMatch(/fonts\.googleapis\.com/);
    expect(csp!).not.toMatch(/fonts\.gstatic\.com/);
    expect(csp!).toMatch(/font-src 'self'/);
    expect(csp!).toMatch(/style-src 'self' 'unsafe-inline'/);
  });
});
