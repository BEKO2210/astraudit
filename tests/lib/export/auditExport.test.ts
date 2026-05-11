/**
 * Phase 5.8 — multi-format export contract.
 *
 * Locks down the schema + filename convention so a silent shape
 * change in `auditExport.ts` fails CI. Three angles:
 *   1. JSON: stable schema header, every top-level key present,
 *      no leakage of the giant tree blob from the bundle.
 *   2. Markdown: every section heading present, severity emojis
 *      attached, recommendations list rendered.
 *   3. AsciiDoc: same content as Markdown but with `==` headings
 *      and `|===` table blocks.
 *   4. Filename: `astraudit-{owner}-{repo}-{YYYY-MM-DD}.{ext}` and
 *      special chars in owner/repo get slugified safely.
 */

import { describe, expect, it } from "vitest";
import {
  EXPORT_SCHEMA_VERSION,
  exportAudit,
  exportToAsciiDoc,
  exportToJson,
  exportToMarkdown,
} from "../../../src/lib/export/auditExport";
import { runAudit } from "../../../src/lib/audit/auditEngine";
import { makeBundle } from "../../fixtures/builders";

function richResult() {
  const bundle = makeBundle({
    metadata: {
      fullName: "demo-org/print-fixture",
      name: "print-fixture",
      owner: {
        login: "demo-org",
        avatarUrl: "https://example.com/a.png",
        htmlUrl: "https://example.com/demo-org",
        type: "Organization",
      },
      description: "Rich fixture for export.",
      stars: 1000,
      defaultBranch: "main",
      language: "TypeScript",
      topics: ["typescript", "vite"],
      license: { spdxId: "MIT", name: "MIT License" },
    },
    paths: [
      "README.md",
      "LICENSE",
      "SECURITY.md",
      "package.json",
      "src/index.ts",
      "tests/index.test.ts",
    ],
    importantFiles: {
      "package.json": JSON.stringify({
        name: "print-fixture",
        scripts: { build: "vite build", test: "vitest run", lint: "eslint ." },
        dependencies: { react: "^18.0.0" },
      }),
      "SECURITY.md": "# Security Policy\n\nReport to security@example.com.",
    },
    readmeContent: "# Demo\n\n## Installation\nnpm install\n\n## Usage\nnpm run dev",
  });
  const FIXED_DATE = "2026-05-10T12:00:00.000Z";
  const result = runAudit(bundle);
  return { ...result, generatedAt: FIXED_DATE };
}

