/**
 * Org-level community-health fallback probe.
 *
 * GitHub renders SECURITY.md / CODE_OF_CONDUCT.md / CONTRIBUTING.md
 * from the owner's `.github` repo (or `.github-private` for orgs)
 * whenever the target repo doesn't ship its own. The
 * `?tab=security-ov-file` / community profile UIs treat that as the
 * effective policy. Without this probe, Astraudit reports "missing"
 * for repos like `expressjs/express` even though GitHub itself shows
 * the policy under the security tab.
 *
 * We only fetch the small handful of files that GitHub's
 * community-health fallback covers, and we cache nothing — the cost
 * is at most three raw-content requests against a single
 * `{owner}/.github` ref. Failures are silent because the probe is
 * a best-effort enhancement, not a hard dependency.
 */
import { fetchRawFile } from "./githubClient";

export interface OrgHealthFiles {
  /** The owner whose `.github` repo we probed. */
  owner: string;
  /** Did we find a `.github` repo at all? Useful for downstream
   *  copy ("inherits from {owner}/.github") and for the validation
   *  harness that distinguishes "no fallback exists" from "fallback
   *  exists but doesn't carry this file". */
  hasOrgRepo: boolean;
  /** Path within the org `.github` repo where the file was found,
   *  e.g. `SECURITY.md` or `.github/SECURITY.md`. Null when missing. */
  securityPolicyPath: string | null;
  securityPolicyContent: string | null;
  codeOfConductPath: string | null;
  codeOfConductContent: string | null;
  contributingPath: string | null;
  contributingContent: string | null;
}

// Phase 7.x — honesty fix. The probe list mirrors what GitHub itself
// recognises for community-health files: any of (no-extension, .md,
// .markdown, .rst, .txt) in any of (root, .github, docs).
const HEALTH_PROBES: Array<{
  key: "securityPolicy" | "codeOfConduct" | "contributing";
  paths: string[];
}> = [
  {
    key: "securityPolicy",
    paths: [
      "SECURITY.md",
      "SECURITY.markdown",
      "SECURITY.rst",
      "SECURITY.txt",
      "SECURITY",
      ".github/SECURITY.md",
      ".github/SECURITY.rst",
      "docs/SECURITY.md",
      "docs/SECURITY.rst",
      "Security.md",
      "security.md",
    ],
  },
  {
    key: "codeOfConduct",
    paths: [
      "CODE_OF_CONDUCT.md",
      "CODE_OF_CONDUCT.markdown",
      "CODE_OF_CONDUCT.rst",
      "CODE_OF_CONDUCT.txt",
      "CODE_OF_CONDUCT",
      ".github/CODE_OF_CONDUCT.md",
      ".github/CODE_OF_CONDUCT.rst",
      "docs/CODE_OF_CONDUCT.md",
      "docs/CODE_OF_CONDUCT.rst",
      "code_of_conduct.md",
      "code-of-conduct.md",
      "Code-of-conduct.md",
    ],
  },
  {
    key: "contributing",
    paths: [
      "CONTRIBUTING.md",
      "CONTRIBUTING.markdown",
      "CONTRIBUTING.rst",
      "CONTRIBUTING.txt",
      "CONTRIBUTING",
      ".github/CONTRIBUTING.md",
      ".github/CONTRIBUTING.rst",
      "docs/CONTRIBUTING.md",
      "docs/CONTRIBUTING.rst",
      "Contributing.md",
      "contributing.md",
    ],
  },
];

export async function fetchOrgHealth(
  owner: string,
  signal?: AbortSignal,
): Promise<OrgHealthFiles> {
  const empty: OrgHealthFiles = {
    owner,
    hasOrgRepo: false,
    securityPolicyPath: null,
    securityPolicyContent: null,
    codeOfConductPath: null,
    codeOfConductContent: null,
    contributingPath: null,
    contributingContent: null,
  };

  // First sniff: does `{owner}/.github` exist at all? We probe its
  // README via raw — cheap and authenticated like any other raw file
  // call. A 404 means no org-level fallback is possible and we return
  // immediately so we don't waste 3 more probes per audit.
  const sniff = await fetchRawFile(owner, ".github", "HEAD", "README.md", signal);
  // README is the most likely landing file but not required — the
  // org repo may exist with no README. Fall back to a no-content
  // probe of `.github/FUNDING.yml` (also extremely common) before
  // giving up.
  let hasOrgRepo = sniff !== null;
  if (!hasOrgRepo) {
    const funding = await fetchRawFile(
      owner,
      ".github",
      "HEAD",
      ".github/FUNDING.yml",
      signal,
    );
    hasOrgRepo = funding !== null;
  }
  if (!hasOrgRepo) {
    // Final fallback: probe SECURITY.md directly. Some `.github` repos
    // contain only health files and nothing else.
    const direct = await fetchRawFile(
      owner,
      ".github",
      "HEAD",
      "SECURITY.md",
      signal,
    );
    if (direct !== null) {
      return {
        ...empty,
        hasOrgRepo: true,
        securityPolicyPath: "SECURITY.md",
        securityPolicyContent: direct,
        // Fill in the other two via the standard probe loop below.
        ...(await probeRemaining(owner, signal, ["codeOfConduct", "contributing"])),
      };
    }
    return empty;
  }

  const probed = await probeRemaining(owner, signal, [
    "securityPolicy",
    "codeOfConduct",
    "contributing",
  ]);
  return { ...empty, hasOrgRepo: true, ...probed };
}

async function probeRemaining(
  owner: string,
  signal: AbortSignal | undefined,
  keys: Array<"securityPolicy" | "codeOfConduct" | "contributing">,
): Promise<Partial<OrgHealthFiles>> {
  const out: Partial<OrgHealthFiles> = {};
  for (const probe of HEALTH_PROBES) {
    if (!keys.includes(probe.key)) continue;
    for (const path of probe.paths) {
      const content = await fetchRawFile(owner, ".github", "HEAD", path, signal);
      if (content) {
        if (probe.key === "securityPolicy") {
          out.securityPolicyPath = path;
          out.securityPolicyContent = content;
        } else if (probe.key === "codeOfConduct") {
          out.codeOfConductPath = path;
          out.codeOfConductContent = content;
        } else {
          out.contributingPath = path;
          out.contributingContent = content;
        }
        break;
      }
    }
  }
  return out;
}
