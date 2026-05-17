/**
 * `?rules=monorepo` — Roadmap M5.4.
 *
 * Opt‑in monorepo health pack. Surfaces signals about whether a
 * repository is structured as a monorepo and which orchestration
 * tooling is in play. Fires only when the visitor enables
 * `?rules=monorepo`; the canonical audit is unchanged.
 *
 * Detection strategy (purely static, never executes user code)
 * - Parse `package.json` for a `workspaces` field (npm + yarn
 *   classic). Both array form and object form (`{ packages: […] }`)
 *   are recognised.
 * - Probe for `pnpm-workspace.yaml` (pnpm workspaces).
 * - Probe for tool config files: `turbo.json`, `nx.json`,
 *   `lerna.json`, `rush.json`, `moon.yml`.
 * - Probe for the `.changeset/` folder (Changesets release flow).
 * - Walk the blob list for `packages/*\/package.json` and
 *   `apps/*\/package.json` to count the inner workspaces.
 *
 * Findings
 * - `monorepo-detected` (INFO)        — any unambiguous monorepo
 *   signal is present (workspaces field, pnpm-workspace.yaml, or
 *   a tool config). Lists the evidence.
 * - `monorepo-no-orchestrator` (LOW)  — workspaces declared but
 *   no Turborepo / nx / Lerna / Rush / Moon config. Without one,
 *   cross-package builds + caching aren't coordinated.
 * - `monorepo-packages-not-declared` (LOW) — inner package.json
 *   files exist under packages/ but the root has no `workspaces`
 *   field AND there's no `pnpm-workspace.yaml`. The inner
 *   packages aren't being linked / installed by the package
 *   manager.
 * - `monorepo-multiple-orchestrators` (LOW) — two or more
 *   orchestrators present (e.g. turbo + nx). Usually an
 *   in-progress migration that wasn't finished.
 * - `monorepo-changesets-detected` (INFO) — `.changeset/` present.
 */

import type { Finding } from "../../../../types/finding";
import type { RulePackContext, RulePackRunner } from "../types";

