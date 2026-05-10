import { ShieldCheck, Sparkles, Workflow } from "lucide-react";

export function Hero() {
  return (
    <header className="relative pt-12 pb-10 sm:pt-16 sm:pb-14">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-aurora-violet/40 to-aurora-mint/30 border border-white/10">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wider text-white/90">
            Astraudit
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Repository intelligence
          </p>
        </div>
      </div>

      <div className="mt-10 max-w-3xl">
        <span className="pill">
          <ShieldCheck className="h-3.5 w-3.5 text-aurora-mint" />
          Browser-only · No code execution
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
          Map, score, and understand any{" "}
          <span className="bg-gradient-to-br from-aurora-violet via-aurora-blue to-aurora-mint bg-clip-text text-transparent">
            public GitHub
          </span>{" "}
          repository.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-slate-300/85 sm:text-lg">
          Astraudit reads metadata, the file tree, and known config files from a
          repository — then produces a structured risk, quality, and maintenance
          review you can trust before you fork, depend on, or contribute.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="pill">
          <Workflow className="h-3.5 w-3.5 text-aurora-cyan" />
          Static analysis only
        </span>
        <span className="pill">
          <ShieldCheck className="h-3.5 w-3.5 text-aurora-mint" />
          Public repos only
        </span>
        <span className="pill">No tokens · No secrets</span>
      </div>
    </header>
  );
}
