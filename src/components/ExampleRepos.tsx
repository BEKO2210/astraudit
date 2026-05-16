import { ChevronRight, GitBranch } from "lucide-react";
import { EXAMPLE_REPOS } from "../data/exampleRepos";

interface ExampleReposProps {
  onPick: (fullName: string) => void;
  disabled?: boolean;
}

export function ExampleRepos({ onPick, disabled }: ExampleReposProps) {
  return (
    <div className="mt-6">
      <p className="card-title mb-3">Try a known public repository</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {EXAMPLE_REPOS.map((repo) => (
          <button
            key={repo.fullName}
            type="button"
            disabled={disabled}
            onClick={() => onPick(repo.fullName)}
            className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-aurora-violet/40 hover:bg-white/[0.06] disabled:opacity-60"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <GitBranch className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate text-sm font-medium text-white">
                  {repo.fullName}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-400">{repo.blurb}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-aurora-violet" />
          </button>
        ))}
      </div>
    </div>
  );
}
