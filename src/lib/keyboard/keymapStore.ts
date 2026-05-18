/**
 * Keymap store — Roadmap M7.2.
 *
 * Lets the visitor rebind the single-key global shortcuts
 * (`palette`, `cheatSheet`, `focusInput`) via the Settings
 * dialog. Defaults are baked in here; user overrides live in
 * localStorage. `useGlobalShortcuts` reads through `getKeymap()`
 * so any change takes effect on the next mount.
 *
 * Out of scope for this slice: the vim‑style `g <key>` chord
 * map — that's a coordinated multi-key system whose configurator
 * would be a UI of its own.
 */

export type KeyAction = "palette" | "cheatSheet" | "focusInput";

export const KEY_ACTIONS: readonly KeyAction[] = [
  "palette",
  "cheatSheet",
  "focusInput",
] as const;

export interface KeyBinding {
  /** The non-modifier key as reported by `KeyboardEvent.key`. */
  key: string;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

const STORAGE_KEY = "astraudit:keymap:v1";

const DEFAULT_BINDINGS: Record<KeyAction, KeyBinding> = {
  // Cmd/Ctrl+K — match every editor's convention.
  palette: { key: "k", meta: true, ctrl: true, alt: false, shift: false },
  // `?` lifted from the vim cheat sheet pattern.
  cheatSheet: { key: "?", meta: false, ctrl: false, alt: false, shift: false },
  // `/` for "go to search input".
  focusInput: { key: "/", meta: false, ctrl: false, alt: false, shift: false },
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

interface PersistedRoot {
  /** Partial map of action → user override. Missing entries fall through to default. */
  overrides: Partial<Record<KeyAction, KeyBinding>>;
}

function readRoot(): PersistedRoot {
  if (!isBrowser()) return { overrides: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { overrides: {} };
    const parsed = JSON.parse(raw) as PersistedRoot;
    if (!parsed || typeof parsed.overrides !== "object" || parsed.overrides == null) {
      return { overrides: {} };
    }
    return parsed;
  } catch {
    return { overrides: {} };
  }
}

function writeRoot(root: PersistedRoot): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  } catch {
    /* private mode / quota — non-fatal */
  }
}

/** Resolved keymap: defaults overlaid with any persisted overrides. */
export function getKeymap(): Record<KeyAction, KeyBinding> {
  const overrides = readRoot().overrides;
  const out = { ...DEFAULT_BINDINGS };
  for (const action of KEY_ACTIONS) {
    const override = overrides[action];
    if (override) out[action] = override;
  }
  return out;
}

/** Persist a binding override for a single action. */
export function setBinding(action: KeyAction, binding: KeyBinding): void {
  const root = readRoot();
  root.overrides[action] = binding;
  writeRoot(root);
}

/** Reset one action back to its default. */
export function resetBinding(action: KeyAction): void {
  const root = readRoot();
  delete root.overrides[action];
  writeRoot(root);
}

/** Reset every action back to its default. */
export function resetAllBindings(): void {
  writeRoot({ overrides: {} });
}

/**
 * Compare a KeyboardEvent against a binding. Returns true only
 * when the non-modifier key + modifier mask exactly match. Both
 * Cmd and Ctrl satisfy the "meta-or-ctrl" requirement of the
 * `palette` action — the binding stores `meta:true, ctrl:true`
 * so either platform's primary modifier triggers it.
 */
export function matchesBinding(event: KeyboardEvent, binding: KeyBinding): boolean {
  if (event.key.toLowerCase() !== binding.key.toLowerCase()) return false;
  // For modifier flags, true in the binding means "require this
  // modifier". When both meta and ctrl are true, satisfying either
  // is enough — that's the cross-platform convention.
  if (binding.meta && binding.ctrl) {
    if (!(event.metaKey || event.ctrlKey)) return false;
  } else {
    if (binding.meta !== event.metaKey) return false;
    if (binding.ctrl !== event.ctrlKey) return false;
  }
  if (binding.alt !== event.altKey) return false;
  if (binding.shift !== event.shiftKey) return false;
  return true;
}

/** Build a KeyBinding from a KeyboardEvent — used by the recorder UI. */
export function bindingFromEvent(event: KeyboardEvent): KeyBinding | null {
  const key = event.key;
  // Disallow standalone modifier keys (they alone aren't shortcuts).
  if (
    key === "Meta" ||
    key === "Control" ||
    key === "Alt" ||
    key === "Shift" ||
    key === "Escape" ||
    key === "Tab"
  ) {
    return null;
  }
  return {
    key,
    meta: event.metaKey,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
  };
}

/**
 * Find another action whose binding collides with the proposed
 * `candidate`. Returns the conflicting action id, or null when
 * nothing else is bound to the same combo. The `exclude` action
 * is skipped (we're checking what the user is *about to* set).
 */
export function findConflict(
  candidate: KeyBinding,
  exclude: KeyAction,
  map: Record<KeyAction, KeyBinding> = getKeymap(),
): KeyAction | null {
  for (const action of KEY_ACTIONS) {
    if (action === exclude) continue;
    if (bindingsEqual(map[action], candidate)) return action;
  }
  return null;
}

function bindingsEqual(a: KeyBinding, b: KeyBinding): boolean {
  return (
    a.key.toLowerCase() === b.key.toLowerCase() &&
    a.meta === b.meta &&
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift
  );
}

/** Human-readable combo, e.g. "Ctrl/⌘ + K". */
export function formatBinding(binding: KeyBinding): string {
  const parts: string[] = [];
  if (binding.meta && binding.ctrl) parts.push("Ctrl/⌘");
  else if (binding.meta) parts.push("⌘");
  else if (binding.ctrl) parts.push("Ctrl");
  if (binding.alt) parts.push("Alt");
  if (binding.shift) parts.push("Shift");
  // Normalise visible key label.
  const key = binding.key.length === 1 ? binding.key.toUpperCase() : binding.key;
  parts.push(key);
  return parts.join(" + ");
}

export const __test = { STORAGE_KEY, DEFAULT_BINDINGS, bindingsEqual };
