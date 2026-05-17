/**
 * `?rules=i18n` — Roadmap M5.2.
 *
 * Surfaces signals about whether a repository is set up for
 * internationalisation. None of these checks fire in a default
 * audit; they only run when the visitor explicitly opts in via the
 * URL flag, so the canonical audit stays uncluttered for the 99%
 * of repos that don't ship locale files.
 *
 * Detection strategy (all evidence is file‑name / manifest based,
 * never executes user code):
 *   - Locale folders + locale files at conventional paths.
 *   - Known i18n libraries listed in `package.json` (dependencies
 *     + devDependencies + peerDependencies).
 *   - Alternate README translations (`README.de.md`, `README.ja.md`,
 *     `README_zh.md`, …).
 *
 * Outputs (severity ranks small on purpose — these are
 * informational rather than alarms; the i18n pack is opt‑in
 * specifically because most repos rationally choose to ship
 * English‑only):
 *   - `i18n-libraries`: INFO — names every i18n library detected.
 *   - `i18n-locale-coverage`: INFO — lists the locale codes
 *     extracted from filenames in locale folders.
 *   - `i18n-readme-translations`: INFO — names the alternate
 *     README files present.
 *   - `i18n-no-setup`: LOW — fires only when the repo ships a
 *     `package.json` (i.e. is a likely web app) but no i18n
 *     library + no locale folder + no translated README.
 *   - `i18n-readme-english-only`: LOW — repo HAS an i18n library
 *     OR multiple locale files but the README is English‑only.
 */

import type { Finding } from "../../../../types/finding";
import type { RulePackContext, RulePackRunner } from "../types";

/**
 * Conventional folder paths that house locale catalogs. Matched
 * case‑insensitively against full paths, both at the repo root and
 * one level deep (e.g. `apps/web/locales/de.json`).
 */
const LOCALE_FOLDER_HINTS = [
  "locales",
  "locale",
  "lang",
  "langs",
  "i18n",
  "messages",
  "translations",
  "translation",
] as const;

/**
 * Package manager dependency names that signal i18n tooling.
 * Detection is purely string membership against
 * `package.json` keys — no version parsing, no transitive lookup.
 */
const I18N_LIBRARIES = [
  "i18next",
  "react-i18next",
  "next-i18next",
  "i18next-browser-languagedetector",
  "next-intl",
  "react-intl",
  "@formatjs/intl",
  "formatjs",
  "@lingui/core",
  "@lingui/react",
  "@lingui/macro",
  "lingui",
  "vue-i18n",
  "@nuxtjs/i18n",
  "nuxt-i18n",
  "svelte-i18n",
  "polyglot",
  "node-polyglot",
  "node-gettext",
  "gettext-parser",
  "i18n",
  "rosetta",
] as const;

/**
 * Filename extensions that look like locale catalogs. `.po`, `.pot`
 * (gettext), `.xliff`, `.xlf` (XLIFF), `.arb` (Flutter), plus the
 * generic JSON/YAML extensions when the basename also looks like a
 * locale code.
 */
const LOCALE_FILE_EXTS = /\.(po|pot|mo|xliff|xlf|arb|properties)$/i;
/** ISO 639‑1 locale codes we'll accept as filename hints. */
const LOCALE_CODE = /^([a-z]{2})(?:[-_][A-Za-z0-9]{2,4})?$/;

interface DetectedLibrary {
  name: string;
  scope: "dependencies" | "devDependencies" | "peerDependencies";
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/** Read package.json once and dig out every detected i18n library. */
function detectI18nLibraries(ctx: RulePackContext): DetectedLibrary[] {
  const pkgFile =
    ctx.classified.importantFileMap.get("package.json") ??
    ctx.classified.importantFileMap.get("package.json".toLowerCase());
  if (!pkgFile?.content) return [];
  let parsed: PackageManifest | null = null;
  try {
    parsed = JSON.parse(pkgFile.content) as PackageManifest;
  } catch {
    return [];
  }
  const out: DetectedLibrary[] = [];
  const scopes: Array<DetectedLibrary["scope"]> = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ];
  for (const scope of scopes) {
    const block = parsed[scope];
    if (!block) continue;
    for (const lib of I18N_LIBRARIES) {
      if (lib in block) {
        out.push({ name: lib, scope });
      }
    }
  }
  return out;
}

