// @vitest-environment happy-dom
//
// Phase 6.34 — XSS regression audit for every `dangerouslySetInnerHTML`
// site in the codebase. Three sites exist today:
//
//   1. <ReadmePreview /> — markdown-it output → sanitiseHtml() pipeline.
//      Comprehensive coverage already lives in tests/lib/markdown/render.test.ts;
//      this file re-asserts the canonical `<script>alert(1)</script>` payload
//      so a single search for that string finds every locked-down surface.
//   2. <BadgeDialog /> — generateBadgeSvg() over escapeXml()-wrapped inputs.
//      Coverage lives in tests/lib/badge/svgBadge.test.ts; same canonical
//      re-assertion below.
//   3. <RuleBook />     — markdown-it({ html: false }) over docs/RULES.md
//      (a build-time string we control). No sanitiser, but `html: false`
//      escapes any inline HTML in the source. Tested below directly.
//
// Why one explicit "alert(1)" file? So that the roadmap item is a single
// place to look when a future contributor wonders "is that thing actually
// XSS-safe?" Each test exercises the real production path (renderer +
// sanitiser config), not a stub.

import MarkdownIt from "markdown-it";
import { describe, expect, it } from "vitest";
import { generateBadgeSvg } from "../../../src/lib/badge/svgBadge";
import { renderReadmeMarkdown } from "../../../src/lib/markdown/render";

const PAYLOAD = "<script>alert(1)</script>";
const opts = { owner: "facebook", repo: "react", branch: "main" };

describe("dangerouslySetInnerHTML — site 1: <ReadmePreview /> (sanitised markdown)", () => {
  it("strips a literal <script>alert(1)</script> from the rendered HTML", () => {
    const html = renderReadmeMarkdown(`# Heading\n\n${PAYLOAD}`, opts);
    expect(html).not.toMatch(/<script[^>]*>/i);
    // The unwrap rule keeps inert text — verify alert() never appears as
    // an executable function call (only as escaped text inside a paragraph).
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    expect(doc.querySelector("script")).toBeNull();
  });

  it("strips an event-handler payload that survives a markdown round-trip", () => {
    const html = renderReadmeMarkdown(`<img src="x" onerror="alert(1)">`, opts);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/alert\s*\(/i);
  });

  it("strips javascript: URLs from inline anchors", () => {
    const html = renderReadmeMarkdown(`[click](javascript:alert(1))`, opts);
    expect(html).not.toMatch(/href="javascript:/i);
  });
});

describe("dangerouslySetInnerHTML — site 2: <BadgeDialog /> (generated SVG)", () => {
  it("escapes a <script>alert(1)</script> payload in every visible field", () => {
    const svg = generateBadgeSvg({
      owner: PAYLOAD,
      repo: PAYLOAD,
      score: 81,
      max: 100,
      grade: PAYLOAD,
      style: "aurora",
    });
    // No live <script> survives the SVG generator — every < becomes &lt;.
    expect(svg.toLowerCase()).not.toMatch(/<script[^>]*>/);
    expect(svg).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    // Parse the SVG as XML and confirm no script element leaked through.
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelector("parsererror")).toBeNull();
  });

  it("clamps a malformed score input rather than embedding it as text", () => {
    const svg = generateBadgeSvg({
      owner: "x",
      repo: "y",
      // The type system blocks string scores at compile time; the runtime
      // path still defends with Number.isFinite + clamp to the [0, max] window.
      score: Number.NaN,
      max: 100,
      grade: "F",
    });
    expect(svg).toContain(">0/100<");
    expect(svg).not.toContain("NaN");
  });
});

describe("dangerouslySetInnerHTML — site 3: <RuleBook /> (markdown-it html:false)", () => {
  // The RuleBook component runs markdown-it with `html: false`, which
  // tells markdown-it to escape any inline HTML in the source rather
  // than passing it through. The source itself is `docs/RULES.md` —
  // a maintainer-controlled file imported via Vite ?raw — so user input
  // never reaches the renderer. We still assert the defence-in-depth
  // contract: even if someone slips raw HTML into RULES.md, it renders
  // as inert text.
  const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

  it("renders inline <script> as escaped text, not as a live element", () => {
    const html = md.render(`# Heading\n\n${PAYLOAD}`);
    expect(html).not.toMatch(/<script[^>]*>/i);
    expect(html).toContain("&lt;script&gt;");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("script")).toBeNull();
  });

  it("renders an event-handler payload as escaped text", () => {
    const html = md.render(`<img src="x" onerror="alert(1)">`);
    expect(html).not.toMatch(/<img[^>]*onerror=/i);
    expect(html).toContain("&lt;img");
  });

  it("strips javascript: URLs from markdown links", () => {
    const html = md.render(`[click](javascript:alert(1))`);
    // markdown-it's link-validator rejects javascript:/vbscript:/file:
    // schemes by default; the link is rendered as plain text instead.
    expect(html).not.toMatch(/href="javascript:/i);
  });
});
