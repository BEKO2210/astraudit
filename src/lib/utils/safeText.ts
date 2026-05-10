export function safeText(input: string | null | undefined, fallback = "—"): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  return trimmed.length === 0 ? fallback : trimmed;
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 1))}…`;
}

export function tryParseJson<T = unknown>(input: string | null | undefined): T | null {
  if (!input) return null;
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}
