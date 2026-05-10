import { describe, expect, it } from "vitest";
import {
  buildBadgeMarkdown,
  colorForScore,
  escapeXml,
  generateBadgeSvg,
  type BadgeOptions,
} from "../../../src/lib/badge/svgBadge";

const baseOpts: BadgeOptions = {
  owner: "facebook",
  repo: "react",
  score: 81,
  max: 100,
  grade: "Very Strong",
};

describe("escapeXml", () => {
  it("escapes the five XML metacharacters", () => {
    expect(escapeXml('a&b<c>d"e\'f')).toBe(
      "a&amp;b&lt;c&gt;d&quot;e&apos;f",
    );
  });

  it("is idempotent on safe input", () => {
    expect(escapeXml("hello world")).toBe("hello world");
  });
});

describe("colorForScore", () => {
  it("returns mint accent for >= 80", () => {
    expect(colorForScore(81).accent).toBe("#42e8c8");
  });

  it("returns violet accent for >= 60", () => {
    expect(colorForScore(72).accent).toBe("#7a5cff");
  });

  it("returns amber accent for >= 45", () => {
    expect(colorForScore(50).accent).toBe("#ffb547");
  });

  it("returns coral accent below 45", () => {
    expect(colorForScore(20).accent).toBe("#ff4d6d");
  });
});

describe("generateBadgeSvg", () => {
  it("produces a self-contained <svg> element by default (flat style)", () => {
    const svg = generateBadgeSvg(baseOpts);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("never emits a parseable script tag or unescaped img attribute (aurora renders owner)", () => {
    const svg = generateBadgeSvg({
      ...baseOpts,
      style: "aurora",
      owner: "<script>alert(1)</script>",
      repo: "evil",
      grade: "<img onerror=alert(1)>",
    });
    // No literal <script ... or <img ... element survives (angle
    // brackets must be escaped to &lt;).
    expect(svg.toLowerCase()).not.toMatch(/<script[^>]*>/);
    expect(svg.toLowerCase()).not.toMatch(/<img[^>]*onerror/);
    // Confirm dangerous input is escaped, not stripped.
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("&lt;img onerror=alert(1)&gt;");
  });

  it("escapes user-provided text in the aurora style", () => {
    // Aurora is the style that renders owner/repo + grade as visible
    // text, so we test escaping there.
    const svg = generateBadgeSvg({
      ...baseOpts,
      owner: "owner & co",
      repo: 'Cole "Quotes"',
      grade: "<Edge>",
      style: "aurora",
    });
    expect(svg).toContain("owner &amp; co");
    expect(svg).toContain("&quot;Quotes&quot;");
    expect(svg).toContain("&lt;Edge&gt;");
  });

  it("clamps score into the [0, max] range", () => {
    const a = generateBadgeSvg({ ...baseOpts, score: -50 });
    expect(a).toContain(">0/100<");
    const b = generateBadgeSvg({ ...baseOpts, score: 200 });
    expect(b).toContain(">100/100<");
  });

  it("renders the aurora style with brand text and accent", () => {
    const svg = generateBadgeSvg({ ...baseOpts, style: "aurora" });
    expect(svg).toContain("ASTRAUDIT");
    expect(svg).toContain("Very Strong");
    expect(svg).toContain("facebook/react");
  });

  it("renders the minimal style as a circular score chip", () => {
    const svg = generateBadgeSvg({ ...baseOpts, style: "minimal" });
    expect(svg).toContain("<circle");
    // No grade label in minimal mode.
    expect(svg).not.toContain("Very Strong");
  });

  it("includes role=img + aria-label for assistive tech", () => {
    const svg = generateBadgeSvg(baseOpts);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="astraudit: 81/100 (Very Strong)"');
  });
});

describe("buildBadgeMarkdown", () => {
  it("links the badge to the Astraudit share URL", () => {
    const md = buildBadgeMarkdown(
      baseOpts,
      "./astraudit.svg",
      "https://example.test/astraudit/#/audit/facebook/react",
    );
    expect(md).toBe(
      "[![Astraudit facebook/react: 81/100 (Very Strong)](./astraudit.svg)](https://example.test/astraudit/#/audit/facebook/react)",
    );
  });
});
