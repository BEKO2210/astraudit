/**
 * Phase 6.8 — Reduced-motion fallback consistency guard.
 *
 * Every `animate-*` Tailwind class in `src/` must be gated by either
 * `motion-safe:` (preferred — animation runs by default, suppressed
 * for `prefers-reduced-motion: reduce`) or `motion-reduce:` (the
 * inverse — used when we DO want a reduced-motion-specific class).
 *
 * Why both forms work:
 *   - `motion-safe:animate-spin` only generates the rule inside a
 *     `@media (prefers-reduced-motion: no-preference)` query, so
 *     reduced-motion users see the static icon.
 *   - `motion-reduce:` has the opposite scope; we don't currently
 *     use it for animations, but it counts as a deliberate gate.
 *
 * The CSS-side companion is `.skeleton-shimmer`, which carries its
 * own `@media (prefers-reduced-motion: reduce)` block (animation:
 * none + background-image: none). The Tooltip transition timings in
 * `globals.css` are 120 ms — short enough that WCAG SC 2.3.3 doesn't
 * require gating, and the `motion-reduce:duration-0` companion isn't
 * worth the noise.
 *
 * If this test catches a new offender:
 *   1. Add `motion-safe:` in front of the `animate-*` class.
 *   2. Verify the static (no-animation) state is still recognisable
 *      to the user (a static spinner icon next to "Loading…" text
 *      is fine; a CTA that depends on a flash to draw attention is
 *      not).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, "../../../src");

/** Tailwind animate utilities (built-ins + Astraudit's custom names). */
const ANIMATE_RE = /(?<![a-zA-Z-])animate-[a-zA-Z][\w-]*/g;

/** Allow-list — `[toast-in_180ms_ease-out]` arbitrary value form, etc. */
const TAILWIND_ARBITRARY_RE = /animate-\[[^\]]+\]/g;

interface Offender {
  file: string;
  line: number;
  match: string;
  context: string;
}

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && /\.(ts|tsx|css)$/.test(entry.name)) yield p;
  }
}

function findOffenders(): Offender[] {
  const out: Offender[] = [];
  for (const file of walk(SRC_DIR)) {
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, idx) => {
      // Skip CSS files — the @media (prefers-reduced-motion) blocks
      // there gate animations directly, e.g. `.skeleton-shimmer`.
      if (file.endsWith(".css")) return;
      // Strip comments + strings inside arbitrary values so we don't
      // false-positive on doc text. Comments aren't scanned because
      // `animate-spin` in a "// see also animate-spin" line counts.
      const stripped = line
        .replace(/\/\/.*$/, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      // Allow Tailwind arbitrary-value form (`animate-[toast-in_180ms]`).
      const arbitraries = stripped.match(TAILWIND_ARBITRARY_RE) ?? [];
      let cleaned = stripped;
      for (const a of arbitraries) cleaned = cleaned.replace(a, "");
      const matches = cleaned.match(ANIMATE_RE);
      if (!matches) return;
      for (const match of matches) {
        // The match is the bare `animate-X`. Look for a preceding
        // `motion-safe:` or `motion-reduce:` prefix on the same token.
        // Tailwind variants attach as `motion-safe:animate-spin`, so
        // we re-search for the prefixed form in the same line.
        const prefixedRe = new RegExp(
          `motion-(safe|reduce):${match.replace(/[-\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`,
        );
        if (prefixedRe.test(stripped)) continue;
        out.push({
          file: path.relative(path.resolve(SRC_DIR, ".."), file),
          line: idx + 1,
          match,
          context: stripped.trim().slice(0, 120),
        });
      }
    });
  }
  return out;
}

describe("animate-* Tailwind classes are gated by motion-safe:/motion-reduce:", () => {
  it("every consumer in src/ either prefixes the class or uses an arbitrary value", () => {
    const offenders = findOffenders();
    expect(
      offenders,
      `\nUngated animation(s) found — wrap with motion-safe: so prefers-reduced-motion users see a static state:\n` +
        offenders
          .map((o) => `  ${o.file}:${o.line}  ${o.match}\n    > ${o.context}`)
          .join("\n"),
    ).toEqual([]);
  });
});
