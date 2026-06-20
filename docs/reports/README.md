# docs/reports/ — 診断・レビュー・作業記録の読み方

このディレクトリは、日付付きの診断・レビュー・作業記録（レポート）を置く場所です。

## 位置づけ

- **現行仕様の正本ではありません。** 現行仕様は `docs/context/` を参照してください（入口は `OVERVIEW.md`、台帳は `AGENTS.md`）。
- 各レポートは**その時点の記録**です。原則として遡及修正しません。後続の判断で内容が変わった場合は、古いレポートを書き換えず、新しいレポートまたは `CHANGELOG.md` で更新します。
- 実データ・個人情報・動画名・ローカルパスは記載しません。

## 分類

| 分類 | 内容 | 例 |
|---|---|---|
| acceptance | 手動受け入れ・write 確認の実行記録 | `ACCEPTANCE_RUN_*.md` |
| repo / root cleanup | リポジトリ構成・ルート整理の棚卸し / 計画 / 完了サマリ | `REPO_ROOT_INVENTORY_*.md`、`REPO_ROOT_CLEANUP_PLAN_*.md`、`REPO_ROOT_CLEANUP_SUMMARY_*.md` |
| archive | archive 整理・参照監査・移動判断 | `ARCHIVE_LEGACY_CODE_DECISION_*.md`、`ARCHIVE_REFERENCE_AUDIT_*.md`、`PHASE5_STREAMLIT_ARCHIVE_PREP_*.md` |
| review / refactor | コードレビュー・リファクタ診断 / ガイド | `CODE_REVIEW_*.md`、`REFACTOR_DIAGNOSIS_*.md`、`REFactoring_GUIDE_*.md` |
| feature | 機能実装の記録 | `SELECTION_IMPLEMENTATION_*.md` |

> 分析（ランキング公平化など）の資料は `docs/analysis/` 配下にあります（本ディレクトリではありません）。

## 命名規則

- `<TOPIC>_<YYYYMMDD>.md`（例: `REPO_ROOT_CLEANUP_SUMMARY_20260620.md`）。
- TOPIC は分類が分かる英大文字スネークケース。日付は実施日。
- 同テーマの続きは、原則として新しい日付の新規ファイルにする。既存レポートに「実施結果」を追記する場合は、追記であることと日付を明記する。

## 主要レポートへの入口

- 構成整理の完了サマリ: `REPO_ROOT_CLEANUP_SUMMARY_20260620.md`
- archive 移動の判断と実施記録: `ARCHIVE_LEGACY_CODE_DECISION_20260619.md`
- Streamlit archive 準備: `PHASE5_STREAMLIT_ARCHIVE_PREP_20260616.md`
- 受け入れ実行記録: `ACCEPTANCE_RUN_20260616.md`
