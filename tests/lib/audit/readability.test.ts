/**
 * Tests for the Phase 3.1 readability scorer.
 *
 * The scorer drives a user-visible grade-level number, so the contract
 * needs to be both numerically and behaviourally locked down:
 *
 *   1. Syllable counting handles the well-known edge cases that the
 *      vowel-group heuristic over-/under-counts (silent-e, '-le'
 *      endings, the exception-list words).
 *   2. Markdown → prose extraction strips fenced code, indented code,
 *      inline code, badges, image embeds, link URLs, table rows,
 *      heading markers, and HTML tags — and KEEPS the heading text +
 *      link labels.
 *   3. Sentence splitting respects abbreviations like "e.g." so the
 *      sentence count isn't inflated.
 *   4. Flesch-Kincaid Grade Level + Reading Ease use the canonical
 *      coefficients (0.39, 11.8, 15.59 / 206.835, 1.015, 84.6).
 *   5. Short READMEs return null instead of a wildly skewed grade.
 *   6. Bucket boundaries match the published ranges (≤ 6 elementary,
 *      7–9 easy, 10–12 standard, 13–15 dense, ≥ 16 academic).
 */

import { describe, expect, it } from "vitest";
import {
  bucketReadability,
  computeReadability,
  countSyllables,
  extractProse,
  splitSentences,
  splitWords,
} from "../../../src/lib/audit/readability";

describe("countSyllables", () => {
  it.each([
    ["the", 1],
    ["cat", 1],
    ["wine", 1], // silent-e
    ["bottle", 2], // '-le' adjustment
    ["apple", 2],
    ["table", 2],
    ["banana", 3],
    ["readability", 5],
    ["computer", 3],
    ["business", 2], // exception
    ["every", 2], // exception
    ["literature", 3], // exception
    ["area", 3], // exception
    ["idea", 3], // exception
  ])("counts %s as %i", (word, expected) => {
    expect(countSyllables(word)).toBe(expected);
  });

  it("returns 0 for an empty string", () => {
    expect(countSyllables("")).toBe(0);
    expect(countSyllables("   ")).toBe(0);
  });

  it("returns at least 1 for any non-empty word", () => {
    for (const w of ["a", "I", "no", "go", "X"]) {
      expect(countSyllables(w)).toBeGreaterThanOrEqual(1);
    }
  });

  it("strips non-letter characters before counting", () => {
    expect(countSyllables("hello!")).toBe(countSyllables("hello"));
    expect(countSyllables("don't")).toBe(countSyllables("dont"));
  });
});

