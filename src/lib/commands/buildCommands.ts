import {
  ArrowLeftRight,
  History as HistoryIcon,
  KeyRound,
  Monitor,
  Moon,
  Printer,
  Sun,
  RotateCcw,
  Star,
  Sparkles,
  PlayCircle,
} from "lucide-react";
import type { Command } from "./types";
import { EXAMPLE_REPOS } from "../../data/exampleRepos";
import {
  applyTheme,
  saveTheme,
  type Theme,
} from "../theme/themeStore";
import {
  listFavorites,
  listHistory,
} from "../history/historyStore";

export interface BuildCommandsOptions {
  /** When an audit is loaded, section commands are emitted. */
  hasAudit: boolean;
  hasCompare: boolean;
  /** Wired in App. */
  jumpTo: (sectionId: string) => void;
  startAudit: (rawInput: string) => void;
  openCompare: () => void;
  openSettings: () => void;
  openHistory: () => void;
  resetToHome: () => void;
}

const SECTIONS: Array<{ id: string; label: string; chord: string }> = [
  { id: "overview", label: "Overview", chord: "g o" },
  { id: "score", label: "Score", chord: "g s" },
  { id: "story", label: "Story", chord: "g t" },
  { id: "readme", label: "README", chord: "g r" },
  { id: "insights", label: "Insights", chord: "g i" },
  { id: "graph", label: "Graph", chord: "g g" },
  { id: "findings", label: "Findings", chord: "g f" },
  { id: "structure", label: "Structure", chord: "g c" },
  { id: "stack", label: "Stack", chord: "g k" },
  { id: "maintenance", label: "Maintenance", chord: "g m" },
  { id: "onboarding", label: "Onboarding", chord: "g b" },
  { id: "next", label: "Next steps", chord: "g n" },
];

export function buildCommands(opts: BuildCommandsOptions): Command[] {
  const cmds: Command[] = [];

  // Section jumps appear only when an audit (or compare) is shown.
  if (opts.hasAudit || opts.hasCompare) {
    for (const s of SECTIONS) {
      cmds.push({
        id: `jump-${s.id}`,
        title: `Jump to ${s.label}`,
        group: "navigate",
        shortcut: s.chord.split(" "),
        action: () => opts.jumpTo(s.id),
      });
    }
  }

  // Actions
  cmds.push({
    id: "open-compare",
    title: "Compare with another repository",
    group: "actions",
    icon: ArrowLeftRight,
    action: opts.openCompare,
  });
  cmds.push({
    id: "open-history",
    title: "Open audit history",
    group: "actions",
    icon: HistoryIcon,
    action: opts.openHistory,
  });
  cmds.push({
    id: "open-settings",
    title: "Open settings (GitHub PAT, cache)",
    group: "actions",
    icon: KeyRound,
    action: opts.openSettings,
  });
  cmds.push({
    id: "reset-home",
    title: "Reset to the empty state",
    group: "actions",
    icon: RotateCcw,
    action: opts.resetToHome,
  });
  if (typeof window !== "undefined") {
    cmds.push({
      id: "print",
      title: "Save current view as PDF",
      group: "actions",
      icon: Printer,
      action: () => window.print(),
    });
  }

  // Theme
  const setAndApply = (t: Theme) => {
    saveTheme(t);
    applyTheme(t);
  };
  cmds.push({
    id: "theme-dark",
    title: "Theme: Dark",
    group: "theme",
    icon: Moon,
    action: () => setAndApply("dark"),
  });
  cmds.push({
    id: "theme-light",
    title: "Theme: Light",
    group: "theme",
    icon: Sun,
    action: () => setAndApply("light"),
  });
  cmds.push({
    id: "theme-system",
    title: "Theme: Follow system preference",
    group: "theme",
    icon: Monitor,
    action: () => setAndApply("system"),
  });

  // History entries (favorites first, then top recents).
  const favs = listFavorites().slice(0, 5);
  const recents = listHistory()
    .filter((h) => !h.favorite)
    .slice(0, 5);
  for (const fav of favs) {
    cmds.push({
      id: `fav-${fav.owner}/${fav.repo}`,
      title: `★ Re-audit ${fav.fullName}`,
      hint: fav.score !== null ? `${fav.score}/100` : undefined,
      group: "history",
      icon: Star,
      action: () => opts.startAudit(`${fav.owner}/${fav.repo}`),
    });
  }
  for (const rec of recents) {
    cmds.push({
      id: `recent-${rec.owner}/${rec.repo}`,
      title: `Re-audit ${rec.fullName}`,
      hint: rec.score !== null ? `${rec.score}/100` : undefined,
      group: "history",
      icon: HistoryIcon,
      action: () => opts.startAudit(`${rec.owner}/${rec.repo}`),
    });
  }

  // Examples
  for (const ex of EXAMPLE_REPOS) {
    cmds.push({
      id: `example-${ex.fullName}`,
      title: `Audit ${ex.fullName}`,
      hint: ex.blurb,
      group: "examples",
      icon: PlayCircle,
      action: () => opts.startAudit(ex.fullName),
    });
  }

  // Friendly catch-all so "/" or "command" surfaces a sensible result.
  cmds.push({
    id: "audit-input-hint",
    title: "Type a repo URL into the main input",
    group: "actions",
    icon: Sparkles,
    action: () => {
      const el = document.querySelector<HTMLInputElement>(
        'input[type="text"][aria-label*="repository" i]',
      );
      el?.focus();
    },
  });

  return cmds;
}
