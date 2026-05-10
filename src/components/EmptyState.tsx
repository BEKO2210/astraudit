import { Compass, Layers, ShieldQuestion, Sparkles } from "lucide-react";
import { VIEW_ENTER_CLASS } from "../lib/ui/transitions";

const FEATURES = [
  {
    icon: Compass,
    title: "Repository story",
    body: "A factual summary of what the repo appears to be, derived only from public files and metadata.",
  },
  {
    icon: Layers,
    title: "Structural audit",
    body: "We map directories, configs, and tests to score documentation, quality, and structure.",
  },
  {
    icon: ShieldQuestion,
    title: "Trust signals",
    body: "License, security policy, dependency hygiene, and CI/CD presence — without ever running any code.",
  },
  {
    icon: Sparkles,
    title: "Prioritized fixes",
    body: "Seven concrete next steps ordered by impact across security, quality, and developer experience.",
  },
];

export function EmptyState() {
  return (
    <section className={`mt-10 grid gap-4 sm:grid-cols-2 ${VIEW_ENTER_CLASS}`}>
      {FEATURES.map((f) => (
        <div key={f.title} className="glass p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
              <f.icon className="h-4 w-4 text-aurora-cyan" />
            </div>
            <h3 className="text-sm font-semibold text-white">{f.title}</h3>
          </div>
          <p className="mt-3 text-sm text-slate-300/85">{f.body}</p>
        </div>
      ))}
    </section>
  );
}
