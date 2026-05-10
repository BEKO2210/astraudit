/**
 * Tests for the Phase 3.2 Dependabot config parser.
 *
 * The parser is the single source of truth for the new "Dependabot
 * coverage" card and any future dependabot-aware findings, so the
 * contract needs to be locked down hard:
 *
 *   1. Top-level `version: 2` is required — v1 configs and missing
 *      version both return null.
 *   2. Each `updates` entry must have a `package-ecosystem` string;
 *      malformed entries are silently skipped, not fatally rejected.
 *   3. `schedule.interval` is normalized to one of seven known values
 *      or "unknown" — never an arbitrary string.
 *   4. Quoted and unquoted scalars round-trip identically.
 *   5. `directories: [...]` (plural list) is parsed as well as the
 *      singular `directory:` field.
 *   6. Group counts equal the number of keys under `groups:`.
 *   7. Registry counts equal the number of top-level entries under
 *      `registries:`.
 *   8. Trailing `# comments` and full-line comments are stripped.
 *   9. Inline-flow arrays `[a, b, c]` parse correctly.
 *  10. Empty / whitespace-only / null input returns null.
 */

import { describe, expect, it } from "vitest";
import {
  formatInterval,
  parseDependabotConfig,
  summariseByEcosystem,
} from "../../../src/lib/audit/dependabotParser";

describe("parseDependabotConfig — happy path", () => {
  it("parses the GitHub-docs reference example", () => {
    const yaml = [
      "version: 2",
      "updates:",
      '  - package-ecosystem: "npm"',
      '    directory: "/"',
      "    schedule:",
      '      interval: "daily"',
      "",
      '  - package-ecosystem: "docker"',
      '    directory: "/"',
      "    schedule:",
      '      interval: "weekly"',
    ].join("\n");

    const out = parseDependabotConfig(yaml);
    expect(out).not.toBeNull();
    expect(out!.versionTwo).toBe(true);
    expect(out!.updates).toHaveLength(2);
    expect(out!.updates[0]).toMatchObject({
      ecosystem: "npm",
      directory: "/",
      interval: "daily",
    });
    expect(out!.updates[1]).toMatchObject({
      ecosystem: "docker",
      directory: "/",
      interval: "weekly",
    });
  });

  it("parses unquoted scalars identically to quoted", () => {
    const yaml = [
      "version: 2",
      "updates:",
      "  - package-ecosystem: github-actions",
      "    directory: /",
      "    schedule:",
      "      interval: monthly",
    ].join("\n");
    const out = parseDependabotConfig(yaml);
    expect(out).not.toBeNull();
    expect(out!.updates[0]).toMatchObject({
      ecosystem: "github-actions",
      directory: "/",
      interval: "monthly",
    });
  });

  it("captures open-pull-requests-limit and target-branch", () => {
    const yaml = [
      "version: 2",
      "updates:",
      '  - package-ecosystem: "npm"',
      '    directory: "/"',
      "    schedule:",
      '      interval: "weekly"',
      "    open-pull-requests-limit: 5",
      '    target-branch: "develop"',
    ].join("\n");
    const out = parseDependabotConfig(yaml);
    expect(out).not.toBeNull();
    expect(out!.updates[0].openPullRequestsLimit).toBe(5);
    expect(out!.updates[0].targetBranch).toBe("develop");
  });

  it("counts grouping rules under `groups:`", () => {
    const yaml = [
      "version: 2",
      "updates:",
      "  - package-ecosystem: npm",
      "    directory: /",
      "    schedule:",
      "      interval: weekly",
      "    groups:",
      "      minor-and-patch:",
      '        update-types: ["minor", "patch"]',
      "      ts-tooling:",
      "        patterns:",
      '          - "@types/*"',
      '          - "typescript"',
    ].join("\n");
    const out = parseDependabotConfig(yaml);
    expect(out).not.toBeNull();
    expect(out!.updates[0].groupCount).toBe(2);
  });

  it("supports the `directories` (plural) array form", () => {
    const yaml = [
      "version: 2",
      "updates:",
      "  - package-ecosystem: npm",
      '    directories: ["/", "/packages/web"]',
      "    schedule:",
      "      interval: weekly",
    ].join("\n");
    const out = parseDependabotConfig(yaml);
    expect(out).not.toBeNull();
    expect(out!.updates[0].directory).toBe("/");
  });

  it("counts top-level registries entries", () => {
    const yaml = [
      "version: 2",
      "registries:",
      "  npm-internal:",
      "    type: npm-registry",
      '    url: "https://npm.pkg.github.com"',
      "  docker-internal:",
      "    type: docker-registry",
      '    url: "https://ghcr.io"',
      "updates:",
      "  - package-ecosystem: npm",
      "    directory: /",
      "    schedule:",
      "      interval: weekly",
    ].join("\n");
    const out = parseDependabotConfig(yaml);
    expect(out).not.toBeNull();
    expect(out!.registryCount).toBe(2);
  });

  it("strips full-line and trailing comments", () => {
    const yaml = [
      "# Astraudit's reference Dependabot config",
      "version: 2  # required",
      "updates:",
      '  - package-ecosystem: "npm"  # the npm registry',
      '    directory: "/"',
      "    schedule:",
      '      interval: "weekly"',
    ].join("\n");
    const out = parseDependabotConfig(yaml);
    expect(out).not.toBeNull();
    expect(out!.updates[0].ecosystem).toBe("npm");
    expect(out!.updates[0].interval).toBe("weekly");
  });

  it("preserves a `#` that sits inside a quoted string", () => {
    const yaml = [
      "version: 2",
      "updates:",
      "  - package-ecosystem: npm",
      '    target-branch: "release/#hash"',
      "    directory: /",
      "    schedule:",
      "      interval: weekly",
    ].join("\n");
    const out = parseDependabotConfig(yaml);
    expect(out).not.toBeNull();
    expect(out!.updates[0].targetBranch).toBe("release/#hash");
  });
});

