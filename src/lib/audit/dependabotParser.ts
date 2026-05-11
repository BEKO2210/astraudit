/**
 * Dependabot v2 config parser — Phase 3.2.
 *
 * The audit already detects whether `.github/dependabot.yml` exists.
 * This parser adds the *content* — which ecosystems are watched, what
 * cadence, how many groups / target branches, etc. — so we can move
 * from "dependabot configured: yes / no" to a useful summary.
 *
 * Design choice: we do NOT pull a full YAML library. Astraudit's
 * runtime is browser-only and dependency-light, and the Dependabot
 * schema is narrow + well-defined (GitHub publishes it). A scoped
 * parser tuned to the v2 schema is ~150 LOC, ships zero new bytes
 * to the browser bundle, and degrades gracefully (returns null) when
 * it hits any unfamiliar shape — which is the right failure mode
 * for a static auditor.
 *
 * What we support:
 *   - Block-style mappings (`key: value`, `key:` then indented children)
 *   - Block-style sequences (`- key: value`, `- value`)
 *   - Inline scalars (quoted single / double / unquoted)
 *   - Inline numbers
 *   - Full-line comments and trailing comments (when not inside quotes)
 *
 * What we DO NOT support (returns null when encountered):
 *   - Anchors / aliases (`&`, `*`)
 *   - Tags (`!!str`)
 *   - Multi-line block scalars (`|`, `>`)
 *   - Inline flow mappings (`{a: b}`) — except for the common case of
 *     inline arrays which we partially parse
 *
 * Pre-build research (2026-05-10):
 *   - GitHub Docs · *Dependabot options reference* — confirmed schema
 *     (version: 2, updates: [...], required keys per update, full list
 *     of `package-ecosystem` and `schedule.interval` values).
 *     https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference
 */

/** Value of `schedule.interval`. GitHub adds new ones occasionally; the
 * "unknown" branch keeps us forward-compatible. */
export type DependabotInterval =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semiannually"
  | "yearly"
  | "cron"
  | "unknown";

/** Single normalized update entry. Only the fields we surface in the UI. */
export interface DependabotUpdate {
  ecosystem: string;
  directory: string | null;
  /** Includes "directories" arrays — first entry only for display. */
  interval: DependabotInterval;
  openPullRequestsLimit: number | null;
  targetBranch: string | null;
  /** Number of grouping rules under `groups:`. */
  groupCount: number;
}

export interface ParsedDependabot {
  /** Whether the file declared `version: 2` at the top level. */
  versionTwo: boolean;
  updates: DependabotUpdate[];
  registryCount: number;
}

/* ------------------------------------------------------------------------- */

const KNOWN_INTERVALS = new Set<DependabotInterval>([
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "semiannually",
  "yearly",
  "cron",
]);

const STRING_QUOTES = /^['"](.*)['"]$/;

/** Strip a single layer of matching quotes around a string. */
function unquote(raw: string): string {
  const trimmed = raw.trim();
  const m = trimmed.match(STRING_QUOTES);
  return m ? m[1] : trimmed;
}

/** Strip trailing comment unless the `#` sits inside quotes. */
function stripTrailingComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "#" && !inSingle && !inDouble) {
      return line.slice(0, i).replace(/\s+$/, "");
    }
  }
  return line.replace(/\s+$/, "");
}

/** Indent of a line in spaces. Tabs counted as 4 (rare in YAML configs). */
function indentOf(line: string): number {
  let n = 0;
  for (const c of line) {
    if (c === " ") n += 1;
    else if (c === "\t") n += 4;
    else break;
  }
  return n;
}

/**
 * Tokenise the YAML into a flat array of meaningful lines, dropping
 * blanks and comments. Each token records indent + content.
 */
interface Token {
  indent: number;
  content: string;
}

function tokenise(yaml: string): Token[] {
  const out: Token[] = [];
  for (const raw of yaml.split(/\r?\n/)) {
    const stripped = stripTrailingComment(raw);
    if (!stripped.trim()) continue;
    out.push({ indent: indentOf(stripped), content: stripped.trim() });
  }
  return out;
}

/* ------------------------------------------------------------------------- */

/** Minimal recursive-descent block-YAML decoder, narrowly scoped to the
 * Dependabot v2 schema. Returns a JS object tree, or null on anything
 * the parser doesn't understand. */
