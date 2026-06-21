# Ranking APP_PLAYBACK Post-Merge Smoke 2026-06-21

> 本書は現行仕様の正本ではなく、**2026-06-21 時点の確認の記録**です。現行仕様は `docs/context/`（入口 `OVERVIEW.md`、台帳 `AGENTS.md`）を参照してください。原則として遡及修正しません。

## 目的

Pull request #60〜#64 で完了したランキング公平化（視聴集計の `APP_PLAYBACK` 統一・旧視聴履歴 purge スクリプト追加・レビュー指摘対応）について、**ユーザーが実データ環境で実施したスモーク確認の完了**を、公開可能な記録として残す。実装・UI・API・DB・migration・ランキング式は変更しない（本書の追加自体が docs-only）。

## 対象 Pull request

- Pull request #60 — 視聴集計を `APP_PLAYBACK` に統一し、旧履歴 purge スクリプトを追加。
- Pull request #61 — ランキングの表示範囲を「再生可能だけ / 全動画」の Select として明示化。
- Pull request #62 — ランキング基準の意思決定サマリーを確定（`docs/analysis/ranking_basis_decision_summary.md`）。
- Pull request #63 — Pull request #60〜#62 のレビュー指摘を反映。
- Pull request #64 — ランキング同点テストの補強と Tooltip のアクセシビリティ対応。

## ユーザー確認済み事項

- 実データでランキング公平化後のスモーク確認を**ユーザーが実施し、完了**した。
- 旧視聴履歴 purge は **dry-run のみ確認**した。
- purge の `--execute` は**未実行**（旧 `FILE_ACCESS_DETECTED` / `MANUAL_ENTRY` の物理削除はしていない）。

## 確認した観点

下記の各観点について、ユーザー確認で**異常の報告はなかった**。本書は方針上、動画名・パス・件数・順位などの**詳細ログは記録しない**（個人情報・実データを残さないため）。具体的な確認結果の数値は本書では扱わない。

- カードの視聴回数・最終再生の表示。
- 一覧の視聴回数ソート・最終再生ソート。
- ランキング4種（総合 / 視聴回数 / 視聴日数 / いいね）。
- ランキングの表示範囲 Select「再生可能だけ / 全動画」の切り替え。
- 分析画面（累計・期間集計・各ランキング・各種分布チャート）。
- あとで見るの分類・表示。
- 運命の一本に関わる視聴履歴系の挙動。
- 旧視聴履歴 purge の dry-run（method 別件数と `integrity_check` の確認まで。`--execute` はしていない）。

## 書かないこと

本書には次を一切記載しない。

- 動画名・ファイル名・フルパス。
- 出演者名。
- 生 timestamp。
- DB の具体的な行データ・件数・順位。
- その他の個人情報。

## 結論

- ランキング公平化は**実データでのスモーク確認まで完了**している。
- 旧履歴の物理削除（purge `--execute`）は**未実施**であり、**当面必須ではない**。集計は `APP_PLAYBACK` のみを参照するため、旧 method を物理削除しなくても現行のランキング・集計挙動には影響しない。
- 次の推奨レーンは **UI 改修**。

## 残す判断

- purge `--execute` は、必要になった時だけ**別 Pull request または運用手順**として扱う。実行時はサービス停止・DB/CSV バックアップ・確認文字列（`PURGE_LEGACY_VIEWING_HISTORY`）を前提とする（受け入れ基準は `docs/context/ACCEPTANCE_CRITERIA.md` の「旧視聴履歴 purge」節）。
- UI 改修は、本セッションの作業とは分離し、**別ブランチ / git worktree** で進める。

## 参照

- `../analysis/ranking_basis_decision_summary.md` — ランキング基準の意思決定サマリー（APP_PLAYBACK 採用・安全な手動 purge・表示範囲 Select の根拠）。
- `../context/ACCEPTANCE_CRITERIA.md` — 「旧視聴履歴 purge（保守作業）」節（purge 実行時の受け入れ基準）。