/**
 * Walk every blob path, identify the ones that live inside a known
 * locale folder, and pull out the locale code from the basename.
 * Returns the deduped, sorted list of detected locale codes plus
 * the original file paths so the finding can cite evidence.
 */
function detectLocaleCoverage(ctx: RulePackContext): {
  locales: string[];
  files: string[];
} {
  const localesSeen = new Set<string>();
  const filesSeen: string[] = [];
  for (const path of ctx.classified.blobPaths) {
    const lower = path.toLowerCase();
    const segments = lower.split("/");
    const inLocaleFolder = segments
      .slice(0, -1)
      .some((seg) => (LOCALE_FOLDER_HINTS as readonly string[]).includes(seg));
    if (!inLocaleFolder) continue;
    const basename = segments[segments.length - 1] ?? "";
    // Either a recognised translation extension OR a JSON/YAML
    // file whose stem looks like a locale code.
    const ext = basename.includes(".") ? basename.slice(basename.lastIndexOf(".")) : "";
    const stem = basename.includes(".")
      ? basename.slice(0, basename.lastIndexOf("."))
      : basename;
    let code: string | null = null;
    if (LOCALE_FILE_EXTS.test(basename)) {
      // Foo.de.po → "de"; messages.de_DE.po → "de"
      const m = LOCALE_CODE.exec(stem.split(".").pop() ?? "");
      if (m) code = m[1]!;
    } else if (ext === ".json" || ext === ".yml" || ext === ".yaml") {
      const m = LOCALE_CODE.exec(stem);
      if (m) code = m[1]!;
    }
    if (code) {
      localesSeen.add(code);
      if (filesSeen.length < 12) filesSeen.push(path);
    }
  }
  return { locales: Array.from(localesSeen).sort(), files: filesSeen };
}

/**
 * Find alternate README files like `README.de.md`, `README_ja.md`,
 * `README-zh.md`. Returns the path + extracted locale code per file.
 */
function detectReadmeTranslations(
  ctx: RulePackContext,
): Array<{ path: string; code: string }> {
  const out: Array<{ path: string; code: string }> = [];
  for (const path of ctx.classified.blobPaths) {
    const lower = path.toLowerCase();
    // Match at the repo root only — nested READMEs are usually
    // package-level docs, not translations.
    if (lower.includes("/")) continue;
    const m =
      /^readme[._-]([a-z]{2})(?:[-_][a-z0-9]{2,4})?\.(?:md|mdx|rst|txt)$/i.exec(
        lower,
      );
    if (m) {
      out.push({ path, code: m[1]!.toLowerCase() });
    }
  }
  return out;
}

function ranWithPackageJson(ctx: RulePackContext): boolean {
  return ctx.deps.hasPackageJson;
}

