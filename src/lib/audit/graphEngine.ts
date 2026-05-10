import type { GraphEdge, GraphNode, GraphNodeStatus, GraphPayload } from "../../types/graph";
import type { CategoryScore, StackSignals } from "../../types/audit";
import type { ClassifiedFiles } from "./fileClassifier";
import type { CiSignals } from "./ciDetector";
import type { SecuritySignals } from "./securityDetector";
import type { ReadmeSignals } from "./documentationDetector";
import type { MaintenanceSignals } from "./maintenanceDetector";
import type { Finding } from "../../types/finding";

interface GraphContext {
  fullName: string;
  categories: CategoryScore[];
  classified: ClassifiedFiles;
  ci: CiSignals;
  security: SecuritySignals;
  readme: ReadmeSignals;
  stack: StackSignals;
  maintenance: MaintenanceSignals;
  findings: Finding[];
}

function statusFromCategory(score: number, max: number, hasAnything: boolean): GraphNodeStatus {
  if (!hasAnything) return "missing";
  const ratio = score / max;
  if (ratio >= 0.8) return "strong";
  if (ratio >= 0.5) return "partial";
  if (ratio > 0) return "missing";
  return "missing";
}

function findRecommendation(findings: Finding[], category: string): string | null {
  const f = findings.find((finding) => finding.category === category);
  return f?.recommendation ?? null;
}

