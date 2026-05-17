/**
 * `?rules=a11y` — Roadmap M5.1.
 *
 * Opt‑in accessibility pack. Surfaces signals about whether a
 * repository takes accessibility seriously. Fires only when the
 * visitor enables `?rules=a11y`; the canonical audit is unchanged.
 *
 * Detection strategy (purely static, never executes user code)
 * - Scan the README markdown for `![alt](url)` images with empty
 *   or missing alt text, and for inline `<img …>` HTML tags
 *   without `alt=`.
 * - Walk `package.json` deps for known a11y testing libraries +
 *   accessible UI primitive packages.
 * - Look for an `ACCESSIBILITY.md` / `A11Y.md` doc at the repo
 *   root (case‑insensitive) and for an `accessibility` /
 *   `a11y` mention in CONTRIBUTING.md.
 *
 * Findings
 * - `a11y-readme-img-no-alt` (LOW / MEDIUM) — README ships images
 *   without alt text. Severity is MEDIUM when more than three
 *   images are affected, LOW otherwise.
 * - `a11y-tooling-detected` (INFO) — names every a11y library
 *   recognised in package.json.
 * - `a11y-no-tooling` (LOW) — web UI project (React, Vue, Svelte,
 *   Solid, Preact, Angular, Lit, Qwik) ships no a11y tooling.
 * - `a11y-docs-found` (INFO) — ACCESSIBILITY.md / A11Y.md present
 *   at the repo root.
 * - `a11y-no-docs` (LOW) — web UI project with no a11y doc and
 *   no a11y mention in CONTRIBUTING.md.
 */

import type { Finding } from "../../../../types/finding";
import type { RulePackContext, RulePackRunner } from "../types";

/**
 * Recognised a11y testing + tooling library names. Membership is
 * exact match against package.json dependency keys.
 */
const A11Y_TOOLING = [
  // Core axe + integrations
  "axe-core",
  "@axe-core/react",
  "@axe-core/playwright",
  "@axe-core/webdriverjs",
  "@axe-core/cli",
  "jest-axe",
  "vitest-axe",
  "react-axe",
  "cypress-axe",
  "@cypress/axe",
  // Other linters / runners
  "pa11y",
  "pa11y-ci",
  "wave-evaluator",
  "eslint-plugin-jsx-a11y",
  "eslint-plugin-vuejs-accessibility",
  // Accessible UI primitive libraries
  "react-aria",
  "react-aria-components",
  "@react-aria/utils",
  "@react-aria/focus",
  "@react-stately/utils",
  "@headlessui/react",
  "@headlessui/vue",
  "@radix-ui/react-primitive",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-tooltip",
  "@radix-ui/react-tabs",
  "reakit",
  "ariakit",
  "@ariakit/react",
] as const;

/** UI frameworks — if any is present we treat the repo as a "web UI project". */
const UI_FRAMEWORKS = [
  "react",
  "react-dom",
  "vue",
  "@vue/runtime-core",
  "svelte",
  "@sveltejs/kit",
  "solid-js",
  "preact",
  "@angular/core",
  "lit",
  "lit-element",
  "qwik",
  "@builder.io/qwik",
  "marko",
  "mithril",
  "htmx.org",
] as const;

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function readManifest(ctx: RulePackContext): PackageManifest | null {
  const pkgFile =
    ctx.classified.importantFileMap.get("package.json") ??
    ctx.classified.importantFileMap.get("package.json".toLowerCase());
  if (!pkgFile?.content) return null;
  try {
    return JSON.parse(pkgFile.content) as PackageManifest;
  } catch {
    return null;
  }
}

function allDepNames(manifest: PackageManifest | null): Set<string> {
  const out = new Set<string>();
  if (!manifest) return out;
  for (const block of [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
  ]) {
    if (!block) continue;
    for (const name of Object.keys(block)) out.add(name);
  }
  return out;
}

