import { describe, expect, it } from "vitest";
import {
  renderAllSocialPosts,
  renderSocialPost,
  SOCIAL_PLATFORMS,
  type SocialPostInput,
} from "../../../src/lib/share/socialPost";

function input(overrides: Partial<SocialPostInput> = {}): SocialPostInput {
  return {
    fullName: "facebook/react",
    totalScore: 88,
    maxScore: 100,
    grade: "A",
    verdict: "Adopt with confidence — strong baselines across all eight categories.",
    auditUrl: "https://beko2210.github.io/astraudit/#/audit/facebook/react",
    repoUrl: "https://github.com/facebook/react",
    ...overrides,
  };
}

describe("renderSocialPost (M8.3)", () => {
  it("produces a post for every platform", () => {
    const posts = renderAllSocialPosts(input());
    expect(posts.map((p) => p.platform).sort()).toEqual(
      [...SOCIAL_PLATFORMS].sort(),
    );
  });

  it("includes the repo + score + grade in every variant", () => {
    for (const p of renderAllSocialPosts(input())) {
      expect(p.text).toContain("facebook/react");
      expect(p.text).toContain("88/100");
      expect(p.text).toContain("(A)");
    }
  });

  it("includes the audit URL in every variant", () => {
    const url = "https://beko2210.github.io/astraudit/#/audit/facebook/react";
    for (const p of renderAllSocialPosts(input())) {
      expect(p.text).toContain(url);
    }
  });

  it("Twitter post stays under 280 chars even with a long verdict", () => {
    const post = renderSocialPost("twitter", input({
      verdict:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    }));
    expect(post.length).toBeLessThanOrEqual(280);
  });

  it("Bluesky stays under 300 chars", () => {
    const post = renderSocialPost("bluesky", input({
      verdict:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit.",
    }));
    expect(post.length).toBeLessThanOrEqual(300);
  });

  it("Mastodon includes hashtags + stays under 500 chars", () => {
    const post = renderSocialPost("mastodon", input());
    expect(post.text).toContain("#opensource");
    expect(post.text).toContain("#devtools");
    expect(post.text).toContain("#github");
    expect(post.length).toBeLessThanOrEqual(500);
  });

  it("LinkedIn intent URL points at the share-offsite endpoint", () => {
    const post = renderSocialPost("linkedin", input());
    expect(post.intentUrl).toMatch(/share-offsite/);
    expect(post.intentUrl).toContain(
      encodeURIComponent(
        "https://beko2210.github.io/astraudit/#/audit/facebook/react",
      ),
    );
  });

  it("Twitter intent URL URL-encodes the body so the hash fragment survives", () => {
    const post = renderSocialPost("twitter", input());
    expect(post.intentUrl).toContain("https://twitter.com/intent/tweet?text=");
    expect(post.intentUrl).not.toContain("\n");
  });

  it("falls back to head-only when verdict + everything still overruns the limit", () => {
    const post = renderSocialPost("twitter", input({
      fullName: "a-very-long-owner/an-equally-long-repo-name-that-eats-budget",
      verdict: "x".repeat(800),
    }));
    expect(post.length).toBeLessThanOrEqual(280);
    // Even in degenerate input the URL has to survive.
    expect(post.text).toContain("beko2210.github.io/astraudit");
  });
});
