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
  // M4.3 slice 1 — Hero / header chrome
  "header.brandSubtitle": "リポジトリ分析",
  "header.homeAria": "Astraudit ホーム",
  "header.openHistory": "監査履歴を開く",
  "header.auth": "認証済み · 5,000/時",
  "header.authShort": "認証済み",
  "header.settings": "設定 · 公開 60/時",
  "header.settingsShort": "設定",
  "header.authTitle": "認証済み GitHub PAT が有効です",
  "header.publicRateTitle":
    "GitHub の公開レート制限を使用中 (1時間あたり60リクエスト)",
  "header.pillBrowserOnly": "ブラウザのみ · コード実行なし",
  "header.pillStatic": "静的解析のみ",
  "header.pillPublic": "公開リポジトリのみ",
  "header.pillPatActive": "ローカル PAT · ブラウザに保存",
  "header.pillPatOptional": "任意の PAT · ローカル保存のみ",
  "header.pillAiMcp": "AI 対応 · MCP",
  "header.pillAiMcpTitle":
    "Astraudit は MCP サーバーを同梱しており、AI クライアント (Claude Desktop, Cursor, Zed, VS Code) からネイティブツールとして監査を実行できます。クリックで手順を表示。",
};

export default JA;
