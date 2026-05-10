import { Lock, ShieldCheck, ShieldAlert } from "lucide-react";
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
