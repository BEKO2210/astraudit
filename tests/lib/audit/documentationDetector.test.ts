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
