/**
 * Phase 6.6 — Animation fill-mode + containing-block guard.
 *
 * Background: the BadgeDialog regression (commit 5973619). The
 * `view-enter` keyframe ENDED with `transform: translateY(0)`
 * (an identity matrix), and the consumer applied the animation with
 * `fill-mode: both`. Combined, that left the wrapper holding an
 * identity transform forever. Per CSSWG, *any* non-`none` transform
 * on an ancestor turns it into a containing block for `position:
 * fixed` descendants — so the dialog's `fixed inset-0` overlay
 * anchored to the wrapper instead of the viewport, ballooning to
 * ~7,000 px tall and pushing the card off-screen.
 *
 * This test re-walks every keyframe in `tailwind.config.ts` and locks
 * three contracts:
 *
 *   1. Every NAMED animation is registered in `theme.extend.animation`
 *      (no orphan keyframes that contributors forget to expose).
 *   2. Animations with `fill-mode: both` MUST NOT end in a non-identity
 *      `transform: ...` declaration. `backwards` is the safe default
 *      for one-shot enter animations.
 *   3. Looping animations may animate `transform`, but the consumers
 *      MUST be leaf elements (no `position: fixed` descendants). We
 *      can't enforce the second half from a unit test, so we keep a
 *      manually-maintained whitelist below — a contributor who adds a
 *      new looping transform animation MUST add the consumer locations
 *      and verify they're all leaves.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../..");
const CONFIG = fs.readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf8");

interface Keyframe {
  name: string;
  /** The raw body between { and the matching closing brace. */
  body: string;
  /** Animates a `transform: ...` somewhere in its body. */
  hasTransform: boolean;
  /** The 100% step (or the last step) holds a non-identity transform. */
  endsWithTransform: boolean;
}

interface AnimationDef {
  name: string;
  /** Full shorthand value, e.g. "view-enter 220ms ease-out backwards". */
  value: string;
  fillMode: "none" | "forwards" | "backwards" | "both" | null;
  isInfinite: boolean;
}

/**
 * Extract balanced-brace blocks for a section like `keyframes:` or
 * `animation:`. We can't use a real CSS parser here without pulling in
 * an extra dep, so we walk the source character-by-character.
 */
function extractObjectBody(source: string, key: string): string | null {
  const start = source.indexOf(`${key}:`);
  if (start < 0) return null;
  const open = source.indexOf("{", start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

function parseKeyframes(body: string): Keyframe[] {
  // Walk the body and only pick up keyframe names at depth 0 (the
  // outer `keyframes: { ... }` block). The inner step selectors
  // (`"0%, 100%": { ... }`) live at depth 1 and must be skipped.
  const out: Keyframe[] = [];
  const nameRe = /(?:"([^"]+)"|([a-zA-Z_][\w-]*))\s*:\s*\{/g;
  let depth = 0;
  let i = 0;
  while (i < body.length) {
    if (depth === 0) {
      nameRe.lastIndex = i;
      const m = nameRe.exec(body);
      if (!m || m.index !== i) {
        // Not a name-at-depth-0 here. Walk forward one char, but track
        // brace depth as we go.
        if (body[i] === "{") depth++;
        else if (body[i] === "}") depth--;
        i++;
        continue;
      }
      const name = m[1] ?? m[2]!;
      const openAt = m.index + m[0].length - 1; // index of "{"
      let d = 1;
      let end = openAt + 1;
      while (end < body.length && d > 0) {
        if (body[end] === "{") d++;
        else if (body[end] === "}") d--;
        end++;
      }
      const stepsBody = body.slice(openAt + 1, end - 1);
      const hasTransform = /transform:/.test(stepsBody);
      const stepRe =
        /"?([^"\s,{}]+(?:\s*,\s*[^"\s,{}]+)*)"?\s*:\s*\{([^}]*)\}/g;
      let stepMatch: RegExpExecArray | null;
      let endsWithTransform = false;
      while ((stepMatch = stepRe.exec(stepsBody)) !== null) {
        const selector = stepMatch[1];
        const stepProps = stepMatch[2];
        if (/(^|\s|,)100%(\s|,|$)/.test(selector)) {
          const tx = stepProps.match(/transform:\s*"?([^",}]+)/);
          if (tx) {
            const value = tx[1].trim();
            if (value !== "none" && value !== "") endsWithTransform = true;
          }
        }
      }
      out.push({ name, body: stepsBody, hasTransform, endsWithTransform });
      i = end;
    } else {
      // Inside a nested block — fast-forward to the matching close.
      if (body[i] === "{") depth++;
      else if (body[i] === "}") depth--;
      i++;
    }
  }
  return out;
}

