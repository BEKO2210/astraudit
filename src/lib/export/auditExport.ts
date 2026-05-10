/**
 * Phase 5.8 — multi-format audit export.
 *
 * Today the audit is read in the browser or printed via the
 * Phase 5.7 print stylesheet. That covers humans; downstream tooling
 * (issue trackers, security dashboards, GitOps pipelines, internal
 * docs) wants structured output. We add three exports:
 *
 *   - JSON      — the full AuditResult with a stable, versioned
 *                 schema. Drop-in for `jq` or any JSON-aware tool.
 *   - Markdown  — a complete narrative report (overview, score
 *                 breakdown, every finding with severity +
 *                 recommendation, the Repo Story, next steps).
 *                 Pasteable into a GitHub issue or a wiki without
 *                 further edits.
 *   - AsciiDoc  — same content as Markdown but in AsciiDoc syntax for
 *                 users on Antora / Asciidoctor docs pipelines.
 *
 * All three are generated client-side in the browser. No backend, no
 * external libraries — Markdown and AsciiDoc are written by hand
 * because both formats are simple enough that a serializer is shorter
 * than a dependency.
 *
 * The filename convention is `astraudit-{owner}-{repo}-{YYYY-MM-DD}.{ext}`
 * so multiple downloads sort nicely on disk.
 */

import type { AuditResult, Recommendation } from "../../types/audit";
import type { Finding } from "../../types/finding";

/** Versioned schema tag we emit at the top of the JSON export. Bump
 *  on a breaking shape change so consumers can detect mismatch. */
export const EXPORT_SCHEMA_VERSION = "1";

export type ExportFormat = "json" | "markdown" | "asciidoc";

export interface ExportFile {
  filename: string;
  content: string;
  mimeType: string;
}

/** Format a YYYY-MM-DD stamp in UTC so two downloads on the same day
 *  but different timezones still collide on disk (a feature: re-runs
 *  overwrite cleanly). */
function isoDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function makeFilename(
  result: AuditResult,
  ext: string,
  date: Date = new Date(),
): string {
  const { owner, repo } = result.bundle.coords;
  // Slugify owner/repo so a `.` or special char doesn't break the
  // download header on Safari.
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `astraudit-${safe(owner)}-${safe(repo)}-${isoDate(date)}.${ext}`;
}

export function exportAudit(
  result: AuditResult,
  format: ExportFormat,
  date: Date = new Date(),
): ExportFile {
  switch (format) {
    case "json":
      return {
        filename: makeFilename(result, "json", date),
        content: exportToJson(result),
        mimeType: "application/json",
      };
    case "markdown":
      return {
        filename: makeFilename(result, "md", date),
        content: exportToMarkdown(result),
        mimeType: "text/markdown",
      };
    case "asciidoc":
      return {
        filename: makeFilename(result, "adoc", date),
        content: exportToAsciiDoc(result),
        mimeType: "text/asciidoc",
      };
  }
}

/* ----------------------------------------------------------------- */
/* JSON                                                              */
/* ----------------------------------------------------------------- */

export function exportToJson(result: AuditResult): string {
  // We deliberately do NOT just `JSON.stringify(result)` — the bundle
  // contains the entire repo tree (potentially megabytes of paths)
  // and the README content. Consumers don't want that in their pinned
  // exports. We emit a curated structured object with a versioned
  // schema header so downstream tools can validate.
  const { bundle, generatedAt } = result;
  const out = {
    schema: "astraudit-audit-export",
    schemaVersion: EXPORT_SCHEMA_VERSION,
    generatedAt,
    repository: {
      fullName: bundle.metadata.fullName,
      owner: bundle.metadata.owner.login,
      name: bundle.metadata.name,
      htmlUrl: bundle.metadata.htmlUrl,
      description: bundle.metadata.description,
      defaultBranch: bundle.metadata.defaultBranch,
      stars: bundle.metadata.stars,
      forks: bundle.metadata.forks,
      openIssues: bundle.metadata.openIssues,
      language: bundle.metadata.language,
      topics: bundle.metadata.topics,
      license: bundle.metadata.license,
      pushedAt: bundle.metadata.pushedAt,
    },
    score: {
      total: result.totalScore,
      max: result.maxScore,
      grade: result.grade,
      verdict: result.verdict,
      headline: result.headline,
    },
    categories: result.categories.map((c) => ({
      key: c.key,
      label: c.label,
      score: c.score,
      max: c.max,
      status: c.status,
      evidence: c.evidence,
    })),
    findings: result.findings.map((f) => ({
      id: f.id,
      title: f.title,
      category: f.category,
      severity: f.severity,
      description: f.description,
      evidence: f.evidence,
      recommendation: f.recommendation,
      affectedFiles: f.affectedFiles,
      confidence: f.confidence,
    })),
    recommendations: result.recommendations.map((r) => ({
      id: r.id,
      title: r.title,
      area: r.area,
      rationale: r.rationale,
      impact: r.impact,
    })),
    onboarding: result.onboarding.map((s) => ({
      id: s.id,
      title: s.title,
      rationale: s.rationale,
      command: s.command,
      optional: s.optional,
    })),
    story: result.story,
    stack: result.stack,
  };
  return JSON.stringify(out, null, 2) + "\n";
}

