/**
 * Pure SVG badge generator.
 *
 * Astraudit has no backend, so we cannot serve a live `badge.svg?...`
 * URL. Instead the dashboard generates an SVG client-side, lets the
 * maintainer download it, and they commit the file into their own
 * repository. The badge then renders next to README content as a
 * normal Markdown image and never lies because the maintainer signs
 * off on every value.
 *
 * The SVG is deliberately self-contained:
 * - Inline attribute-based styling (no <style> blocks: many renderers
 *   strip them, especially shields-style image proxies).
 * - System-stack fonts only — no external assets.
 * - All user-provided text is XML-escaped.
 * - Width is estimated from a fixed character width per glyph so the
 *   badge has a consistent, deterministic layout.
 */

export type BadgeStyle = "flat" | "aurora" | "minimal";

export interface BadgeOptions {
  owner: string;
  repo: string;
  score: number;
  max: number;
  grade: string;
  style?: BadgeStyle;
  /** Override the leading label (default "astraudit"). */
  label?: string;
}

const FONT_FAMILY =
  "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
const MONO_FAMILY =
  "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

/** Estimate string width in px for a given font size (rough but stable). */
function estimateWidth(text: string, fontSize: number): number {
  // 0.6 is a safe heuristic for the Inter/system stack at common sizes.
  return Math.ceil(text.length * fontSize * 0.6);
}

export function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function colorForScore(score: number): {
  bg: string;
  fg: string;
  accent: string;
} {
  if (score >= 80) return { bg: "#0f5132", fg: "#ffffff", accent: "#42e8c8" };
  if (score >= 60) return { bg: "#3c2d6b", fg: "#ffffff", accent: "#7a5cff" };
  if (score >= 45) return { bg: "#7c4a03", fg: "#ffffff", accent: "#ffb547" };
  return { bg: "#7f1d1d", fg: "#ffffff", accent: "#ff4d6d" };
}

function clampScore(score: number, max: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(max, Math.round(score)));
}

/** SVG preamble shared by every style. */
function svgOpen(width: number, height: number, ariaLabel: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(ariaLabel)}">`;
}

/** Shields.io-style flat badge: LABEL : VALUE. */
function renderFlat(opts: BadgeOptions): string {
  const score = clampScore(opts.score, opts.max);
  const label = opts.label ?? "astraudit";
  const value = `${score}/${opts.max}`;
  const labelText = label;
  const fontSize = 11;
  const padding = 8;
  const labelWidth = estimateWidth(labelText, fontSize) + padding * 2;
  const valueWidth = estimateWidth(value, fontSize) + padding * 2;
  const totalWidth = labelWidth + valueWidth;
  const height = 20;
  const colors = colorForScore(score);
  const aria = `${label}: ${score}/${opts.max} (${opts.grade})`;

  return [
    svgOpen(totalWidth, height, aria),
    `<linearGradient id="g" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-opacity=".25"/></linearGradient>`,
    `<rect width="${totalWidth}" height="${height}" rx="3" fill="#1f2933"/>`,
    `<rect x="${labelWidth}" width="${valueWidth}" height="${height}" rx="3" fill="${colors.bg}"/>`,
    `<rect width="${totalWidth}" height="${height}" rx="3" fill="url(#g)"/>`,
    `<g fill="#fff" font-family="${MONO_FAMILY}" font-size="${fontSize}" text-anchor="middle">`,
    `  <text x="${labelWidth / 2}" y="14">${escapeXml(labelText)}</text>`,
    `  <text x="${labelWidth + valueWidth / 2}" y="14">${escapeXml(value)}</text>`,
    `</g>`,
    `</svg>`,
  ].join("");
}

