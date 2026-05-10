import { githubFetchSafe } from "./githubClient";
import type { LanguagesMap } from "../../types/github";

export async function fetchLanguages(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<LanguagesMap> {
  const data = await githubFetchSafe<LanguagesMap>(
    `/repos/${owner}/${repo}/languages`,
    { signal },
  );
  return data ?? {};
}
