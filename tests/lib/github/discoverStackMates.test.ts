import { describe, it, expect } from "vitest";
import {
  buildSearchQuery,
  discoverStackMates,
  rankCandidate,
  type StackMateBase,
} from "../../../src/lib/github/discoverStackMates";

const BASE: StackMateBase = {
  fullName: "vitejs/vite",
  language: "TypeScript",
  topics: ["build-tool", "frontend", "esm", "vite"],
  stars: 70_000,
};

function rawItem(
  partial: Partial<{
    full_name: string;
    html_url: string;
    description: string | null;
    language: string | null;
    topics: string[];
    stargazers_count: number;
    fork: boolean;
    archived: boolean;
  }>,
): {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  fork: boolean;
  archived: boolean;
} {
  return {
    full_name: "alice/widget",
    html_url: "https://github.com/alice/widget",
    description: null,
    language: "JavaScript",
    topics: [],
    stargazers_count: 10_000,
    fork: false,
    archived: false,
    ...partial,
  };
}

describe("buildSearchQuery", () => {
  it("includes language, topics, star window, excludes self/forks/archived", () => {
    const q = buildSearchQuery(BASE);
    expect(q).toContain('language:"TypeScript"');
    expect(q).toContain("topic:build-tool");
    expect(q).toContain("topic:frontend");
    expect(q).toContain("stars:23333..210000");
    expect(q).toContain("archived:false");
    expect(q).toContain("fork:false");
    expect(q).toContain("-repo:vitejs/vite");
  });

  it("caps the topic clauses at 4 to keep the query short", () => {
    const q = buildSearchQuery({
      ...BASE,
      topics: ["a", "b", "c", "d", "e", "f"],
    });
    // 4 topics → 4 `topic:` clauses, no more.
    const topicMatches = q.match(/topic:/g) ?? [];
    expect(topicMatches.length).toBe(4);
  });

  it("omits the language clause when null", () => {
    const q = buildSearchQuery({ ...BASE, language: null });
    expect(q).not.toContain("language:");
  });

  it("clamps the star window for low-star repos", () => {
    const q = buildSearchQuery({ ...BASE, stars: 0 });
    // floor(1/3) = 0, clamped to 1; ceil(1*3) = 3.
    expect(q).toContain("stars:1..3");
  });
});

describe("rankCandidate", () => {
  it("scores a perfect language + heavy topic overlap highly", () => {
    const r = rankCandidate(BASE, rawItem({
      language: "TypeScript",
      topics: ["build-tool", "frontend", "esm", "vite"],
      stargazers_count: 50_000,
    }));
    expect(r.similarity).toBeGreaterThan(0.85);
    expect(r.reasons).toContain("Same primary language (TypeScript)");
    expect(r.reasons.some((s) => s.startsWith("Shares 4 topics"))).toBe(true);
  });

  it("scores a wrong language much lower than a right one", () => {
    const right = rankCandidate(BASE, rawItem({
      language: "TypeScript",
      topics: ["build-tool"],
      stargazers_count: 50_000,
    }));
    const wrong = rankCandidate(BASE, rawItem({
      language: "Rust",
      topics: ["build-tool"],
      stargazers_count: 50_000,
    }));
    expect(right.similarity).toBeGreaterThan(wrong.similarity + 0.4);
  });

  it("adds a small bonus when both repos have no primary language", () => {
    const r = rankCandidate(
      { ...BASE, language: null },
      rawItem({ language: null, topics: [], stargazers_count: 50_000 }),
    );
    expect(r.similarity).toBeGreaterThan(0);
    expect(r.reasons).toContain("Both repos have no primary language");
  });

  it("never returns above 1.0 even when every signal lines up", () => {
    const r = rankCandidate(BASE, rawItem({
      language: "TypeScript",
      topics: BASE.topics,
      stargazers_count: 70_000,
    }));
    expect(r.similarity).toBeLessThanOrEqual(1);
  });
});

describe("discoverStackMates", () => {
  it("ranks by similarity, filters self/forks/archived, applies limit", async () => {
    const candidates = [
      rawItem({ full_name: "vitejs/vite", stargazers_count: 70_000 }), // self → drop
      rawItem({ full_name: "x/fork", fork: true }),                    // fork → drop
      rawItem({ full_name: "y/archived", archived: true }),            // archived → drop
      rawItem({
        full_name: "z/zero",
        language: "Ruby",
        topics: [],
        stargazers_count: 50_000,
      }), // zero similarity → drop
      rawItem({
        full_name: "high/match",
        language: "TypeScript",
        topics: ["build-tool", "frontend"],
        stargazers_count: 60_000,
      }),
      rawItem({
        full_name: "med/match",
        language: "TypeScript",
        topics: ["build-tool"],
        stargazers_count: 30_000,
      }),
    ];

    const result = await discoverStackMates(BASE, {
      limit: 5,
      fetcher: async () => ({ total_count: candidates.length, items: candidates }),
    });

    expect(result.map((r) => r.fullName)).toEqual([
      "high/match",
      "med/match",
    ]);
    expect(result[0].similarity).toBeGreaterThan(result[1].similarity);
    expect(result[0].reasons.length).toBeGreaterThan(0);
  });

  it("honours the limit parameter", async () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      rawItem({
        full_name: `owner/match${i}`,
        language: "TypeScript",
        topics: ["build-tool"],
        stargazers_count: 60_000 - i * 1000,
      }),
    );
    const result = await discoverStackMates(BASE, {
      limit: 3,
      fetcher: async () => ({ total_count: 10, items: candidates }),
    });
    expect(result.length).toBe(3);
  });

  it("returns an empty list when nothing scores above zero", async () => {
    const result = await discoverStackMates(BASE, {
      fetcher: async () => ({
        total_count: 1,
        items: [
          rawItem({
            full_name: "no/match",
            language: "Ruby",
            topics: [],
            stargazers_count: 50_000,
          }),
        ],
      }),
    });
    expect(result).toEqual([]);
  });
});
