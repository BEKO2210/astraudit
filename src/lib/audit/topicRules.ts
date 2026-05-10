/**
 * Topic-driven contextual rules — Phase 3.7.
 *
 * GitHub topics are an underused signal: when a repo carries a topic
 * like `cli` or `eslint-plugin`, the maintainer has *told* us what
 * shape the project is supposed to take. A topic-aware audit can
 * flag obvious gaps that would never surface from a generic
 * documentation/security/CI check ("repo says `cli` but ships no
 * `bin` entry").
 *
 * Pre-build research (2026-05-10):
 *   - GitHub Topics is a free-form taxonomy — there's no closed
 *     allow-list. Real-world topics on the trending list (May 2026)
 *     converge on a stable handful for project shape:
 *       cli, command-line, terminal, command-line-tool
 *       react-component, vue-component, svelte-component,
 *       component-library
 *       eslint-plugin, eslint-config
 *       babel-plugin, babel-preset
 *       postcss-plugin
 *       monorepo, workspaces
 *       typescript, typescript-library
 *       github-action, action, github-actions-action
 *       vscode-extension, vscode-theme
 *       chrome-extension, browser-extension, firefox-extension
 *       electron, electron-app
 *       webpack-plugin, vite-plugin, rollup-plugin, esbuild-plugin
 *   - ESLint plugin contract (eslint.org/docs/latest/extend/plugins):
 *     name must start with `eslint-plugin-` (or `@scope/eslint-plugin-…`),
 *     `eslint` must be declared as a peer dependency, keywords should
 *     include `eslint-plugin`. We mirror the "name + peer + keyword"
 *     triple as a partial-credit rule.
 *   - GitHub Action contract: must ship `action.yml` (or `.yaml`) at
 *     the repo root. Type-of-action is declared inside that file
 *     (`runs.using` = node20 / docker / composite).
 *   - Browser extension contract: a `manifest.json` at the repo root
 *     plus an `icons` field (Manifest V3 also requires
 *     `manifest_version: 3` but we keep that out of scope).
 *
 * Each rule returns a `TopicCheck` with status `met` / `missing` /
 * `partial` / `not-applicable`. We never throw; an unknown topic
 * simply produces no checks, which is the right failure mode for a
 * rule-based detector.
 */

import type { ParsedManifest } from "./packageManifest";
import type { ClassifiedFiles } from "./fileClassifier";
import type { StackSignals } from "../../types/audit";

export type CheckStatus = "met" | "missing" | "partial" | "not-applicable";

export interface TopicCheck {
  /** Stable identifier — fine to use as a React key or diff handle. */
  id: string;
  /** Topic that triggered this rule (lower-cased). */
  topic: string;
  /** Human-facing title, e.g. "CLI must declare a `bin` entry". */
  title: string;
  status: CheckStatus;
  /** What we found — short, factual sentences. */
  evidence: string[];
  /** Hint about what to add when status is `missing` / `partial`. */
  hint?: string;
}

/* -------------------------------------------------------------------------- */

export interface TopicRulesContext {
  topics: string[];
  manifest: ParsedManifest | null;
  classified: ClassifiedFiles;
  stack: StackSignals;
}

/* -------------------------------------------------------------------------- */
/* Topic groups                                                                */
/* -------------------------------------------------------------------------- */

const CLI_TOPICS = new Set([
  "cli",
  "command-line",
  "command-line-tool",
  "command-line-interface",
  "terminal",
  "tui",
]);

const REACT_COMPONENT_TOPICS = new Set([
  "react-component",
  "react-components",
  "react-library",
]);

const VUE_COMPONENT_TOPICS = new Set([
  "vue-component",
  "vue-components",
  "vue-library",
]);

const SVELTE_COMPONENT_TOPICS = new Set([
  "svelte-component",
  "svelte-components",
]);

const ESLINT_PLUGIN_TOPICS = new Set(["eslint-plugin", "eslintplugin"]);
const BABEL_PLUGIN_TOPICS = new Set(["babel-plugin", "babelplugin"]);
const POSTCSS_PLUGIN_TOPICS = new Set(["postcss-plugin"]);

const MONOREPO_TOPICS = new Set(["monorepo", "workspaces", "lerna"]);

const TYPESCRIPT_TOPICS = new Set(["typescript", "typescript-library"]);

const GITHUB_ACTION_TOPICS = new Set([
  "github-action",
  "github-actions",
  "action",
  "github-actions-action",
]);