export const runI18nPack: RulePackRunner = (ctx) => {
  const out: Finding[] = [];
  const libs = detectI18nLibraries(ctx);
  const coverage = detectLocaleCoverage(ctx);
  const readmes = detectReadmeTranslations(ctx);

  if (libs.length > 0) {
    out.push({
      id: "i18n-libraries",
      title: `i18n libraries detected (${libs.length})`,
      category: "documentation",
      severity: "info",
      description:
        "The package manifest declares one or more known internationalisation libraries.",
      evidence: libs.map((l) => `${l.name} (${l.scope})`).join(", "),
      recommendation:
        "Keep i18n catalogs in version control alongside the code that consumes them so reviewers can verify translations stay in sync with UI changes.",
      affectedFiles: ["package.json"],
      confidence: "high",
    });
  }

  if (coverage.locales.length > 0) {
    out.push({
      id: "i18n-locale-coverage",
      title: `Locale coverage: ${coverage.locales.join(", ")}`,
      category: "documentation",
      severity: "info",
      description: `Found ${coverage.locales.length} locale${
        coverage.locales.length === 1 ? "" : "s"
      } in conventional locale folders.`,
      evidence: coverage.files.slice(0, 8).join("\n"),
      recommendation:
        "Document the supported locales in the README so contributors know which translations are kept up to date.",
      affectedFiles: coverage.files,
      confidence: "high",
    });
  }

  if (readmes.length > 0) {
    out.push({
      id: "i18n-readme-translations",
      title: `Translated README files: ${readmes.map((r) => r.code).join(", ")}`,
      category: "documentation",
      severity: "info",
      description:
        "Alternate README files were detected at the repository root, signalling deliberate localisation of the project's front page.",
      evidence: readmes.map((r) => r.path).join("\n"),
      recommendation:
        "Cross-link each translated README from the canonical English one (and vice versa) so visitors arrive in the right language without guessing the filename.",
      affectedFiles: readmes.map((r) => r.path),
      confidence: "high",
    });
  }

  const hasAnyI18nSignal =
    libs.length > 0 || coverage.locales.length > 0 || readmes.length > 0;

  if (!hasAnyI18nSignal && ranWithPackageJson(ctx)) {
    out.push({
      id: "i18n-no-setup",
      title: "No internationalisation setup detected",
      category: "documentation",
      severity: "low",
      description:
        "The project ships a package.json but no i18n library, no locale folder, and no translated README. If the project serves users beyond a single language audience, this is a gap worth closing.",
      evidence:
        "Checked package.json dependencies for known i18n libraries, scanned for locale folders (locales/, i18n/, messages/, …), and looked for README.<lang>.md alternates.",
      recommendation:
        "Pick one of i18next, react-intl, next-intl, vue-i18n, @lingui/* depending on your stack. Extract user-facing strings into a single catalog file so future translators don't have to grep the codebase.",
      affectedFiles: ctx.deps.hasPackageJson ? ["package.json"] : [],
      confidence: "medium",
    });
  }

  // Soft warning: project clearly cares about i18n (has libs OR
  // multiple locales) but ships a single English README. The
  // README is usually the first thing international contributors
  // read; mismatched language signal is a tractable fix.
  const wantsI18n =
    libs.length > 0 || coverage.locales.filter((c) => c !== "en").length > 0;
  if (wantsI18n && readmes.length === 0) {
    out.push({
      id: "i18n-readme-english-only",
      title: "README appears to ship in English only",
      category: "documentation",
      severity: "low",
      description:
        "The project declares i18n libraries or maintains non-English locale catalogs but the repository root only ships an English README. International contributors typically read the README before exploring the UI — keeping the README single-language while the product is multilingual can feel inconsistent.",
      evidence:
        libs.length > 0
          ? `i18n libraries: ${libs.map((l) => l.name).join(", ")}`
          : `Non-English locales detected: ${coverage.locales
              .filter((c) => c !== "en")
              .join(", ")}`,
      recommendation:
        "Add a `README.<lang>.md` for each first-class locale and cross-link from the canonical English README. Even a translated short intro plus a link back is better than no signal at all.",
      affectedFiles: ctx.bundle.readme?.path ? [ctx.bundle.readme.path] : [],
      confidence: "medium",
    });
  }

  return out;
};

// Exported for testing only — the pack's main surface is `runI18nPack`.
export const __test = {
  detectI18nLibraries,
  detectLocaleCoverage,
  detectReadmeTranslations,
  I18N_LIBRARIES,
  LOCALE_FOLDER_HINTS,
};