interface PackageManifest {
  workspaces?: string[] | { packages?: string[]; nohoist?: string[] };
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

/** Normalise the `workspaces` field to a flat string[] of globs. */
function workspaceGlobs(manifest: PackageManifest | null): string[] {
  if (!manifest?.workspaces) return [];
  const w = manifest.workspaces;
  if (Array.isArray(w)) return w;
  if (typeof w === "object" && Array.isArray(w.packages)) return w.packages;
  return [];
}

const ORCHESTRATORS = [
  { id: "turborepo", file: "turbo.json", display: "Turborepo" },
  { id: "nx", file: "nx.json", display: "nx" },
  { id: "lerna", file: "lerna.json", display: "Lerna" },
  { id: "rush", file: "rush.json", display: "Rush" },
  { id: "moon", file: "moon.yml", display: "Moon" },
] as const;

/**
 * Inner-package count, derived from blob paths. Matches both
 * `packages/*\/package.json` and `apps/*\/package.json` since the
 * latter is the common "app vs library" split.
 */
function innerPackageCount(ctx: RulePackContext): {
  packages: string[];
  total: number;
} {
  const out: string[] = [];
  for (const path of ctx.classified.blobPaths) {
    const lower = path.toLowerCase();
    // Match `<root>/package.json` where root is a single segment under
    // packages/ or apps/ — `packages/foo/package.json` ✓
    //                      `packages/foo/bar/package.json` ✗
    const m = /^(packages|apps)\/([^/]+)\/package\.json$/i.exec(lower);
    if (m) out.push(path);
  }
  return { packages: out, total: out.length };
}

function hasChangesetFolder(ctx: RulePackContext): boolean {
  for (const path of ctx.classified.blobPaths) {
    if (path.toLowerCase().startsWith(".changeset/")) return true;
  }
  return false;
}

export const runMonorepoPack: RulePackRunner = (ctx) => {
  const out: Finding[] = [];
  const manifest = readManifest(ctx);
  const globs = workspaceGlobs(manifest);
  const hasPnpmWorkspace = !!ctx.classified.hasFile("pnpm-workspace.yaml");
  const orchestratorsPresent = ORCHESTRATORS.filter((o) =>
    ctx.classified.hasFile(o.file),
  );
  const inner = innerPackageCount(ctx);
  const hasChangesets = hasChangesetFolder(ctx);

  const declaresWorkspaces = globs.length > 0 || hasPnpmWorkspace;
  const hasAnyMonorepoSignal =
    declaresWorkspaces || orchestratorsPresent.length > 0 || inner.total > 0;

  if (!hasAnyMonorepoSignal) {
    // Single-package repo — emit nothing. The pack is silent
    // for the 99% of repositories that aren't monorepos.
    return out;
  }

  // Compose evidence for the "detected" finding.
  const evidenceLines: string[] = [];
  if (globs.length > 0) {
    evidenceLines.push(`package.json workspaces: ${globs.join(", ")}`);
  }
  if (hasPnpmWorkspace) {
    evidenceLines.push("pnpm-workspace.yaml present");
  }
  if (orchestratorsPresent.length > 0) {
    evidenceLines.push(
      `Orchestrator configs: ${orchestratorsPresent
        .map((o) => o.display)
        .join(", ")}`,
    );
  }
  if (inner.total > 0) {
    evidenceLines.push(
      `Inner packages detected: ${inner.total} (e.g. ${inner.packages
        .slice(0, 3)
        .join(", ")})`,
    );
  }
  out.push({
    id: "monorepo-detected",
    title: `Monorepo layout detected (${inner.total} inner package${
      inner.total === 1 ? "" : "s"
    })`,
    category: "structure",
    severity: "info",
    description:
      "The repository ships unambiguous monorepo signals — workspaces declaration, pnpm-workspace.yaml, an orchestrator config, or multiple inner packages under packages/ or apps/.",
    evidence: evidenceLines.join("\n"),
    recommendation:
      "Document the monorepo layout in the README (which orchestrator, which package manager, how to add a new workspace). New contributors otherwise spend their first hour reverse-engineering the structure.",
    affectedFiles: declaresWorkspaces ? ["package.json"] : [],
    confidence: "high",
  });

  if (declaresWorkspaces && orchestratorsPresent.length === 0) {
    out.push({
      id: "monorepo-no-orchestrator",
      title: "Workspaces declared but no monorepo orchestrator",
      category: "ci",
      severity: "low",
      description:
        "The package manager links the inner workspaces but there's no Turborepo, nx, Lerna, Rush, or Moon config to coordinate cross-package builds. Without one, `npm test` in CI runs every package sequentially with no caching and no graph-based ordering.",
      evidence:
        globs.length > 0
          ? `Workspaces: ${globs.join(", ")}`
          : "pnpm-workspace.yaml present without an orchestrator config.",
      recommendation:
        "Turborepo is the lowest-friction choice for new monorepos (single `turbo.json`, content-hashed remote cache). nx is heavier but better for graph-driven builds with affected detection. Pick one and wire `turbo run build` / `nx affected` into the CI pipeline.",
      affectedFiles: ["package.json"],
      confidence: "medium",
    });
  }

  if (inner.total > 0 && !declaresWorkspaces) {
    out.push({
      id: "monorepo-packages-not-declared",
      title: `${inner.total} inner package.json file${
        inner.total === 1 ? "" : "s"
      } but no workspaces declaration`,
      category: "structure",
      severity: "low",
      description:
        "Files like `packages/foo/package.json` exist but the root package.json has no `workspaces` field and there's no pnpm-workspace.yaml. The package manager isn't linking these inner packages, so cross-package imports won't resolve without manual setup.",
      evidence: inner.packages.slice(0, 5).join("\n"),
      recommendation:
        'Add a `"workspaces": ["packages/*", "apps/*"]` array to the root package.json (npm + yarn), or commit a `pnpm-workspace.yaml` with the same globs (pnpm). Without this, `npm install` at the root does not install the inner package deps.',
      affectedFiles: ["package.json"],
      confidence: "medium",
    });
  }

  if (orchestratorsPresent.length >= 2) {
    out.push({
      id: "monorepo-multiple-orchestrators",
      title: `Multiple monorepo orchestrators detected (${orchestratorsPresent
        .map((o) => o.display)
        .join(", ")})`,
      category: "structure",
      severity: "low",
      description:
        "Two or more orchestrator config files are present. This is usually an in-progress migration that wasn't completed — the CI runs whichever the scripts invoke, while the leftover config silently rots and confuses new contributors.",
      evidence: orchestratorsPresent.map((o) => o.file).join(", "),
      recommendation:
        "Commit to one orchestrator and remove the unused config. If a migration is genuinely in flight, document the target state in CONTRIBUTING.md so the duplication is intentional and time-boxed.",
      affectedFiles: orchestratorsPresent.map((o) => o.file),
      confidence: "high",
    });
  }

  if (hasChangesets) {
    out.push({
      id: "monorepo-changesets-detected",
      title: "Changesets release flow detected",
      category: "maintenance",
      severity: "info",
      description:
        "The `.changeset/` folder is present — the repo uses the Changesets release-management workflow for coordinating versioning across packages. Contributors document their changes via `npx changeset add`, and a maintainer-only `changesets/action` PR opens a release PR when ready.",
      evidence: ".changeset/ folder present at repo root",
      recommendation:
        "Document the changeset flow in CONTRIBUTING.md — new contributors typically miss the `npx changeset add` step and their PRs sit waiting for it.",
      affectedFiles: [],
      confidence: "high",
    });
  }

  return out;
};

export const __test = {
  workspaceGlobs,
  innerPackageCount,
  hasChangesetFolder,
  ORCHESTRATORS,
};
