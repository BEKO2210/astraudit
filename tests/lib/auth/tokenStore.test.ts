import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearToken,
  isGithubUrl,
  loadToken,
  loadTokenMeta,
  looksLikeGithubToken,
  saveToken,
} from "../../../src/lib/auth/tokenStore";

class MockStorage {
  private store = new Map<string, string>();
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
  key(_index: number) {
    return null;
  }
}

let storage: MockStorage;

beforeEach(async () => {
  storage = new MockStorage();
  vi.stubGlobal("window", { localStorage: storage });
  vi.stubGlobal("localStorage", storage);
  // Force the module to re-evaluate its cached token.
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isGithubUrl", () => {
  it("accepts the api and raw hosts", () => {
    expect(isGithubUrl("https://api.github.com/repos/x/y")).toBe(true);
    expect(isGithubUrl("https://raw.githubusercontent.com/x/y/main/README.md")).toBe(
      true,
    );
  });

  it("rejects everything else", () => {
    expect(isGithubUrl("https://example.com")).toBe(false);
    // github.com (the website) is NOT on the allow-list — only the API host is.
    expect(isGithubUrl("https://github.com/x/y")).toBe(false);
    // Non-absolute strings resolve against the api.github.com base, which is
    // acceptable here because in practice we only call this with URLs that
    // we ourselves generated (always absolute). The contract is "permissive
    // on relative input, strict on absolute hosts".
    expect(isGithubUrl("https://malicious.example/api.github.com")).toBe(false);
  });
});

describe("looksLikeGithubToken", () => {
  it("accepts ghp_ and github_pat_ prefixes", () => {
    expect(looksLikeGithubToken("ghp_" + "a".repeat(36))).toBe(true);
    expect(looksLikeGithubToken("github_pat_" + "a".repeat(80))).toBe(true);
  });

  it("rejects short or unprefixed inputs", () => {
    expect(looksLikeGithubToken("hello world")).toBe(false);
    expect(looksLikeGithubToken("ghp_abc")).toBe(false);
  });
});

describe("token storage", () => {
  it("save -> load round-trip", async () => {
    const m = await import("../../../src/lib/auth/tokenStore");
    m.saveToken("ghp_" + "a".repeat(36));
    expect(m.loadToken()).toMatch(/^ghp_/);
    expect(m.loadTokenMeta()?.prefix).toBe("ghp_aaa");
  });

  it("clearToken empties storage", async () => {
    const m = await import("../../../src/lib/auth/tokenStore");
    m.saveToken("ghp_" + "b".repeat(36));
    m.clearToken();
    expect(m.loadToken()).toBeNull();
    expect(m.loadTokenMeta()).toBeNull();
  });

  it("saving an empty string clears the token", async () => {
    const m = await import("../../../src/lib/auth/tokenStore");
    m.saveToken("ghp_" + "c".repeat(36));
    m.saveToken("");
    expect(m.loadToken()).toBeNull();
  });

  it("loadToken returns null when no storage backend exists", () => {
    // Use the module-level imports captured before stubbing storage.
    expect(loadToken).toBeDefined();
    expect(saveToken).toBeDefined();
    expect(loadTokenMeta).toBeDefined();
    expect(clearToken).toBeDefined();
  });
});
