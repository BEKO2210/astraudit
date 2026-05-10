/**
 * Tests for the `audit_repo` MCP tool handler.
 *
 * The handler is a thin wrapper around `loadRepoBundle()` +
 * `runAudit()` + `exportToJson()`. We don't re-test the engine
 * here (existing 739 vitest cases already cover it). We DO test:
 *
 *   1. Happy path — fixture bundle in, JSON-with-versioned-schema
 *      out, wrapped in the MCP `content[]` shape.
 *   2. NotFoundError — surfaced as an isError response with a
 *      machine-readable `error` field.
 *   3. RateLimitError — same shape, plus the reset-at timestamp.
 *   4. Token routing — when the tool argument carries a `token`,
 *      that value reaches the underlying HTTP layer (asserted by
 *      a fetch stub that captures the Authorization header).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { handleAuditRepo } from "../../../bin/mcp-server";
import { NotFoundError, RateLimitError } from "../../../src/lib/github/githubClient";
import { makeBundle } from "../../fixtures/builders";

describe("audit_repo handler — happy path", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns the curated AuditResult JSON wrapped in the MCP content shape", async () => {
    // Stub `loadRepoBundle` by importing the bundle path directly
    // and short-circuiting at the metadata fetch level. We patch
    // globalThis.fetch so each fetcher gets a fixture response.
    const fixture = makeBundle({
      metadata: {
        fullName: "demo-org/handler-fixture",
        name: "handler-fixture",
        owner: {
          login: "demo-org",
          avatarUrl: "",
          htmlUrl: "",
          type: "Organization",
        },
        description: "MCP handler test fixture",
        stars: 10,
        defaultBranch: "main",
        language: "TypeScript",
        license: { spdxId: "MIT", name: "MIT License" },
      },
      paths: ["README.md", "LICENSE", "package.json"],
      importantFiles: {
        "package.json": JSON.stringify({
          name: "handler-fixture",
          scripts: { build: "vite build" },
        }),
      },
      readmeContent: "# Handler fixture\n\n## Installation\nnpm install",
    });

    // The fixture's `tree.entries` + `metadata` already cover the
    // shapes loadRepoBundle expects. We map each URL to the right
    // sub-fixture so the audit can run end-to-end.
    const tree = fixture.tree;
    const respondJson = (body: unknown) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const respond404 = () => new Response("", { status: 404 });

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/repos/demo-org/handler-fixture/git/trees/")) {
        return respondJson({
          sha: "x",
          tree: tree.entries.map((e) => ({
            path: e.path,
            type: e.type,
            sha: "sha",
            size: e.size,
          })),
          truncated: false,
        });
      }
      if (url.endsWith("/repos/demo-org/handler-fixture")) {
        return respondJson({
          id: 1,
          name: "handler-fixture",
          full_name: "demo-org/handler-fixture",
          owner: { login: "demo-org", avatar_url: "", html_url: "", type: "Organization" },
          description: "MCP handler test fixture",
          html_url: "",
          stargazers_count: 10,
          forks_count: 0,
          watchers_count: 10,
          open_issues_count: 0,
          default_branch: "main",
          language: "TypeScript",
          topics: [],
          license: { spdx_id: "MIT", name: "MIT License" },
          archived: false,
          disabled: false,
          fork: false,
          is_template: false,
          size: 0,
          pushed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_at: new Date(Date.now() - 86_400_000).toISOString(),
          has_wiki: false,
          has_pages: false,
          has_issues: true,
          has_discussions: false,
        });
      }
      if (url.includes("/languages")) return respondJson({ TypeScript: 1000 });
      if (url.includes("/readme")) return respond404();
      if (url.includes("/raw.githubusercontent.com/") && url.endsWith("/package.json")) {
        return new Response(
          JSON.stringify({
            name: "handler-fixture",
            scripts: { build: "vite build" },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/raw.githubusercontent.com")) return respond404();
      if (url.includes("/actions/workflows")) {
        return respondJson({ total_count: 0, workflows: [] });
      }
      if (url.includes("/commits")) return respondJson([]);
      if (url.includes("/releases")) return respondJson([]);
      if (url.includes("/issues")) return respondJson([]);
      if (url.includes("/search/issues")) return respondJson({ total_count: 0 });
      return respond404();
    }) as typeof globalThis.fetch;

    const out = await handleAuditRepo({
      owner: "demo-org",
      repo: "handler-fixture",
    });

    expect(out.isError).toBeFalsy();
    expect(out.content).toHaveLength(1);
    expect(out.content[0].type).toBe("text");
    const parsed = JSON.parse(out.content[0].text);
    expect(parsed.schema).toBe("astraudit-audit-export");
    expect(parsed.schemaVersion).toBe("1");
    expect(parsed.repository.fullName).toBe("demo-org/handler-fixture");
    expect(parsed.score.total).toBeGreaterThanOrEqual(0);
    expect(parsed.score.total).toBeLessThanOrEqual(100);
    expect(Array.isArray(parsed.categories)).toBe(true);
    expect(parsed.categories.length).toBeGreaterThanOrEqual(8);
  });
});

describe("audit_repo handler — error paths", () => {
  let originalFetch: typeof globalThis.fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("surfaces NotFoundError as a structured MCP error response", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("", { status: 404 }),
    ) as typeof globalThis.fetch;

    const out = await handleAuditRepo({
      owner: "demo-org",
      repo: "does-not-exist",
    });
    expect(out.isError).toBe(true);
    const parsed = JSON.parse(out.content[0].text);
    expect(parsed.error).toBe("not-found");
    expect(parsed.message).toMatch(/private repositories/i);
  });

  it("surfaces RateLimitError with reset timestamp", async () => {
    const reset = Math.floor(Date.now() / 1000) + 600;
    globalThis.fetch = vi.fn(
      async () =>
        new Response("", {
          status: 403,
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": String(reset),
          },
        }),
    ) as typeof globalThis.fetch;

    const out = await handleAuditRepo({
      owner: "demo-org",
      repo: "anything",
    });
    expect(out.isError).toBe(true);
    const parsed = JSON.parse(out.content[0].text);
    expect(parsed.error).toMatch(/rate-limit/);
    expect(parsed.rateLimitResetAtSeconds).toBe(reset);
  });

  it("synthetic error guard — RateLimitError flag round-trips", () => {
    // Light sanity-check: the constructors exposed for the handler
    // do what we expect. Cheap but locks the contract used above.
    const e = new RateLimitError({
      resetAtSeconds: 12345,
      unauthenticated: true,
    });
    expect(e.resetAtSeconds).toBe(12345);
    const nf = new NotFoundError();
    expect(nf.status).toBe(404);
  });
});

describe("audit_repo handler — token routing", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalToken: string | undefined;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalToken = process.env.GITHUB_TOKEN;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("forwards the tool's `token` arg as Bearer Authorization", async () => {
    delete process.env.GITHUB_TOKEN;
    let capturedAuth: string | null = null;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("api.github.com")) {
        const headers = new Headers(init?.headers as HeadersInit | undefined);
        capturedAuth = headers.get("authorization");
      }
      return new Response("", { status: 404 });
    }) as typeof globalThis.fetch;

    await handleAuditRepo({
      owner: "demo-org",
      repo: "any",
      token: "ghp_test_token_xxx",
    });
    expect(capturedAuth).toBe("Bearer ghp_test_token_xxx");
  });

  it("falls back to GITHUB_TOKEN env var when no token arg is provided", async () => {
    process.env.GITHUB_TOKEN = "ghp_env_token_yyy";
    let capturedAuth: string | null = null;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("api.github.com")) {
        const headers = new Headers(init?.headers as HeadersInit | undefined);
        capturedAuth = headers.get("authorization");
      }
      return new Response("", { status: 404 });
    }) as typeof globalThis.fetch;

    await handleAuditRepo({
      owner: "demo-org",
      repo: "any",
    });
    expect(capturedAuth).toBe("Bearer ghp_env_token_yyy");
  });
});