function decodeBlock(tokens: Token[], start: number, parentIndent: number): {
  value: unknown;
  next: number;
} {
  if (start >= tokens.length) return { value: null, next: start };
  const head = tokens[start];
  if (head.indent <= parentIndent) {
    // Empty block at this level.
    return { value: null, next: start };
  }
  // Sequence: starts with `-` lines at the same indent.
  if (head.content.startsWith("- ") || head.content === "-") {
    const arr: unknown[] = [];
    let i = start;
    while (i < tokens.length && tokens[i].indent === head.indent) {
      const t = tokens[i];
      if (!(t.content.startsWith("- ") || t.content === "-")) break;
      const remainder = t.content === "-" ? "" : t.content.slice(2);
      if (!remainder) {
        // The item starts on the next line, deeper indent.
        const r = decodeBlock(tokens, i + 1, t.indent);
        arr.push(r.value);
        i = r.next;
      } else if (/^[A-Za-z0-9_.\-]+:\s*(?:\S.*)?$/.test(remainder)) {
        // Item is a mapping that starts on the same line as the dash.
        // The dash effectively becomes an indent of head.indent + 2.
        const inlineKv = parseKeyValue(remainder);
        if (!inlineKv) return { value: null, next: i };
        // Phase 7.x — Object.create(null) instead of `{}` so an
        // attacker-controlled YAML key like `__proto__` can't pollute
        // Object.prototype. CodeQL's `js/remote-property-injection`
        // fires on the bracket assignments below; the null-proto
        // object makes the entire mutation isolated from any
        // ambient prototype chain.
        const obj = Object.create(null) as Record<string, unknown>;
        if (inlineKv.value === null) {
          // Nested object on next line.
          const r = decodeBlock(tokens, i + 1, t.indent + 1);
          if (r.value === null) {
            obj[inlineKv.key] = null;
          } else {
            obj[inlineKv.key] = r.value;
          }
          i = r.next;
        } else {
          obj[inlineKv.key] = inlineKv.value;
          i += 1;
        }
        // Remaining sibling keys for this dash are at the *deeper* indent.
        while (i < tokens.length && tokens[i].indent > t.indent) {
          // They share parent indent of (t.indent + 2 typically). Grab
          // each key:value line.
          const sibling = tokens[i];
          if (sibling.indent <= t.indent) break;
          const kv = parseKeyValue(sibling.content);
          if (!kv) {
            // Unexpected line — bail.
            return { value: null, next: i };
          }
          if (kv.value === null) {
            const r = decodeBlock(tokens, i + 1, sibling.indent);
            obj[kv.key] = r.value;
            i = r.next;
          } else {
            obj[kv.key] = kv.value;
            i += 1;
          }
        }
        arr.push(obj);
      } else {
        // Plain scalar list item.
        arr.push(parseScalar(remainder));
        i += 1;
      }
    }
    return { value: arr, next: i };
  }
  // Mapping. Phase 7.x — null-proto object guards against
  // user-controlled YAML keys polluting Object.prototype via
  // `__proto__` / `constructor`.
  const obj = Object.create(null) as Record<string, unknown>;
  let i = start;
  while (i < tokens.length && tokens[i].indent === head.indent) {
    const t = tokens[i];
    const kv = parseKeyValue(t.content);
    if (!kv) return { value: null, next: i };
    if (kv.value === null) {
      const r = decodeBlock(tokens, i + 1, t.indent);
      obj[kv.key] = r.value;
      i = r.next;
    } else {
      obj[kv.key] = kv.value;
      i += 1;
    }
  }
  return { value: obj, next: i };
}

/** Try to split `key: value` (or `key:` with empty value). Returns null
 * on unrecognisable input so the caller can bail. */
function parseKeyValue(
  content: string,
): { key: string; value: unknown } | null {
  const m = content.match(/^([A-Za-z0-9_.\-]+):\s*(.*)$/);
  if (!m) return null;
  const key = m[1];
  const rest = m[2];
  if (!rest) return { key, value: null };
  return { key, value: parseScalar(rest) };
}

/** Decode a scalar value: number, inline array, quoted/unquoted string. */
function parseScalar(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Inline flow array `[a, "b", c]`. Mapping inline flow is intentionally
  // not supported (returns the raw string).
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    const parts = inner.split(",").map((p) => unquote(p.trim()));
    return parts.filter((p) => p !== "");
  }
  // Numbers.
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (/^-?\d+\.\d+$/.test(trimmed)) return Number(trimmed);
  // Booleans (Dependabot rarely uses them, but be safe).
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null" || trimmed === "~") return null;
  // String with quotes stripped.
  return unquote(trimmed);
}

