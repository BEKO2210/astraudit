/**
 * CHANGELOG.md release-pace parser — Phase 3.6.
 *
 * Walks the changelog file looking for *dated release headings* and
 * computes a cadence summary independent of GitHub Releases. Why both?
 *   - Many projects publish a CHANGELOG but never tag a Release on
 *     GitHub. The API view says "no releases" while the file shows
 *     years of structured cadence.
 *   - Some projects do both — the gap between them is itself a
 *     signal (dropped releases, tag drift).
 *
 * Pre-build research (2026-05-10):
 *   - Keep a Changelog 1.1.0 — canonical heading is
 *     `## [1.0.0] - 2017-06-20` with ISO-8601 (`YYYY-MM-DD`) dates.
 *     `[Unreleased]` is the special-case top section. Six standard
 *     change categories: Added / Changed / Deprecated / Removed /
 *     Fixed / Security. https://keepachangelog.com/en/1.1.0/
 *   - Real-world variants seen in the wild:
 *       `## [1.0.0] - 2024-01-15`   (Keep a Changelog)
 *       `## 1.0.0 (2024-01-15)`     (Conventional Changelog default)
 *       `## v1.0.0 - 2024-01-15`
 *       `## 1.0.0 - 2024-01-15`
 *       `## 1.0.0 / 2024-01-15`
 *       `# 1.0.0 (2024-01-15)`      (rare h1)
 *     The parser accepts every shape that contains *both* a
 *     version-like token and an ISO-8601 date on the same heading
 *     line, plus a few date formats common outside the standard
 *     (e.g. `2024-Jan-15` is intentionally not supported — too rare
 *     to be worth the false-positive risk).
 *
 * The parser is a single forward pass with no back-tracking; it never
 * touches the network, never throws, and returns null on any input
 * that isn't recognisably a CHANGELOG (no dated release headings at
 * all → nothing to grade).
 */

export type ChangelogCadence =
  | "frequent" /*    cadence ≤ 14 days        */
  | "regular" /*     cadence ≤ 60 days        */
  | "occasional" /*  cadence ≤ 180 days       */
  | "rare" /*        cadence ≤ 365 days       */
  | "dormant"; /*    cadence > 365 days OR last release > 540 days ago */

export interface ChangelogRelease {
  /** Version-like token as seen in the heading: `1.0.0`, `v2.5.1`, `[3.0.0-beta.2]`. */
  version: string;
  /** ISO 8601 date string (`YYYY-MM-DD`). */
  date: string;
}

export interface ParsedChangelog {
  /** Releases sorted oldest → newest. */
  releases: ChangelogRelease[];
  /** Most recent date (`YYYY-MM-DD`), null when the file is empty. */
  latestDate: string | null;
  /** Days between *now* and the most-recent release, null when no
   *  releases were detected. Computed against the timestamp passed
   *  into `parseChangelog` (defaults to `Date.now()`). */
  daysSinceLatest: number | null;
  /** Mean delta in days between consecutive releases (oldest → newest).
   *  Null when there are < 2 releases. */
  averageDaysBetween: number | null;
  /** Median delta in days between consecutive releases. Null when
   *  there are < 2 releases. We surface both — the mean is sensitive
   *  to long initial gaps, the median to outlier patches. */
  medianDaysBetween: number | null;
  /** Coarse cadence label for the UI. */
  cadence: ChangelogCadence;
  /** True when an `[Unreleased]` section is present at the top. */
  hasUnreleasedSection: boolean;
}

/* -------------------------------------------------------------------------- */
/* Heading detection                                                           */
/* -------------------------------------------------------------------------- */

const HEADING_RE = /^(#{1,3})\s+(.+)$/;
const ISO_DATE_RE = /(\d{4}-\d{2}-\d{2})/;
const VERSION_RE =
  /(?:\[)?v?(\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.+-]+)?)(?:\])?/;
const UNRELEASED_RE = /\[?\bunreleased\b\]?/i;

/** Validate the date components are real (not 2024-13-99). */
function isRealDate(iso: string): boolean {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [_, ys, ms, ds] = m;
  void _;
  const y = Number(ys);
  const mo = Number(ms);
  const d = Number(ds);
  if (mo < 1 || mo > 12) return false;
  if (d < 1 || d > 31) return false;
  // Construct via Date; if the components round-trip the parts match.
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === mo - 1 &&
    probe.getUTCDate() === d
  );
}

/** Strip markdown link syntax (`[1.0.0](url)` → `1.0.0`) so the
 *  version regex sees the bare token. */
