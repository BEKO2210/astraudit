import type { CommitInfo, ReleaseInfo, RepoBundle } from "../../types/github";
import type { ClassifiedFiles } from "./fileClassifier";
import type { ReadmeSignals } from "./documentationDetector";
import type { CiSignals } from "./ciDetector";
import type { StackSignals } from "../../types/audit";
import type { MaintenanceSignals } from "./maintenanceDetector";

export type AgeBucket = "newborn" | "young" | "established" | "mature" | "veteran";
export type StarsBucket = "tiny" | "small" | "medium" | "large" | "huge" | "mega";
export type FreshnessBucket = "fresh" | "recent" | "stale" | "abandoned" | "unknown";
export type CadenceBucket = "burst" | "active" | "steady" | "occasional" | "rare" | "unknown";
export type DiversityBucket = "monolingual" | "bilingual" | "polyglot";
export type RootDensityBucket = "tidy" | "moderate" | "crowded" | "very-crowded";
export type TriageHealth = "healthy" | "moderate" | "backlog" | "heavy" | "unknown";
export type ReleaseRhythm = "frequent" | "regular" | "occasional" | "rare" | "none";

export interface ReadmeMetrics {
  exists: boolean;
  chars: number;
  words: number;
  headings: number;
  codeBlocks: number;
  inlineCode: number;
  images: number;
  links: number;
  badges: number;
  tables: number;
  sections: string[];
}

export interface CommitActivity {
  count: number;
  spanDays: number | null;
  cadenceDays: number | null;
  uniqueAuthors: number;
  topAuthors: Array<{ name: string; commits: number }>;
  bucket: CadenceBucket;
}

export interface ReleaseActivity {
  count: number;
  latestTag: string | null;
  latestPublishedAt: string | null;
  daysSinceLatest: number | null;
  averageDaysBetween: number | null;
  rhythm: ReleaseRhythm;
}

export interface WorkflowProfile {
  total: number;
  hasBuild: boolean;
  hasTest: boolean;
  hasLint: boolean;
  hasDeploy: boolean;
  hasRelease: boolean;
  hasCodeQL: boolean;
  hasDependabot: boolean;
  buckets: string[];
  providers: Array<{ id: string; label: string }>;
  hasGithubActions: boolean;
}

export interface TreeShape {
  totalFiles: number;
  rootFiles: number;
  rootDensity: RootDensityBucket;
  maxDepth: number;
  averageDepth: number;
  monorepoShape: "single" | "monorepo" | "polyrepo" | "unknown";
  topExtensions: Array<{ ext: string; count: number; share: number }>;
}

export interface DerivedInsights {
  ageDays: number | null;
  ageBucket: AgeBucket;
  starsBucket: StarsBucket;
  starsPerDay: number | null;
  starsPerMonth: number | null;
  freshnessBucket: FreshnessBucket;
  daysSincePush: number | null;
  diversityBucket: DiversityBucket;
  primaryLanguageShare: number;
  languageGap: number;
  triageHealth: TriageHealth;
  issuePrRatio: number | null;
  readme: ReadmeMetrics;
  commits: CommitActivity;
  releases: ReleaseActivity;
  workflows: WorkflowProfile;
  tree: TreeShape;
  licenseSummary: string | null;
  licenseTone: "permissive" | "weak-copyleft" | "strong-copyleft" | "proprietary" | "unknown";
  topicSignals: string[];
  trustScore: number;
  audienceLabel: string;
  formattedAge: string;
}

/**
 * Strip the most common Markdown inline syntax so a README heading like
 *   # [React](https://react.dev/) · [![GitHub license](https://img.shields.io/badge/...)](url)
 * becomes a clean, human-readable section name.
 */
