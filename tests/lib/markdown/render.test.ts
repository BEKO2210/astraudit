import { describe, expect, it } from "vitest";
import {
  renderReadmeMarkdown,
  truncateMarkdown,
} from "../../../src/lib/markdown/render";

const opts = { owner: "facebook", repo: "react", branch: "main" };

describe("renderReadmeMarkdown", () => {
  it("renders headings, lists, and links", () => {
    const html = renderReadmeMarkdown(
      `# Title\n\n- item one\n- item two\n\n[link](https://example.com)`,
      opts,
    );
    expect(html).toContain("<h1>");
    expect(html).toContain("<li>");
    expect(html).toContain('href="https://example.com"');
  });

  it("escapes raw HTML (no live <script>, <img>, or inline events)", () => {
    const md = `# Hello <script>alert('xss')</script>\n\n<img src="x" onerror="alert(1)">`;
    const html = renderReadmeMarkdown(md, opts);
    // No live tags in the output — markdown-it has html:false, so raw HTML
    // is escaped to &lt; / &gt; entities.
    expect(html).not.toMatch(/<script[^>]*>/i);
    expect(html).not.toMatch(/<img[^>]*onerror/i);
    // The escaped form should contain the entity for the script tag.
    expect(html).toContain("&lt;script&gt;");
  });

  it("strips javascript: URLs", () => {
    const md = `[click](javascript:alert(1))`;
    const html = renderReadmeMarkdown(md, opts);
    expect(html).not.toMatch(/href="javascript:/i);
  });

  it("forces target=_blank rel=noreferrer noopener on external links", () => {
    const html = renderReadmeMarkdown(`[ext](https://example.com)`, opts);
    expect(html).toMatch(/target="_blank"/);
    expect(html).toMatch(/rel="noreferrer noopener"/);
  });

  it("keeps in-page anchors in the same tab", () => {
    const html = renderReadmeMarkdown(`[toc](#table-of-contents)`, opts);
    expect(html).not.toMatch(/target="_blank"/);
  });

  it("resolves relative links against github.com/<owner>/<repo>/blob/<branch>", () => {
    const html = renderReadmeMarkdown(`[docs](./docs/index.md)`, opts);
    expect(html).toContain(
      "https://github.com/facebook/react/blob/main/docs/index.md",
    );
  });

  it("resolves relative images against raw.githubusercontent.com", () => {
    const html = renderReadmeMarkdown(`![logo](./assets/logo.png)`, opts);
    expect(html).toContain(
      "https://raw.githubusercontent.com/facebook/react/main/assets/logo.png",
    );
  });

  it("adds loading=lazy and referrerpolicy=no-referrer to images", () => {
    const html = renderReadmeMarkdown(`![alt](https://example.com/x.png)`, opts);
    expect(html).toMatch(/loading="lazy"/);
    expect(html).toMatch(/referrerpolicy="no-referrer"/);
  });
});

describe("truncateMarkdown", () => {
  it("returns the source unchanged when shorter than the cap", () => {
    const r = truncateMarkdown("# small", 1000);
    expect(r.truncated).toBe(false);
    expect(r.content).toBe("# small");
  });

  it("cuts at the next paragraph boundary after the cap", () => {
    const long =
      "para one. ".repeat(60) + "\n\n" + "para two. ".repeat(60) + "\n\n" + "para three.";
    const r = truncateMarkdown(long, 200);
    expect(r.truncated).toBe(true);
    expect(r.content.endsWith(".")).toBe(true);
    expect(r.content.length).toBeLessThan(long.length);
  });

  it("re-closes an open code fence at the cut point", () => {
    const md = "```js\n" + "x".repeat(2000);
    const r = truncateMarkdown(md, 50);
    expect(r.truncated).toBe(true);
    expect(r.content.endsWith("```")).toBe(true);
  });
});
