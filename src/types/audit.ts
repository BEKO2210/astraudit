import type { Finding, FindingCategory } from "./finding";
import type { GraphPayload } from "./graph";
import type { RepoBundle } from "./github";
import type { DerivedInsights } from "../lib/audit/insightEngine";
import type { OnboardingStep } from "../lib/audit/copyEngine";

export type Grade =
  | "Excellent"
  | "Very Strong"
  | "Strong"
  | "Good, but incomplete"
  | "Risky"
  | "Critical";

export type CategoryStatus =
  | "strong"
  | "partial"
  | "weak"
  | "missing"
  | "not-detected"
  | "info"
  /**
   * Phase 7.0.5 — the public surface doesn't carry the data
   * Astraudit would need to score this category honestly. Examples:
   * branch protection (gated to repo admins), transitive CVE counts
   * (out of scope, see SCOPE.md). An `unknown` category contributes
   * `0` to the numerator AND `0` to the denominator (helper:
   * `effectiveMaxScore()`) — no penalty, no credit. The dashboard
   * renders it with a question-mark badge.
   */
  | "unknown"
  /**
   * Phase 7.0.5 — the file / pattern doesn't belong on this stack.
   * Example: `Dockerfile` on a Rust library crate, `requirements.txt`
   * on a Cargo crate, `.env.example` on a static-site repo.
   * `not-applicable` categories contribute `0` to the numerator and
   * are removed from the denominator entirely (helper:
   * `effectiveMaxScore()`), so the displayed percentage stays
   * honest. The dashboard renders it with an `n/a` badge.
   */
  | "not-applicable";

export interface CategoryScore {
  key: FindingCategory;
  label: string;
  score: number;
  max: number;
  status: CategoryStatus;
  summary: string;
  evidence: string[];
}

export interface StackSignals {
  language: string | null;
  languages: Array<{ name: string; bytes: number; share: number }>;
  packageManager: string | null;
  runtime: string | null;
  frameworks: string[];
  buildTools: string[];
  testTools: string[];
  lintTools: string[];
  monorepoTool: string | null;
  containerized: boolean;
  hasLockfile: boolean;
  dependencyCounts: {
    dependencies: number | null;
    devDependencies: number | null;
  } | null;
  /** Toolchain version pinning (mise, asdf, nvm, pyenv, rbenv, …). */
  envManagers: string[];
  /** Python-side ecosystem detection (uv, Pixi, Hatch, Poetry, Pipenv). */
  pythonTools: string[];
  /** Software Bill of Materials files detected at the repo root. */
  sboms: string[];
  /** AI / agent tooling integrations detected (Claude Code, Cursor, Aider, …). */
  aiDevTools: string[];
}

export interface FileStructureSummary {
  importantFilesPresent: string[];
  importantFilesMissing: string[];
  importantFolders: string[];
  rootFileCount: number;
  treeTruncated: boolean;
  totalFiles: number;
  suspiciousFiles: string[];
}

export interface RepoStorySection {
  heading: string;
  body: string;
}

export interface Recommendation {
  id: string;
  title: string;
  area: FindingCategory;
  rationale: string;
  impact: "high" | "medium" | "low";
}

export interface AuditResult {
  bundle: RepoBundle;
  totalScore: number;
  maxScore: number;
  grade: Grade;
  verdict: string;
  headline: string;
  categories: CategoryScore[];
  findings: Finding[];
  story: RepoStorySection[];
  graph: GraphPayload;
  stack: StackSignals;
  fileStructure: FileStructureSummary;
  recommendations: Recommendation[];
  insights: DerivedInsights;
  onboarding: OnboardingStep[];
  generatedAt: string;
}

export type AuditProgressStep =
  | "metadata"
  | "tree"
  | "stack"
  | "documentation"
  | "quality"
  | "graph"
  | "recommendations"
  | "done";

export interface AuditProgress {
  step: AuditProgressStep;
  label: string;
  index: number;
  total: number;
}

export interface WorkerInputMessage {
  type: "audit";
  bundle: RepoBundle;
  /** Optional correlation id so callers can match parallel audits. */
  id?: string;
}

export type WorkerOutputMessage =
  | { type: "progress"; progress: AuditProgress; id?: string }
  | { type: "result"; result: AuditResult; id?: string }
  | { type: "error"; message: string; id?: string };
