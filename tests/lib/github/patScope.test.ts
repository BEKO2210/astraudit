/**
 * Phase 6.35 — GitHub PAT scope guard.
 *
 * The token must never leave the browser, and on the way out it must
 * ONLY ride the Authorization header to the two GitHub origins on the
 * `ALLOWED_HOSTS` allow-list in `tokenStore.ts`. A regression that
 * leaked the header to (say) a documentation CDN would silently
 * exfiltrate the PAT.
 *
 * `withAuthHeader` is private to `githubClient.ts`, so we exercise
 * its contract through the public surface (`githubFetch` +
 * `fetchRawFile`): mock global `fetch`, drive it at three URL shapes,
 * inspect the captured request headers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "astraudit:github-pat:v1";

class MockStorage {
  store = new Map<string, string>();
  getItem(k: string) {
    return this.store.has(k) ? (this.store.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(i: number) {
    return Array.from(this.store.keys())[i] ?? null;
  }
}

let storage: MockStorage;
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  storage = new MockStorage();
  vi.stubGlobal("window", { localStorage: storage });
  vi.stubGlobal("localStorage", storage);
  // Pre-seed a token so the test can prove header attach / no-attach
  // is gated by URL, not by token absence.
  storage.setItem(STORAGE_KEY, "ghp_abcdef1234567890abcdef1234567890ab");
  vi.resetModules();
  fetchSpy = vi.spyOn(globalThis, "fetch");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function headersFromCall(callIndex: number): Record<string, string> {
  const init = fetchSpy.mock.calls[callIndex]?.[1] as
    | (RequestInit & { headers?: Record<string, string> | Headers })
    | undefined;
  const h = init?.headers;
  if (!h) return {};
  if (h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  return h as Record<string, string>;
}

function jsonResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("PAT scope — Authorization attaches only to allow-listed GitHub origins", () => {
  it("attaches Authorization to api.github.com requests", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { ok: true }));
    const { githubFetch } = await import(
      "../../../src/lib/github/githubClient"
    );
    await githubFetch<unknown>("/repos/foo/bar");
    const headers = headersFromCall(0);
    const auth = headers["Authorization"] ?? headers["authorization"];
    expect(auth, "expected Bearer token on api.github.com call").toMatch(
      /^Bearer ghp_/,
    );
  });

  it("attaches Authorization to raw.githubusercontent.com requests", async () => {
    fetchSpy.mockResolvedValue(new Response("body", { status: 200 }));
    const { fetchRawFile } = await import(
      "../../../src/lib/github/githubClient"
    );
    await fetchRawFile("foo", "bar", "main", "README.md");
    const headers = headersFromCall(0);
    const auth = headers["Authorization"] ?? headers["authorization"];
    expect(auth, "expected Bearer token on raw.githubusercontent.com call").toMatch(
      /^Bearer ghp_/,
    );
  });

  it("never attaches Authorization to a non-GitHub origin", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { ok: true }));
    // Drive a call through `githubFetch` with an absolute URL pointing
    // at a different host — withAuthHeader must short-circuit because
    // isGithubUrl(url) returns false.
    const { githubFetch } = await import(
      "../../../src/lib/github/githubClient"
    );
    await githubFetch<unknown>("https://example.com/leaked");
    const headers = headersFromCall(0);
    expect(
      headers["Authorization"] ?? headers["authorization"],
      "Authorization must NOT ride to non-GitHub origins",
    ).toBeUndefined();
  });

  it("does not leak Authorization to a path that contains 'api.github.com' as a substring (host check, not string match)", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { ok: true }));
    const { githubFetch } = await import(
      "../../../src/lib/github/githubClient"
    );
    await githubFetch<unknown>("https://malicious.example/api.github.com/repos");
    const headers = headersFromCall(0);
    expect(
      headers["Authorization"] ?? headers["authorization"],
    ).toBeUndefined();
  });
});
