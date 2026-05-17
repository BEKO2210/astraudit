import { ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDialog } from "../lib/ui/useDialog";
import {
  filterCommands,
  GROUP_LABELS,
  type Command,
  type CommandGroup,
} from "../lib/commands/types";
import { useTranslation } from "../lib/i18n";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Phase 5.3 — body scroll lock + focus restore on close. The
  // palette already owns its own Esc / Arrow / Enter handler below
  // (it needs the arrow keys for list navigation), so we don't pass
  // an initialFocusRef — the local effect already moves focus into
  // the search input. useDialog's Esc handler runs at capture and
  // is harmless (it just calls onClose, same as the local one).
  useDialog({ open, onClose, containerRef: dialogRef });

  const filtered = useMemo(() => filterCommands(commands, query), [commands, query]);
  const grouped = useMemo(() => {
    const map = new Map<CommandGroup, Command[]>();
    for (const c of filtered) {
      const arr = map.get(c.group) ?? [];
      arr.push(c);
      map.set(c.group, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(filtered.length - 1);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[activeIndex];
        if (cmd) {
          cmd.action();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, filtered, activeIndex]);

  // Scroll the active item into view as the user navigates.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLButtonElement>(
      `[data-cmd-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  let runningIndex = 0;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[8vh] backdrop-blur sm:pt-[15vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("palette.regionLabel")}
    >
      <div
        className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("palette.placeholder")}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 rounded-md bg-transparent py-1 text-sm text-white placeholder:text-slate-500"
            aria-label={t("palette.searchAria")}
          />
          <kbd className="hidden shrink-0 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-1.5 scrollbar-thin"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">
              {t("palette.emptyPrefix")} “{query}”.
            </p>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="px-1 py-1">
                <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t(GROUP_LABELS[group])}
                </p>
                <div>
                  {items.map((cmd) => {
                    const idx = runningIndex++;
                    const isActive = idx === activeIndex;
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        data-cmd-index={idx}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition ${
                          isActive
                            ? "bg-gradient-to-r from-aurora-violet/20 to-aurora-blue/15 text-white ring-1 ring-aurora-violet/30"
                            : "text-slate-300 hover:bg-white/[0.04]"
                        }`}
                      >
                        {Icon ? (
                          <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{cmd.title}</span>
                        {cmd.hint ? (
                          <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">
                            {cmd.hint}
                          </span>
                        ) : null}
                        {cmd.shortcut?.length ? (
                          <span className="hidden shrink-0 items-center gap-1 sm:flex">
                            {cmd.shortcut.map((s, i) => (
                              <kbd
                                key={i}
                                className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-slate-400"
                              >
                                {s}
                              </kbd>
                            ))}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/5 px-3 py-1.5 text-[10px] text-slate-500">
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono">↑↓</kbd>
            {t("palette.navigateHint")}
            <kbd className="ml-2 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono">↵</kbd>
            {t("palette.selectHint")}
          </span>
          <span className="hidden sm:inline">
            <kbd className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono">?</kbd>
            {t("palette.shortcutsHint")}
          </span>
        </div>
      </div>
    </div>
  );
}