function stripHeadingLinks(line: string): string {
  return line.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

/* -------------------------------------------------------------------------- */
/* Top-level                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Parse a CHANGELOG file. Returns null when no dated release headings
 * are detected (the file isn't recognisably a Keep-a-Changelog-style
 * log). `now` is injectable so tests can pin the "days since latest"
 * computation deterministically.
 */
export function parseChangelog(
  content: string | null | undefined,
  now: Date = new Date(),
): ParsedChangelog | null {
  if (!content || !content.trim()) return null;

  const lines = content.split(/\r?\n/);
  const releases: ChangelogRelease[] = [];
  let hasUnreleasedSection = false;

  // Track which (version, date) pairs we've already accepted so a
  // duplicate heading later in the file (e.g. a TOC at the bottom)
  // doesn't double-count.
  const seen = new Set<string>();

  for (const raw of lines) {
    const m = raw.match(HEADING_RE);
    if (!m) continue;
    const headingBody = stripHeadingLinks(m[2]);

    if (UNRELEASED_RE.test(headingBody)) {
      hasUnreleasedSection = true;
      continue;
    }

    const dateMatch = headingBody.match(ISO_DATE_RE);
    if (!dateMatch) continue;
    const date = dateMatch[1];
    if (!isRealDate(date)) continue;

    const versionMatch = headingBody.match(VERSION_RE);
    if (!versionMatch) continue;
    const version = versionMatch[1];

    // De-dupe identical (version, date) pairs.
    const key = `${version}|${date}`;
    if (seen.has(key)) continue;
    seen.add(key);

    releases.push({ version, date });
  }

  if (releases.length === 0) return null;

  // Sort oldest → newest by date string (ISO 8601 sorts lexically).
  releases.sort((a, b) => a.date.localeCompare(b.date));

  const latest = releases[releases.length - 1];
  const latestDate = latest.date;
  const daysSinceLatest = daysBetween(latestDate, now);

  let averageDaysBetween: number | null = null;
  let medianDaysBetween: number | null = null;
  if (releases.length >= 2) {
    const deltas: number[] = [];
    for (let i = 1; i < releases.length; i++) {
      deltas.push(daysBetween(releases[i - 1].date, releases[i].date));
    }
    const sum = deltas.reduce((a, b) => a + b, 0);
    averageDaysBetween = Math.round((sum / deltas.length) * 10) / 10;
    medianDaysBetween = median(deltas);
  }

  const cadence = bucketCadence({
    averageDaysBetween,
    daysSinceLatest,
    releaseCount: releases.length,
  });

  return {
    releases,
    latestDate,
    daysSinceLatest,
    averageDaysBetween,
    medianDaysBetween,
    cadence,
    hasUnreleasedSection,
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function daysBetween(fromIso: string, to: Date | string): number {
  const a = parseIsoUtc(fromIso);
  const b = typeof to === "string" ? parseIsoUtc(to) : to.getTime();
  return Math.round((b - a) / 86_400_000);
}

function parseIsoUtc(iso: string): number {
  const [y, mo, d] = iso.split("-").map(Number);
  return Date.UTC(y, (mo || 1) - 1, d || 1);
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
}

function bucketCadence(input: {
  averageDaysBetween: number | null;
  daysSinceLatest: number | null;
  releaseCount: number;
}): ChangelogCadence {
  const { averageDaysBetween, daysSinceLatest, releaseCount } = input;
  // A single dated release tells us nothing about cadence; classify by
  // how recent the last entry is.
  if (releaseCount < 2) {
    if (daysSinceLatest === null || daysSinceLatest > 540) return "dormant";
    if (daysSinceLatest > 365) return "rare";
    return "occasional";
  }
  // Stale — even if cadence was tight historically, no entry in 18
  // months means "dormant" today.
  if (daysSinceLatest !== null && daysSinceLatest > 540) return "dormant";

  const avg = averageDaysBetween ?? 365;
  if (avg <= 14) return "frequent";
  if (avg <= 60) return "regular";
  if (avg <= 180) return "occasional";
  if (avg <= 365) return "rare";
  return "dormant";
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                  */
/* -------------------------------------------------------------------------- */

const CADENCE_LABEL: Record<ChangelogCadence, string> = {
  frequent: "Frequent",
  regular: "Regular",
  occasional: "Occasional",
  rare: "Rare",
  dormant: "Dormant",
};

export function formatCadence(c: ChangelogCadence): string {
  return CADENCE_LABEL[c];
}
