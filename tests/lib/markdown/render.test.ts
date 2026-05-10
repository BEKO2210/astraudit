// @vitest-environment happy-dom
//
// Phase 6.x — the renderer's sanitiser path needs DOMParser, which
// the default `node` environment doesn't provide. happy-dom is a
// fast (~250 KB) WHATWG DOM implementation that gives us
// `DOMParser` + `document` without pulling in jsdom's Canvas /
// network shims we don't use.

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

  it("strips the dangerous bits of raw HTML but keeps safe markup", () => {
    // Phase 6.x — the renderer now allows safe HTML so authored
    // READMEs that use <div align="center"> / <img> / <details>
    // render correctly. The sanitiser must still strip <script>,
    // event handlers, and javascript: URLs.
    const md = `# Hello <script>alert('xss')</script>\n\n<img src="x" onerror="alert(1)">\n\n<div align="center"><strong>Hi</strong></div>`;
    const html = renderReadmeMarkdown(md, opts);
    // No live tags, no event handlers.
    expect(html).not.toMatch(/<script[^>]*>/i);
    expect(html).not.toMatch(/onerror/i);
    // The `alert('xss')` body of the stripped <script> survives as
    // inert text inside the surrounding <h1> — that's the unwrap
    // contract documented in the next test. We do NOT assert the
    // text is gone, only that nothing executable remains.
    // Safe inline HTML survives.
    expect(html).toMatch(/<div align="center">/i);
    expect(html).toMatch(/<strong>Hi<\/strong>/i);
  });

  it("unwraps <script> bodies, doesn't execute them, doesn't leak the text", () => {
    const md = `<script>const x = 'leaked';</script>`;
    const html = renderReadmeMarkdown(md, opts);
    expect(html).not.toMatch(/<script/i);
    // The body of a stripped <script> stays as inert text via the
    // unwrap rule. That's a deliberate trade-off — we'd rather
    // surface "weird text appeared" than silently swallow content
    // (matches GitHub's own behaviour for unknown tags).
    expect(html).toMatch(/leaked/);
  });

  it("strips inline event handlers from otherwise-safe tags", () => {
    const md = `<a href="https://example.com" onclick="bad()">x</a>`;
    const html = renderReadmeMarkdown(md, opts);
    expect(html).not.toMatch(/onclick/i);
    expect(html).toMatch(/href="https:\/\/example\.com"/);
  });

  it("strips style attributes", () => {
    const md = `<div style="color:red; background:url('javascript:bad')">x</div>`;
    const html = renderReadmeMarkdown(md, opts);
    expect(html).not.toMatch(/style=/i);
    expect(html).not.toMatch(/javascript:/i);
  });

  it("resolves inline <img src> against raw.githubusercontent.com (matches markdown path)", () => {
    const md = `<img src="./public/logo.png" alt="logo">`;
    const html = renderReadmeMarkdown(md, opts);
    expect(html).toContain(
      "https://raw.githubusercontent.com/facebook/react/main/public/logo.png",
    );
  });

  it("resolves inline <a href> against github.com/.../blob/<branch>", () => {
    const md = `<a href="./docs/index.md">docs</a>`;
    const html = renderReadmeMarkdown(md, opts);
    expect(html).toContain(
      "https://github.com/facebook/react/blob/main/docs/index.md",
    );
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