function parseAnimations(body: string): AnimationDef[] {
  // Each animation is: <name>: "<value>" where <name> is bare or quoted.
  const out: AnimationDef[] = [];
  const re = /(?:"([^"]+)"|([a-zA-Z_][\w-]*))\s*:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const name = m[1] ?? m[2]!;
    const value = m[3];
    const fillMode =
      (["none", "forwards", "backwards", "both"] as const).find((f) =>
        new RegExp(`(^|\\s)${f}(\\s|$)`).test(value),
      ) ?? null;
    out.push({
      name,
      value,
      fillMode,
      isInfinite: /\binfinite\b/.test(value),
    });
  }
  return out;
}

/** Looping transform-animating keyframes whose consumers we've already
 *  audited as leaf-only (no `position: fixed` descendants). When this
 *  list changes, audit every callsite and add a comment justifying
 *  the new entry. */
const APPROVED_LOOPING_TRANSFORMS = new Set([
  // pulseRing: scale oscillation. Used in EmptyFindingsCelebration on
  // four leaf <Star>/<SparkleIcon> elements + one inert glow <div>
  // (children: none). Verified Phase 6.6.
  "pulseRing",
  // floaty: translateY oscillation. Used in EmptyFindingsCelebration
  // on two leaf decorative icons. Verified Phase 6.6.
  "floaty",
]);

describe("tailwind keyframes — fill-mode + containing-block guard", () => {
  const keyframesBody = extractObjectBody(CONFIG, "keyframes");
  const animationsBody = extractObjectBody(CONFIG, "animation");

  const keyframes = keyframesBody ? parseKeyframes(keyframesBody) : [];
  const animations = animationsBody ? parseAnimations(animationsBody) : [];

  it("parses both blocks from tailwind.config.ts", () => {
    expect(keyframes.length, "no keyframes parsed").toBeGreaterThan(0);
    expect(animations.length, "no animations parsed").toBeGreaterThan(0);
  });

  it("every keyframe has a registered animation", () => {
    const animationNames = new Set(animations.map((a) => a.name));
    const orphans = keyframes
      .map((k) => k.name)
      .filter((n) => !animationNames.has(n));
    expect(
      orphans,
      `Orphan keyframe(s) — define an entry in theme.extend.animation:\n  ${orphans.join(", ")}`,
    ).toEqual([]);
  });

  it("no animation uses fill-mode: both with a transform end-state", () => {
    // `both` keeps the 100% styles applied forever. Combined with a
    // transform end-state, that's exactly the BadgeDialog regression.
    const offenders = animations.flatMap((a) => {
      if (a.fillMode !== "both") return [];
      const k = keyframes.find((kf) => kf.name === a.name);
      if (!k || !k.endsWithTransform) return [];
      return [
        `  - "${a.name}" (${a.value}) holds a transform after the animation finishes`,
      ];
    });
    expect(
      offenders,
      `Containing-block trap risk — switch fill-mode to "backwards" or drop the trailing transform:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("looping transform-animating keyframes are explicitly approved as leaf-only", () => {
    // Looping animations hold the transform for their entire (effectively
    // forever) lifetime. If an ancestor of a `position: fixed` descendant
    // ever picks one of these up, the fixed descendant anchors to the
    // wrapper, not the viewport. We can't detect "leaf-only" from a unit
    // test, so we maintain an audited whitelist.
    const looping = animations.filter((a) => a.isInfinite);
    const unapproved = looping
      .filter((a) => {
        const k = keyframes.find((kf) => kf.name === a.name);
        return k?.hasTransform && !APPROVED_LOOPING_TRANSFORMS.has(a.name);
      })
      .map((a) => a.name);
    expect(
      unapproved,
      `New looping transform animation(s) detected — audit every consumer for fixed/absolute descendants, then add to APPROVED_LOOPING_TRANSFORMS:\n  ${unapproved.join(", ")}`,
    ).toEqual([]);
  });
});
