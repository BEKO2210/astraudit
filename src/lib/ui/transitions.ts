/**
 * View-transition utility classes.
 *
 * Phase 2.8.6 design notes (research summary):
 *
 * - Web Animation guidance recommends 300-500 ms max for page-level
 *   transitions; we land at 220 ms, intentionally on the brisk side
 *   so a snappy app doesn't feel sluggish.
 * - 35% of users (Pope Tech 2025) opt into prefers-reduced-motion.
 *   Rather than removing all motion we keep a fade-only entry on
 *   that path — fade is widely tolerated by users with vestibular
 *   sensitivities while still signalling content change.
 * - We deliberately avoid the View Transitions API for now because
 *   it is Chrome-only at production maturity. Plain CSS keyframes
 *   (defined in tailwind.config.ts) work in every browser and need
 *   no feature detection.
 *
 * The constant keeps the decision in one place. Every view root
 * imports it instead of repeating the variant pair.
 */

/**
 * Apply this to the root of any major view that mounts/unmounts on
 * an App-state transition (idle, loading, ready, compared, error,
 * empty). The animation only runs once per mount because React
 * remounts the component when the state branch changes.
 */
export const VIEW_ENTER_CLASS =
  "motion-safe:animate-view-enter motion-reduce:animate-fade-in";
