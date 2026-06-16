# Acceptance Run 2026-06-16

## 概要

- 確認日: 2026-06-16
- 対象ブランチ: `main`
- 対象 commit: `2f3a385`
- 対象: Next.js + FastAPI 版 ClipBox
- 方針: read-only 優先。DB やファイル名を変更し得る操作は実施せず `skipped` とした。
- Pull request #46 反映確認: README の `/watch-later`、20260616 レポート2件、`ACCEPTANCE_CRITERIA.md` の「あとで見る」「共通動画カード・状態反映」を確認済み。

## 起動確認

| 項目 | 結果 | メモ |
|---|---|---|
| Streamlit 停止確認 | pass | `localhost:8501` は応答なし。 |
| 起動方法 | pass | `run_dev.bat` を使用。 |
| 起動時バックアップ | pass | `videos_startup_20260616_233141.db` の作成ログを確認。DB内容は開いていない。 |
| Migration | pass | `migrations applied: status=skipped updated_count=0` を確認。 |
| FastAPI health | pass | `/api/health` が 200、`{"status":"ok","db_exists":true}` を返した。 |
| Next.js | pass | `/` が 200 を返した。 |
| Runtime control | not tested | 実画面での表示確認は未実施。 |
| 起動ログ警告 | note | 標準エラーに `Input redirection is not supported` が出たが、FastAPI と Next.js は起動済み。ルート `package-lock.json` 警告は確認されなかった。 |

## 受け入れ結果

| セクション | 結果 | メモ |
|---|---|---|
| 起動・基本表示 | partial | API health と Next.js ルート 200 まで確認。サイドバー遷移と実画面表示は未確認。 |
| Tier1 | not tested | 実画面操作が必要。read-only 確認結果未入力。 |
| Tier2 | not tested | 実画面操作が必要。read-only 確認結果未入力。 |
| あとで見る | not tested | 実画面操作が必要。トグル・自動解除など write 系は未実施。 |
| 共通動画カード・状態反映 | not tested | 実画面操作が必要。 |
| AVP | skipped | AVP 起動・再生対象操作は write/外部アプリ起動を伴うため未実施。 |
| 検索 | not tested | 実画面操作が必要。 |
| ランキング | not tested | 実画面操作が必要。 |
| 分析 | not tested | 実画面操作が必要。 |
| 設定 | skipped | 設定保存は write 系のため未実施。画面表示の read-only 確認結果は未入力。 |
| スキャン | skipped | DB/ファイル可用性に影響し得るため未実施。 |
| バックアップ | partial | 起動時バックアップのみ確認。手動バックアップは未実施。 |
| Runtime control | not tested | 実画面操作が必要。停止ボタンは実施せず。 |

## 不具合・リスク

| 重大度 | 内容 | 推奨対応 |
|---|---|---|
| Low | `run_dev.bat` のログ取得起動時に `Input redirection is not supported` が標準エラーへ出力された。サービス自体は起動し、health と Next.js 200 は確認済み。 | 必要なら別 Pull request で非対話起動時のログ出力を調査する。 |
| Medium | 受け入れ基準の大半は実画面の手動確認結果が未入力。 | 実機で各セクションの `pass / fail / skipped / not tested` を記録して再実行する。 |

## 品質ゲート

| コマンド | 結果 |
|---|---|
| `python -m pytest` | pass: 161 passed, 64 warnings |
| `cd frontend && npm run typecheck` | pass |
| `cd frontend && npm run lint` | pass |
| `cd frontend && npm run build` | pass |
| `git status --short -- data artifacts` | pass: 差分なし |

## Phase 5 判定

判定: `pending`

理由: 起動、バックアップ、自動テスト、frontend build は通過したが、`ACCEPTANCE_CRITERIA.md` の主要な実画面シナリオが未確認。read-only 中心の実機確認結果が揃うまで、Streamlit archive の完了判定は保留する。

## 次作業

- `ACCEPTANCE_CRITERIA.md` に沿って実画面の read-only 項目を記録する。
- write 系確認を行う場合は、事前に DB バックアップと Streamlit 停止を確認し、対象操作を明示してから実施する。
- `run_dev.bat` の非対話起動時 stderr 警告を必要に応じて別 Pull request で調査する。