/** Find every Markdown image whose alt text is empty or missing. */
function findMarkdownImagesWithoutAlt(readme: string): string[] {
  // Pattern: `![alt-text](url-or-path)` — capture the alt slot.
  const re = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(readme))) {
    const alt = m[1] ?? "";
    if (alt.trim().length === 0) {
      out.push(m[2] ?? "");
      if (out.length >= 12) break;
    }
  }
  return out;
}

/** Find every inline `<img …>` tag in the README that lacks an alt= attribute. */
function findHtmlImagesWithoutAlt(readme: string): string[] {
  const out: string[] = [];
  // Match <img …> (self-closing or not). We only need the attribute soup.
  const re = /<img\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(readme))) {
    const attrs = m[1] ?? "";
    // alt= with any value (including alt="" — that's intentional
    // decorative, so it doesn't count as a finding).
    const hasAlt = /\balt\s*=/i.test(attrs);
    if (!hasAlt) {
      // Pull the src for the evidence list.
      const srcMatch = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs);
      out.push(srcMatch?.[1] ?? "<img>");
      if (out.length >= 12) break;
    }
  }
  return out;
}

/** Look up a doc file at the repo root by canonical basename(s). */
function findRootDoc(ctx: RulePackContext, ...names: string[]): string | null {
  for (const name of names) {
    const hit = ctx.classified.hasFile(name);
    if (hit) return hit;
  }
  return null;
}

function importantContent(
  ctx: RulePackContext,
  path: string | null,
): string | null {
  if (!path) return null;
  const file =
    ctx.classified.importantFileMap.get(path) ??
    ctx.classified.importantFileMap.get(path.toLowerCase());
  return file?.content ?? null;
}

