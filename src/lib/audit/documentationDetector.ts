import type { ImportantFile } from "../../types/github";

export interface ReadmeSignals {
  exists: boolean;
  length: number;
  mentionsInstall: boolean;
  mentionsUsage: boolean;
  mentionsApi: boolean;
  mentionsExamples: boolean;
  mentionsScreenshot: boolean;
  hasBadges: boolean;
  hasHeadings: boolean;
}

const INSTALL_PATTERNS = [
  /\binstall(ation)?\b/i,
  /\bsetup\b/i,
  /\bgetting started\b/i,
  /\bquick(start| start)\b/i,
];
const USAGE_PATTERNS = [/\busage\b/i, /\bhow to use\b/i, /\bexample\b/i];
const API_PATTERNS = [/\bapi\b/i, /\bcli\b/i, /\boptions\b/i];
const EXAMPLE_PATTERNS = [/\bexample\b/i, /\bdemo\b/i, /\bsample\b/i];
const SCREENSHOT_PATTERNS = [/\bscreenshot\b/i, /\bdemo\b/i, /!\[/];

export function analyzeReadme(readme: ImportantFile | null): ReadmeSignals {
  if (!readme || !readme.content) {
    return {
      exists: !!readme,
      length: readme?.size ?? 0,
      mentionsInstall: false,
      mentionsUsage: false,
      mentionsApi: false,
      mentionsExamples: false,
      mentionsScreenshot: false,
      hasBadges: false,
      hasHeadings: false,
    };
  }

  const content = readme.content;
  const length = content.length;
  return {
    exists: true,
    length,
    mentionsInstall: INSTALL_PATTERNS.some((re) => re.test(content)),
    mentionsUsage: USAGE_PATTERNS.some((re) => re.test(content)),
    mentionsApi: API_PATTERNS.some((re) => re.test(content)),
    mentionsExamples: EXAMPLE_PATTERNS.some((re) => re.test(content)),
    mentionsScreenshot: SCREENSHOT_PATTERNS.some((re) => re.test(content)),
    hasBadges: /\[!\[/.test(content) || /img.shields.io/.test(content),
    hasHeadings: /^#{1,3} /m.test(content),
  };
}
