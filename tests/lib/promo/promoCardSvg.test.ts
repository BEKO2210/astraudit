import { describe, expect, it } from "vitest";
import {
  escapeXml,
  renderPromoCardSvg,
  type PromoCardInput,
} from "../../../src/lib/promo/promoCardSvg";

function input(overrides: Partial<PromoCardInput> = {}): PromoCardInput {
  return {
    fullName: "facebook/react",
    totalScore: 88,
    maxScore: 100,
    grade: "A",
    verdict: "Adopt with confidence — strong baselines across all eight categories.",
    language: "TypeScript",
    generatedAt: "2026-05-18T00:00:00Z",
    ...overrides,
  };
}

describe("escapeXml", () => {
  it("escapes the five XML special characters", () => {
    expect(escapeXml(`<a href="x">a & 'b'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;a &amp; &apos;b&apos;&lt;/a&gt;",
    );
  });
});

describe("renderPromoCardSvg (M8.2)", () => {
  it("emits a 1200x630 SVG with the standard viewBox", () => {
    const svg = renderPromoCardSvg(input());
    expect(svg).toContain('viewBox="0 0 1200 630"');
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
  });

  it("includes the repo name + score number + grade", () => {
    const svg = renderPromoCardSvg(input());
    expect(svg).toContain("facebook/react");
    expect(svg).toContain(">88<");
    expect(svg).toContain("Grade A");
  });

  it("falls back to a default verdict when none is provided", () => {
    const svg = renderPromoCardSvg(input({ verdict: null }));
    expect(svg).toContain("Browser");
  });

  it("escapes characters in the repo name + verdict + language", () => {
    const svg = renderPromoCardSvg(
      input({
        fullName: "<owner/repo>",
        verdict: "She said \"hi\" & left.",
        language: "C++",
      }),
    );
    expect(svg).toContain("&lt;owner/repo&gt;");
    expect(svg).toContain("She said &quot;hi&quot; &amp; left.");
    expect(svg).toContain("C++");
    expect(svg).not.toContain("<owner");
  });

  it("renders the date stamp truncated to YYYY-MM-DD", () => {
    const svg = renderPromoCardSvg(input({ generatedAt: "2027-01-04T18:30:00.000Z" }));
    expect(svg).toContain("2027-01-04");
    expect(svg).not.toContain("18:30");
  });

  it("clamps an over-max score to the maxScore", () => {
    const svg = renderPromoCardSvg(input({ totalScore: 150 }));
    expect(svg).toContain(">100<");
  });

  it("never produces unbalanced angle brackets in the output (well-formed SVG)", () => {
    const svg = renderPromoCardSvg(input());
    const opens = (svg.match(/</g) ?? []).length;
    const closes = (svg.match(/>/g) ?? []).length;
    expect(opens).toBe(closes);
  });

  it("uses the mint tone for high scores and red for very low scores", () => {
    const high = renderPromoCardSvg(input({ totalScore: 95 }));
    expect(high).toContain("#42e8c8");
    const low = renderPromoCardSvg(input({ totalScore: 10, grade: "F" }));
    expect(low).toContain("#ff7a90");
  });
});
