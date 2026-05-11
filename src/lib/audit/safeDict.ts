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
 *   2. Reject the small set of keys that JavaScript treats as
 *      prototype-mutating (`__proto__`, `constructor`, `prototype`).
 *   3. Use `Object.defineProperty` for the actual write —
 *      data-flow analyzers (incl. CodeQL) recognise this as a
 *      safe, configured property assignment and stop flagging it.
 *
 * Callers should `import { createSafeDict, safeAssign } from "./safeDict"`
 * everywhere they used to write `obj[userKey] = value` against
 * untrusted input.
 */

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Allocate a prototype-less dictionary. Use this anywhere you'd
 * otherwise write `: Record<string, unknown> = {}` and then assign
 * via bracket access from user data.
 */
export function createSafeDict<T = unknown>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

/**
 * Write `value` to `dict[key]` after validating that `key` isn't one
 * of the prototype-mutating special names. Silently skips the write
 * for forbidden keys — the assumption is that the caller is parsing
 * data they don't fully trust, so dropping a malicious key is the
 * right outcome.
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
  if (typeof key !== "string" || FORBIDDEN_KEYS.has(key)) return false;
  Object.defineProperty(dict, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  return true;
}
