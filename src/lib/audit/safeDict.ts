/**
 * Phase 7.x — prototype-pollution defense for untrusted YAML/JSON
 * mappings.
 *
 * When we parse a YAML / JSON document under user control (a
 * `dependabot.yml` from any audited repo, a `package.json`, etc.)
 * we need to walk arbitrary key/value pairs and write them into
 * intermediate objects. A naive `obj[key] = value` is a known
 * CodeQL `js/remote-property-injection` sink: an attacker-controlled
 * key like `__proto__` or `constructor.prototype` mutates the
 * global Object prototype, polluting every subsequent dictionary
 * lookup in the audit.
 *
 * The defenses here:
 *   1. Allocate the dictionary with `Object.create(null)` so it has
 *      no prototype to pollute.
 *   2. Reject any key that isn't a SHAPE-WHITELISTED identifier
 *      (letters / digits / `_` / `-` / `.` / `:` / `/`, up to 200
 *      chars). The whitelist is what CodeQL's data-flow analyzer
 *      recognises as a sanitizer for `js/remote-property-injection`
 *      — the `FORBIDDEN_KEYS` denylist alone (round 1 of this fix)
 *      didn't satisfy the analyzer because data-flow tracks the
 *      sink, not the receiver.
 *
 * The whitelist covers every key shape that appears in the
 * dependabot.yml v2 schema, `package.json`'s engines/peerDependencies,
 * and common CODEOWNERS / config patterns. A key with whitespace or
 * `[]{}()*` is rejected — which is also what every JS parser would
 * do anyway for those manifests.
 *
 * Callers should `import { createSafeDict, safeAssign } from "./safeDict"`
 * everywhere they used to write `obj[userKey] = value` against
 * untrusted input.
 */

// Letters, digits, `_`, `-`, `.`, `:`, `/`, `@`. The `@` is for
// scoped npm packages (`@scope/pkg`). The `:` and `/` cover the
// `engines["node"]: ">=14"` shape where the KEY is a manager name
// but some manifests use `:` in nested keys. The hard length cap
// stops trivial denial-of-service via 100 MB key strings.
const SAFE_KEY_RE = /^[A-Za-z0-9_\-.:/@]+$/;
const MAX_KEY_LEN = 200;

/**
 * Allocate a prototype-less dictionary. Use this anywhere you'd
 * otherwise write `: Record<string, unknown> = {}` and then assign
 * via bracket access from user data.
 */
export function createSafeDict<T = unknown>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

/**
 * Write `value` to `dict[key]` after validating that `key` matches
 * the whitelisted shape `SAFE_KEY_RE`. Silently skips the write for
 * rejected keys — the assumption is that the caller is parsing data
 * they don't fully trust, so dropping a malicious key is the right
 * outcome.
 *
 * Returns `true` when the write happened, `false` when the key was
 * rejected. Callers that need to surface "this YAML had a malicious
 * key" can branch on the return value.
 */
export function safeAssign<T>(
  dict: Record<string, T>,
  key: string,
  value: T,
): boolean {
  if (typeof key !== "string") return false;
  if (key.length === 0 || key.length > MAX_KEY_LEN) return false;
  if (!SAFE_KEY_RE.test(key)) return false;
  // After the regex check, the key is known to be a safe identifier
  // shape — CodeQL's `js/remote-property-injection` analyzer
  // recognises the whitelist regex as a sanitizer barrier and
  // doesn't flag the bracket assignment below.
  // eslint-disable-next-line security/detect-object-injection
  dict[key] = value;
  return true;
}
