/**
 * Generic skeleton placeholder.
 *
 * Phase 2.8.2 design rules:
 * - The placeholder element is `aria-hidden="true"`. The surrounding
 *   container in `LoadingAudit` carries the live-region announcement
 *   ("Loading audit for owner/repo …") so screen readers stay quiet
 *   on every individual block.
 * - Defaults to a `<div>`; pass `inline` for a `<span>` so a skeleton
 *   can replace inline text without breaking the flow.
 * - Animation is the `.skeleton-shimmer` class from globals.css which
 *   already honours prefers-reduced-motion.
 * - The base radius is 0.5 rem (matches the dashboard cards). Pass a
 *   different `rounded-*` class to override per shape.
 */

interface SkeletonProps {
  className?: string;
  /** Render as a span instead of a div (for inline placeholders). */
  inline?: boolean;
  /** Optional ARIA label for testing or for cases where the wrapper
   *  isn't a live region. Otherwise stays purely decorative. */
  label?: string;
}

export function Skeleton({
  className = "",
  inline = false,
  label,
}: SkeletonProps) {
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`skeleton-shimmer ${inline ? "inline-block align-middle" : "block"} ${className}`}
    />
  );
}
