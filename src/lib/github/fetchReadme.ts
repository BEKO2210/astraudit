import { githubFetchSafe } from "./githubClient";
import type { ImportantFile } from "../../types/github";

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

export async function fetchReadme(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<ImportantFile | null> {
  const raw = await githubFetchSafe<RawReadme>(
    `/repos/${owner}/${repo}/readme`,
    { signal },
  );
  if (!raw) return null;
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
