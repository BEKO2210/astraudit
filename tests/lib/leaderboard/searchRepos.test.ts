import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSearchQuery,
  collectTopRepos,
  searchTopRepos,
} from "../../../src/lib/leaderboard/searchRepos";

const origFetch = globalThis.fetch;

function mockSearchResponse(items: Array<Record<string, unknown>>, total = items.length) {
  return {
    total_count: total,
    incomplete_results: false,
    items: items.map((it, idx) => ({
      full_name: `owner/repo-${idx}`,
      owner: { login: "owner" },
      name: `repo-${idx}`,
      html_url: `https://github.com/owner/repo-${idx}`,
      description: null,
      stargazers_count: 100 - idx,
      language: "TypeScript",
      topics: [],
      archived: false,
      default_branch: "main",
      pushed_at: "2026-05-01T00:00:00Z",
      ...it,
    })),
  };
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  globalThis.fetch = origFetch;
  vi.restoreAllMocks();
});

describe("buildSearchQuery", () => {
  it("emits the default min-stars + archived:false when filter is empty", () => {
    expect(buildSearchQuery({})).toBe("stars:>=1000 archived:false");
  });

  it("honours an explicit minStars", () => {
    expect(buildSearchQuery({ minStars: 250 })).toBe(
      "stars:>=250 archived:false",
    );
  });

  it("quotes language tokens so multi-word names survive", () => {
    expect(buildSearchQuery({ language: "Common Lisp" })).toBe(
      'stars:>=1000 language:"Common Lisp" archived:false',
    );
  });

  it("threads a topic + raw query passthrough", () => {
    expect(
      buildSearchQuery({
        language: "typescript",
        topic: "cli",
        minStars: 5000,
        rawQuery: "good-first-issues:>5",
      }),
    ).toBe(
      'stars:>=5000 language:"typescript" topic:cli archived:false good-first-issues:>5',
    );
  });
});

describe("searchTopRepos", () => {
  it("hits /search/repositories with sort=stars + the constructed query", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(mockSearchResponse([{}, {}, {}])), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const page = await searchTopRepos({ language: "typescript" });
    expect(page.hits).toHaveLength(3);
    expect(page.hits[0]?.fullName).toBe("owner/repo-0");
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(call).toContain("/search/repositories");
    expect(call).toContain("sort=stars");
    expect(call).toContain("order=desc");
    expect(call).toContain(encodeURIComponent('language:"typescript"'));
  });

  it("marks the last page when the API returns fewer hits than per_page", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(mockSearchResponse([{}, {}])), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const page = await searchTopRepos({}, { perPage: 100, page: 1 });
    expect(page.isLastPage).toBe(true);
  });

  it("marks the last page when (page * perPage) hits GitHub's 1000-result ceiling", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(mockSearchResponse(Array(100).fill({}))), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const page = await searchTopRepos({}, { perPage: 100, page: 10 });
    expect(page.isLastPage).toBe(true);
  });

  it("clamps perPage to 100", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(mockSearchResponse([])), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await searchTopRepos({}, { perPage: 250 });
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(call).toContain("per_page=100");
  });
});

describe("collectTopRepos", () => {
  it("stops at the requested limit even when more pages exist", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockSearchResponse(Array(100).fill({}))), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    const hits = await collectTopRepos({}, 30);
    expect(hits).toHaveLength(30);
    // One page is enough — limit < perPage cap.
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("paginates across pages to reach the limit", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockSearchResponse(Array(100).fill({}))), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockSearchResponse(Array(50).fill({}))), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    const hits = await collectTopRepos({}, 150);
    expect(hits).toHaveLength(150);
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });

  it("stops early when the API runs out of results", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify(mockSearchResponse(Array(7).fill({}))), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const hits = await collectTopRepos({}, 200);
    expect(hits).toHaveLength(7);
  });
});
