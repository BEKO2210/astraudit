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
  // M4.3 slice 2 — hero marketing copy
  "hero.h1.prefix": "この",
  "hero.h1.brand": " public GitHub ",
  "hero.h1.suffix": "リポジトリを信頼すべきか？30秒で答えがわかります。",
  "hero.lead.prefix": "URL を貼り付け。",
  "hero.lead.bold": "100点満点のレディネススコア",
  "hero.lead.suffix":
    "、重要な8つのシグナル、メンテナが最初に着手する修正項目を取得 — フォーク・依存追加・コントリビュートの前に。ログインなし、バックエンドなし、AI による推測なし。",
  // M4.3 slice 2 — empty-state feature grid
  "empty.heading": "監査で得られる内容",
  "empty.feature1.title": "リポジトリストーリー",
  "empty.feature1.body":
    "公開ファイルとメタデータのみから導いた、リポジトリが何であるかの事実ベースの要約です。",
  "empty.feature2.title": "構造監査",
  "empty.feature2.body":
    "ディレクトリ・設定・テストをマッピングし、ドキュメント・品質・構造をスコア化します。",
  "empty.feature3.title": "信頼シグナル",
  "empty.feature3.body":
    "ライセンス・セキュリティポリシー・依存関係衛生・CI/CD の有無を、コードを一切実行せずに検査します。",
  "empty.feature4.title": "優先度付き修正項目",
  "empty.feature4.body":
    "セキュリティ・品質・開発者体験への影響度で並べた、具体的な7つの次のステップ。",
  // M4.3 slice 2 — onboarding panel
  "onboarding.heading": "このリポジトリの実際の使い方",
  "onboarding.subtitle":
    "ファイルツリー・ロックファイル・検出されたスクリプトから推測した手順です。Astraudit はこれらを実行しません。あくまでガイダンスです。",
  "onboarding.emptyTitle": "自動化されたオンボーディング手順は検出されませんでした",
  "onboarding.emptyDescription":
    "Astraudit はセットアップ手順を生成できる package マニフェスト・ロックファイル・実行スクリプトの組み合わせを認識できませんでした。プロジェクトの README をご確認ください — そこに記載されたインストール手順が信頼できるパスです。",
  "onboarding.pillOptional": "任意",
  "onboarding.pillRecommended": "推奨",
  "onboarding.copyCommand": "コマンドをコピー",
  // M4.3 slice 3 — ReviewDashboard verdict header
  "dashboard.verdictBadge": "Astraudit の判定",
  "dashboard.actions.similar": "類似リポジトリ",
  "dashboard.actions.compare": "比較する…",
  "dashboard.actions.compareDisabledTip":
    "比較を有効にするには別の監査を実行してください",
  "dashboard.actions.reaudit": "再監査",
  "dashboard.actions.reauditTitle":
    "キャッシュされたバンドルを破棄して GitHub から再取得します。デプロイ後やダッシュボードが古いスコアを表示している場合に便利です。",
  "dashboard.actions.simpleMode": "シンプルモード",
  "dashboard.actions.simpleModeTitle":
    "簡略化された表示: スコア、平易な言葉での判定、上位3つの強みと弱点。",
  "dashboard.actions.badge": "バッジ",
  "dashboard.actions.copyVerdict": "判定をコピー",
  "dashboard.meta.generated": "生成日時",
  "dashboard.meta.findingsLabel": "検出",
  "dashboard.meta.recommendationsLabel": "推奨される次のステップ",
  "dashboard.fab.share": "共有",
  "dashboard.fab.print": "PDF として保存",
  "dashboard.fab.compare": "比較",
  "toast.share.copied": "リンクをクリップボードにコピーしました",
  "toast.share.error": "共有リンクをコピーできませんでした",
  "toast.share.errorDetail": "完全な URL はアドレスバーに表示されています。",
  // M4.3 slice 4 — findings panel + card + toast region
  "panel.findings.title": "検出",
  "panel.findings.empty": "現在のフィルタに一致する検出はありません。",
  "severity.all": "すべての重要度",
  "severity.critical": "重大",
  "severity.high": "高",
  "severity.medium": "中",
  "severity.low": "低",
  "severity.info": "情報",
  "category.all": "すべてのカテゴリ",
  "category.security": "セキュリティ",
  "category.documentation": "ドキュメント",
  "category.quality": "品質",
  "category.ci": "CI/CD",
  "category.structure": "構造",
  "category.ecosystem": "エコシステム",
  "category.maintenance": "メンテナンス",
  "category.dx": "DX",
  "finding.confidenceLabel": "信頼度",
  "finding.evidenceLabel": "根拠",
  "finding.recommendationLabel": "推奨対応",
  "finding.copyDeepLink": "この検出へのリンクをコピー",
  "finding.copyPath": "パスをコピー",
  "finding.copyAllPaths": "すべてのパスをコピー",
  "toast.regionLabel": "通知",
  "toast.dismiss": "通知を閉じる",
};

export default JA;