/** Branded aurora badge: shows score, grade, and the repo. */
function renderAurora(opts: BadgeOptions): string {
  const score = clampScore(opts.score, opts.max);
  const fullName = `${opts.owner}/${opts.repo}`;
  const colors = colorForScore(score);

  const titleSize = 11;
  const scoreSize = 22;
  const gradeSize = 11;
  const suffixSize = 11;

  const fullNameWidth = estimateWidth(fullName, titleSize);
  const scoreText = `${score}`;
  const suffixText = `/${opts.max}`; // rendered as a <tspan> after the score
  const scoreWidth = estimateWidth(scoreText, scoreSize);
  const suffixWidth = estimateWidth(suffixText, suffixSize);
  const gradeWidth = estimateWidth(opts.grade, gradeSize);
  const padding = 14;
  // Phase 5.3 follow-up — the grade letter used to land at
  // `padding + scoreWidth + 14`, ignoring the width of the inline
  // `/max` tspan that sits between the score number and the grade.
  // For score "78" / max "100" / grade "B" the tspan was ~26 px
  // wide, so the grade rendered ~12 px inside the tspan. Now we
  // include `suffixWidth` in the offset (and in the badge's inner
  // width) so the three glyphs never overlap.
  const gradeOffset = scoreWidth + suffixWidth + 14;
  const inner = Math.max(fullNameWidth, gradeOffset + gradeWidth);
  const width = inner + padding * 2;
  const height = 60;
  const aria = `Astraudit ${fullName}: ${score}/${opts.max} ${opts.grade}`;

  return [
    svgOpen(width, height, aria),
    `<defs>`,
    `  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">`,
    `    <stop offset="0%" stop-color="#0a0e1a"/>`,
    `    <stop offset="100%" stop-color="#171c30"/>`,
    `  </linearGradient>`,
    `  <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">`,
    `    <stop offset="0%" stop-color="${colors.accent}"/>`,
    `    <stop offset="100%" stop-color="#3a7bff"/>`,
    `  </linearGradient>`,
    `</defs>`,
    `<rect width="${width}" height="${height}" rx="9" fill="url(#bg)"/>`,
    `<rect x="0" y="0" width="${width}" height="3" rx="1" fill="url(#accent)"/>`,
    `<text x="${padding}" y="20" fill="#9aa3c2" font-family="${FONT_FAMILY}" font-size="9" letter-spacing="2">ASTRAUDIT</text>`,
    `<text x="${padding}" y="40" fill="#fff" font-family="${FONT_FAMILY}" font-size="${scoreSize}" font-weight="700">${escapeXml(scoreText)}<tspan font-size="${suffixSize}" fill="#9aa3c2">${escapeXml(suffixText)}</tspan></text>`,
    `<text x="${padding + gradeOffset}" y="38" fill="${colors.accent}" font-family="${FONT_FAMILY}" font-size="${gradeSize}" font-weight="600">${escapeXml(opts.grade)}</text>`,
    `<text x="${padding}" y="${height - 8}" fill="#9aa3c2" font-family="${FONT_FAMILY}" font-size="9">${escapeXml(fullName)}</text>`,
    `</svg>`,
  ].join("");
}

/** Minimal: a small filled circle with the score, no labels. */
function renderMinimal(opts: BadgeOptions): string {
  const score = clampScore(opts.score, opts.max);
  const colors = colorForScore(score);
  const size = 56;
  const aria = `Astraudit score ${score}/${opts.max}`;

  return [
    svgOpen(size, size, aria),
    `<defs>`,
    `  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">`,
    `    <stop offset="0%" stop-color="${colors.accent}"/>`,
    `    <stop offset="100%" stop-color="#3a7bff"/>`,
    `  </linearGradient>`,
    `</defs>`,
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#0a0e1a" stroke="url(#ring)" stroke-width="3"/>`,
    `<text x="${size / 2}" y="${size / 2 + 1}" fill="#fff" font-family="${FONT_FAMILY}" font-size="20" font-weight="700" text-anchor="middle" dominant-baseline="middle">${escapeXml(String(score))}</text>`,
    `<text x="${size / 2}" y="${size / 2 + 16}" fill="#9aa3c2" font-family="${FONT_FAMILY}" font-size="7" text-anchor="middle">/ ${opts.max}</text>`,
    `</svg>`,
  ].join("");
}

export function generateBadgeSvg(opts: BadgeOptions): string {
  const style = opts.style ?? "flat";
  if (style === "aurora") return renderAurora(opts);
  if (style === "minimal") return renderMinimal(opts);
  return renderFlat(opts);
}

/** Build a copy-paste Markdown snippet that links the badge to the audit. */
export function buildBadgeMarkdown(
  opts: BadgeOptions,
  badgePath: string,
  shareUrl: string,
): string {
  const alt = `Astraudit ${opts.owner}/${opts.repo}: ${clampScore(opts.score, opts.max)}/${opts.max} (${opts.grade})`;
  return `[![${alt}](${badgePath})](${shareUrl})`;
}
