/**
 * <Tooltip /> — Phase 2.8.8 CSS-only tooltip primitive.
 *
 * Why this exists:
 *   The codebase has been leaning on the `title` HTML attribute for hover
 *   hints on icon-only buttons (CopyButton, ShareButton, PrintButton,
 *   ThemeToggle, FAB cluster). Per Heydon Pickering, Adrian Roselli, and
 *   Scott O'Hara, `title` is unreliable for keyboard users (never shown),
 *   touch users (never shown), and screen readers (only some announce it,
 *   inconsistently). We replace those with a real, accessibly-styled
 *   tooltip element.
 *
 * Pre-build research notes:
 *   - WAI-ARIA APG: trigger references the tooltip via `aria-describedby`
 *     OR `aria-labelledby` (when the tooltip *is* the accessible name).
 *     The bubble carries `role="tooltip"`. Tooltips never receive focus.
 *   - Heydon Pickering / Inclusive Components: when the trigger already
 *     has a sufficient accessible name (e.g. `aria-label="Copy"`), adding
 *     `aria-describedby` to a tooltip with the same text is redundant —
 *     so this primitive only wires `aria-describedby` when the consumer
 *     explicitly asks for it via `describe`.
 *   - WCAG 2.2 SC 1.4.13 *Content on Hover or Focus* (AA):
 *       · Dismissible — Escape closes the tooltip without moving focus.
 *       · Hoverable   — pointer can traverse from trigger onto the
 *                       tooltip without it disappearing (we keep
 *                       `pointer-events: auto` and the bubble extends
 *                       its hit area into the gap above the trigger).
 *       · Persistent  — visible while the trigger has hover OR focus,
 *                       OR while the bubble itself is hovered.
 *   - Pure CSS handles the show/hide via `:hover`, `:focus-within`. We
 *     only need a tiny bit of JS for Esc dismissal + an id for ARIA.
 *
 * Sources:
 *   - https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
 *   - https://inclusive-components.design/tooltips-toggletips/
 *   - https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
 */

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from "react";

type Placement = "top" | "bottom";
type EdgeAlign = "center" | "left" | "right";

interface TooltipProps {
  /** Visible tooltip text. Keep it short (≤ ~40 chars). */
  label: string;
  /** Single interactive trigger element (button/link). */
  children: ReactElement;
  /** Where the bubble sits relative to the trigger. Default "top". */
  placement?: Placement;
  /**
   * If true, link the bubble to the trigger via `aria-describedby` so
   * screen readers append the tooltip text after the trigger's name.
   * Use when the tooltip adds *new* information (not just duplicating
   * an existing aria-label). Default false to avoid SR redundancy.
   */
  describe?: boolean;
  /** Extra className for the bubble — useful for width caps. */
  bubbleClassName?: string;
}

export function Tooltip({
  label,
  children,
  placement = "top",
  describe = false,
  bubbleClassName = "",
}: TooltipProps) {
  const id = useId();
  const tooltipId = `tt-${id}`;
  const [dismissed, setDismissed] = useState(false);
  const [edgeAlign, setEdgeAlign] = useState<EdgeAlign>("center");
  const wrapRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  // Esc dismissal: per WCAG 1.4.13, the tooltip must be closeable
  // without moving the pointer or focus. We track a "dismissed" flag
  // that hides the bubble until the trigger is blurred or the pointer
  // leaves, which resets the state for the next interaction.
  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Escape" && !dismissed) {
      setDismissed(true);
      // Don't preventDefault — Escape still bubbles to dialogs above us.
    }
  };

  const resetDismiss = () => {
    if (dismissed) setDismissed(false);
  };

  // Phase 5.x bugfix — viewport edge detection. The default
  // `transform: translateX(-50%)` centers the bubble on the trigger,
  // which works fine in the middle of the page but pushes the bubble
  // off-screen when the trigger sits near the left or right viewport
  // edge (the dashboard's score-area buttons cluster against the
  // right edge; the rate-limit chip in the Hero cluster sits against
  // the right edge on mobile). On hover/focus we measure the
  // bubble's position relative to the viewport and flip the alignment
  // to whichever edge it's closest to.
  const measureEdge = () => {
    const bubble = bubbleRef.current;
    if (!bubble) return;
    // Measure with the bubble's natural position (the visible rect
    // includes the translateX(-50%) so we can detect overflow).
    const rect = bubble.getBoundingClientRect();
    const vw = window.innerWidth;
    const margin = 8;
    if (rect.right > vw - margin) {
      setEdgeAlign("right");
    } else if (rect.left < margin) {
      setEdgeAlign("left");
    } else {
      setEdgeAlign("center");
    }
  };

  // Re-measure whenever the bubble becomes visible (hover / focus
  // change). We can't use `useEffect` keyed on visibility because
  // visibility lives in CSS — instead, hook the wrapper's pointer /
  // focus events.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onShow = () => measureEdge();
    wrap.addEventListener("pointerenter", onShow);
    wrap.addEventListener("focusin", onShow);
    // Re-check on resize so an orientation flip on mobile doesn't
    // strand the bubble outside the new viewport.
    const onResize = () => {
      if (wrap.matches(":hover, :focus-within")) measureEdge();
    };
    window.addEventListener("resize", onResize);
    return () => {
      wrap.removeEventListener("pointerenter", onShow);
      wrap.removeEventListener("focusin", onShow);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  if (!isValidElement(children)) {
    // Defensive: the consumer must pass a single React element. If not,
    // we render the bubble and skip aria wiring rather than throwing.
    return <span className="tt-wrap">{children}</span>;
  }

  const trigger = describe
    ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
        "aria-describedby": tooltipId,
      })
    : children;

  return (
    <span
      ref={wrapRef}
      className="tt-wrap"
      data-tt-placement={placement}
      data-tt-align={edgeAlign}
      data-tt-dismissed={dismissed ? "true" : undefined}
      onKeyDown={handleKeyDown}
      onPointerLeave={resetDismiss}
      onBlur={resetDismiss}
    >
      {trigger}
      <span
        ref={bubbleRef}
        role="tooltip"
        id={tooltipId}
        className={`tt-bubble ${bubbleClassName}`}
      >
        {label}
      </span>
    </span>
  );
}
