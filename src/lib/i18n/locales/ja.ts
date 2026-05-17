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
  // M4.3 slice 5a — Settings dialog
  "settings.close": "設定を閉じる",
  "settings.title": "GitHub アクセス設定",
  "settings.subtitle": "任意 · ブラウザ内のみに保存",
  "settings.tokenActive": "現在このブラウザでトークンが有効です。",
  "settings.tokenStoredAs": "保存形式",
  "settings.tokenSavedAt": "保存日時",
  "settings.tokenNone":
    "トークン未保存 — 公開レート制限 (60リクエスト/時) を使用中。",
  "settings.tokenBenefit":
    "読み取り専用トークンを追加すると、このブラウザでのレートが 5,000 リクエスト/時 に上がります。",
  "settings.rateLimitTitle": "GitHub レート制限のライブ状態",
  "settings.checking": "確認中",
  "settings.recheck": "再確認",
  "settings.modeLabel": "モード",
  "settings.modeAuth": "認証",
  "settings.modePublic": "公開",
  "settings.remainingLabel": "残り",
  "settings.resetsLabel": "リセットまで",
  "settings.resetsValueMin": "分",
  "settings.probing": "確認中…",
  "settings.probeError": "確認のため GitHub に到達できませんでした。",
  "settings.formLabel": "読み取り専用の GitHub PAT を貼り付け",
  "settings.formPlaceholder": "ghp_… または github_pat_…",
  "settings.tokenHide": "トークンを隠す",
  "settings.tokenReveal": "トークンを表示",
  "settings.save": "保存",
  "settings.errorEmpty": "先にトークンを貼り付けてください。",
  "settings.toastSaved": "GitHub トークンを保存しました",
  "settings.toastRemoved": "GitHub トークンを削除しました",
  "settings.toastCacheCleared": "監査キャッシュをクリアしました",
  "settings.scopeHint":
    "Astraudit は public_repo の読み取り権限のみを必要とします — 最小限のスコープを付与してください。",
  "settings.createToken": "Fine‑grained トークンを作成",
  "settings.privacyNote":
    "トークンはこのブラウザから出ません。api.github.com と raw.githubusercontent.com への Authorization ヘッダーとしてのみ送信されます。Astraudit には受信できるバックエンドはありません。",
  "settings.removeToken": "トークンを削除",
  "settings.densityHeading": "表示密度",
  "settings.densityHint":
    "Compact はカードのパディングを約20%詰め、本文を少し小さくします。クリック領域はフルサイズのままです。",
  "settings.densityComfortable": "標準",
  "settings.densityComfortableHint": "元の余白。",
  "settings.densityCompact": "コンパクト",
  "settings.densityCompactHint": "カードを詰めて文字を小さく。",
  "settings.cacheHeading": "監査キャッシュ",
  "settings.cacheClear": "クリア",
  "settings.cacheCount": "件の監査をキャッシュ",
  "settings.cacheTtl": "TTL 24時間",
  "settings.cacheMore": "件",
  "settings.cacheEmpty":
    "まだキャッシュされた監査はありません。24時間以内に同じ監査を再実行すると、すべての GitHub API 呼び出しがスキップされます — 公開の 60リクエスト/時 の制限を使用している場合に便利です。",
  "settings.timeJustNow": "たった今",
  "settings.timeMinAgo": "分前",
  "settings.timeHourAgo": "時間前",
  "settings.timeDayAgo": "日前",
  // M4.3 slice 5b — Shortcuts dialog
  "shortcuts.close": "閉じる",
  "shortcuts.title": "キーボードショートカット",
  "shortcuts.subtitle":
    "2キーの連続入力 (\"g s\") は約1秒以内に両方押してください。",
  "shortcuts.openPalette": "コマンドパレットを開く",
  "shortcuts.openPaletteWinLinux":
    "コマンドパレットを開く (Windows / Linux)",
  "shortcuts.focusInput": "リポジトリ入力欄にフォーカス",
  "shortcuts.showSheet": "このチートシートを表示",
  "shortcuts.closeDialog": "アクティブなダイアログを閉じる",
  "shortcuts.jumpOverview": "概要へジャンプ",
  "shortcuts.jumpScore": "スコアへジャンプ",
  "shortcuts.jumpStory": "ストーリーへジャンプ",
  "shortcuts.jumpReadme": "README へジャンプ",
  "shortcuts.jumpInsights": "インサイトへジャンプ",
  "shortcuts.jumpGraph": "グラフへジャンプ",
  "shortcuts.jumpFindings": "検出へジャンプ",
  "shortcuts.jumpStructure": "構造へジャンプ (コード)",
  "shortcuts.jumpStack": "スタックへジャンプ",
  "shortcuts.jumpMaintenance": "メンテナンスへジャンプ",
  "shortcuts.jumpOnboarding": "オンボーディングへジャンプ (ビルド)",
  "shortcuts.jumpNext": "次のステップへジャンプ",
  // M4.3 slice 5b — History dialog
  "history.close": "閉じる",
  "history.title": "監査履歴",
  "history.subtitle":
    "ローカルに保存 · ブラウザデータを消去すると削除されます。",
  "history.tabFavorites": "お気に入り",
  "history.tabRecent": "最近",
  "history.clearAll": "すべてクリア",
  "history.emptyFavorites":
    "まだお気に入りはありません。このリストから監査にスターを付けると上部に固定されます。",
  "history.emptyRecent":
    "まだ監査はありません — 実行履歴はここに表示されます。",
  "history.favorite": "お気に入り",
  "history.unfavorite": "お気に入り解除",
  "history.remove": "履歴から削除",
  "history.toastCleared": "監査履歴をクリアしました",
  // M4.3 slice 5c — Compare dialog
  "compare.close": "閉じる",
  "compare.title": "比較",
  "compare.leftLabelSuffix": "が左側になります。",
  "compare.formLabel": "右側のリポジトリ",
  "compare.placeholder": "owner/repo または完全な GitHub URL",
  "compare.submit": "比較を実行",
  "compare.examplesLabel": "または例を選択",
  "compare.footnote":
    "両方の監査が並行して実行されます。キャッシュの結果はどちらの側にも再利用されます。",
  // M4.3 slice 5c — Badge dialog
  "badge.close": "閉じる",
  "badge.title": "Astraudit バッジ",
  "badge.subtitle":
    "SVG をダウンロードし、README の横にコミットして埋め込みます。Astraudit にはバックエンドがありません — 値は保存するファイルに焼き込まれます。",
  "badge.styleFlat": "フラット",
  "badge.styleFlatHint": "shields.io 風",
  "badge.styleAurora": "オーロラ",
  "badge.styleAuroraHint": "Astraudit ブランド",
  "badge.styleMinimal": "ミニマル",
  "badge.styleMinimalHint": "スコアのみのチップ",
  "badge.download": "ダウンロード",
  "badge.copySvg": "SVG ソースをコピー",
  "badge.markdownHeading": "Markdown スニペット",
  "badge.markdownHint":
    "README に貼り付けると、このリポジトリの最新 Astraudit 実行へのリンクが付きます。",
  "badge.copyMarkdown": "Markdown をコピー",
  "badge.footnote":
    "バッジの値はダウンロード時点で焼き込まれます。新しいスコアを公開したいときは再エクスポートしてください。",
  "badge.toastSaved": "バッジを保存しました",
  "badge.toastError": "バッジを保存できませんでした",
  // M4.3 slice 5c — Command palette
  "palette.regionLabel": "コマンドパレット",
  "palette.searchAria": "コマンドパレット検索",
  "palette.placeholder":
    "コマンドを入力、セクションへジャンプ、例を実行…",
  "palette.emptyPrefix": "該当するコマンドはありません",
  "palette.navigateHint": "移動",
  "palette.selectHint": "選択",
  "palette.shortcutsHint": "ショートカット",
  "palette.groupNavigate": "セクションへジャンプ",
  "palette.groupActions": "アクション",
  "palette.groupTheme": "テーマ",
  "palette.groupHistory": "履歴から",
  "palette.groupExamples": "例を監査",
  // M4.3 slice 6a — Panel headings + small components
  "panel.auditGraph": "監査グラフ",
  "panel.signals": "シグナル詳細",
  "panel.signalsSubtitle": "重要な8つのシグナル",
  "panel.repoStory": "リポジトリストーリー",
  "panel.repoStorySubtitle":
    "公開メタデータ・ファイル・構造から生成。AI による推論なし。",
  "panel.insights": "リポジトリインサイト",
  "panel.scoreBreakdown": "スコア内訳",
  "panel.registry": "レジストリシグナル",
  "panel.maintenance": "メンテナンス",
  "panel.dependencies": "依存関係とスタック",
  "footer.builtWith":
    "Vite、React、および GitHub の公開 API で構築。",
  "examples.tryKnown": "既知の公開リポジトリを試す",
  "input.repoAria": "GitHub リポジトリ URL",
  "input.repoPlaceholder": "GitHub リポジトリの URL または owner/repo を貼り付けてください…",
  "graph.filterAria": "監査グラフをステータスで絞り込み",
  "graph.loadingAria": "監査グラフを読み込み中",
  "registry.aria": "公開レジストリの検索",
  "export.formatAria": "エクスポート形式",
  "sticky.summaryAria": "監査サマリー",
  "sticky.badgeAria": "バッジを生成",
  "heatmap.less": "少ない",
  "heatmap.more": "多い",
  "recommendations.emptyTitle": "推奨される次のステップはありません",
  "recommendations.emptyBody":
    "Astraudit のルールベース検出器は優先すべき改善項目を見つけませんでした。これは追跡しているすべてのシグナルがすでに強いと監査が判断した稀なケースです — より細かい項目については Findings パネルをご確認ください。",
  "recommendations.copyAll": "すべてのステップをコピー",
  "recommendations.subtitle":
    "影響度順に並べた7つの優先改善項目。",
  "overview.archivedPill": "アーカイブ済み",
  "overview.forkPill": "フォーク",
  "overview.templatePill": "テンプレート",
  "overview.copyUrl": "GitHub URL をコピー",
  "overview.copyOwnerRepo": "owner/repo をコピー",
  "overview.openOnGithub": "GitHub で開く",
  "overview.noDescription": "説明はありません。",
  "overview.licenseNone": "なし",
  "stackmates.close": "閉じる",
  "compareDashboard.copySummary": "サマリーをコピー",
  "compareDashboard.shared": "共通",
  // M4.3 slice 6b — OverviewHeader stat cards
  "overview.statStars": "スター",
  "overview.statForks": "フォーク",
  "overview.statWatchers": "ウォッチャー",
  "overview.statOpenIssues": "オープン Issue",
  "overview.statLanguage": "言語",
  "overview.statLicense": "ライセンス",
  "overview.statDefaultBranch": "デフォルトブランチ",
  "overview.statLastPush": "最終プッシュ",
  "overview.statCreated": "作成日",
  "overview.statHomepage": "ホームページ",
  // M4.3 slice 6b — InsightsPanel
  "insights.projectAge": "プロジェクト年齢",
  "insights.starMomentum": "スターの勢い",
  "insights.pushFreshness": "プッシュの新しさ",
  "insights.commitCadence": "コミット頻度",
  "insights.recentAuthors": "最近の作者",
  "insights.releaseRhythm": "リリースリズム",
  "insights.openQueue": "オープンキュー",
  "insights.languageMix": "言語構成",
  "insights.fileTreeShape": "ファイルツリーの形",
  "insights.ciProfile": "CI/CD プロファイル",
  "insights.dependabotCoverage": "Dependabot カバレッジ",
  "insights.codeOwnership": "コードオーナーシップ",
  "insights.securityPolicy": "セキュリティポリシー",
  "insights.runtimeContract": "ランタイム契約",
  "insights.changelogCadence": "CHANGELOG 頻度",
  "insights.trustSignalScore": "信頼シグナルスコア",
  "insights.readmeFootprint": "README 規模",
  "insights.lastRelease": "最終リリース",
  "insights.topFileTypes": "主要ファイルタイプ",
  "insights.topicSignals": "トピックシグナル",
  "insights.aiAgentTooling": "AI / エージェントツーリング",
  "insights.toolchainPinning": "ツールチェーン固定",
  "insights.supplyChainTransparency": "サプライチェーン透明性",
  // M4.3 slice 6b — MaintenancePanel
  "maintenance.cardLastPush": "最終プッシュ",
  "maintenance.cardReleases": "リリース",
  "maintenance.cardOpenIssues": "オープン Issue",
  "maintenance.headingRecentCommits": "最近のコミット",
  "maintenance.copyCommitSha": "コミット SHA をコピー",
  "maintenance.copyTag": "タグをコピー",
  // M4.3 slice 6b — DependencyPanel
  "deps.fieldPrimaryLang": "主要言語",
  "deps.fieldRuntime": "ランタイム",
  "deps.fieldPackageManager": "パッケージマネージャー",
  "deps.fieldLockfile": "ロックファイル",
  "deps.fieldFrameworks": "フレームワーク",
  "deps.fieldBuildTools": "ビルドツール",
  "deps.fieldTestTools": "テストツール",
  "deps.fieldToolchainManagers": "ツールチェーンマネージャー",
  "deps.fieldPythonEcosystem": "Python エコシステム",
  "deps.fieldSbom": "ソフトウェア部品表 (SBOM)",
  "deps.fieldLintFormat": "Lint/フォーマットツール",
  "deps.fieldAiAgentTooling": "AI / エージェントツーリング",
  "deps.headingLanguageMix": "言語構成",
  "deps.notDetected": "未検出",
  // M4.3 slice 6b — FileStructurePanel
  "fileTree.heading": "ファイル構造インテリジェンス",
  "fileTree.filesMappedSuffix": "ファイルをマッピング",
  "fileTree.rootFilesSuffix": "ルートファイル",
  "fileTree.importantPresent": "存在する重要ファイル",
  "fileTree.notableMissing": "注目すべき欠落ファイル",
  "fileTree.recognizedFolders": "認識されたフォルダ",
  "fileTree.suspiciousFiles": "疑わしいファイル名（ファイル名一致のみ）",
  "fileTree.suspiciousFooter":
    "ファイル名一致のみです。Astraudit はシークレット検出のためにファイル内容を読み取りません。",
  "fileTree.treeTruncated": "GitHub によりツリーが切り詰められました",
  "fileTree.noneDetected": "未検出。",
  // M4.3 slice 6b — CompareDashboard
  "compareDashboard.perCategoryScore": "カテゴリ別スコア",
  "compareDashboard.findingsDiff": "検出の差分",
  "compareDashboard.stackDiff": "スタックの差分",
  "compareDashboard.quickVerdict": "簡易判定",
  "compareDashboard.onlyInLeft": "左のみ",
  "compareDashboard.onlyInRight": "右のみ",
  "compareDashboard.noneShort": "なし。",
  // M4.3 slice 6b — TopicChecks panel
  "topicChecks.aria": "トピックに基づくコンテキストチェック",
  "topicChecks.emptyTitle": "まだトピックの整合がありません",
  "topicChecks.emptyDescription":
    "リポジトリの GitHub About 設定にいくつかのトピックを追加してください（例: react, cli, typescript）。その後 Astraudit はトピックを実際のシグナル（README、ロックファイル、テスト、CI、ライセンス）と照合し、ギャップをここに表示します。",
  "topicChecks.heading": "トピックの整合",
  "topicChecks.metSuffix": "達成",
  "topicChecks.partialSuffix": "部分的",
  "topicChecks.missingSuffix": "未達",
  "topicChecks.intro":
    "各ルールはリポジトリの GitHub トピックから発火し、そのトピックが慣例的に示す契約を検証します（例: cli → bin エントリを期待）。",
  "topicChecks.hintLabel": "ヒント:",
  // M4.3 slice 6b — ReadmePreview
  "panel.readmePreview": "README プレビュー",
  "readmePreview.noReadme": "このリポジトリには README ファイルがありません。",
  "readmePreview.noReadmeHint":
    "README は多くの訪問者が最初に読むものです。追加することは通常、もっとも効果的なドキュメント改善です。",
  "readmePreview.showLess": "折りたたむ",
  "readmePreview.showMore": "もっと見る",
  "readmePreview.viewFullReadme": "README 全文を見る",
  "readmePreview.renderedSafelyPrefix":
    "安全にレンダリング · Markdown + 許可された HTML のみ · スクリプト、スタイル、イベントハンドラは除去されます。相対リンクは次に解決されます: ",
  // M4.3 slice 6b — App errors + skeleton labels
  "app.tryDifferentRepo": "別のリポジトリを試す",
  "app.invalidInput": "無効な入力です。",
  "app.workerNotReady": "ワーカーが準備できていません",
  "app.pickDifferent": "比較する2つの異なるリポジトリを選択してください。",
  "app.runSingleFirst":
    "先に単一リポジトリの監査を実行してから、比較対象のリポジトリを選んでください。",
  "app.compareFailed": "比較に失敗しました",
  "app.auditFailed": "監査に失敗しました",
  "app.workerNotReadyMsg":
    "このブラウザでは監査ワーカーが利用できません。ページを再読み込みするか、別のブラウザ（最新版の Chromium / Firefox / Safari）をお試しください。",
  "app.workerNotReadyCompareMsg":
    "このブラウザでは監査ワーカーが利用できません。ページを再読み込みするか、別のブラウザをお試しください。",
  "app.retry": "再試行",
  "skeleton.loadingRuleBook": "ルールブックを読み込み中",
  "skeleton.loadingScope": "スコープページを読み込み中",
  "skeleton.loadingBookmarklet": "ブックマークレットページを読み込み中",
  "skeleton.loadingCompare": "比較ダッシュボードを読み込み中",
  "skeleton.loadingLeaderboard": "リーダーボードを読み込み中",
  // M5.1 — オプトイン Rule Pack
  "rulePacks.activeLabel": "有効な Rule Pack",
  "rulePacks.a11y.label": "アクセシビリティ",
  "rulePacks.a11y.description":
    "README の alt テキスト、axe で検査可能な例、ドキュメント済みスニペット内の ARIA ヒント。",
  "rulePacks.i18n.label": "国際化",
  "rulePacks.i18n.description":
    "ロケールファイルの存在、英語のみではない README、翻訳ツーリングのシグナル。",
  "rulePacks.ts.label": "TypeScript 厳格度",
  "rulePacks.ts.description":
    "strict: true、noImplicitAny、noUncheckedIndexedAccess — tsconfig を基に測定。",
  "rulePacks.monorepo.label": "モノレポの健全性",
  "rulePacks.monorepo.description":
    "ワークスペース宣言、依存バージョンの一貫性、Turborepo / nx のシグナル。",
  // M5.5 — 設定: Rule Pack の切替
  "settings.rulePacksHeading": "Rule Pack",
  "settings.rulePacksHint":
    "オプトイン検出ファミリ。URL フラグ（?rules=…）が常に正の情報源で、監査の共有性が保たれます。",
  "settings.rulePacksReauditToast":
    "Rule Pack を更新しました。適用するには監査を再実行してください。",
  // M6.3 — リーダーボード
  "leaderboard.heading": "トップリポジトリ・リーダーボード",
  "leaderboard.intro":
    "言語とトピックでフィルタを設定し、バッチ監査をキューします。結果は Astraudit スコア順にソートされます。シングルフライト + レート制限対応 — 公開 GitHub PAT で安全に実行できます。",
  "leaderboard.filterLanguage": "言語",
  "leaderboard.filterLanguagePlaceholder": "例: typescript",
  "leaderboard.filterTopic": "トピック",
  "leaderboard.filterTopicPlaceholder": "例: cli",
  "leaderboard.filterMinStars": "最低スター数",
  "leaderboard.filterLimit": "件数",
  "leaderboard.start": "リーダーボードを実行",
  "leaderboard.cancel": "キャンセル",
  "leaderboard.reset": "リセット",
  "leaderboard.preflightLow":
    "このバッチにはレート制限が不足しています。設定で GitHub PAT を追加するか件数を減らしてください。",
  "leaderboard.rateLimitHit":
    "バッチ実行中に GitHub レート制限に達しました。部分的な結果を表示します。リセット後に再開できます。",
  "leaderboard.tableRank": "順位",
  "leaderboard.tableRepo": "リポジトリ",
  "leaderboard.tableScore": "スコア",
  "leaderboard.tableGrade": "評価",
  "leaderboard.tableStars": "スター",
  "leaderboard.tableLastPushed": "最終プッシュ",
  "leaderboard.tableActions": "アクション",
  "leaderboard.openAudit": "監査を開く",
  "leaderboard.progressLabel": "監査中",
  "leaderboard.progressDone": "完了",
  "leaderboard.emptyHint":
    "上のフィルタを設定し「リーダーボードを実行」を押してください。",
  "leaderboard.errorRow": "監査に失敗しました",
  "leaderboard.snapshotLabel": "キャッシュされたスナップショットを表示中（",
  // M6.5 — トレンドピル
  "leaderboard.tableTrend": "推移",
  "leaderboard.trendNew": "新規",
  "leaderboard.trendDropped": "離脱",
  // M7.1.2 — リポジトリをウォッチ
  "sticky.watch": "ウォッチ",
  "sticky.watching": "ウォッチ中",
  "sticky.watchAria": "このリポジトリの変更をウォッチ",
  "sticky.unwatchAria": "このリポジトリのウォッチを停止",
  "sticky.watchAdded": "リポジトリをウォッチリストに追加しました。",
  "sticky.watchRemoved": "リポジトリをウォッチリストから削除しました。",
  "header.openWatched": "ウォッチ中のリポジトリを開く",
  "watched.title": "ウォッチ中",
  "watched.subtitle":
    "変更を追跡するためにマークしたリポジトリ。ローカル保存・テレメトリなし。",
  "watched.empty":
    "ウォッチ中のリポジトリはまだありません。監査のスティッキーバーで「ウォッチ」を押すと追跡を開始できます。",
  "watched.close": "ウォッチ中のリポジトリを閉じる",
  "watched.unwatch": "停止",
  "watched.scoreLabel": "スコア",
  "watched.gradeLabel": "評価",
  "watched.findingsLabel": "検出数",
  "watched.lastCheckedPrefix": "最終チェック",
  "watched.neverChecked": "未チェック",
  "watched.intervalPrefix": "チェック間隔",
};

export default JA;
