import { useEffect, useRef, useState } from "react";

export interface SectionItem {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: SectionItem[];
}

export function SectionNav({ sections }: SectionNavProps) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  const navRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

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

  // Auto-scroll active tab into view in the horizontal nav strip.
  useEffect(() => {
    const container = navRef.current;
    const btn = buttonRefs.current.get(active);
    if (!container || !btn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const overflowsRight = btnRect.right > containerRect.right - 16;
    const overflowsLeft = btnRect.left < containerRect.left + 16;
    if (overflowsRight || overflowsLeft) {
      const targetLeft =
        btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    }
  }, [active]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 90;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div
      className="sticky z-30 -mx-4 mb-4 border-b border-white/5 bg-ink-950/85 px-4 py-2 backdrop-blur transition-[top] duration-200 motion-reduce:transition-none sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 print:hidden"
      style={{ top: "var(--sticky-offset, 0px)" }}
    >
      <div className="relative">
        {/* Right-edge fade hint when there's more to scroll */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-ink-950/90 to-transparent"
        />
        {/* Left-edge fade hint */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-r from-ink-950/90 to-transparent"
        />
        <nav
          ref={navRef}
          className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto scroll-smooth px-2"
        >
          {sections.map((s) => {
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                ref={(el) => {
                  if (el) buttonRefs.current.set(s.id, el);
                  else buttonRefs.current.delete(s.id);
                }}
                type="button"
                onClick={() => handleClick(s.id)}
                aria-current={isActive ? "true" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-gradient-to-br from-aurora-violet/40 to-aurora-blue/30 text-white ring-1 ring-aurora-violet/50 shadow-glow"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
