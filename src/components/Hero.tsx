import { Settings, ShieldCheck, Sparkles, Workflow, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { loadToken, loadTokenMeta } from "../lib/auth/tokenStore";

interface HeroProps {
  onOpenSettings: () => void;
  /** A tick that bumps whenever the token changes — re-renders the badge. */
  authTick: number;
}

export function Hero({ onOpenSettings, authTick }: HeroProps) {
  const [hasToken, setHasToken] = useState(false);
  const [prefix, setPrefix] = useState<string | null>(null);

  useEffect(() => {
    setHasToken(!!loadToken());
    setPrefix(loadTokenMeta()?.prefix ?? null);
  }, [authTick]);

  return (
    <header className="relative pt-10 pb-8 sm:pt-16 sm:pb-14">
      <div className="flex items-center justify-between gap-2">
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
        <button
          type="button"
          onClick={onOpenSettings}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
            hasToken
              ? "border-aurora-mint/40 bg-aurora-mint/10 text-aurora-mint hover:bg-aurora-mint/20"
              : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
          }`}
          aria-label="Open settings"
        >
          {hasToken ? (
            <>
              <Zap className="h-3 w-3" />
              <span className="hidden sm:inline">Auth · 5k/h</span>
              <span className="sm:hidden">Auth</span>
              {prefix ? <span className="font-mono">{prefix}…</span> : null}
            </>
          ) : (
            <>
              <Settings className="h-3 w-3" />
              <span className="hidden sm:inline">Settings · public 60/h</span>
              <span className="sm:hidden">Settings</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-10 max-w-3xl">
        <span className="pill">
          <ShieldCheck className="h-3.5 w-3.5 text-aurora-mint" />
          Browser-only · No code execution
        </span>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
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
        <span className="pill">
          {hasToken ? "Local PAT · stays in your browser" : "Optional PAT · stored only locally"}
        </span>
      </div>
    </header>
  );
}