const VSCODE_EXTENSION_TOPICS = new Set([
  "vscode-extension",
  "vscode",
  "vscode-extensions",
]);

const BROWSER_EXTENSION_TOPICS = new Set([
  "chrome-extension",
  "firefox-extension",
  "browser-extension",
  "edge-extension",
  "webextension",
]);

const ELECTRON_TOPICS = new Set(["electron", "electron-app"]);

const BUNDLER_PLUGIN_TOPICS = new Map<string, string>([
  ["webpack-plugin", "webpack"],
  ["vite-plugin", "vite"],
  ["rollup-plugin", "rollup"],
  ["esbuild-plugin", "esbuild"],
]);

/* -------------------------------------------------------------------------- */

function intersects(topics: Set<string>, source: string[]): string | null {
  for (const t of source) {
    if (topics.has(t)) return t;
  }
  return null;
}

function hasFile(classified: ClassifiedFiles, ...names: string[]): string | null {
  for (const n of names) {
    const found =
      classified.importantFileMap.get(n) ??
      classified.importantFileMap.get(n.toLowerCase());
    if (found) return found.path;
    // Fallback to the broader blob set for files that aren't in the
    // important-files allow-list (e.g. `manifest.json`, `action.yml`).
    if (classified.blobPaths.has(n) || classified.blobPathsLower.has(n.toLowerCase())) {
      return classified.blobPathsLower.get(n.toLowerCase()) ?? n;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Rules                                                                       */
/* -------------------------------------------------------------------------- */

export function evaluateTopicRules(
  ctx: TopicRulesContext,
): TopicCheck[] {
  const topics = ctx.topics.map((t) => t.toLowerCase());
  const checks: TopicCheck[] = [];

  /* ---- CLI ---------------------------------------------------------- */
  const cliTopic = intersects(CLI_TOPICS, topics);
  if (cliTopic) {
    if (ctx.manifest) {
      const evidence: string[] = [];
      const hasBin = ctx.manifest.hasBinEntry;
      if (hasBin) evidence.push("`bin` entry declared in package.json.");
      else evidence.push("No `bin` entry in package.json.");
      checks.push({
        id: "cli-bin-entry",
        topic: cliTopic,
        title: "CLI projects should declare a `bin` entry",
        status: hasBin ? "met" : "missing",
        evidence,
        hint: hasBin
          ? undefined
          : "Add a `bin` entry to package.json so installing the package puts the executable on the user's PATH.",
      });
    }
  }

  /* ---- ESLint plugin ----------------------------------------------- */
  const eslintTopic = intersects(ESLINT_PLUGIN_TOPICS, topics);
  if (eslintTopic && ctx.manifest) {
    const m = ctx.manifest;
    const nameOk =
      !!m.name &&
      (m.name.startsWith("eslint-plugin-") ||
        /^@[^/]+\/eslint-plugin(?:-|$)/.test(m.name));
    const peerOk = m.peerDependencies.some((p) => p.name === "eslint");
    const keywordOk = m.keywords.includes("eslint-plugin");
    const score = [nameOk, peerOk, keywordOk].filter(Boolean).length;
    const status: CheckStatus =
      score === 3 ? "met" : score === 0 ? "missing" : "partial";
    const evidence: string[] = [];
    evidence.push(nameOk ? "Name matches `eslint-plugin-*` convention." : "Name does not match `eslint-plugin-*` convention.");
    evidence.push(peerOk ? "`eslint` declared as a peer dependency." : "`eslint` not declared as a peer dependency.");
    evidence.push(keywordOk ? "`eslint-plugin` is in `keywords`." : "`eslint-plugin` not in `keywords`.");
    checks.push({
      id: "eslint-plugin-contract",
      topic: eslintTopic,
      title: "ESLint plugins should follow the published contract",
      status,
      evidence,
      hint:
        status === "met"
          ? undefined
          : "ESLint Docs require `eslint-plugin-*` naming, an `eslint` peer dependency, and the `eslint-plugin` keyword.",
    });
  }

  /* ---- Babel plugin ------------------------------------------------ */
  const babelTopic = intersects(BABEL_PLUGIN_TOPICS, topics);
  if (babelTopic && ctx.manifest) {
    const m = ctx.manifest;
    const nameOk =
      !!m.name &&
      (m.name.startsWith("babel-plugin-") ||
        /^@[^/]+\/babel-plugin(?:-|$)/.test(m.name));
    const peerOk = m.peerDependencies.some((p) => p.name === "@babel/core");
    const status: CheckStatus =
      nameOk && peerOk ? "met" : nameOk || peerOk ? "partial" : "missing";
    checks.push({
      id: "babel-plugin-contract",
      topic: babelTopic,
      title: "Babel plugins should follow the published contract",
      status,
      evidence: [
        nameOk ? "Name matches `babel-plugin-*` convention." : "Name does not match `babel-plugin-*` convention.",
        peerOk ? "`@babel/core` declared as a peer dependency." : "`@babel/core` not declared as a peer dependency.",
      ],
      hint:
        status === "met"
          ? undefined
          : "Babel plugins should use `babel-plugin-*` naming and declare `@babel/core` as a peer dependency.",
    });
  }

  /* ---- PostCSS plugin --------------------------------------------- */
  const postcssTopic = intersects(POSTCSS_PLUGIN_TOPICS, topics);
  if (postcssTopic && ctx.manifest) {
    const m = ctx.manifest;
    const peerOk = m.peerDependencies.some((p) => p.name === "postcss");
    const keywordOk = m.keywords.includes("postcss-plugin");
    const status: CheckStatus = peerOk && keywordOk ? "met" : peerOk || keywordOk ? "partial" : "missing";
    checks.push({
      id: "postcss-plugin-contract",
      topic: postcssTopic,
      title: "PostCSS plugins should declare the contract",
      status,
      evidence: [
        peerOk ? "`postcss` declared as a peer dependency." : "`postcss` not declared as a peer dependency.",
        keywordOk ? "`postcss-plugin` is in `keywords`." : "`postcss-plugin` not in `keywords`.",
      ],
    });
  }

  /* ---- React / Vue / Svelte component libraries ------------------- */
  for (const [topicSet, framework, depName] of [
    [REACT_COMPONENT_TOPICS, "React", "react"],
    [VUE_COMPONENT_TOPICS, "Vue", "vue"],
    [SVELTE_COMPONENT_TOPICS, "Svelte", "svelte"],
  ] as const) {
    const t = intersects(topicSet, topics);
    if (!t || !ctx.manifest) continue;
    const peerOk = ctx.manifest.peerDependencies.some((p) => p.name === depName);
    checks.push({
      id: `${depName}-component-peer`,
      topic: t,
      title: `${framework} component libraries should declare \`${depName}\` as a peer dependency`,
      status: peerOk ? "met" : "missing",
      evidence: [
        peerOk
          ? `\`${depName}\` declared as a peer dependency.`
          : `\`${depName}\` is not in peerDependencies.`,
      ],
      hint: peerOk
        ? undefined
        : `Move \`${depName}\` from dependencies to peerDependencies so consumers control the host version.`,
    });
  }

  /* ---- Monorepo --------------------------------------------------- */
  const monorepoTopic = intersects(MONOREPO_TOPICS, topics);
  if (monorepoTopic) {
    const hasNpmWorkspaces = !!ctx.manifest?.hasWorkspaces;
    const hasPnpmWorkspaces =
      !!hasFile(ctx.classified, "pnpm-workspace.yaml", "pnpm-workspace.yml");
    const ok = hasNpmWorkspaces || hasPnpmWorkspaces;
    checks.push({
      id: "monorepo-workspaces",
      topic: monorepoTopic,
      title: "Monorepos should declare a workspace configuration",
      status: ok ? "met" : "missing",
      evidence: [
        hasNpmWorkspaces
          ? "`workspaces` declared in package.json."
          : hasPnpmWorkspaces
            ? "`pnpm-workspace.yaml` is present."
            : "Neither `workspaces` nor `pnpm-workspace.yaml` was detected.",
      ],
      hint: ok
        ? undefined
        : "Declare `workspaces: [\"packages/*\"]` in package.json or ship a `pnpm-workspace.yaml`.",
    });
  }

  /* ---- TypeScript ------------------------------------------------- */
  const tsTopic = intersects(TYPESCRIPT_TOPICS, topics);
  if (tsTopic) {
    const hasTsConfig = !!hasFile(
      ctx.classified,
      "tsconfig.json",
      "tsconfig.base.json",
    );
    checks.push({
      id: "typescript-tsconfig",
      topic: tsTopic,
      title: "TypeScript projects should ship a `tsconfig.json`",
      status: hasTsConfig ? "met" : "missing",
      evidence: [
        hasTsConfig
          ? "`tsconfig.json` is present at the repo root."
          : "No `tsconfig.json` (or `tsconfig.base.json`) detected.",
      ],
      hint: hasTsConfig
        ? undefined
        : "Add a tracked `tsconfig.json` so tooling and consumers know the language target.",
    });
  }

  /* ---- GitHub Action --------------------------------------------- */
  const actionTopic = intersects(GITHUB_ACTION_TOPICS, topics);
  if (actionTopic) {
    const path = hasFile(ctx.classified, "action.yml", "action.yaml");
    checks.push({
      id: "github-action-manifest",
      topic: actionTopic,
      title: "GitHub Actions must ship an `action.yml`",
      status: path ? "met" : "missing",
      evidence: [
        path
          ? `Action manifest at \`${path}\`.`
          : "No `action.yml` / `action.yaml` detected at the repo root.",
      ],
      hint: path
        ? undefined
        : "GitHub Actions are discovered by their root-level `action.yml` (or `.yaml`) file.",
    });
  }

  /* ---- VS Code extension ----------------------------------------- */
  const vscodeTopic = intersects(VSCODE_EXTENSION_TOPICS, topics);
  if (vscodeTopic && ctx.manifest) {
    const hasEnginesVscode = !!ctx.manifest.engines.vscode;
    checks.push({
      id: "vscode-engines",
      topic: vscodeTopic,
      title: "VS Code extensions must declare `engines.vscode`",
      status: hasEnginesVscode ? "met" : "missing",
      evidence: [
        hasEnginesVscode
          ? `\`engines.vscode\` set to \`${ctx.manifest.engines.vscode}\`.`
          : "`engines.vscode` is not declared.",
      ],
      hint: hasEnginesVscode
        ? undefined
        : "Without `engines.vscode`, the VS Code Marketplace will reject the extension.",
    });
  }

  /* ---- Browser extension ----------------------------------------- */
  const browserTopic = intersects(BROWSER_EXTENSION_TOPICS, topics);
  if (browserTopic) {
    const path = hasFile(ctx.classified, "manifest.json");
    checks.push({
      id: "browser-extension-manifest",
      topic: browserTopic,
      title: "Browser extensions must ship a `manifest.json`",
      status: path ? "met" : "missing",
      evidence: [
        path
          ? `Found \`${path}\`.`
          : "No `manifest.json` detected at the repo root.",
      ],
      hint: path
        ? undefined
        : "Browser extension hosts (Chrome, Firefox, Edge) load the extension from a root `manifest.json`.",
    });
  }

  /* ---- Electron --------------------------------------------------- */
  const electronTopic = intersects(ELECTRON_TOPICS, topics);
  if (electronTopic && ctx.manifest) {
    const hasElectron = ctx.manifest.dependencyNames.includes("electron");
    checks.push({
      id: "electron-dep",
      topic: electronTopic,
      title: "Electron apps should depend on `electron`",
      status: hasElectron ? "met" : "missing",
      evidence: [
        hasElectron
          ? "`electron` is in the dependency tree."
          : "`electron` is not declared in dependencies / devDependencies.",
      ],
    });
  }

  /* ---- Bundler plugins ------------------------------------------- */
  for (const [topicName, depName] of BUNDLER_PLUGIN_TOPICS) {
    if (!topics.includes(topicName) || !ctx.manifest) continue;
    const peerOk = ctx.manifest.peerDependencies.some(
      (p) => p.name === depName,
    );
    checks.push({
      id: `${depName}-plugin-peer`,
      topic: topicName,
      title: `${depName} plugins should declare \`${depName}\` as a peer dependency`,
      status: peerOk ? "met" : "missing",
      evidence: [
        peerOk
          ? `\`${depName}\` declared as a peer dependency.`
          : `\`${depName}\` is not in peerDependencies.`,
      ],
    });
  }

  return checks;
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                  */
/* -------------------------------------------------------------------------- */

const STATUS_LABEL: Record<CheckStatus, string> = {
  met: "met",
  missing: "missing",
  partial: "partial",
  "not-applicable": "n/a",
};

export function formatCheckStatus(status: CheckStatus): string {
  return STATUS_LABEL[status];
}

/** Roll up a list of checks into met / partial / missing counts. */
export function summariseTopicChecks(checks: TopicCheck[]) {
  let met = 0;
  let missing = 0;
  let partial = 0;
  for (const c of checks) {
    if (c.status === "met") met += 1;
    else if (c.status === "missing") missing += 1;
    else if (c.status === "partial") partial += 1;
  }
  return { total: checks.length, met, partial, missing };
}
