/**
 * Tests for the Phase 3.4 SECURITY.md parser.
 *
 * Mirrors the OpenSSF Scorecard signal scheme:
 *   - At least one valid contact channel (email, GHSA, HackerOne,
 *     Bugcrowd, Open Bug Bounty, PGP, or a generic security URL)
 *     drives the file out of the `placeholder` bucket.
 *   - Substantive prose (≥ 40 words) + vulnerability terminology
 *     promote it to `good`.
 *   - Substantive prose (≥ 80 words) + a timeline reference promote
 *     it to `complete`.
 *
 * The parser must:
 *   1. Recognise every supported channel kind exactly once even when
 *      the same value appears multiple times.
 *   2. Strip example placeholders (`security@example.com`,
 *      `your-email@…`) so a copy-pasted template doesn't score.
 *   3. Tolerate inline HTML, fenced PGP blocks, and markdown link
 *      syntax without losing the URL.
 *   4. Detect timeline phrases (`30 days`, `within 24 hours`,
 *      `5 business days`).
 *   5. Detect a "Supported versions" heading via case-insensitive
 *      match.
 *   6. Return null only on literal empty / whitespace-only input.
 */

import { describe, expect, it } from "vitest";
import {
  formatChannelKind,
  formatPolicyQuality,
  parseSecurityPolicy,
} from "../../../src/lib/audit/securityPolicyParser";

describe("parseSecurityPolicy — channel extraction", () => {
  it("recognises a private email contact", () => {
    const p = parseSecurityPolicy(
      "If you find a security issue, please email security@astraudit.dev — do not file a public issue.",
    );
    expect(p).not.toBeNull();
    expect(p!.channels).toHaveLength(1);
    expect(p!.channels[0]).toMatchObject({
      kind: "email",
      value: "security@astraudit.dev",
    });
  });

  it("recognises a GitHub Security Advisories URL", () => {
    const p = parseSecurityPolicy(
      "Report at https://github.com/owner/repo/security/advisories/new",
    );
    expect(p!.channels[0].kind).toBe("ghsa");
  });

  it("recognises the GHSA phrase even without a URL", () => {
    const p = parseSecurityPolicy(
      "Please open a private report through GitHub Security Advisories.",
    );
    expect(p!.channels.some((c) => c.kind === "ghsa")).toBe(true);
  });

  it("recognises HackerOne, Bugcrowd, and Open Bug Bounty URLs", () => {
    const p = parseSecurityPolicy(
      [
        "Submit a report through one of:",
        "- https://hackerone.com/astraudit",
        "- https://bugcrowd.com/astraudit",
        "- https://openbugbounty.org/projects/astraudit/",
      ].join("\n"),
    );
    const kinds = p!.channels.map((c) => c.kind).sort();
    expect(kinds).toEqual(["bugcrowd", "hackerone", "openbugbounty"]);
  });

  it("recognises an inline PGP key block", () => {
    const p = parseSecurityPolicy(
      [
        "Send encrypted reports via PGP:",
        "```",
        "-----BEGIN PGP PUBLIC KEY BLOCK-----",
        "mQENBF...key omitted...",
        "-----END PGP PUBLIC KEY BLOCK-----",
        "```",
        "Email: security@example.org",
      ].join("\n"),
    );
    expect(p!.channels.some((c) => c.kind === "pgp")).toBe(true);
  });

  it("recognises a PGP key URL", () => {
    const p = parseSecurityPolicy(
      "Our PGP key is published at https://keys.openpgp.org/vks/v1/by-email/security@astraudit.dev",
    );
    expect(p!.channels.some((c) => c.kind === "pgp")).toBe(true);
  });

  it("ignores example placeholder emails", () => {
    const p = parseSecurityPolicy(
      "Send reports to security@example.com or your-email@yourdomain.com.",
    );
    expect(p!.channels).toHaveLength(0);
    expect(p!.quality).toBe("placeholder");
  });

  it("dedupes the same value across multiple appearances", () => {
    const p = parseSecurityPolicy(
      "security@org.dev — please email security@org.dev for urgent issues.",
    );
    expect(p!.channels).toHaveLength(1);
  });
});

