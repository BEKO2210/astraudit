/**
 * README readability — Phase 3.1.
 *
 * Computes Flesch-Kincaid Grade Level (FKGL) and Flesch Reading Ease
 * (FRE) on the prose extracted from a README. Strictly browser-only,
 * no AI APIs, no network calls, no third-party dependencies.
 *
 * Pre-build research (2026-05-10):
 *   - Confirmed formulas (Wikipedia + textstat + Penn State writing
 *     centre):
 *       FKGL = 0.39 · (words/sentences) + 11.8 · (syllables/words) − 15.59
 *       FRE  = 206.835 − 1.015 · (words/sentences) − 84.6 · (syllables/words)
 *   - Syllable counting follows the standard heuristic used in
 *     `words/syllable` (MIT, ~325 LOC) and Lingua::EN::Syllable (Perl):
 *     count vowel groups, subtract silent-e, with a small exception
 *     list for known edge cases. Accuracy on common English words is
 *     ~85–90 %, which is more than enough for a "reads at grade N"
 *     summary.
 *   - Technical-doc sweet spot: grade 10–12. Below 8 reads as
 *     over-simplified, above 14 reads as dense / academic. We surface
 *     the raw grade and let the reader decide.
 *   - Pre-processing for technical READMEs: strip fenced + indented
 *     code, inline code, badges, image embeds, HTML tags, table rows,
 *     and link markup (keep visible label, drop URL). Headings are
 *     kept — they are valid prose for the reader.
 *
 * Sources baked into the contract:
 *   - https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests
 *   - https://github.com/words/syllable
 *   - https://textstat.readthedocs.io/
 */

export interface Readability {
  /** Flesch-Kincaid Grade Level (0–20+). 12 ≈ high-school senior. */
  fleschKincaidGrade: number;
  /** Flesch Reading Ease (0–100, higher = easier). 60–70 = standard. */
  fleschReadingEase: number;
  /** Tokens after prose extraction. */
  words: number;
  /** Sentences detected after prose extraction. */
  sentences: number;
  /** Heuristic syllable total. */
  syllables: number;
  /** Coarse bucket for UI labelling. See `bucketReadability`. */
  bucket: ReadabilityBucket;
}

export type ReadabilityBucket =
  | "elementary" /*  ≤ 6    */
  | "easy" /*       7–9    */
  | "standard" /*    10–12  */
  | "dense" /*       13–15  */
  | "academic"; /*   ≥ 16   */

/* --------------------------------------------------------------------------
 * Syllable counting
 * --------------------------------------------------------------------------
 * Heuristic vowel-group approach with a small exception list for the
 * most common mis-counts. We deliberately keep this < 50 LOC so it stays
 * auditable; the trade-off vs. a full-blown library is ≈ 5 percentage
 * points of accuracy — fine for an aggregate grade-level number.
 * ------------------------------------------------------------------------ */

const SYLLABLE_EXCEPTIONS: Record<string, number> = {
  // Common single-syllable words the vowel-group heuristic over-counts.
  the: 1,
  every: 2,
  // Common multi-syllable words the heuristic under-counts.
  business: 2,
  vegetable: 3,
  literature: 3,
  comfortable: 3,
  area: 3,
  idea: 3,
  ideal: 2,
  iron: 2,
  ironic: 3,
  cooperation: 5,
  // Suffix-only contractions that confuse the algorithm.
  doesnt: 2,
  cant: 1,
  wont: 1,
  isnt: 2,
};

/**
 * Count syllables in a single English word using a vowel-group heuristic.
 * Returns at least 1 for any non-empty input.
 *
 * Strategy:
 *   1. Lookup table for known mis-counts.
 *   2. Strip a silent trailing 'e' / 'es' / 'ed' (but only after a
 *      non-l consonant — '-le' endings keep the 'e' because the 'e'
 *      forms its own syllable, e.g. `apple` → "a-ple").
 *   3. Count vowel groups in the remainder. `y` counts as a vowel
 *      (mid- and end-word) — `readability` has five.
 *   4. Drop a leading bare 'y' so words like `youth` don't double-count.
 */
export function countSyllables(rawWord: string): number {
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  if (SYLLABLE_EXCEPTIONS[word] !== undefined) return SYLLABLE_EXCEPTIONS[word];
  if (word.length <= 3) return 1;

  // Strip silent endings — but the regex deliberately requires a non-l
  // consonant before the 'e', so '-le' endings (apple, bottle, table)
  // are NOT stripped; the trailing 'e' is voiced and its own group.
  let working = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/u, "");
  working = working.replace(/^y/, "");

  const groups = working.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 0);
}

/* --------------------------------------------------------------------------
 * Markdown → prose extraction
 * ------------------------------------------------------------------------ */

/**
 * Strip everything that isn't human-readable prose: fenced code blocks,
 * indented code, inline code spans, HTML tags, badge images, image
 * embeds, table rows, link URLs (keep visible label), heading markers,
 * blockquote markers, and emphasis markers.
 */
