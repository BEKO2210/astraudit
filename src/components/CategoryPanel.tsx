import type { CategoryScore } from "../types/audit";

interface CategoryPanelProps {
  category: CategoryScore;
}

export function CategoryPanel({ category }: CategoryPanelProps) {
  return (
    <section className="glass p-6">
      <h3 className="text-sm font-semibold text-white">{category.label}</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
        Score {category.score}/{category.max}
      </p>
      <p className="mt-3 text-sm text-slate-200/90">{category.summary}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-300/85">
        {category.evidence.map((ev, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aurora-cyan/70" />
            <span>{ev}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
