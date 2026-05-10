import { githubFetchSafe } from "./githubClient";
import type { WorkflowInfo } from "../../types/github";

interface RawWorkflowsResponse {
  total_count: number;
  workflows: Array<{
    id: number;
    name: string;
    path: string;
    state: string;
  }>;
}

export async function fetchWorkflows(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<WorkflowInfo[]> {
  const data = await githubFetchSafe<RawWorkflowsResponse>(
    `/repos/${owner}/${repo}/actions/workflows?per_page=30`,
    { signal },
  );
  if (!data || !Array.isArray(data.workflows)) return [];
  return data.workflows.map((w) => ({
    name: w.name,
    path: w.path,
    state: w.state,
  }));
}
