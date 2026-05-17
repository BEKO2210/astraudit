/**
 * Japanese catalog — Roadmap M4.2 (framework slice).
 *
 * Strings here are first‑pass agent‑drafted Japanese. M4.3 routes
 * this file to a native‑speaker reviewer via PR; nothing here ships
 * to a public locale URL until that pass clears.
 *
 * Conventions used until M4.3 review:
 *   - Hiragana/katakana for native nouns + verbs, ASCII for
 *     project nomenclature ("GitHub", "Astraudit").
 *   - Ja‑style punctuation (・、。) for body strings, ASCII
 *     punctuation for menu / button labels.
 *   - Half‑width Latin digits.
 */

import type { Catalog } from "../types";

const JA: Catalog = {
  "cta.audit": "監査する",
  "cta.compare": "比較する…",
  "cta.similarRepos": "類似リポジトリ",
  "cta.close": "閉じる",
  "cta.openFullAudit": "詳細な監査を開く →",
  "dialog.similarRepos.title": "類似リポジトリ",
  "dialog.similarRepos.subtitle":
    "同じ言語・重複するトピック・近い規模のスタックメイトを表示します。",
  "dialog.similarRepos.loading": "GitHub で検索中…",
  "dialog.similarRepos.empty":
    "現在の条件で類似リポジトリは見つかりませんでした。トピックが宣言され主要言語が明確なリポジトリで最も良い結果が得られます。",
  "switcher.language": "言語",
};

export default JA;