export function extractProse(markdown: string): string {
  if (!markdown) return "";
  let text = markdown;

  // 1. Fenced code blocks (```...``` or ~~~...~~~) — anything between fences.
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/~~~[\s\S]*?~~~/g, " ");

  // 2. HTML tags — `<details>`, `<img>`, `<br>`, etc. Keep textual content.
  text = text.replace(/<[^>]+>/g, " ");

  // 3. Badges and image embeds: `![alt](url)` or `[![…](…)](…)`.
  text = text.replace(/\[?!\[[^\]]*\]\([^)]*\)\]?(?:\([^)]*\))?/g, " ");

  // 4. Plain link `[text](url)` → keep `text`.
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // 5. Reference-style links: `[text][ref]` → keep `text`.
  text = text.replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1");

  // 6. Inline code spans `` `code` ``.
  text = text.replace(/`[^`\n]*`/g, " ");

  // 7. Indented code blocks (4+ leading spaces or a tab on a line).
  text = text.replace(/^(?: {4,}|\t).*$/gm, " ");

  // 8. Tables: any line that starts with `|`.
  text = text.replace(/^\s*\|.*$/gm, " ");

  // 9. Heading markers — keep the heading text as prose, drop only the `#`s.
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");

  // 10. Blockquote markers `> `.
  text = text.replace(/^\s{0,3}>\s?/gm, "");

  // 11. List markers: `- `, `* `, `+ `, `1. `.
  text = text.replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, "");

  // 12. Horizontal rules.
  text = text.replace(/^\s{0,3}(?:[-*_]\s?){3,}$/gm, " ");

  // 13. Emphasis markers (single chars only — don't break unmatched
  // underscores inside identifiers, but most prose markdown uses pairs).
  text = text.replace(/(\*\*|__)(.+?)\1/g, "$2");
  text = text.replace(/(\*|_)(.+?)\1/g, "$2");
  text = text.replace(/~~(.+?)~~/g, "$1");

  // 14. Reference link definitions on their own line: `[id]: url`.
  text = text.replace(/^\s*\[[^\]]+\]:\s*\S.*$/gm, " ");

  // 15. Collapse whitespace and trim.
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/* --------------------------------------------------------------------------
 * Sentence + word splitting
 * ------------------------------------------------------------------------ */

// Abbreviations whose trailing period must NOT end a sentence. Each
// entry is a regex source ready for word-boundary matching ("e\\.g"
// matches "e.g" with the literal dot).
const ABBREV_RE = /\b(?:e\.g|i\.e|etc|vs|mr|mrs|ms|dr|st|jr|sr|fig|no)\./gi;
// Sentinel character used to temporarily mask abbreviation periods so
// they survive the split. U+0001 is a control char that never appears
// in real prose.
const ABBR_MARK = "";

/**
 * Split prose into sentences using terminal punctuation. Abbreviations
 * (`e.g.`, `i.e.`, `etc.`) are masked first so their dots don't end a
 * sentence.
 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  // 1. Mask abbreviation-final periods.
  const masked = text.replace(ABBREV_RE, (m) => m.slice(0, -1) + ABBR_MARK);
  // 2. Split after terminal punctuation followed by whitespace, OR at
  //    end of string.
  const parts = masked.split(/(?<=[.!?])\s+/);
  // 3. Restore the masked periods.
  return parts
    .map((p) => p.replace(new RegExp(ABBR_MARK, "g"), ".").trim())
    .filter(Boolean);
}

export function splitWords(text: string): string[] {
  if (!text) return [];
  // Word = run of letters / apostrophes; drop bare punctuation.
  return text.match(/[A-Za-z][A-Za-z'']*/g) ?? [];
}

/* --------------------------------------------------------------------------
 * Bucketing for the UI label
 * ------------------------------------------------------------------------ */

export function bucketReadability(grade: number): ReadabilityBucket {
  if (grade <= 6) return "elementary";
  if (grade <= 9) return "easy";
  if (grade <= 12) return "standard";
  if (grade <= 15) return "dense";
  return "academic";
}

/* --------------------------------------------------------------------------
 * Top-level scorer
 * ------------------------------------------------------------------------ */

const MIN_WORDS_FOR_SCORE = 30;
const MIN_SENTENCES_FOR_SCORE = 2;

/**
 * Compute Flesch-Kincaid grade and reading ease for a markdown document.
 * Returns null when there isn't enough prose to give a stable score
 * (very short READMEs would otherwise produce wildly skewed numbers).
 */
export function computeReadability(markdown: string | null | undefined): Readability | null {
  if (!markdown) return null;
  const prose = extractProse(markdown);
  const sentences = splitSentences(prose);
  const words = splitWords(prose);

  if (
    words.length < MIN_WORDS_FOR_SCORE ||
    sentences.length < MIN_SENTENCES_FOR_SCORE
  ) {
    return null;
  }

  let syllables = 0;
  for (const w of words) syllables += countSyllables(w);

  const wps = words.length / sentences.length;
  const spw = syllables / words.length;
  const fkgl = 0.39 * wps + 11.8 * spw - 15.59;
  const fre = 206.835 - 1.015 * wps - 84.6 * spw;

  // Round to one decimal — anything finer is noise.
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const grade = round1(fkgl);
  return {
    fleschKincaidGrade: grade,
    fleschReadingEase: round1(fre),
    words: words.length,
    sentences: sentences.length,
    syllables,
    bucket: bucketReadability(grade),
  };
}
