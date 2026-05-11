import { Info, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import type { CategoryScore } from "../types/audit";

interface SecurityPanelProps {
  category: CategoryScore;
}

export function SecurityPanel({ category }: SecurityPanelProps) {
  return (
    <section className="glass p-6">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-aurora-mint" />
        <h3 className="text-sm font-semibold text-white">Security & trust</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Static signals only. Branch protection cannot be inspected from a
        browser-only audit.
      </p>

      {/* Phase 7.0.4 — transitive-dependency honesty disclaimer. The
          Security panel is the first place a reader looks for CVE
          coverage; we make it unmissable that Astraudit does NOT do
          CVE scanning and what to run instead. Same line is copied
          verbatim into the JSON / Markdown / AsciiDoc exports
          (see src/lib/export/auditExport.ts). */}
      <div
        className="mt-3 flex items-start gap-2 rounded-md border border-aurora-cyan/30 bg-aurora-cyan/[0.06] px-3 py-2 text-[12px] text-slate-200/90"
        role="note"
      >
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aurora-cyan" />
        <span>
          <strong className="font-semibold text-white">Scope:</strong>{" "}
          Astraudit reads declared dependencies + lockfile presence. It does{" "}
          <em>not</em> scan transitive CVEs — for that, run{" "}
          <code className="font-mono">npm audit</code>,{" "}
          <code className="font-mono">pip-audit</code>,{" "}
          <code className="font-mono">cargo audit</code>, or{" "}
          <code className="font-mono">bundler audit</code> depending on the
          stack.
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {category.evidence.map((ev, idx) => {
          const positive =
            /present|detected|set|active|yes/i.test(ev) &&
            !/^no /i.test(ev) &&
            !/missing|not /i.test(ev);
          return (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-200/90"
            >
              {positive ? (
                <ShieldCheck className="mt-0.5 h-4 w-4 text-aurora-mint" />
              ) : (
                <ShieldAlert className="mt-0.5 h-4 w-4 text-risk-medium" />
              )}
              <span>{ev}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
