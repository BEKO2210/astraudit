/**
 * `?rules=ts` — Roadmap M5.3.
 *
 * Reads `tsconfig.json` and surfaces signals about TypeScript
 * strictness configuration. Only runs when the visitor enables
 * the pack via the URL flag; the canonical audit is unchanged.
 *
 * Detection strategy
 * - Parse `tsconfig.json` as JSONC (tolerates `// line comments`,
 *   block comments, and trailing commas — all three are
 *   legal in tsconfig but break `JSON.parse`).
 * - We do NOT resolve `extends` chains. A tsconfig that defers
 *   strictness to `@tsconfig/strictest` reads as "strict not
 *   explicit here" in the audit; the dashboard surfaces that
 *   honestly rather than guessing what a base config does.
 * - We never execute user code.
 *
 * Findings
 * - `ts-no-tsconfig` (LOW)        — TS project (has .ts files or
 *   typescript in deps) but ships no tsconfig.json.
 * - `ts-strict-on` (INFO)         — `strict: true`.
 * - `ts-strict-off` (MEDIUM)      — `strict` missing or false AND
 *   none of the eight strict-family flags are individually set.
 * - `ts-strict-partial` (LOW)     — `strict` is false but some
 *   individual strict-family flags are explicit. Surfaces which
 *   are on / off so the reviewer can see the actual posture.
 * - `ts-extra-strict-on` (INFO)   — any of the
 *   "modern-recommended-but-off-by-default" flags are enabled:
 *   `noUncheckedIndexedAccess`, `noImplicitOverride`,
 *   `exactOptionalPropertyTypes`,
 *   `noPropertyAccessFromIndexSignature`,
 *   `noFallthroughCasesInSwitch`, `noImplicitReturns`.
 * - `ts-extra-strict-suggest` (LOW)— `strict: true` but none of
 *   the above extras are on. Soft nudge: when a team has already
 *   committed to strict mode, the marginal cost of these extras
 *   is small relative to the bug-surface they close.
 */

import type { Finding } from "../../../../types/finding";
import type { RulePackContext, RulePackRunner } from "../types";

