import { fetchRawFile, githubFetchSafe } from "./githubClient";
import type { ImportantFile, RepoTree } from "../../types/github";

interface RawReadme {
  name: string;
  path: string;
  size: number;
  content: string;
  encoding: string;
}

function decodeBase64Utf8(b64: string): string {
  const cleaned = b64.replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/**
 * README path candidates probed when the dedicated `/readme` API fails.
 * Order mirrors GitHub's own fallback chain so the audit credits the
 * same file the website does: case variants first, then alternative
 * extensions (rST for Python, AsciiDoc for Spring/JVM).
 */
const README_CANDIDATES = [
  "README.md",
  "Readme.md",
  "readme.md",
  "README",
  "README.markdown",
  "README.rst",
  "README.txt",
  "README.adoc",
  "README.asciidoc",
  "Readme.markdown",
  "ReadMe.md",
];

export async function fetchReadme(
  owner: string,
  repo: string,
  signal?: AbortSignal,
  /**
   * Optional repo tree from the prior bundle step. Used for the raw
   * fallback so we only probe filenames that actually exist in the
   * default branch — saves one wasted raw round-trip per repo when
   * the canonical /readme API path failed.
   */
  tree?: RepoTree,
  /** Default branch — needed for the raw URL. */
  defaultBranch?: string,
): Promise<ImportantFile | null> {
  const raw = await githubFetchSafe<RawReadme>(
    `/repos/${owner}/${repo}/readme`,
    { signal },
  );
  if (raw) {
    let content: string | null = null;
    if (raw.encoding === "base64" && typeof raw.content === "string") {
      try {
        content = decodeBase64Utf8(raw.content);
      } catch {
        content = null;
      }
    }
    return {
      path: raw.path,
      size: raw.size,
      content,
    };
  }
  // Raw-content fallback. The `/repos/{o}/{r}/readme` call lives on
  // the core REST surface, which is rate-limited to 60 requests/hour
  // for unauthenticated browser users. raw.githubusercontent.com has
  // its own bucket; when one fails the other often still works, so
  // we try it before reporting "no README" on a repo that clearly
  // ships one in its tree.
  if (!defaultBranch) return null;
  const treeLower = new Map<string, string>();
  if (tree) {
    for (const entry of tree.entries) {
      if (entry.type === "blob") treeLower.set(entry.path.toLowerCase(), entry.path);
    }
  }
  for (const want of README_CANDIDATES) {
    const actual = treeLower.size
      ? treeLower.get(want.toLowerCase())
      : undefined;
    // When no tree is available, probe the canonical candidate
    // directly — better to issue one extra raw call than to return
    // null and tank the documentation score downstream.
    const path = actual ?? (treeLower.size ? null : want);
    if (!path) continue;
    const content = await fetchRawFile(owner, repo, defaultBranch, path, signal);
    if (content !== null) {
      return { path, size: content.length, content };
    }
  }
  return null;
}