export const runA11yPack: RulePackRunner = (ctx) => {
  const out: Finding[] = [];
  const manifest = readManifest(ctx);
  const deps = allDepNames(manifest);

  const tooling = A11Y_TOOLING.filter((name) => deps.has(name));
  const uiFw = UI_FRAMEWORKS.filter((name) => deps.has(name));
  const isUiProject = uiFw.length > 0;

  // README image alt-text scan.
  const readme = ctx.bundle.readme?.content ?? "";
  if (readme.length > 0) {
    const mdMissing = findMarkdownImagesWithoutAlt(readme);
    const htmlMissing = findHtmlImagesWithoutAlt(readme);
    const totalMissing = mdMissing.length + htmlMissing.length;
    if (totalMissing > 0) {
      const severity = totalMissing >= 4 ? "medium" : "low";
      const evidenceLines: string[] = [];
      if (mdMissing.length > 0) {
        evidenceLines.push(
          `Markdown images without alt (${mdMissing.length}): ${mdMissing
            .slice(0, 5)
            .join(", ")}`,
        );
      }
      if (htmlMissing.length > 0) {
        evidenceLines.push(
          `<img> tags without alt= (${htmlMissing.length}): ${htmlMissing
            .slice(0, 5)
            .join(", ")}`,
        );
      }
      out.push({
        id: "a11y-readme-img-no-alt",
        title: `README ships ${totalMissing} image${
          totalMissing === 1 ? "" : "s"
        } without alt text`,
        category: "documentation",
        severity,
        description:
          "Screen readers and link previews announce image alt text. Empty or missing alt makes README screenshots opaque to anyone not using a sighted browser, and yields generic 'Image' labels in PR previews + RSS readers.",
        evidence: evidenceLines.join("\n"),
        recommendation:
          'For meaningful images, write `![Short, factual description](url)`. For purely decorative ones (separators, badges that duplicate adjacent text), use `![](url)` deliberately — the empty alt signals "skip me" to assistive tech.',
        affectedFiles: ctx.bundle.readme?.path
          ? [ctx.bundle.readme.path]
          : ["README.md"],
        confidence: "high",
      });
    }
  }

  // a11y tooling presence.
  if (tooling.length > 0) {
    out.push({
      id: "a11y-tooling-detected",
      title: `Accessibility tooling detected (${tooling.length})`,
      category: "quality",
      severity: "info",
      description:
        "The package manifest declares one or more libraries that signal an accessibility practice — either testing harnesses (axe, pa11y, jest-axe), lint rules (eslint-plugin-jsx-a11y), or accessibility-first UI primitives (react-aria, Radix, HeadlessUI).",
      evidence: tooling.join(", "),
      recommendation:
        "Keep the a11y tooling wired into CI (jest-axe assertions, eslint-plugin-jsx-a11y in the lint job) so regressions surface at PR time rather than after release.",
      affectedFiles: ["package.json"],
      confidence: "high",
    });
  } else if (isUiProject) {
    out.push({
      id: "a11y-no-tooling",
      title: "UI project ships no accessibility tooling",
      category: "quality",
      severity: "low",
      description: `The project depends on ${uiFw.join(
        " / ",
      )} but has no a11y testing or linting library. Without one, accessibility regressions are only caught when a human notices.`,
      evidence: `UI frameworks detected: ${uiFw.join(", ")}`,
      recommendation:
        "Add `eslint-plugin-jsx-a11y` (React/JSX) or `eslint-plugin-vuejs-accessibility` (Vue) for free static checks. Wire `axe-core` / `jest-axe` into component tests for runtime assertions.",
      affectedFiles: ["package.json"],
      confidence: "medium",
    });
  }

  // ACCESSIBILITY.md / A11Y.md presence.
  const a11yDoc = findRootDoc(
    ctx,
    "ACCESSIBILITY.md",
    "A11Y.md",
    "ACCESSIBILITY",
    "A11Y",
  );
  if (a11yDoc) {
    out.push({
      id: "a11y-docs-found",
      title: `Accessibility documentation present: ${a11yDoc}`,
      category: "documentation",
      severity: "info",
      description:
        "A dedicated accessibility doc signals an active commitment — contributors and integrators can find the project's a11y standards in one place.",
      evidence: a11yDoc,
      recommendation:
        "Cross-link the accessibility doc from CONTRIBUTING.md so new contributors discover it before submitting their first PR.",
      affectedFiles: [a11yDoc],
      confidence: "high",
    });
  } else if (isUiProject) {
    const contributing = findRootDoc(ctx, "CONTRIBUTING.md", "CONTRIBUTING");
    const contributingTxt = importantContent(ctx, contributing) ?? "";
    const mentioned =
      /\b(accessib\w*|a11y|aria|screen[\s-]?reader|wcag)\b/i.test(
        contributingTxt,
      );
    if (!mentioned) {
      out.push({
        id: "a11y-no-docs",
        title: "No accessibility documentation",
        category: "documentation",
        severity: "low",
        description:
          "The project ships a UI framework but has neither an ACCESSIBILITY.md / A11Y.md doc nor an accessibility mention in CONTRIBUTING.md. Contributors have no documented baseline for what 'accessible enough to merge' means.",
        evidence: contributing
          ? `Checked ${contributing} for keywords: accessibility, a11y, aria, screen reader, wcag — none found.`
          : "Neither ACCESSIBILITY.md, A11Y.md nor CONTRIBUTING.md found at the repo root.",
        recommendation:
          "Even a one-paragraph ACCESSIBILITY.md naming the target conformance (WCAG 2.1 AA is the common bar), the testing tooling in use, and the contact for issues sets the floor. The web.dev a11y guide and the W3C ARIA Authoring Practices are both solid starting points to link out to.",
        affectedFiles: contributing ? [contributing] : [],
        confidence: "medium",
      });
    }
  }

  return out;
};

export const __test = {
  findMarkdownImagesWithoutAlt,
  findHtmlImagesWithoutAlt,
  A11Y_TOOLING,
  UI_FRAMEWORKS,
};