/* ----------------------------------------------------------------- */
/* Markdown                                                          */
/* ----------------------------------------------------------------- */

const SEVERITY_EMOJI: Record<Finding["severity"], string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
  info: "⚪",
};

export function exportToMarkdown(result: AuditResult): string {
  const { bundle } = result;
  const lines: string[] = [];

  lines.push(`# Astraudit — ${bundle.metadata.fullName}`);
  lines.push("");
  if (bundle.metadata.description) {
    lines.push(`> ${bundle.metadata.description}`);
    lines.push("");
  }
  lines.push(
    `**Score:** ${result.totalScore} / ${result.maxScore}  ·  **Grade:** ${result.grade}`,
  );
  lines.push("");
  lines.push(`*${result.verdict}*`);
  lines.push("");
  lines.push(`Generated: \`${result.generatedAt}\`  ·  Repository: ${bundle.metadata.htmlUrl}`);
  lines.push("");

  /* Score breakdown ------------------------------------------------ */
  lines.push("## Score breakdown");
  lines.push("");
  lines.push("| Category | Score | Status |");
  lines.push("| --- | --- | --- |");
  for (const c of result.categories) {
    lines.push(`| ${escMd(c.label)} | ${c.score}/${c.max} | ${c.status} |`);
  }
  lines.push("");

  /* Repo Story ----------------------------------------------------- */
  if (result.story.length > 0) {
    lines.push("## Repository story");
    lines.push("");
    for (const section of result.story) {
      lines.push(`### ${escMd(section.heading)}`);
      lines.push("");
      lines.push(escMd(section.body));
      lines.push("");
    }
  }

  /* Findings ------------------------------------------------------- */
  lines.push("## Findings");
  lines.push("");
  if (result.findings.length === 0) {
    lines.push("_No findings — the rule-based detectors didn't raise anything._");
    lines.push("");
  } else {
    for (const f of result.findings) {
      const emoji = SEVERITY_EMOJI[f.severity];
      lines.push(
        `### ${emoji} [${f.severity.toUpperCase()}] ${escMd(f.title)}`,
      );
      lines.push("");
      lines.push(`**Category:** ${f.category}`);
      lines.push("");
      lines.push(escMd(f.description));
      lines.push("");
      if (f.evidence) {
        lines.push(`**Evidence:** ${escMd(f.evidence)}`);
        lines.push("");
      }
      if (f.recommendation) {
        lines.push(`**Recommendation:** ${escMd(f.recommendation)}`);
        lines.push("");
      }
      if (f.affectedFiles && f.affectedFiles.length > 0) {
        lines.push(`**Affected files:**`);
        for (const path of f.affectedFiles) lines.push(`- \`${path}\``);
        lines.push("");
      }
    }
  }

  /* Recommendations ------------------------------------------------ */
  if (result.recommendations.length > 0) {
    lines.push("## Recommended next steps");
    lines.push("");
    result.recommendations.forEach((r: Recommendation, i) => {
      lines.push(
        `${i + 1}. **${escMd(r.title)}** _(impact: ${r.impact})_ — ${escMd(r.rationale)}`,
      );
    });
    lines.push("");
  }

  /* Onboarding ----------------------------------------------------- */
  if (result.onboarding.length > 0) {
    lines.push("## How to actually use this repository");
    lines.push("");
    result.onboarding.forEach((s, i) => {
      const optTag = s.optional ? " *(optional)*" : "";
      lines.push(`${i + 1}. **${escMd(s.title)}**${optTag}`);
      lines.push("");
      lines.push(`   ${escMd(s.rationale)}`);
      if (s.command) {
        lines.push("");
        lines.push("   ```sh");
        lines.push(`   ${s.command}`);
        lines.push("   ```");
      }
      lines.push("");
    });
  }

  lines.push("---");
  lines.push("");
  lines.push(`Generated by Astraudit · ${result.generatedAt}`);
  lines.push("");
  return lines.join("\n");
}

/** Escape Markdown control characters that would otherwise turn copy
 *  text into accidental formatting. We deliberately don't escape
 *  back-ticks because most user-visible strings don't contain them
 *  and escaping breaks the readability of file paths inside titles. */
function escMd(text: string): string {
  return text.replace(/([\\*_~|<>])/g, "\\$1");
}