describe("parseSecurityPolicy — quality grading", () => {
  it("a contactless file is graded `placeholder`", () => {
    const p = parseSecurityPolicy("# Security policy\n\nWe care about security.");
    expect(p!.quality).toBe("placeholder");
  });

  it("a one-line file with a contact is graded `basic`", () => {
    const p = parseSecurityPolicy(
      "Report security issues to security@astraudit.dev.",
    );
    expect(p!.quality).toBe("basic");
  });

  it("a substantive file with a contact + vuln terms is `good`", () => {
    const prose = Array.from(
      { length: 6 },
      () =>
        "We treat every reported vulnerability as confidential and respond promptly to your disclosure.",
    ).join(" ");
    const p = parseSecurityPolicy(
      `# Security\n\n${prose}\n\nReport at security@astraudit.dev.`,
    );
    expect(p!.words).toBeGreaterThanOrEqual(40);
    expect(p!.hasVulnTerminology).toBe(true);
    expect(p!.quality).toBe("good");
  });

  it("a long file with a timeline is `complete`", () => {
    const prose = Array.from(
      { length: 12 },
      () =>
        "We treat every reported vulnerability as confidential and respond within 30 days of disclosure.",
    ).join(" ");
    const p = parseSecurityPolicy(
      `${prose}\n\nReport at security@astraudit.dev.`,
    );
    expect(p!.words).toBeGreaterThanOrEqual(80);
    expect(p!.hasTimeline).toBe(true);
    expect(p!.quality).toBe("complete");
  });
});

describe("parseSecurityPolicy — markdown handling", () => {
  it("preserves URLs inside markdown link syntax", () => {
    const p = parseSecurityPolicy(
      "Report through [our advisory page](https://github.com/owner/repo/security/advisories).",
    );
    expect(p!.channels.some((c) => c.kind === "ghsa")).toBe(true);
  });

  it("preserves URLs inside HTML anchor tags", () => {
    const p = parseSecurityPolicy(
      'Report at <a href="https://hackerone.com/astraudit">HackerOne</a>.',
    );
    expect(p!.channels.some((c) => c.kind === "hackerone")).toBe(true);
  });

  it("ignores fenced code blocks except for inline PGP keys", () => {
    const p = parseSecurityPolicy(
      [
        "```",
        "DO_NOT_EMAIL=security@should-not-match.com",
        "```",
        "Email security@real.dev for issues.",
      ].join("\n"),
    );
    const emails = p!.channels.filter((c) => c.kind === "email");
    expect(emails.map((c) => c.value)).toEqual(["security@real.dev"]);
  });
});

describe("parseSecurityPolicy — auxiliary signals", () => {
  it("detects a Supported Versions heading", () => {
    const p = parseSecurityPolicy([
      "# Security",
      "## Supported Versions",
      "Email security@org.dev.",
    ].join("\n"));
    expect(p!.mentionsSupportedVersions).toBe(true);
  });

  it("detects timeline references in various phrasings", () => {
    expect(
      parseSecurityPolicy(
        "We respond to every reported vulnerability within 24 hours.",
      )!.hasTimeline,
    ).toBe(true);
    expect(
      parseSecurityPolicy(
        "Vulnerability disclosure window is 90 days.",
      )!.hasTimeline,
    ).toBe(true);
    expect(
      parseSecurityPolicy(
        "We patch every vulnerability in 5 business days.",
      )!.hasTimeline,
    ).toBe(true);
  });

  it("returns null on empty / whitespace input", () => {
    expect(parseSecurityPolicy("")).toBeNull();
    expect(parseSecurityPolicy("   \n   ")).toBeNull();
    expect(parseSecurityPolicy(null)).toBeNull();
    expect(parseSecurityPolicy(undefined)).toBeNull();
  });
});

describe("UI helpers", () => {
  it.each([
    ["email", "Email"],
    ["ghsa", "GitHub Security Advisories"],
    ["hackerone", "HackerOne"],
    ["bugcrowd", "Bugcrowd"],
    ["openbugbounty", "Open Bug Bounty"],
    ["pgp", "PGP"],
    ["url", "Web form"],
  ] as const)("formatChannelKind(%s) = %s", (k, label) => {
    expect(formatChannelKind(k)).toBe(label);
  });

  it.each([
    ["placeholder", "placeholder"],
    ["basic", "basic"],
    ["good", "substantive"],
    ["complete", "complete with timeline"],
  ] as const)("formatPolicyQuality(%s) = %s", (q, label) => {
    expect(formatPolicyQuality(q)).toBe(label);
  });
});
