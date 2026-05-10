import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  applyTheme,
  cycleTheme,
  listenSystemPreference,
  loadTheme,
  saveTheme,
  type ResolvedTheme,
  type Theme,
} from "../lib/theme/themeStore";

const LABEL: Record<Theme, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const initial = loadTheme();
    setTheme(initial);
    setResolved(applyTheme(initial));
  }, []);

  // When the user has "system", follow OS preference changes live.
  useEffect(() => {
    if (theme !== "system") return;
    return listenSystemPreference(() => {
      setResolved(applyTheme("system"));
    });
  }, [theme]);

  const handleClick = () => {
    const next = cycleTheme(theme);
    setTheme(next);
    saveTheme(next);
    setResolved(applyTheme(next));
  };

  const Icon =
    theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const tone =
    resolved === "light"
      ? "border-slate-300 bg-white/70 text-slate-600 hover:bg-white"
      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Theme: ${LABEL[theme]}. Click to cycle.`}
      title={`Theme: ${LABEL[theme]} · click to cycle`}
      data-print-hide="true"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition print:hidden ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{LABEL[theme]}</span>
    </button>
  );
}
