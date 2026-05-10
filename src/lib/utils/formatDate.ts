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
