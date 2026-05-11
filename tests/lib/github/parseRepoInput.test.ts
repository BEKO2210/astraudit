import { describe, expect, it } from "vitest";
import { parseRepoInput } from "../../../src/lib/github/parseRepoInput";

describe("parseRepoInput", () => {
  it("accepts owner/repo shorthand", () => {
    const r = parseRepoInput("facebook/react");
    expect(r.ok).toBe(true);
    expect(r.coords).toEqual({ owner: "facebook", repo: "react" });
  });

  it("accepts https github URLs", () => {
    const r = parseRepoInput("https://github.com/vuejs/core");
    expect(r.ok).toBe(true);
    expect(r.coords).toEqual({ owner: "vuejs", repo: "core" });
  });

  it("accepts http and trailing slashes", () => {
    const r = parseRepoInput("http://github.com/expressjs/express/");
    expect(r.ok).toBe(true);
    expect(r.coords?.repo).toBe("express");
  });

  it("strips .git suffix", () => {
    const r = parseRepoInput("github.com/lodash/lodash.git");
    expect(r.ok).toBe(true);
    expect(r.coords).toEqual({ owner: "lodash", repo: "lodash" });
  });

  it("accepts ssh form (git@github.com:owner/repo.git)", () => {
    const r = parseRepoInput("git@github.com:vitejs/vite.git");
    expect(r.ok).toBe(true);
    expect(r.coords).toEqual({ owner: "vitejs", repo: "vite" });
  });

  it("ignores extra path segments after owner/repo", () => {
    const r = parseRepoInput(
      "https://github.com/facebook/react/tree/main/packages/react",
    );
    expect(r.ok).toBe(true);
    expect(r.coords).toEqual({ owner: "facebook", repo: "react" });
  });

  it("preserves valid slug characters (letters, digits, dot, dash, underscore)", () => {
    const r = parseRepoInput("scope_1/my.repo-name");
    expect(r.ok).toBe(true);
    expect(r.coords).toEqual({ owner: "scope_1", repo: "my.repo-name" });
  });

  it("rejects empty input", () => {
    const r = parseRepoInput("");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/does not look like/i);
  });

  it("rejects single segment", () => {
    const r = parseRepoInput("react");
    expect(r.ok).toBe(false);
  });

  it("rejects illegal slug characters", () => {
    const r = parseRepoInput("foo/bar with space");
    expect(r.ok).toBe(false);
  });

  it("rejects overly long owner or repo names", () => {
    const owner = "a".repeat(101);
    const r = parseRepoInput(`${owner}/repo`);
    expect(r.ok).toBe(false);
  });

  it("trims whitespace", () => {
    const r = parseRepoInput("  facebook/react  ");
    expect(r.ok).toBe(true);
    expect(r.coords).toEqual({ owner: "facebook", repo: "react" });
  });
});

// Phase 6.31 — share-URL fuzz. Every shape a user might paste should
// either parse cleanly OR surface a *specific* error (so a future PR
// can't silently broaden the input grammar to "anything that contains
// two slashes").
describe("parseRepoInput — Phase 6.31 share-URL fuzz", () => {
  it("strips ?query parameters from a GitHub URL", () => {
    const r = parseRepoInput("https://github.com/facebook/react?tab=readme");
    expect(r.ok).toBe(true);
    expect(r.coords).toEqual({ owner: "facebook", repo: "react" });
  });

  it("strips #fragment from a GitHub URL", () => {
    const r = parseRepoInput("https://github.com/facebook/react#readme");
    expect(r.ok).toBe(true);
    expect(r.coords).toEqual({ owner: "facebook", repo: "react" });
  });

  it("strips both ?query and #fragment together", () => {
    const r = parseRepoInput(
      "https://github.com/facebook/react?tab=readme#installation",
    );
    expect(r.ok).toBe(true);
    expect(r.coords).toEqual({ owner: "facebook", repo: "react" });
  });

  it("rejects gist.github.com with a specific message", () => {
    const r = parseRepoInput("https://gist.github.com/octocat/abcdef");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Gist/i);
  });

  it("rejects gitlab.com with a specific message", () => {
    const r = parseRepoInput("https://gitlab.com/gitlab-org/gitlab");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/GitLab/i);
  });

  it("rejects bitbucket.org with a specific message", () => {
    const r = parseRepoInput("https://bitbucket.org/atlassian/jira");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/BitBucket/i);
  });

  it("rejects codeberg.org with a specific message", () => {
    const r = parseRepoInput("https://codeberg.org/forgejo/forgejo");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Codeberg/i);
  });

  it("rejects git.io shortlinks with a specific message", () => {
    const r = parseRepoInput("https://git.io/abc123");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/shortlink/i);
  });

  it("rejects bit.ly shortlinks with a specific message", () => {
    const r = parseRepoInput("https://bit.ly/3xYz");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/shortlink/i);
  });

  it("rejects owner-only URLs (no repo segment)", () => {
    const r = parseRepoInput("https://github.com/facebook");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/does not look like/i);
  });

  it("rejects a bare repo name with no owner segment", () => {
    const r = parseRepoInput("react");
    expect(r.ok).toBe(false);
  });

  it("accepts an authenticated git+https URL", () => {
    // Some CIs / dotfiles paste tokens into the URL.
    const r = parseRepoInput("https://x-access-token:abc@github.com/facebook/react");
    // The `@` makes the owner segment "x-access-token:abc" which fails
    // SLUG_RE — reject cleanly rather than silently routing to a
    // bogus owner.
    expect(r.ok).toBe(false);
  });

  it("ignores trailing whitespace on every shape", () => {
    expect(parseRepoInput("\thttps://github.com/vuejs/core\n").ok).toBe(true);
    expect(parseRepoInput("git@github.com:vitejs/vite.git  ").ok).toBe(true);
  });
});
