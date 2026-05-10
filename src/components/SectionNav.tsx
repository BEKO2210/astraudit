import { useEffect, useState } from "react";

export interface SectionItem {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: SectionItem[];
}

export function SectionNav({ sections }: SectionNavProps) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      let current = sections[0]?.id ?? "";
      const offset = 120;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top - offset <= 0) current = s.id;
        else break;
      }
      setActive(current);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [sections]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 90;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-white/5 bg-ink-950/80 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <nav className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1">
        {sections.map((s) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handleClick(s.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-gradient-to-br from-aurora-violet/30 to-aurora-blue/20 text-white ring-1 ring-aurora-violet/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