describe("exportToJson", () => {
  const json = exportToJson(richResult());
  const parsed = JSON.parse(json) as Record<string, unknown>;

  it("includes the versioned schema header", () => {
    expect(parsed.schema).toBe("astraudit-audit-export");
    expect(parsed.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
  });

  it("emits every top-level section", () => {
    expect(parsed.repository).toBeDefined();
    expect(parsed.score).toBeDefined();
    expect(parsed.categories).toBeInstanceOf(Array);
    expect(parsed.findings).toBeInstanceOf(Array);
    expect(parsed.recommendations).toBeInstanceOf(Array);
    expect(parsed.onboarding).toBeInstanceOf(Array);
    expect(parsed.story).toBeInstanceOf(Array);
    expect(parsed.stack).toBeDefined();
  });

  it("does NOT leak the full bundle blob (would be megabytes)", () => {
    expect(parsed.bundle).toBeUndefined();
    expect((parsed.repository as { tree?: unknown }).tree).toBeUndefined();
  });

  it("ends with a trailing newline (POSIX-friendly)", () => {
    expect(json.endsWith("\n")).toBe(true);
  });

  it("recommendations carry impact + rationale (the new shape)", () => {
    const recs = parsed.recommendations as Array<Record<string, unknown>>;
    if (recs.length > 0) {
      expect(recs[0]).toHaveProperty("impact");
      expect(recs[0]).toHaveProperty("rationale");
    }
  });

  it("Phase 7.0.4: includes the scope disclaimer block", () => {
    const scope = parsed.scope as Record<string, string[]> | undefined;
    expect(scope).toBeDefined();
    expect(Array.isArray(scope?.what_we_check)).toBe(true);
    expect(Array.isArray(scope?.what_we_do_not_check)).toBe(true);
    expect(scope!.what_we_do_not_check.join(" ")).toMatch(/transitive CVE/i);
    expect(scope!.what_we_do_not_check.join(" ")).toMatch(/authenticated/i);
    expect(scope!.what_we_do_not_check.join(" ")).toMatch(/branch protection/i);
  });
});

describe("exportToMarkdown", () => {
  const md = exportToMarkdown(richResult());

  it("starts with a top-level h1 carrying the repo full name", () => {
    expect(md.startsWith("# Astraudit — demo-org/print-fixture")).toBe(true);
  });

  it("renders the score line with both score + max + grade", () => {
    expect(md).toMatch(/\*\*Score:\*\*\s*\d+\s*\/\s*\d+/);
    expect(md).toMatch(/\*\*Grade:\*\*/);
  });

  it("renders every required section heading", () => {
    expect(md).toMatch(/^## Score breakdown$/m);
    expect(md).toMatch(/^## Findings$/m);
  });

  it("uses a real markdown table for the score breakdown", () => {
    expect(md).toMatch(/\| Category \| Score \| Status \|/);
    expect(md).toMatch(/\|\s*---\s*\|/);
  });

  it("attaches severity emojis to findings (or shows the empty-celebration line)", () => {
    if (md.includes("### ")) {
      expect(md).toMatch(/[🔴🟠🟡🔵⚪]/);
    } else {
      expect(md).toMatch(/_No findings/);
    }
  });

  it("escapes markdown control characters in user-visible strings", () => {
    // `escMd` should turn `*` into `\*`. We can't easily synth a
    // result with a `*` in it, so instead assert the helper is used
    // by checking that no raw, unescaped `*` appears at the start of
    // a finding-title line (a regression would render every finding
    // title as italic-prefixed).
    const findingHeadings = md
      .split("\n")
      .filter((l) => l.startsWith("### "));
    for (const h of findingHeadings) {
      // No raw `*…*` italic spans inside the heading text proper.
      expect(h).not.toMatch(/\*\w/);
    }
  });

  it("Phase 7.0.4: carries the scope disclaimer section", () => {
    expect(md).toMatch(/^## Scope of this audit$/m);
    expect(md).toMatch(/### What Astraudit checks/);
    expect(md).toMatch(/### What Astraudit does NOT check/);
    expect(md).toMatch(/transitive CVE/i);
    expect(md).toMatch(/npm audit/);
  });
});

describe("exportToAsciiDoc", () => {
  const adoc = exportToAsciiDoc(richResult());

  it("starts with an AsciiDoc h1 (= prefix) carrying the repo full name", () => {
    expect(adoc.startsWith("= Astraudit — demo-org/print-fixture")).toBe(true);
  });

  it("declares the standard attribute header", () => {
    expect(adoc).toMatch(/:generated-at:/);
    expect(adoc).toMatch(/:repo-url:/);
  });

  it("uses `==` h2 headings (NOT markdown-style `## `)", () => {
    expect(adoc).toMatch(/^== Score breakdown$/m);
    expect(adoc).toMatch(/^== Findings$/m);
    expect(adoc).not.toMatch(/^## /m);
  });

  it("renders the score table with `|===` delimiters", () => {
    expect(adoc).toMatch(/\|===/);
    expect(adoc).toMatch(/\|\s*Category\s*\|\s*Score\s*\|\s*Status/);
  });

  it("Phase 7.0.4: carries the scope disclaimer section", () => {
    expect(adoc).toMatch(/^== Scope of this audit$/m);
    expect(adoc).toMatch(/=== What Astraudit checks/);
    expect(adoc).toMatch(/=== What Astraudit does \*not\* check/);
    expect(adoc).toMatch(/transitive CVE/i);
  });
});

describe("exportAudit dispatcher + filename convention", () => {
  it("returns the right shape for json", () => {
    const out = exportAudit(richResult(), "json", new Date("2026-05-10T12:00:00Z"));
    expect(out.filename).toBe("astraudit-demo-org-print-fixture-2026-05-10.json");
    expect(out.mimeType).toBe("application/json");
    expect(out.content.length).toBeGreaterThan(100);
  });

  it("returns .md for markdown + text/markdown mime", () => {
    const out = exportAudit(richResult(), "markdown", new Date("2026-05-10T12:00:00Z"));
    expect(out.filename.endsWith(".md")).toBe(true);
    expect(out.mimeType).toBe("text/markdown");
  });

  it("returns .adoc for asciidoc + text/asciidoc mime", () => {
    const out = exportAudit(richResult(), "asciidoc", new Date("2026-05-10T12:00:00Z"));
    expect(out.filename.endsWith(".adoc")).toBe(true);
    expect(out.mimeType).toBe("text/asciidoc");
  });

  it("slugifies special chars in owner/repo so Safari downloads don't break", () => {
    const result = richResult();
    // Mutate the coords with chars Safari rejects in Content-Disposition.
    const muted = {
      ...result,
      bundle: {
        ...result.bundle,
        coords: { owner: "demo/org", repo: "print fixture!" },
        metadata: {
          ...result.bundle.metadata,
          owner: { ...result.bundle.metadata.owner, login: "demo/org" },
          name: "print fixture!",
        },
      },
    };
    const out = exportAudit(muted, "json", new Date("2026-05-10T12:00:00Z"));
    expect(out.filename).not.toMatch(/[/!\s]/);
    expect(out.filename).toMatch(
      /^astraudit-demo-org-print-fixture[-]?-2026-05-10\.json$/,
    );
  });
});