function stripMarkdownInline(input: string): string {
  return input
    // images first so the alt-text doesn't get treated as a link label
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    // links: keep the visible label, drop the URL
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // emphasis, strong, inline code, strikethrough
    .replace(/[*_`~]/g, "")
    // collapse whitespace and trim middle dots / pipes / dashes left over
    .replace(/[·|]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-—–:]+|[\s\-—–:]+$/g, "")
    .trim();
}

const PERMISSIVE = ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "Unlicense"];
const WEAK_COPYLEFT = ["LGPL-2.1", "LGPL-3.0", "MPL-2.0", "EPL-2.0", "EPL-1.0"];
const STRONG_COPYLEFT = ["GPL-2.0", "GPL-3.0", "AGPL-3.0", "CDDL-1.0"];

function buildLicenseSummary(spdxId: string | null, fullName: string | null) {
  if (!spdxId) {
    return {
      summary: fullName ? `${fullName} (custom or non-SPDX terms).` : null,
      tone: "unknown" as const,
    };
  }
  if (PERMISSIVE.includes(spdxId)) {
    return {
      summary: `${spdxId} — permissive: commercial reuse, redistribution, and modification allowed with attribution.`,
      tone: "permissive" as const,
    };
  }
  if (WEAK_COPYLEFT.includes(spdxId)) {
    return {
      summary: `${spdxId} — weak copyleft: derivative works of the licensed code must stay open, but linking is allowed.`,
      tone: "weak-copyleft" as const,
    };
  }
  if (STRONG_COPYLEFT.includes(spdxId)) {
    return {
      summary: `${spdxId} — strong copyleft: derivative works must be released under the same license.`,
      tone: "strong-copyleft" as const,
    };
  }
  return {
    summary: `${spdxId} — review the license text before commercial reuse.`,
    tone: "proprietary" as const,
  };
}

function bucketAge(days: number | null): AgeBucket {
  if (days === null) return "established";
  if (days < 60) return "newborn";
  if (days < 365) return "young";
  if (days < 365 * 3) return "established";
  if (days < 365 * 7) return "mature";
  return "veteran";
}

function bucketStars(stars: number): StarsBucket {
  if (stars < 50) return "tiny";
  if (stars < 1_000) return "small";
  if (stars < 10_000) return "medium";
  if (stars < 50_000) return "large";
  if (stars < 100_000) return "huge";
  return "mega";
}

function bucketFreshness(days: number | null): FreshnessBucket {
  if (days === null) return "unknown";
  if (days <= 14) return "fresh";
  if (days <= 90) return "recent";
  if (days <= 365) return "stale";
  return "abandoned";
}

function analyzeCommits(commits: CommitInfo[]): CommitActivity {
  if (commits.length === 0) {
    return {
      count: 0,
      spanDays: null,
      cadenceDays: null,
      uniqueAuthors: 0,
      topAuthors: [],
      bucket: "unknown",
    };
  }
  const dates = commits
    .map((c) => (c.authorDate ? new Date(c.authorDate).getTime() : null))
    .filter((d): d is number => d !== null);
  let spanDays: number | null = null;
  let cadence: number | null = null;
  if (dates.length >= 2) {
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    spanDays = Math.max(0, Math.round((max - min) / 86_400_000));
    cadence = dates.length > 1 ? spanDays / (dates.length - 1) : null;
  }
  const counts = new Map<string, number>();
  for (const c of commits) {
    if (!c.authorName) continue;
    counts.set(c.authorName, (counts.get(c.authorName) ?? 0) + 1);
  }
  const top = Array.from(counts.entries())
    .map(([name, n]) => ({ name, commits: n }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 3);

  let bucket: CadenceBucket = "unknown";
  if (cadence !== null) {
    if (cadence <= 1) bucket = "burst";
    else if (cadence <= 4) bucket = "active";
    else if (cadence <= 14) bucket = "steady";
    else if (cadence <= 60) bucket = "occasional";
    else bucket = "rare";
  }
  return {
    count: commits.length,
    spanDays,
    cadenceDays: cadence !== null ? Math.round(cadence * 10) / 10 : null,
    uniqueAuthors: counts.size,
    topAuthors: top,
    bucket,
  };
}

function analyzeReleases(releases: ReleaseInfo[]): ReleaseActivity {
  if (releases.length === 0) {
    return {
      count: 0,
      latestTag: null,
      latestPublishedAt: null,
      daysSinceLatest: null,
      averageDaysBetween: null,
      rhythm: "none",
    };
  }
  const published = releases
    .map((r) => (r.publishedAt ? new Date(r.publishedAt).getTime() : null))
    .filter((t): t is number => t !== null)
    .sort((a, b) => b - a);
  const latest = published[0] ?? null;
  const daysSince = latest
    ? Math.round((Date.now() - latest) / 86_400_000)
    : null;
  let avg: number | null = null;
  if (published.length >= 2) {
    let total = 0;
    for (let i = 1; i < published.length; i++) {
      total += (published[i - 1] - published[i]) / 86_400_000;
    }
    avg = total / (published.length - 1);
  }
  let rhythm: ReleaseRhythm = "occasional";
  if (avg === null) rhythm = releases.length > 0 ? "occasional" : "none";
  else if (avg <= 14) rhythm = "frequent";
  else if (avg <= 60) rhythm = "regular";
  else if (avg <= 180) rhythm = "occasional";
  else rhythm = "rare";

  return {
    count: releases.length,
    latestTag: releases[0]?.tagName ?? null,
    latestPublishedAt: releases[0]?.publishedAt ?? null,
    daysSinceLatest: daysSince,
    averageDaysBetween: avg !== null ? Math.round(avg) : null,
    rhythm,
  };
}

function analyzeTree(classified: ClassifiedFiles): TreeShape {
  const blob = Array.from(classified.blobPaths);
  const total = blob.length;
  const rootFiles = classified.rootFileCount;

  let depthSum = 0;
  let maxDepth = 0;
  const extCounts = new Map<string, number>();
  for (const path of blob) {
    const segments = path.split("/").length;
    depthSum += segments;
    if (segments > maxDepth) maxDepth = segments;
    const dot = path.lastIndexOf(".");
    if (dot > path.lastIndexOf("/") && dot < path.length - 1) {
      const ext = path.slice(dot + 1).toLowerCase();
      if (ext.length <= 6) extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
    }
  }
  const avgDepth = total > 0 ? Math.round((depthSum / total) * 10) / 10 : 0;
  const topExt = Array.from(extCounts.entries())
    .map(([ext, count]) => ({ ext, count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  let rootDensity: RootDensityBucket = "tidy";
  if (rootFiles > 60) rootDensity = "very-crowded";
  else if (rootFiles > 30) rootDensity = "crowded";
  else if (rootFiles > 18) rootDensity = "moderate";

  let monorepoShape: TreeShape["monorepoShape"] = "single";
  const monorepoConfig = classified.hasFile(
    "turbo.json",
    "nx.json",
    "pnpm-workspace.yaml",
    "pnpm-workspace.yml",
    "lerna.json",
    "rush.json",
    "moon.yml",
  );
  const hasPackagesFolder = Array.from(classified.blobPathsLower.keys()).some(
    (p) => p.startsWith("packages/") || p.startsWith("apps/"),
  );
  if (monorepoConfig || hasPackagesFolder) {
    monorepoShape = "monorepo";
  } else if (rootFiles === 0 && total > 0) {
    monorepoShape = "polyrepo";
  } else if (total === 0) {
    monorepoShape = "unknown";
  }

  return {
    totalFiles: total,
    rootFiles,
    rootDensity,
    maxDepth,
    averageDepth: avgDepth,
    monorepoShape,
    topExtensions: topExt,
  };
}

function analyzeReadmeMetrics(signals: ReadmeSignals, content: string | null): ReadmeMetrics {
  if (!signals.exists) {
    return {
      exists: false,
      chars: 0,
      words: 0,
      headings: 0,
      codeBlocks: 0,
      inlineCode: 0,
      images: 0,
      links: 0,
      badges: 0,
      tables: 0,
      sections: [],
    };
  }
  const text = content ?? "";
  const chars = text.length || signals.length;
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const headings = text ? (text.match(/^#{1,6} /gm) ?? []).length : 0;
  const codeBlocks = text ? (text.match(/```/g) ?? []).length / 2 : 0;
  const inlineCode = text ? (text.match(/`[^`\n]+`/g) ?? []).length : 0;
  const images = text ? (text.match(/!\[/g) ?? []).length : 0;
  const links = text ? (text.match(/\]\([^)]+\)/g) ?? []).length : 0;
  const badges = text ? (text.match(/img\.shields\.io|badge\.fury\.io|github\.com\/.+\/(workflows|actions)\/.+\/badge/g) ?? []).length : 0;
  const tables = text ? (text.match(/^\|.+\|$/gm) ?? []).length : 0;

  const sections: string[] = [];
  if (text) {
    const headingLines = text.match(/^#{1,3} .+$/gm) ?? [];
    for (const line of headingLines) {
      const cleaned = stripMarkdownInline(line.replace(/^#+\s*/, ""));
      if (cleaned && cleaned.length <= 80) sections.push(cleaned);
      if (sections.length >= 12) break;
    }
  }
  return {
    exists: true,
    chars,
    words,
    headings,
    codeBlocks: Math.floor(codeBlocks),
    inlineCode,
    images,
    links,
    badges,
    tables,
    sections,
  };
}

function analyzeWorkflows(ci: CiSignals): WorkflowProfile {
  const buckets: string[] = [];
  if (ci.hasBuildWorkflow) buckets.push("build");
  if (ci.hasTestWorkflow) buckets.push("test");
  if (ci.hasLintWorkflow) buckets.push("lint");
  if (ci.hasDeployWorkflow) buckets.push("deploy");
  if (ci.hasReleaseWorkflow) buckets.push("release");
  if (ci.hasCodeQLWorkflow) buckets.push("codeql");
  return {
    total: ci.workflowCount,
    hasBuild: ci.hasBuildWorkflow,
    hasTest: ci.hasTestWorkflow,
    hasLint: ci.hasLintWorkflow,
    hasDeploy: ci.hasDeployWorkflow,
    hasRelease: ci.hasReleaseWorkflow,
    hasCodeQL: ci.hasCodeQLWorkflow,
    hasDependabot: false,
    buckets,
    providers: ci.providers.map((p) => ({ id: p.id, label: p.label })),
    hasGithubActions: ci.hasGithubActions,
  };
}

function bucketTriage(openIssues: number, openPRs: number | null, stars: number): TriageHealth {
  if (openPRs === null && openIssues === 0) return "unknown";
  if (openPRs === null) {
    if (openIssues > 1000) return "heavy";
    if (openIssues > 250) return "backlog";
    if (openIssues > 50) return "moderate";
    return "healthy";
  }
  const total = openIssues + openPRs;
  const ratio = stars > 0 ? total / stars : total / 100;
  if (ratio < 0.005) return "healthy";
  if (ratio < 0.02) return "moderate";
  if (ratio < 0.05) return "backlog";
  return "heavy";
}

function describeAudience(stars: number, ageDays: number | null): string {
  if (stars >= 100_000) return "household-name OSS project";
  if (stars >= 25_000) return "category-leading OSS project";
  if (stars >= 5_000) return "well-known OSS project";
  if (stars >= 1_000) return "popular community project";
  if (stars >= 100) return "growing community project";
  if (ageDays !== null && ageDays < 60) return "newly published project";
  return "small or niche project";
}

function describeAgeText(days: number | null): string {
  if (days === null) return "creation date unknown";
  if (days < 30) return `${days} days old`;
  if (days < 365) return `${Math.round(days / 30)} months old`;
  const years = days / 365;
  if (years < 2) return `over a year old`;
  return `${years.toFixed(1)} years old`;
}

function pickTopicSignals(topics: string[]): string[] {
  const groups: Record<string, string[]> = {
    web: ["frontend", "react", "vue", "svelte", "angular", "ssr", "nextjs", "nuxt"],
    backend: ["nodejs", "express", "fastify", "nestjs", "api", "rest", "graphql"],
    devtool: ["cli", "tooling", "build-tool", "bundler", "compiler", "linter"],
    runtime: ["deno", "bun", "nodejs", "wasm", "v8"],
    docs: ["documentation", "tutorial", "examples"],
    infra: ["docker", "kubernetes", "terraform", "ansible", "ci-cd"],
    ai: ["machine-learning", "ai", "llm", "nlp", "ml"],
  };
  const matched = new Set<string>();
  const lowerTopics = topics.map((t) => t.toLowerCase());
  for (const [label, members] of Object.entries(groups)) {
    if (lowerTopics.some((t) => members.includes(t))) matched.add(label);
  }
  return Array.from(matched);
}

interface InsightsContext {
  bundle: RepoBundle;
  classified: ClassifiedFiles;
  readme: ReadmeSignals;
  ci: CiSignals;
  stack: StackSignals;
  maintenance: MaintenanceSignals;
}

export function deriveInsights(ctx: InsightsContext): DerivedInsights {
  const { bundle, classified, readme, ci, stack, maintenance } = ctx;
  const meta = bundle.metadata;

  const ageDays =
    meta.createdAt !== null
      ? Math.max(
          0,
          Math.round((Date.now() - new Date(meta.createdAt).getTime()) / 86_400_000),
        )
      : null;
  const ageBucket = bucketAge(ageDays);
  const starsBucket = bucketStars(meta.stars);
  const starsPerDay = ageDays && ageDays > 0 ? meta.stars / ageDays : null;
  const starsPerMonth = starsPerDay !== null ? Math.round(starsPerDay * 30 * 10) / 10 : null;
  const freshnessBucket = bucketFreshness(maintenance.daysSincePush);

  const totalLangBytes = stack.languages.reduce((sum, l) => sum + l.bytes, 0);
  const primaryShare =
    totalLangBytes > 0 && stack.languages.length > 0
      ? stack.languages[0].bytes / totalLangBytes
      : 0;
  const languageGap =
    stack.languages.length >= 2
      ? (stack.languages[0].bytes - stack.languages[1].bytes) / Math.max(1, totalLangBytes)
      : 1;
  let diversityBucket: DiversityBucket = "monolingual";
  if (stack.languages.length >= 3 && primaryShare < 0.7) diversityBucket = "polyglot";
  else if (stack.languages.length >= 2 && primaryShare < 0.85) diversityBucket = "bilingual";

  const triageHealth = bucketTriage(
    bundle.issues.openIssueCount,
    bundle.issues.openPRCount,
    meta.stars,
  );
  const issuePrRatio =
    bundle.issues.openPRCount && bundle.issues.openPRCount > 0
      ? Math.round((bundle.issues.openIssueCount / bundle.issues.openPRCount) * 10) / 10
      : null;

  const readmeContent = bundle.readme?.content ?? null;
  const readmeMetrics = analyzeReadmeMetrics(readme, readmeContent);
  const commits = analyzeCommits(bundle.recentCommits);
  const releases = analyzeReleases(bundle.releases);
  const workflows = analyzeWorkflows(ci);
  workflows.hasDependabot = !!classified.hasFile(
    ".github/dependabot.yml",
    ".github/dependabot.yaml",
  );

  const tree = analyzeTree(classified);
  const lic = buildLicenseSummary(
    meta.license?.spdxId ?? null,
    meta.license?.name ?? null,
  );

  let trustScore = 0;
  if (meta.license) trustScore += 22;
  if (classified.hasFile(
    "SECURITY.md",
    ".github/SECURITY.md",
    "docs/SECURITY.md",
    "SECURITY",
  ))
    trustScore += 18;
  if (workflows.hasDependabot) trustScore += 14;
  if (workflows.hasCodeQL) trustScore += 14;
  if (classified.hasFile(
    "CODEOWNERS",
    ".github/CODEOWNERS",
    "docs/CODEOWNERS",
  ))
    trustScore += 9;
  if (workflows.total > 0) trustScore += 9;
  if (stack.sboms.length > 0) trustScore += 9;
  if (!classified.suspiciousFiles.length) trustScore += 5;
  trustScore = Math.min(100, trustScore);

  return {
    ageDays,
    ageBucket,
    starsBucket,
    starsPerDay: starsPerDay !== null ? Math.round(starsPerDay * 100) / 100 : null,
    starsPerMonth,
    freshnessBucket,
    daysSincePush: maintenance.daysSincePush,
    diversityBucket,
    primaryLanguageShare: Math.round(primaryShare * 1000) / 10,
    languageGap: Math.round(languageGap * 1000) / 10,
    triageHealth,
    issuePrRatio,
    readme: readmeMetrics,
    commits,
    releases,
    workflows,
    tree,
    licenseSummary: lic.summary,
    licenseTone: lic.tone,
    topicSignals: pickTopicSignals(meta.topics),
    trustScore,
    audienceLabel: describeAudience(meta.stars, ageDays),
    formattedAge: describeAgeText(ageDays),
  };
}