describe("parseDependabotConfig — error / edge cases", () => {
  it("returns null for empty / whitespace / null input", () => {
    expect(parseDependabotConfig("")).toBeNull();
    expect(parseDependabotConfig("   \n   ")).toBeNull();
    expect(parseDependabotConfig(null)).toBeNull();
    expect(parseDependabotConfig(undefined)).toBeNull();
  });

  it("returns null when version is missing or not 2", () => {
    expect(
      parseDependabotConfig("updates:\n  - package-ecosystem: npm\n    schedule:\n      interval: weekly"),
    ).toBeNull();
    expect(
      parseDependabotConfig("version: 1\nupdates:\n  - package-ecosystem: npm"),
    ).toBeNull();
  });

  it("returns null when `updates:` is absent", () => {
    expect(parseDependabotConfig("version: 2")).toBeNull();
  });

  it("normalises an unknown schedule.interval to 'unknown'", () => {
    const yaml = [
      "version: 2",
      "updates:",
      "  - package-ecosystem: npm",
      "    directory: /",
      "    schedule:",
      "      interval: every-other-tuesday",
    ].join("\n");
    const out = parseDependabotConfig(yaml);
    expect(out).not.toBeNull();
    expect(out!.updates[0].interval).toBe("unknown");
  });

  it("skips entries that lack a package-ecosystem field", () => {
    const yaml = [
      "version: 2",
      "updates:",
      "  - directory: /",
      "    schedule:",
      "      interval: weekly",
      "  - package-ecosystem: pip",
      "    directory: /",
      "    schedule:",
      "      interval: weekly",
    ].join("\n");
    const out = parseDependabotConfig(yaml);
    expect(out).not.toBeNull();
    expect(out!.updates).toHaveLength(1);
    expect(out!.updates[0].ecosystem).toBe("pip");
  });
});

describe("formatInterval", () => {
  it.each([
    ["daily", "Daily"],
    ["weekly", "Weekly"],
    ["monthly", "Monthly"],
    ["quarterly", "Quarterly"],
    ["semiannually", "Twice a year"],
    ["yearly", "Yearly"],
    ["cron", "Cron"],
    ["unknown", "—"],
  ] as const)("formats %s as %s", (interval, expected) => {
    expect(formatInterval(interval)).toBe(expected);
  });
});

describe("summariseByEcosystem", () => {
  it("groups updates by ecosystem and dedupes intervals/dirs", () => {
    const updates = [
      {
        ecosystem: "npm",
        directory: "/",
        interval: "weekly" as const,
        openPullRequestsLimit: null,
        targetBranch: null,
        groupCount: 2,
      },
      {
        ecosystem: "npm",
        directory: "/packages/web",
        interval: "weekly" as const,
        openPullRequestsLimit: null,
        targetBranch: null,
        groupCount: 1,
      },
      {
        ecosystem: "github-actions",
        directory: "/",
        interval: "monthly" as const,
        openPullRequestsLimit: null,
        targetBranch: null,
        groupCount: 0,
      },
    ];
    const out = summariseByEcosystem(updates);
    expect(out).toHaveLength(2);
    // Sorted alphabetically — github-actions first.
    expect(out[0].ecosystem).toBe("github-actions");
    expect(out[1].ecosystem).toBe("npm");
    // Multiple directories under npm dedupe by the order seen.
    expect(out[1].directories).toEqual(["/", "/packages/web"]);
    expect(out[1].intervals).toEqual(["weekly"]);
    expect(out[1].totalGroupCount).toBe(3);
  });

  it("flags mixed cadence when the same ecosystem has multiple intervals", () => {
    const updates = [
      {
        ecosystem: "npm",
        directory: "/",
        interval: "daily" as const,
        openPullRequestsLimit: null,
        targetBranch: null,
        groupCount: 0,
      },
      {
        ecosystem: "npm",
        directory: "/packages/web",
        interval: "weekly" as const,
        openPullRequestsLimit: null,
        targetBranch: null,
        groupCount: 0,
      },
    ];
    const out = summariseByEcosystem(updates);
    expect(out[0].intervals).toEqual(["daily", "weekly"]);
  });
});