/* ----------------------------------------------------------------- */
/* AsciiDoc                                                          */
/* ----------------------------------------------------------------- */

export function exportToAsciiDoc(result: AuditResult): string {
  const { bundle } = result;
  const lines: string[] = [];

  lines.push(`= Astraudit — ${bundle.metadata.fullName}`);
  lines.push(`:generated-at: ${result.generatedAt}`);
  lines.push(`:repo-url: ${bundle.metadata.htmlUrl}`);
  lines.push("");
  if (bundle.metadata.description) {
    lines.push(bundle.metadata.description);
    lines.push("");
  }
  lines.push(
    `*Score:* ${result.totalScore} / ${result.maxScore}  · *Grade:* ${result.grade}`,
  );
  lines.push("");
  lines.push(`_${result.verdict}_`);
  lines.push("");
  lines.push(`Generated: \`${result.generatedAt}\`  ·  Repository: ${bundle.metadata.htmlUrl}`);
  lines.push("");

  /* Score breakdown ------------------------------------------------ */
  lines.push("== Score breakdown");
  lines.push("");
  lines.push("|===");
  lines.push("| Category | Score | Status");
  for (const c of result.categories) {
    lines.push(`| ${escAdoc(c.label)} | ${c.score}/${c.max} | ${c.status}`);
  }
  lines.push("|===");
  lines.push("");

  /* Repo Story ----------------------------------------------------- */
  if (result.story.length > 0) {
    lines.push("== Repository story");
    lines.push("");
    for (const section of result.story) {
      lines.push(`=== ${escAdoc(section.heading)}`);
      lines.push("");
      lines.push(escAdoc(section.body));
      lines.push("");
    }
  }

  /* Findings ------------------------------------------------------- */
  lines.push("== Findings");
  lines.push("");
  if (result.findings.length === 0) {
    lines.push("_No findings — the rule-based detectors didn't raise anything._");
    lines.push("");
  } else {
    for (const f of result.findings) {
      lines.push(`=== [${f.severity.toUpperCase()}] ${escAdoc(f.title)}`);
      lines.push("");
      lines.push(`*Category:* ${f.category}`);
      lines.push("");
      lines.push(escAdoc(f.description));
      lines.push("");
      if (f.evidence) {
        lines.push(`*Evidence:* ${escAdoc(f.evidence)}`);
        lines.push("");
      }
      if (f.recommendation) {
        lines.push(`*Recommendation:* ${escAdoc(f.recommendation)}`);
        lines.push("");
      }
      if (f.affectedFiles && f.affectedFiles.length > 0) {
        lines.push("*Affected files:*");
        for (const path of f.affectedFiles) lines.push(`* \`${path}\``);
        lines.push("");
      }
    }
  }

  /* Recommendations ------------------------------------------------ */
  if (result.recommendations.length > 0) {
    lines.push("== Recommended next steps");
    lines.push("");
    result.recommendations.forEach((r: Recommendation) => {
      lines.push(
        `. *${escAdoc(r.title)}* (impact: ${r.impact}) — ${escAdoc(r.rationale)}`,
      );
    });
    lines.push("");
  }

  /* Onboarding ----------------------------------------------------- */
  if (result.onboarding.length > 0) {
    lines.push("== How to actually use this repository");
    lines.push("");
    result.onboarding.forEach((s) => {
      const optTag = s.optional ? " (optional)" : "";
      lines.push(`. *${escAdoc(s.title)}*${optTag}`);
      lines.push(`+`);
      lines.push(escAdoc(s.rationale));
      if (s.command) {
        lines.push("+");
        lines.push("[source,sh]");
        lines.push("----");
        lines.push(s.command);
        lines.push("----");
      }
    });
    lines.push("");
  }

  lines.push("'''");
  lines.push("");
  lines.push(`Generated by Astraudit · ${result.generatedAt}`);
  lines.push("");
  return lines.join("\n");
}

/** Escape AsciiDoc control characters. AsciiDoc is permissive about
 *  most punctuation but treats `_`, `*`, `+` and `[` specially in
 *  inline contexts. We escape the few that break common patterns. */
function escAdoc(text: string): string {
  // AsciiDoc inline-format characters we need to neutralize: `*` `_` `+` `\`
  return text.replace(/([\\*_+])/g, "\\$1");
}

/* ----------------------------------------------------------------- */
/* Browser-side download trigger                                      */
/* ----------------------------------------------------------------- */

/**
 * Trigger a browser download. Pure browser code — no backend, no
 * external library. Skips silently in non-DOM environments so unit
 * tests can call it without crashing.
 */
export function downloadExportFile(file: ExportFile): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([file.content], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Spec says revoke can happen immediately after click() returns,
  // because the download has already been kicked off. The 5s grace
  // is belt-and-suspenders for old browsers that haven't quite
  // started fetching the blob yet.
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
