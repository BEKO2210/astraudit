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
