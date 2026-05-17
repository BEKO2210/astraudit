/**
 * Astraudit audit engine — public library entry point.
 *
 * Roadmap M3.1 — exposes the same deterministic audit pipeline the
 * site + MCP server already use, but framed as a tree-shakeable
 * library import. The browser extension (M3.2 onwards) consumes
 * this entry; the bookmarklet (M3.6) too. The website + MCP server
 * keep importing from the deeper paths they always have — nothing
 * here changes their wiring.
 *
 * Surface contract (intentionally narrow):
 *
 *   loadRepoBundle(coords, options?)     → fetch the bundle from
 *                                          GitHub's public API
 *   runAudit(bundle, emit?)              → run all ~70 detectors
 *   progressFor(step)                    → human-friendly progress
 *                                          metadata
 *   parseRepoInput(text)                 → normalise "owner/repo"
 *                                          and URL forms
 *
 * Plus the error classes consumers need to branch on
 * (RateLimitError, NotFoundError, InvalidTokenError, GithubError,
 * TooLargeError) and the full type surface from `src/types/`.
 *
 * Anything NOT exported from this barrel is implementation detail.
 * Adding to the surface = bumping the lib's major version.
 */

// --- Engine + bundle loader ------------------------------------------------
export { runAudit, progressFor } from "./lib/audit/auditEngine";
export type { ProgressEmitter } from "./lib/audit/auditEngine";

export { loadRepoBundle } from "./lib/github/index";
export type {
  LoadOptions,
  LoadProgressKey,
} from "./lib/github/index";

// --- Input parsing ---------------------------------------------------------
export { parseRepoInput } from "./lib/github/parseRepoInput";

// --- Stack-mate discovery (M4.1) ------------------------------------------
export {
  discoverStackMates,
  buildSearchQuery as buildStackMateQuery,
  rankCandidate as rankStackMate,
} from "./lib/github/discoverStackMates";
export type {
  StackMateBase,
  StackMate,
  DiscoverOptions as StackMateDiscoverOptions,
} from "./lib/github/discoverStackMates";

// --- Error classes (consumers branch on these for UX wiring) --------------
export {
  GithubError,
  RateLimitError,
  NotFoundError,
  InvalidTokenError,
  TooLargeError,
} from "./lib/github/githubClient";

// --- Type surface ----------------------------------------------------------
// Re-export every type the consumer will touch. Keeping them grouped by
// source file makes additions reviewable: a new type appearing here is a
// deliberate API addition, not an accidental leak.

export type {
  // From src/types/finding.ts
  Severity,
  Confidence,
  FindingCategory,
  Finding,
} from "./types/finding";

export type {
  // From src/types/audit.ts
  Grade,
  CategoryStatus,
  CategoryScore,
  StackSignals,
  FileStructureSummary,
  RepoStorySection,
  Recommendation,
  AuditResult,
  AuditProgressStep,
  AuditProgress,
} from "./types/audit";

export type {
  // From src/types/github.ts
  RepoCoordinates,
  RepoMetadata,
  TreeEntry,
  RepoTree,
  CommitInfo,
  ReleaseInfo,
  WorkflowInfo,
  LanguagesMap,
  RepoIssuesSnapshot,
  ImportantFile,
  OrgHealthSnapshot,
  BranchProtectionSignals,
  RepoBundle,
} from "./types/github";
