/**
 * Per-audit promo card SVG renderer — Roadmap M8.2.
 *
 * Produces a 1200×630 (standard OG image) SVG summarising one
 * audit: repo full name, score ring, grade letter, one-line
 * verdict, Astraudit wordmark. Pure string output — no DOM,
 * no canvas. Renders identically server-side and in the worker.
 *
 * The PromoCardButton (M8.2 UI slice) wraps this into a
 * downloadable .svg / .png and copies a ready-to-paste
 * `<meta property="og:image">` snippet for embedding in
 * READMEs or community posts.
 */

export interface PromoCardInput {
  fullName: string;
  totalScore: number;
  maxScore: number;
  grade: string;
  /** 1–2 sentence verdict; will be truncated to a reasonable length. */
  verdict?: string | null;
  /** Primary language tag, e.g. "TypeScript". */
  language?: string | null;
  /** Optional explicit generated-at timestamp; defaults to today. */
  generatedAt?: string;
}

const W = 1200;
const H = 630;
const RING_CX = 220;
const RING_CY = 320;
const RING_R = 130;
const RING_STROKE = 26;
const VERDICT_MAX_CHARS = 110;

/**
 * Minimal XML escaper for text we drop inside SVG `<text>` / attrs.
 * Only the canonical XML special characters need handling — we
 * never emit raw user HTML here.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function gradeTone(score: number, max: number): { fg: string; bg: string } {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 80) return { fg: "#42e8c8", bg: "#0b3a32" }; // mint
  if (pct >= 60) return { fg: "#5fb8ff", bg: "#0d2e4a" }; // cyan
  if (pct >= 45) return { fg: "#ffa654", bg: "#3a2410" }; // amber
  return { fg: "#ff7a90", bg: "#3a1018" }; // red
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function ringPath(pctRaw: number): string {
  // Clamp the visible arc to [1%, 99%] so neither extreme renders
  // as a closed circle (which would visually equal 0% or 100%
  // ambiguously).
  const pct = Math.max(1, Math.min(99, pctRaw));
  const angle = (pct / 100) * Math.PI * 2 - Math.PI / 2;
  const x = RING_CX + RING_R * Math.cos(angle);
  const y = RING_CY + RING_R * Math.sin(angle);
  const largeArc = pct > 50 ? 1 : 0;
  return `M ${RING_CX} ${RING_CY - RING_R} A ${RING_R} ${RING_R} 0 ${largeArc} 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
}

export function renderPromoCardSvg(input: PromoCardInput): string {
  const score = Math.max(0, Math.min(input.maxScore, Math.round(input.totalScore)));
  const max = Math.max(1, Math.round(input.maxScore));
  const pct = (score / max) * 100;
  const tone = gradeTone(score, max);
  const grade = escapeXml(input.grade);
  const fullName = escapeXml(truncate(input.fullName, 60));
  const verdict = escapeXml(
    truncate((input.verdict ?? "").trim(), VERDICT_MAX_CHARS) ||
      "Browser‑only audit · rule‑based · no AI inference.",
  );
  const language = input.language ? escapeXml(input.language) : null;
  const stamp = escapeXml(
    (input.generatedAt ?? new Date().toISOString()).slice(0, 10),
  );

  const arc = ringPath(pct);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Astraudit score card for ${fullName}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0e1a"/>
      <stop offset="100%" stop-color="#101831"/>
    </linearGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7a5cff"/>
      <stop offset="100%" stop-color="#42e8c8"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="url(#brand)"/>
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" fill="#e7ebf3">
    <text x="60" y="80" font-size="34" font-weight="700">Astraudit</text>
    <text x="60" y="118" font-size="20" fill="#94a3b8">${stamp} · rule‑based browser audit</text>

    <!-- Score ring -->
    <circle cx="${RING_CX}" cy="${RING_CY}" r="${RING_R}" fill="${tone.bg}" stroke="#1f2942" stroke-width="${RING_STROKE}"/>
    <path d="${arc}" fill="none" stroke="${tone.fg}" stroke-width="${RING_STROKE}" stroke-linecap="round"/>
    <text x="${RING_CX}" y="${RING_CY + 8}" font-size="84" font-weight="700" text-anchor="middle" fill="${tone.fg}">${score}</text>
    <text x="${RING_CX}" y="${RING_CY + 60}" font-size="22" text-anchor="middle" fill="#94a3b8">/ ${max}</text>

    <!-- Grade pill under ring -->
    <g transform="translate(${RING_CX - 70}, ${RING_CY + RING_R + 40})">
      <rect width="140" height="56" rx="28" fill="${tone.bg}" stroke="${tone.fg}" stroke-width="2"/>
      <text x="70" y="38" font-size="32" font-weight="700" text-anchor="middle" fill="${tone.fg}">Grade ${grade}</text>
    </g>

    <!-- Repo name + verdict on the right column -->
    <text x="430" y="230" font-size="56" font-weight="700" fill="#ffffff">${fullName}</text>
    ${
      language
        ? `<g transform="translate(430, 260)">
      <rect width="${Math.min(360, 18 + language.length * 14)}" height="38" rx="19" fill="#1a2342" stroke="#324070" stroke-width="1.5"/>
      <text x="20" y="26" font-size="18" fill="#cbd5e1">${language}</text>
    </g>`
        : ""
    }
    <foreignObject x="430" y="${language ? 330 : 270}" width="710" height="220">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #cbd5e1; font-size: 26px; line-height: 1.4;">
        ${verdict}
      </div>
    </foreignObject>

    <!-- Footer wordmark -->
    <text x="60" y="${H - 50}" font-size="18" fill="#64748b">beko2210.github.io/astraudit</text>
    <text x="${W - 60}" y="${H - 50}" font-size="18" text-anchor="end" fill="#64748b">100‑point score · 8 categories · MIT</text>
  </g>
</svg>`;
}
