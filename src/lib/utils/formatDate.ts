export function formatDate(input: string | null | undefined): string {
  if (!input) return "—";
  try {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatRelative(input: string | null | undefined): string {
  if (!input) return "Unknown";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays < 1) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} months ago`;
  const diffYears = (diffDays / 365).toFixed(1);
  return `${diffYears} years ago`;
}

/**
 * Fine-grained "X ago" formatter for audit / cache timestamps.
 * Distinct from `formatRelative` (day granularity, used for
 * commits / releases) because users care about the difference
 * between "30 seconds ago" and "2 hours ago" when deciding
 * whether to re-audit.
 */
export function formatRelativeTime(input: string | null | undefined, now: number = Date.now()): string {
  if (!input) return "Unknown";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diffSec = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec} seconds ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHr / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  const diffYears = (diffDays / 365).toFixed(1);
  return `${diffYears} years ago`;
}