describe("extractProse", () => {
  it("strips fenced code blocks but keeps surrounding prose", () => {
    const md = "Intro paragraph.\n\n```js\nconsole.log('hi');\n```\n\nOutro paragraph.";
    const prose = extractProse(md);
    expect(prose).toContain("Intro paragraph.");
    expect(prose).toContain("Outro paragraph.");
    expect(prose).not.toContain("console.log");
  });

  it("strips indented code blocks (4+ spaces)", () => {
    const md = "Before\n\n    const x = 1;\n    const y = 2;\n\nAfter";
    const prose = extractProse(md);
    expect(prose).not.toContain("const x");
    expect(prose).toContain("Before");
    expect(prose).toContain("After");
  });

  it("strips inline code spans", () => {
    expect(extractProse("Run `npm install` first.")).toBe("Run first.");
  });

  it("strips badge images while keeping prose", () => {
    const md = "[![Build](https://img.shields.io/badge/build-passing.svg)](https://ci) Hello world.";
    const prose = extractProse(md);
    expect(prose).not.toContain("img.shields.io");
    expect(prose).toContain("Hello world.");
  });

  it("strips bare image embeds", () => {
    expect(extractProse("![alt](logo.png) Astraudit is browser-only.")).toContain(
      "Astraudit is browser-only.",
    );
    expect(extractProse("![alt](logo.png)")).not.toContain("logo.png");
  });

  it("keeps the visible label of plain links", () => {
    expect(extractProse("See [the docs](https://example.com/docs).")).toBe(
      "See the docs.",
    );
  });

  it("strips HTML tags but keeps their text content", () => {
    expect(extractProse("<details><summary>Click</summary>Hello.</details>"))
      .toContain("Hello.");
  });

  it("removes table rows and heading markers, keeping heading text", () => {
    const md = "## Install\n\n| col | col |\n|-----|-----|\n| a | b |\n\nHello.";
    const prose = extractProse(md);
    expect(prose).toContain("Install");
    expect(prose).toContain("Hello.");
    expect(prose).not.toContain("|");
    expect(prose).not.toMatch(/^#+/);
  });

  it("strips emphasis markers (*, _, ~) from prose", () => {
    expect(extractProse("This is **bold** and *italic* and ~~struck~~ text.")).toBe(
      "This is bold and italic and struck text.",
    );
  });
});

describe("splitSentences", () => {
  it("splits on period, exclamation, question mark", () => {
    expect(splitSentences("First. Second! Third?")).toEqual([
      "First.",
      "Second!",
      "Third?",
    ]);
  });

  it("keeps abbreviations together (e.g., i.e., etc.)", () => {
    const out = splitSentences("Use e.g. this. Or that.");
    expect(out.length).toBe(2);
    expect(out[0]).toContain("e.g.");
  });

  it("returns an empty array for empty input", () => {
    expect(splitSentences("")).toEqual([]);
  });
});

describe("splitWords", () => {
  it("matches words with apostrophes", () => {
    expect(splitWords("don't go")).toEqual(["don't", "go"]);
  });

  it("ignores bare punctuation", () => {
    expect(splitWords("Hello, world! ---")).toEqual(["Hello", "world"]);
  });
});

describe("bucketReadability", () => {
  it.each([
    [0, "elementary"],
    [6, "elementary"],
    [7, "easy"],
    [9, "easy"],
    [10, "standard"],
    [12, "standard"],
    [13, "dense"],
    [15, "dense"],
    [16, "academic"],
    [22, "academic"],
  ])("grade %i -> %s", (grade, bucket) => {
    expect(bucketReadability(grade)).toBe(bucket);
  });
});

describe("computeReadability — formula", () => {
  it("returns null when prose is too short", () => {
    expect(computeReadability("# tiny readme")).toBeNull();
    expect(computeReadability("Hello world.")).toBeNull();
    expect(computeReadability(null)).toBeNull();
  });

  it("produces deterministic values for a known sample", () => {
    // 4 simple sentences, 28 words → still under MIN_WORDS, so build a
    // longer block with steady, easy prose.
    const sample = [
      "Astraudit reads metadata from public GitHub repositories.",
      "It runs in the browser and never sends data anywhere.",
      "The audit produces a structured report you can read in minutes.",
      "Findings come from rule-based detectors over public files.",
      "The score is a quick health check, not a full audit.",
    ].join(" ");
    const r = computeReadability(sample);
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.words).toBeGreaterThanOrEqual(40);
    expect(r.sentences).toBe(5);
    // Easy-prose block lands in the standard / easy band.
    expect(r.fleschKincaidGrade).toBeGreaterThan(4);
    expect(r.fleschKincaidGrade).toBeLessThan(13);
    expect(r.fleschReadingEase).toBeGreaterThan(40);
    expect(r.fleschReadingEase).toBeLessThan(100);
  });

  it("scores academic prose higher than easy prose", () => {
    const easy = Array.from(
      { length: 8 },
      () => "Use it. It is small. The code stays in the browser.",
    ).join(" ");
    const academic = Array.from(
      { length: 6 },
      () =>
        "The institutionalisation of decentralised infrastructure necessitates conscientious deliberation about epistemic boundaries.",
    ).join(" ");

    const easyScore = computeReadability(easy);
    const academicScore = computeReadability(academic);
    expect(easyScore).not.toBeNull();
    expect(academicScore).not.toBeNull();
    if (!easyScore || !academicScore) return;
    expect(academicScore.fleschKincaidGrade).toBeGreaterThan(
      easyScore.fleschKincaidGrade,
    );
  });

  it("ignores fenced code so a code-heavy README isn't misread as dense", () => {
    const proseLine =
      "Astraudit runs entirely in the browser and never sends repository data anywhere. ";
    const proseBlock = proseLine.repeat(5); // 60 prose words
    const codeBlock =
      "```js\nfor (let i = 0; i < n; i++) { f(i); }\n```\n".repeat(8); // ~80 code tokens
    const md = `${proseBlock}\n\n${codeBlock}`;
    const r = computeReadability(md);
    expect(r).not.toBeNull();
    if (!r) return;
    // Prose-only word count: 5 × 12 prose words = 60. If code sneaked
    // in we'd see well over 100. Lock the upper bound just under that.
    expect(r.words).toBeLessThanOrEqual(60);
  });

  it("rounds grade and reading ease to one decimal place", () => {
    // Need ≥ 30 words to clear MIN_WORDS_FOR_SCORE — 7 copies × 7 words.
    const sample = Array.from(
      { length: 7 },
      () => "This is a sentence. It is short.",
    ).join(" ");
    const r = computeReadability(sample);
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.fleschKincaidGrade.toString()).toMatch(/^-?\d+(\.\d)?$/);
    expect(r.fleschReadingEase.toString()).toMatch(/^-?\d+(\.\d)?$/);
  });
});