/* ------------------------------------------------------------------------- */

/**
 * Parse a Dependabot config file. Returns null on:
 *   - empty / whitespace-only input
 *   - fatal parser errors (anchors, tags, block scalars, inline flow
 *     mappings, malformed indentation)
 *   - missing top-level `version: 2` declaration (we deliberately
 *     refuse to guess for v1 configs — the v1 schema is different)
 *   - missing `updates:` block
 */
export function parseDependabotConfig(yaml: string | null | undefined): ParsedDependabot | null {
  if (!yaml || !yaml.trim()) return null;
  const tokens = tokenise(yaml);
  if (tokens.length === 0) return null;

  // Top-level mapping starts at indent 0.
  if (tokens[0].indent !== 0) return null;
  const root = decodeBlock(tokens, 0, -1);
  const obj = root.value;
  if (!isPlainObject(obj)) return null;

  // version: 2 — accept both number 2 and string "2".
  const versionRaw = obj.version;
  const versionTwo =
    versionRaw === 2 || versionRaw === "2";
  if (!versionTwo) return null;

  const updatesRaw = obj.updates;
  if (!Array.isArray(updatesRaw)) return null;

  const updates: DependabotUpdate[] = [];
  for (const entry of updatesRaw) {
    if (!isPlainObject(entry)) continue;
    const ecosystemRaw = entry["package-ecosystem"];
    if (typeof ecosystemRaw !== "string") continue;
    const ecosystem = ecosystemRaw.trim();
    if (!ecosystem) continue;

    let directory: string | null = null;
    if (typeof entry.directory === "string") {
      directory = entry.directory;
    } else if (Array.isArray(entry.directories) && entry.directories.length) {
      const first = entry.directories[0];
      directory = typeof first === "string" ? first : null;
    }

    let interval: DependabotInterval = "unknown";
    const schedule = entry.schedule;
    if (isPlainObject(schedule)) {
      const v = schedule.interval;
      if (typeof v === "string" && (KNOWN_INTERVALS as Set<string>).has(v)) {
        interval = v as DependabotInterval;
      }
    }

    const openPullRequestsLimit = numberOrNull(
      entry["open-pull-requests-limit"],
    );

    const targetBranch =
      typeof entry["target-branch"] === "string"
        ? (entry["target-branch"] as string)
        : null;

    let groupCount = 0;
    const groups = entry.groups;
    if (isPlainObject(groups)) groupCount = Object.keys(groups).length;

    updates.push({
      ecosystem,
      directory,
      interval,
      openPullRequestsLimit,
      targetBranch,
      groupCount,
    });
  }

  let registryCount = 0;
  const registries = obj.registries;
  if (isPlainObject(registries)) registryCount = Object.keys(registries).length;

  return {
    versionTwo: true,
    updates,
    registryCount,
  };
}

/* ------------------------------------------------------------------------- */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

/* ------------------------------------------------------------------------- */
/* UI helpers                                                                 */
/* ------------------------------------------------------------------------- */

/** Pretty label for the cadence pill. */
export function formatInterval(interval: DependabotInterval): string {
  switch (interval) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "semiannually":
      return "Twice a year";
    case "yearly":
      return "Yearly";
    case "cron":
      return "Cron";
    case "unknown":
      return "—";
  }
}

/** Group updates by ecosystem so the UI can show "npm · weekly · 2 dirs". */
export interface EcosystemSummary {
  ecosystem: string;
  intervals: DependabotInterval[];
  directories: string[];
  totalGroupCount: number;
}

export function summariseByEcosystem(
  updates: DependabotUpdate[],
): EcosystemSummary[] {
  const map = new Map<string, EcosystemSummary>();
  for (const u of updates) {
    let entry = map.get(u.ecosystem);
    if (!entry) {
      entry = {
        ecosystem: u.ecosystem,
        intervals: [],
        directories: [],
        totalGroupCount: 0,
      };
      map.set(u.ecosystem, entry);
    }
    if (!entry.intervals.includes(u.interval)) entry.intervals.push(u.interval);
    if (u.directory && !entry.directories.includes(u.directory)) {
      entry.directories.push(u.directory);
    }
    entry.totalGroupCount += u.groupCount;
  }
  // Sort by ecosystem name for stable output.
  return Array.from(map.values()).sort((a, b) =>
    a.ecosystem.localeCompare(b.ecosystem),
  );
}
