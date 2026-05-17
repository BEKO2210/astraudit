import type { AuditProgress, AuditProgressStep, AuditResult } from "../../types/audit";
import type { RepoBundle } from "../../types/github";
import { classifyFiles } from "./fileClassifier";
import { detectStack } from "./stackDetector";
import { analyzeReadme } from "./documentationDetector";
import { analyzeDependencies } from "./dependencyDetector";
import { analyzeSecurity } from "./securityDetector";
import { analyzeMaintenance } from "./maintenanceDetector";
import { analyzeCi } from "./ciDetector";
import { analyzeDx } from "./dxDetector";
import { buildCategoryScores, buildVerdict, effectiveMaxScore, gradeFromScore, totalScore } from "./scoreEngine";
import { buildRecommendations } from "./recommendationEngine";
import { buildGraph } from "./graphEngine";
import { buildFindings } from "./riskEngine";
import { severityRank } from "../utils/severity";
import { deriveInsights } from "./insightEngine";
import { buildHeadlineVerdict, buildOnboarding, buildRichStory } from "./copyEngine";
import {
  NO_PACKS,
  type EnabledPacks,
  type RulePackId,
  type RulePackRunner,
} from "./rulePacks/types";
import { serialiseEnabledPacks } from "./rulePacks/parseRules";
import { runI18nPack } from "./rulePacks/packs/i18n";
import { runTsPack } from "./rulePacks/packs/ts";

/**
 * Roadmap M5.x — opt‑in pack registry. Each entry's `run`
 * appends additional findings when the pack is enabled. Default
 * audits skip every pack so the canonical scoring stays stable.
 * Future slices land more entries here as the packs grow.
 */
const PACK_RUNNERS: Partial<Record<RulePackId, RulePackRunner>> = {
  i18n: runI18nPack,
  ts: runTsPack,
};

const STEP_LABELS: Record<AuditProgressStep, string> = {
  metadata: "Reading repository metadata",
  tree: "Mapping file tree",
  stack: "Detecting stack",
  documentation: "Scanning documentation",
  quality: "Evaluating quality signals",
  graph: "Building audit graph",
  recommendations: "Generating recommendations",
  done: "Audit complete",
};

const STEP_ORDER: AuditProgressStep[] = [
  "metadata",
  "tree",
  "stack",
  "documentation",
  "quality",
  "graph",
  "recommendations",
  "done",
];

export function progressFor(step: AuditProgressStep): AuditProgress {
  const index = STEP_ORDER.indexOf(step);
  return {
    step,
    label: STEP_LABELS[step],
    index,
    total: STEP_ORDER.length,
  };
}

export type ProgressEmitter = (step: AuditProgressStep) => void;

/**
 * Roadmap M5.1 — optional audit configuration. Today the only
 * knob is `enabledPacks`; later slices may extend this with
 * pack‑specific tuning. Defaulted everywhere so existing callers
 * stay source‑compatible.
 */
export interface AuditOptions {
  enabledPacks?: EnabledPacks;
}

export function runAudit(
  bundle: RepoBundle,
  emit: ProgressEmitter = () => {},
  options: AuditOptions = {},
): AuditResult {
  const enabledPacks = options.enabledPacks ?? NO_PACKS;
  emit("metadata");
  emit("tree");
  const classified = classifyFiles(bundle.tree, bundle.importantFiles);

  emit("stack");
  const stack = detectStack(classified, bundle.languages);
  const deps = analyzeDependencies(classified);

  emit("documentation");
  // Phase 7.0.2 — pass `hasWiki` through so the docs-presence
  // signal accounts for repos that document via the GitHub Wiki
  // (Astraudit can't fetch wiki content — it lives in a separate
  // git repo at github.com/owner/repo.wiki.git that the tree API
  // doesn't cover — but presence-of-wiki is itself an honest signal).
  const readme = analyzeReadme(bundle.readme, {
    hasWiki: bundle.metadata.hasWiki,
  });

  emit("quality");
  const security = analyzeSecurity(
    classified,
    bundle.orgHealth,
    bundle.branchProtection,
  );
  const maintenance = analyzeMaintenance(bundle);
  const ci = analyzeCi(classified, bundle.workflows);
  const dx = analyzeDx(classified, readme, deps, bundle.orgHealth);

  const categories = buildCategoryScores({
    classified,
    readme,
    deps,
    security,
    maintenance,
    ci,
    dx,
    stack,
  });

  const baseFindings = buildFindings({
    classified,
    readme,
    deps,
    security,
    maintenance,
    ci,
    dx,
    stack,
  });

  // Roadmap M5.x — append findings from each enabled rule pack.
  // Packs are pure functions of (bundle, classified, deps) and
  // cannot influence the category scores; their findings flow
  // through the same severity ordering as the core ones so they
  // sit naturally in the dashboard list.
  const packFindings = [];
  for (const packId of enabledPacks) {
    const runner = PACK_RUNNERS[packId];
    if (!runner) continue;
    try {
      packFindings.push(...runner({ bundle, classified, deps }));
    } catch {
      // A pack must never crash the audit. Swallow + carry on so
      // the default surface is always rendered.
    }
  }

  const findings = [...baseFindings, ...packFindings].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );

  const score = totalScore(categories);
  const grade = gradeFromScore(score);
  const verdict = buildVerdict(score, grade, categories);

  emit("graph");
  const graph = buildGraph({
    fullName: bundle.metadata.fullName,
    categories,
    classified,
    ci,
    security,
    readme,
    stack,
    maintenance,
    findings,
  });

  emit("recommendations");
  const recommendations = buildRecommendations({ categories, findings, stack });
  const insights = deriveInsights({
    bundle,
    classified,
    readme,
    ci,
    stack,
    maintenance,
    security,
    deps,
  });
  const copyCtx = { bundle, insights, stack, classified, categories };
  const story = buildRichStory(copyCtx);
  const onboarding = buildOnboarding(copyCtx);
  const headline = buildHeadlineVerdict(copyCtx);

  emit("done");

  return {
    bundle,
    totalScore: score,
    // Phase 7.0.5 — denominator-aware total. Categories with status
    // `not-applicable` or `unknown` drop out of the denominator
    // entirely. For v1.0-era audits (no n/a + no unknown emitted yet)
    // this equals the legacy fixed sum of 100; downstream items that
    // emit the new states will see the percentage stay honest.
    maxScore: effectiveMaxScore(categories),
    grade,
    verdict,
    headline,
    categories,
    findings,
    story,
    graph,
    stack,
    fileStructure: {
      importantFilesPresent: classified.importantFilesPresent,
      importantFilesMissing: classified.importantFilesMissing,
      importantFolders: classified.importantFolders,
      rootFileCount: classified.rootFileCount,
      treeTruncated: bundle.tree.truncated,
      totalFiles: classified.totalFiles,
      suspiciousFiles: classified.suspiciousFiles,
    },
    recommendations,
    insights,
    onboarding,
    generatedAt: new Date().toISOString(),
    // Echo the active packs back into the result so the dashboard
    // can show an "Active rule packs" chip and downstream consumers
    // (export, history, compare) know which audit configuration
    // produced this snapshot. Canonical comma‑split → array for
    // serialisation friendliness.
    enabledPacks: serialiseEnabledPacks(enabledPacks)?.split(",") ?? [],
  };
}

// Keep the import alive even when later slices don't use it.
export type { RulePackId };
