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
import { buildCategoryScores, buildVerdict, gradeFromScore, totalScore } from "./scoreEngine";
import { buildRecommendations } from "./recommendationEngine";
import { buildGraph } from "./graphEngine";
import { buildFindings } from "./riskEngine";
import { severityRank } from "../utils/severity";
import { deriveInsights } from "./insightEngine";
import { buildHeadlineVerdict, buildOnboarding, buildRichStory } from "./copyEngine";

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

export function runAudit(
  bundle: RepoBundle,
  emit: ProgressEmitter = () => {},
): AuditResult {
  emit("metadata");
  emit("tree");
  const classified = classifyFiles(bundle.tree, bundle.importantFiles);

  emit("stack");
  const stack = detectStack(classified, bundle.languages);
  const deps = analyzeDependencies(classified);

  emit("documentation");
  const readme = analyzeReadme(bundle.readme);

  emit("quality");
  const security = analyzeSecurity(classified, bundle.orgHealth);
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

  const findings = buildFindings({
    classified,
    readme,
    deps,
    security,
    maintenance,
    ci,
    dx,
  }).sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

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
  const recommendations = buildRecommendations({ categories, findings });
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
    maxScore: categories.reduce((sum, c) => sum + c.max, 0),
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
  };
}
