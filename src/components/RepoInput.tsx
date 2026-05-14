import { ArrowRight, Loader2, Search } from "lucide-react";
import { useState, type FormEvent } from "react";

interface RepoInputProps {
  onSubmit: (input: string) => void;
  loading: boolean;
  initialValue?: string;
  error?: string | null;
}

export function RepoInput({ onSubmit, loading, initialValue, error }: RepoInputProps) {
  const [value, setValue] = useState(initialValue ?? "");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} className="gradient-border">
      <div className="glass-strong flex flex-col gap-3 rounded-[1.2rem] p-3 md:flex-row md:items-center md:gap-2">
        <div className="flex flex-1 items-center gap-3 px-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste a GitHub repository URL or owner/repo..."
            spellCheck={false}
            autoComplete="off"
            inputMode="url"
            className="w-full rounded-md bg-transparent py-3 text-base text-white placeholder:text-slate-500"
            aria-label="GitHub repository URL"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "repo-input-error" : undefined}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-aurora-violet to-aurora-blue px-5 py-3 text-sm font-semibold text-white shadow-glow transition active:translate-y-px disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
              Auditing
            </>
          ) : (
            <>
              Audit Repository
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
      {error ? (
        <p
          id="repo-input-error"
          role="alert"
          className="mt-3 text-sm text-risk-critical/90"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
