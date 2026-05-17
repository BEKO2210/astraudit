import type { ComponentType } from "react";

export type CommandGroup =
  | "navigate"
  | "actions"
  | "theme"
  | "history"
  | "examples";

export interface Command {
  id: string;
  title: string;
  hint?: string;
  group: CommandGroup;
  shortcut?: string[];
  icon?: ComponentType<{ className?: string }>;
  action: () => void;
}

/** Score how well a query matches a command label, 0 means no match. */
export function scoreCommandMatch(query: string, cmd: Command): number {
  if (!query) return 1;
  const q = query.toLowerCase().trim();
  const title = cmd.title.toLowerCase();
  const hint = cmd.hint?.toLowerCase() ?? "";
  const haystack = `${title} ${hint} ${cmd.group}`;

  if (title === q) return 1000;
  if (title.startsWith(q)) return 800;
  if (haystack.includes(q)) return 500;

  // Subsequence match: every char of q appears in title in order.
  let i = 0;
  for (const c of title) {
    if (c === q[i]) i++;
    if (i === q.length) return 200;
  }
  return 0;
}

/** Filter + sort commands by relevance to the query. */
export function filterCommands(commands: Command[], query: string): Command[] {
  if (!query.trim()) return commands;
  return commands
    .map((c) => ({ c, score: scoreCommandMatch(query, c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);
}

// Roadmap M4.3 slice 5c — group labels are translation keys; the
// palette resolves them via `t()` at render time. Keeping them as
// keys (rather than rendered strings) means a runtime locale switch
// re-renders correctly without invalidating any memoised palette
// state.
import type { TranslationKey } from "../i18n/types";

export const GROUP_LABELS: Record<CommandGroup, TranslationKey> = {
  navigate: "palette.groupNavigate",
  actions: "palette.groupActions",
  theme: "palette.groupTheme",
  history: "palette.groupHistory",
  examples: "palette.groupExamples",
};
