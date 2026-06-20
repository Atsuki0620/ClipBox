# archive/legacy-docs/ — 旧設計・旧実装メモ

このディレクトリは、`archive/` 直下にあった Streamlit 期の設計・実装メモ（Markdown）の集約先です。2026-06-20 の構成整理で `archive/` 直下から移動しました。

## 位置づけ

- 現行仕様の正本ではありません。当時の検討内容を追うための歴史資料です。
- 現行仕様は `docs/context/` 配下の正本（`OVERVIEW.md`・`SPEC_NEXTJS.md`・`DATA_MODEL.md`・`API_SPEC.md` 等）を参照してください。
- 日付付きファイル名はその時点の記録であり、原則として遡及修正しません。

## 収録資料の分類（Streamlit 期）

- 概要・アーキテクチャ: `AGENT_SYSTEM_OVERVIEW.md`、`ARCHITECTURE_2026-01-24.md`、`PROJECT_OVERVIEW_20260125.md`、`動画管理システム_技術仕様書.md`
- 要件・仕様: `FEATURE_REQUIREMENTS_2026-01.md`、`IMPROVEMENT_SPEC_2026-01-24.md`、`動画管理システム_要件定義書.md`
- 実装ガイド・状況: `IMPLEMENTATION_GUIDE_2026-01-24.md`、`IMPLEMENTATION_GUIDE_20260125.md`、`IMPLEMENTATION_STATUS_2026-01.md`、`DATA_MODEL_20260125.md`
- 実装・修正計画: `REFACTOR_PLAN_DETAILED_2026-01-11.md`、`REFactoring_GUIDE_20260228.md`、`SELECTION_IMPLEMENTATION.md`、`sidebar_filter_plan.md`、`リファクタリング計画書_260110.md`、`実装計画書_UI改善と機能追加_20260115.md`、`選択中カード強調表示_修正計画書_20260117.md`、`動画管理システム_分析タブ設計書_2026-01-11.md`
- レビュー・分析: `CODE_REVIEW_20260224.md`、`VIDEO_STATISTICS_ANALYSIS.md`
- 不具合・メモ: `bug_report_streamlit_blank_2026-01-11.md`、`開発メモ.md`

## 注意

- ここから現行仕様を復元する場合は、必ず `docs/context/` の正本とコードの両方で確認してください。
- 旧コード断片は `archive/legacy-code/`、旧 Streamlit UI は `archive/streamlit/` にあります。
