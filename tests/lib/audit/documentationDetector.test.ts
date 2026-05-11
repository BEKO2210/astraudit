import { describe, expect, it } from "vitest";
import { analyzeReadme } from "../../../src/lib/audit/documentationDetector";

function readme(content: string | null) {
  return analyzeReadme(content === null ? null : { path: "README.md", size: content.length, content });
}

describe("analyzeReadme", () => {
  it("returns a not-exists profile when no readme", () => {
    const r = readme(null);
    expect(r.exists).toBe(false);
    expect(r.length).toBe(0);
  });

  it("detects install/usage/api/example/screenshot mentions", () => {
    const md = `# Project\n\n## Installation\n\nnpm install foo\n\n## Usage\n\nimport foo\n\n## API\n\nfoo.bar()\n\n## Examples\n\nsee examples\n\n## Screenshot\n\n![demo](demo.png)`;
    const r = readme(md);
    expect(r.mentionsInstall).toBe(true);
    expect(r.mentionsUsage).toBe(true);
    expect(r.mentionsApi).toBe(true);
    expect(r.mentionsExamples).toBe(true);
    expect(r.mentionsScreenshot).toBe(true);
    expect(r.hasHeadings).toBe(true);
  });

  it("detects badge presence", () => {
    const md = `# Project\n\n[![CI](https://img.shields.io/...)](https://github.com/foo/bar)\n`;
    expect(readme(md).hasBadges).toBe(true);
  });

  it("returns false for missing signals", () => {
    const md = `Just a sentence about my repo.`;
    const r = readme(md);
    expect(r.mentionsInstall).toBe(false);
    expect(r.hasHeadings).toBe(false);
    expect(r.hasBadges).toBe(false);
  });
});

// Phase 7.0.2 — Wiki + external-docs awareness.
describe("analyzeReadme — external documentation awareness", () => {
  function readmeWith(content: string, options: { hasWiki?: boolean } = {}) {
    return analyzeReadme(
      { path: "README.md", size: content.length, content },
      options,
    );
  }

  it("recognises a Read the Docs link as external docs", () => {
    const r = readmeWith(
      `# My Project\n\nFull docs: https://myproject.readthedocs.io/en/latest/`,
    );
    expect(r.hasExternalDocs).toBe(true);
    expect(r.externalDocsHost).toBe("Read the Docs");
  });

  it("recognises docs.rs / pkg.go.dev as ecosystem-canonical hosts", () => {
    expect(
      readmeWith(`See [docs.rs/serde](https://docs.rs/serde)`).externalDocsHost,
    ).toBe("docs.rs");
    expect(
      readmeWith(`Reference: https://pkg.go.dev/github.com/foo/bar`)
        .externalDocsHost,
    ).toBe("pkg.go.dev");
  });

  it("recognises a docs subdomain (Tailwind-style)", () => {
    const r = readmeWith(`Docs at https://docs.tailwindcss.com/`);
    expect(r.hasExternalDocs).toBe(true);
    expect(r.externalDocsHost).toBe("dedicated docs subdomain");
  });

  it("does NOT recognise an arbitrary marketing URL as external docs", () => {
    const r = readmeWith(`Visit our site at https://mycompany.io/`);
    expect(r.hasExternalDocs).toBe(false);
    expect(r.externalDocsHost).toBeNull();
  });

  // Regression guard — Codex review on PR #76 caught that the
  // host-only refactor dropped path-prefix entries (vercel.app/docs,
  // netlify.app/docs, deno.land/manual). Restore + lock.
  it("recognises *.vercel.app with /docs path as Vercel-hosted docs", () => {
    const r = readmeWith(`Full docs: https://mycoolapp.vercel.app/docs/intro`);
    expect(r.hasExternalDocs).toBe(true);
    expect(r.externalDocsHost).toBe("Vercel-hosted docs");
  });

  it("recognises *.netlify.app with /docs path as Netlify-hosted docs", () => {
    const r = readmeWith(`See [docs](https://mysite.netlify.app/docs)`);
    expect(r.hasExternalDocs).toBe(true);
    expect(r.externalDocsHost).toBe("Netlify-hosted docs");
  });

  it("recognises deno.land/manual as Deno manual", () => {
    const r = readmeWith(`Reference: https://deno.land/manual@v1.30.0/intro`);
    expect(r.hasExternalDocs).toBe(true);
    expect(r.externalDocsHost).toBe("Deno manual");
  });

  it("does NOT flag a bare *.vercel.app marketing site (no /docs path)", () => {
    const r = readmeWith(`Live demo: https://mycoolapp.vercel.app/`);
    expect(r.hasExternalDocs).toBe(false);
    expect(r.externalDocsHost).toBeNull();
  });

  it("does NOT flag a bare *.netlify.app marketing site (no /docs path)", () => {
    const r = readmeWith(`Hosted at https://mysite.netlify.app`);
    expect(r.hasExternalDocs).toBe(false);
    expect(r.externalDocsHost).toBeNull();
  });

  // Regression guard — the lookalike attack the URL-parser refactor
  // was supposed to close.
  it("does NOT match a lookalike host (evil.com.readthedocs.io.attacker.com)", () => {
    const r = readmeWith(
      `Suspicious: https://evil.com.readthedocs.io.attacker.com/`,
    );
    expect(r.hasExternalDocs).toBe(false);
    expect(r.externalDocsHost).toBeNull();
  });

  it("flags GitHub Wiki as external docs when has_wiki is true and README is thin", () => {
    const r = readmeWith(`# Tiny`, { hasWiki: true });
    expect(r.hasExternalDocs).toBe(true);
    expect(r.externalDocsHost).toBe("GitHub Wiki");
  });

  it("prefers an explicit external-docs link over the GitHub Wiki signal", () => {
    const r = readmeWith(
      `# Project\n\nFull docs at https://myproject.readthedocs.io/`,
      { hasWiki: true },
    );
    expect(r.externalDocsHost).toBe("Read the Docs");
  });

  it("surfaces GitHub Wiki even when the README is missing entirely", () => {
    const r = analyzeReadme(null, { hasWiki: true });
    expect(r.exists).toBe(false);
    expect(r.hasExternalDocs).toBe(true);
    expect(r.externalDocsHost).toBe("GitHub Wiki");
  });

  it("treats a repo with no README and no wiki as not having external docs", () => {
    const r = analyzeReadme(null);
    expect(r.hasExternalDocs).toBe(false);
    expect(r.externalDocsHost).toBeNull();
  });
});