export function buildGraph(ctx: GraphContext): GraphPayload {
  const {
    fullName,
    categories,
    classified,
    ci,
    security,
    readme,
    stack,
    maintenance,
    findings,
  } = ctx;

  const get = (key: string) => categories.find((c) => c.key === key);
  const docCat = get("documentation");
  const structCat = get("structure");
  const qualCat = get("quality");
  const secCat = get("security");
  const maintCat = get("maintenance");
  const dxCat = get("dx");
  const ecoCat = get("ecosystem");
  const ciCat = get("ci");

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const addNode = (
    id: string,
    label: string,
    status: GraphNodeStatus,
    summary: string,
    evidence: string[],
    recommendation: string | null,
    position: { x: number; y: number },
  ) => {
    nodes.push({
      id,
      position,
      data: { label, status, summary, evidence, recommendation },
    });
  };

  addNode(
    "repo",
    fullName,
    "info",
    "Repository entry point.",
    [
      `Default branch present.`,
      `${classified.totalFiles} blob files mapped.`,
    ],
    null,
    { x: 0, y: 0 },
  );

  addNode(
    "documentation",
    "Documentation",
    statusFromCategory(docCat?.score ?? 0, docCat?.max ?? 15, !!docCat),
    docCat?.summary ?? "Documentation",
    docCat?.evidence ?? [],
    findRecommendation(findings, "documentation"),
    { x: -480, y: -240 },
  );
  addNode(
    "readme",
    "README",
    readme.exists ? (readme.length >= 800 ? "strong" : "partial") : "missing",
    readme.exists ? "README detected." : "No README detected.",
    [
      readme.exists
        ? `Length: ~${readme.length} chars.`
        : "README content missing.",
      `Install mention: ${readme.mentionsInstall ? "yes" : "no"}`,
      `Usage mention: ${readme.mentionsUsage ? "yes" : "no"}`,
    ],
    readme.exists ? null : "Add a README.md describing the project, installation, and usage.",
    { x: -720, y: -380 },
  );

  addNode(
    "source",
    "Source Code",
    structCat?.status === "strong" ? "strong" : structCat?.status === "partial" ? "partial" : "missing",
    structCat?.summary ?? "Source",
    structCat?.evidence ?? [],
    findRecommendation(findings, "structure"),
    { x: -240, y: -300 },
  );
  addNode(
    "languages",
    "Languages",
    stack.languages.length > 0 ? "strong" : "missing",
    stack.languages.length > 0
      ? `${stack.languages.length} language(s) detected.`
      : "No language data available.",
    stack.languages.slice(0, 5).map(
      (l) => `${l.name}: ${(l.share * 100).toFixed(1)}%`,
    ),
    null,
    { x: -240, y: -460 },
  );

  addNode(
    "tests",
    "Tests",
    classified.hasTestSignals
      ? qualCat?.status === "strong"
        ? "strong"
        : "partial"
      : "missing",
    classified.hasTestSignals ? "Test signals detected." : "No tests detected.",
    qualCat?.evidence ?? [],
    findRecommendation(findings, "quality"),
    { x: 0, y: -300 },
  );

  addNode(
    "ci",
    "CI/CD",
    ci.hasWorkflows ? (ciCat?.status === "strong" ? "strong" : "partial") : "missing",
    ci.hasWorkflows
      ? `${ci.workflowCount} workflow(s) detected.`
      : "No GitHub Actions workflows detected.",
    ci.workflowNames.slice(0, 6).map((n) => `Workflow: ${n}`),
    findRecommendation(findings, "ci"),
    { x: 240, y: -300 },
  );
  addNode(
    "workflows",
    "Workflows",
    ci.hasWorkflows ? "info" : "missing",
    ci.hasWorkflows ? "Workflow files mapped." : "No workflow files.",
    ci.workflowNames.slice(0, 6),
    null,
    { x: 240, y: -460 },
  );

  addNode(
    "security",
    "Security",
    secCat?.status === "strong"
      ? "strong"
      : secCat?.status === "partial"
        ? "partial"
        : "missing",
    secCat?.summary ?? "Security",
    secCat?.evidence ?? [],
    findRecommendation(findings, "security"),
    { x: 480, y: -240 },
  );
  addNode(
    "license",
    "LICENSE",
    security.hasLicense ? "strong" : "missing",
    security.hasLicense ? "LICENSE file present." : "No LICENSE file detected.",
    [security.hasLicense ? "Found at repository root." : "Missing"],
    security.hasLicense ? null : "Add an OSI-approved LICENSE file.",
    { x: 720, y: -380 },
  );
  addNode(
    "security-md",
    "SECURITY.md",
    security.hasSecurityPolicy ? "strong" : "missing",
    security.hasSecurityPolicy ? "Security policy present." : "No SECURITY.md detected.",
    [security.hasSecurityPolicy ? "Found in repo root or .github/" : "Missing"],
    security.hasSecurityPolicy ? null : "Add a SECURITY.md with reporting instructions.",
    { x: 720, y: -240 },
  );
  addNode(
    "risk",
    "Risk Areas",
    security.suspiciousFiles.length > 0 ? "missing" : "info",
    security.suspiciousFiles.length > 0
      ? `${security.suspiciousFiles.length} potentially sensitive filenames detected.`
      : "No suspicious filenames detected.",
    security.suspiciousFiles.slice(0, 5),
    security.suspiciousFiles.length > 0
      ? "Review filenames; treat as suspected leakage and rotate any related secrets."
      : null,
    { x: 720, y: -100 },
  );

  addNode(
    "deps",
    "Dependencies",
    ecoCat?.status === "strong"
      ? "strong"
      : ecoCat?.status === "partial"
        ? "partial"
        : "missing",
    ecoCat?.summary ?? "Dependencies",
    ecoCat?.evidence ?? [],
    findRecommendation(findings, "ecosystem"),
    { x: -480, y: 240 },
  );
  addNode(
    "package-manager",
    "Package Manager",
    stack.packageManager ? "strong" : "missing",
    stack.packageManager ? `${stack.packageManager} detected.` : "No package manager detected.",
    [`Lockfile: ${stack.hasLockfile ? "present" : "missing"}`],
    stack.packageManager ? null : "Adopt a lockfile-backed package manager.",
    { x: -720, y: 380 },
  );

  addNode(
    "releases",
    "Releases",
    maintenance.releasesCount > 0 ? "strong" : "missing",
    maintenance.releasesCount > 0
      ? `${maintenance.releasesCount} release(s).`
      : "No releases detected.",
    [
      maintenance.latestRelease ? `Latest: ${maintenance.latestRelease}` : "No releases",
    ],
    maintenance.releasesCount > 0 ? null : "Tag a first release to communicate stability.",
    { x: -240, y: 300 },
  );

  addNode(
    "maintenance",
    "Maintenance",
    maintCat?.status === "strong"
      ? "strong"
      : maintCat?.status === "partial"
        ? "partial"
        : "missing",
    maintCat?.summary ?? "Maintenance",
    maintCat?.evidence ?? [],
    findRecommendation(findings, "maintenance"),
    { x: 0, y: 300 },
  );

  addNode(
    "dx",
    "Developer Experience",
    dxCat?.status === "strong"
      ? "strong"
      : dxCat?.status === "partial"
        ? "partial"
        : "missing",
    dxCat?.summary ?? "DX",
    dxCat?.evidence ?? [],
    findRecommendation(findings, "dx"),
    { x: 240, y: 300 },
  );

  addNode(
    "config",
    "Config",
    classified.importantFolders.includes("config") || classified.blobPaths.has("tsconfig.json")
      ? "info"
      : "unknown",
    "Configuration signals.",
    [
      `tsconfig.json: ${classified.blobPaths.has("tsconfig.json") ? "yes" : "no"}`,
      `config/ folder: ${classified.importantFolders.includes("config") ? "yes" : "no"}`,
    ],
    null,
    { x: 480, y: 240 },
  );

  addNode(
    "docs",
    "Docs",
    classified.hasDocsFolder ? "strong" : "missing",
    classified.hasDocsFolder ? "docs/ folder present." : "No docs/ folder detected.",
    [classified.hasDocsFolder ? "Folder mapped" : "Folder missing"],
    classified.hasDocsFolder
      ? null
      : "Add a docs/ folder for deeper, version-controlled documentation.",
    { x: -480, y: -100 },
  );

  edges.push(
    { id: "e-repo-doc", source: "repo", target: "documentation" },
    { id: "e-doc-readme", source: "documentation", target: "readme" },
    { id: "e-doc-docs", source: "documentation", target: "docs" },
    { id: "e-repo-source", source: "repo", target: "source" },
    { id: "e-source-langs", source: "source", target: "languages" },
    { id: "e-repo-tests", source: "repo", target: "tests" },
    { id: "e-repo-ci", source: "repo", target: "ci" },
    { id: "e-ci-workflows", source: "ci", target: "workflows" },
    { id: "e-repo-security", source: "repo", target: "security" },
    { id: "e-security-license", source: "security", target: "license" },
    { id: "e-security-md", source: "security", target: "security-md" },
    { id: "e-security-risk", source: "security", target: "risk" },
    { id: "e-repo-deps", source: "repo", target: "deps" },
    { id: "e-deps-pm", source: "deps", target: "package-manager" },
    { id: "e-repo-maint", source: "repo", target: "maintenance" },
    { id: "e-maint-releases", source: "maintenance", target: "releases" },
    { id: "e-repo-dx", source: "repo", target: "dx" },
    { id: "e-repo-config", source: "repo", target: "config" },
  );

  return { nodes, edges };
}