/** Strip JSONC comments + trailing commas before `JSON.parse`. */
function stripJsonc(input: string): string {
  // The order matters: comments first (so we don't mangle a `//` inside
  // a string), then trailing commas. The string-literal regex below
  // skips characters inside `"..."` so commented-out text inside a
  // string is preserved.
  let out = "";
  let i = 0;
  const len = input.length;
  while (i < len) {
    const ch = input[i];
    const next = input[i + 1];
    // Single-line // comment
    if (ch === "/" && next === "/") {
      const eol = input.indexOf("\n", i + 2);
      i = eol === -1 ? len : eol;
      continue;
    }
    // Block /* ... */ comment
    if (ch === "/" && next === "*") {
      const end = input.indexOf("*/", i + 2);
      i = end === -1 ? len : end + 2;
      continue;
    }
    // String literal — copy verbatim (with escape handling).
    if (ch === '"') {
      const start = i;
      i++;
      while (i < len) {
        if (input[i] === "\\") {
          i += 2;
          continue;
        }
        if (input[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      out += input.slice(start, i);
      continue;
    }
    out += ch;
    i++;
  }
  // Trailing commas before `]` or `}` — legal in JSONC, not in JSON.
  return out.replace(/,(\s*[\]}])/g, "$1");
}

/** Flags that `"strict": true` implicitly enables. */
const STRICT_FAMILY = [
  "noImplicitAny",
  "strictNullChecks",
  "strictFunctionTypes",
  "strictBindCallApply",
  "strictPropertyInitialization",
  "noImplicitThis",
  "useUnknownInCatchVariables",
  "alwaysStrict",
] as const;

/** Strict-but-off-by-default extras worth surfacing. */
const EXTRA_STRICT = [
  "noUncheckedIndexedAccess",
  "noImplicitOverride",
  "exactOptionalPropertyTypes",
  "noPropertyAccessFromIndexSignature",
  "noFallthroughCasesInSwitch",
  "noImplicitReturns",
] as const;

type CompilerOpts = Record<string, unknown> | undefined;

interface ParsedConfig {
  compilerOptions?: CompilerOpts;
}

function parseTsconfig(content: string): ParsedConfig | null {
  try {
    return JSON.parse(stripJsonc(content)) as ParsedConfig;
  } catch {
    return null;
  }
}

function isBoolTrue(opts: CompilerOpts, key: string): boolean {
  return opts != null && opts[key] === true;
}

function isBoolExplicitFalse(opts: CompilerOpts, key: string): boolean {
  return opts != null && opts[key] === false;
}

/** Does the repo look like a TypeScript project? */
function isTypeScriptProject(ctx: RulePackContext): boolean {
  if (ctx.deps.isTypescriptProject) return true;
  for (const path of ctx.classified.blobPaths) {
    if (path.toLowerCase().endsWith(".ts") || path.toLowerCase().endsWith(".tsx")) {
      return true;
    }
  }
  return false;
}

export const runTsPack: RulePackRunner = (ctx) => {
  const out: Finding[] = [];
  const tsconfigFile =
    ctx.classified.importantFileMap.get("tsconfig.json") ??
    ctx.classified.importantFileMap.get("tsconfig.json".toLowerCase());

  const isTs = isTypeScriptProject(ctx);

  if (!tsconfigFile?.content) {
    if (isTs) {
      out.push({
        id: "ts-no-tsconfig",
        title: "TypeScript project without a tsconfig.json",
        category: "quality",
        severity: "low",
        description:
          "The repository contains TypeScript sources but no tsconfig.json was found at the root. Without a checked-in config every contributor's editor / build relies on defaults, which makes strictness drift invisible.",
        evidence: "tsconfig.json absent from the repository root.",
        recommendation:
          "Commit a tsconfig.json that at minimum sets `\"strict\": true` and `\"target\": \"ES2022\"`. Modern toolchains (Vite, tsc, ts-node) all honour it without further wiring.",
        affectedFiles: [],
        confidence: "medium",
      });
    }
    return out;
  }

  const parsed = parseTsconfig(tsconfigFile.content);
  if (!parsed) {
    // We don't surface a finding for an unparseable tsconfig: the
    // core audit will already flag the JSON parse error via
    // ImportantFile; doubling up here would just add noise.
    return out;
  }

  const co = parsed.compilerOptions;
  const strict = isBoolTrue(co, "strict");

  // Explicit per-flag overrides — note `strict: true` is the
  // *default* for every family member, but `"strict": true,
  // "strictNullChecks": false` is legal and disables that one
  // member. We honour explicit `false` overrides.
  const familyOn: string[] = [];
  const familyOff: string[] = [];
  for (const flag of STRICT_FAMILY) {
    if (isBoolTrue(co, flag)) {
      familyOn.push(flag);
    } else if (isBoolExplicitFalse(co, flag)) {
      familyOff.push(flag);
    }
  }
  const extrasOn = EXTRA_STRICT.filter((f) => isBoolTrue(co, f));
  const extrasOff = EXTRA_STRICT.filter((f) => !isBoolTrue(co, f));

  if (strict) {
    out.push({
      id: "ts-strict-on",
      title: "tsconfig declares strict mode",
      category: "quality",
      severity: "info",
      description:
        "compilerOptions.strict is true, enabling the eight strict-family flags by default (noImplicitAny, strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, noImplicitThis, useUnknownInCatchVariables, alwaysStrict).",
      evidence:
        familyOff.length > 0
          ? `Explicitly disabled despite strict: ${familyOff.join(", ")}`
          : "All eight strict-family flags effectively enabled.",
      recommendation:
        familyOff.length > 0
          ? `${familyOff.join(", ")} ${
              familyOff.length === 1 ? "is" : "are"
            } explicitly disabled — re-enable when the corresponding fix is in scope.`
          : "Keep this configuration; opting into strict mode is the single biggest TypeScript bug-surface reduction.",
      affectedFiles: ["tsconfig.json"],
      confidence: "high",
    });
  } else if (familyOn.length > 0) {
    out.push({
      id: "ts-strict-partial",
      title: `tsconfig enables some strict flags individually (${familyOn.length}/8)`,
      category: "quality",
      severity: "low",
      description:
        "compilerOptions.strict is not true, but some strict-family flags are enabled individually. Flipping `strict: true` would enable all eight at once and prevent silent drift when new strict-family flags are added.",
      evidence: `Enabled: ${familyOn.join(", ")}`,
      recommendation:
        "Replace the individual flags with `\"strict\": true`. Remove any now-redundant per-flag entries from compilerOptions.",
      affectedFiles: ["tsconfig.json"],
      confidence: "high",
    });
  } else {
    out.push({
      id: "ts-strict-off",
      title: "tsconfig does not enable strict mode",
      category: "quality",
      severity: "medium",
      description:
        "compilerOptions.strict is not enabled and none of the eight strict-family flags are set individually. The TypeScript compiler is running in its loosest mode — implicit any, no null checks, no strict function variance.",
      evidence:
        "tsconfig.json has neither `\"strict\": true` nor an individual strict-family flag.",
      recommendation:
        "Add `\"strict\": true` to compilerOptions. Most modern codebases can adopt it in one pass; older ones often opt in flag-by-flag (strictNullChecks first, then noImplicitAny).",
      affectedFiles: ["tsconfig.json"],
      confidence: "high",
    });
  }

  if (extrasOn.length > 0) {
    out.push({
      id: "ts-extra-strict-on",
      title: `Extra strict flags enabled: ${extrasOn.length}/${EXTRA_STRICT.length}`,
      category: "quality",
      severity: "info",
      description:
        "The tsconfig opts into one or more of the modern-recommended-but-off-by-default flags. These catch a class of bugs that `strict: true` alone does not.",
      evidence: `Enabled: ${extrasOn.join(", ")}`,
      recommendation:
        extrasOff.length > 0
          ? `Consider also enabling: ${extrasOff.join(", ")}.`
          : "All recommended extras are on — keep this configuration.",
      affectedFiles: ["tsconfig.json"],
      confidence: "high",
    });
  } else if (strict) {
    out.push({
      id: "ts-extra-strict-suggest",
      title: "Strict mode is on; consider the extra strict flags",
      category: "quality",
      severity: "low",
      description:
        "compilerOptions.strict is true, which is great. Several modern flags that close additional bug classes are off by default and could be opted into now that the team has accepted strict semantics.",
      evidence: `None of: ${EXTRA_STRICT.join(", ")} are enabled.`,
      recommendation:
        "Try `noUncheckedIndexedAccess` first — it's the highest-leverage of the extras, surfacing every array / object index access that could be undefined. `noImplicitOverride` is also cheap.",
      affectedFiles: ["tsconfig.json"],
      confidence: "medium",
    });
  }

  return out;
};

export const __test = {
  stripJsonc,
  parseTsconfig,
  STRICT_FAMILY,
  EXTRA_STRICT,
};
