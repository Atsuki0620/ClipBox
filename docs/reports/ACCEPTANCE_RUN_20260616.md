# Acceptance Run 2026-06-16

## 2026-06-17 追記 - write-enabled acceptance rerun

- 対象 commit: この追記を含む最終 commit（SHA は完了報告に記載）
- 対象ブランチ: `main`
- 方針: Streamlit を write 検証対象から外し、FastAPI + Next.js の write 操作を実データで確認。検証後はリネーム済み実ファイルを元名へ戻し、DB をテスト前スナップショットで丸ごと復元。
- Public API / schema / DB 永続先の変更: なし。
- Pull request: 作成しない。

### 修正内容

- ランダム/運命など一覧 query を再取得しないカードで、レベル判定・未選別戻し・いいね後に `GET /api/videos/{id}` でカード単体の動画情報を再取得するように変更。
- カード表示に使う DB 由来フィールドを、`video` prop 直読みではなくカード内の最新化済み動画情報へ寄せた。
- `watch-later/toggle` は従来どおり応答値で即時反映し、処理済み動画へのいいねで発生する自動解除は再取得結果で反映する。
- ランダム/運命では write 後の再抽選や不要な一覧スケルトン化が起きないことを確認。

### Write-enabled 確認結果

| 項目 | 結果 | メモ |
|---|---:|---|
| 事前状態 | pass | 開始時の tracked 差分なし。Streamlit 8501 は listen なし。 |
| DB バックアップ | pass | 既存バックアップ API と exact restore 用スナップショットを作成。 |
| Tier1 ランダム | pass | レベル変更後、タイトル tooltip の basename が `GET /api/videos/{id}` の最新パスと一致。再抽選リクエスト 0。 |
| Tier1 運命の1本 | pass | 復元表示した運命カードでレベル変更後の tooltip 最新化を確認。再抽選リクエスト 0。 |
| Tier2 ランダム | pass | 選別完了後、tooltip とドロップダウンが API 最新状態と一致。一覧リクエスト 0。 |
| Tier2 未選別に戻す | pass | `unselect` 後、tooltip とドロップダウンが未選別状態へ更新。カード数は維持。 |
| Tier2 運命の1本 | pass | 復元表示した運命カードで選別後の tooltip 最新化を確認。再抽選リクエスト 0。 |
| あとで見る自動解除 | pass | 処理済みカードをあとで見るに戻した後、いいねで DB とボタン表示が解除状態へ更新。 |
| 通常再生 | pass | API 成功、視聴回数 +1、最終再生日更新を確認。既知の外部プレイヤー PID 差分は検出なし。 |
| AVP 候補/最大4本 | pass | 候補 5 件追加、再生対象 4 件選択、5 件目 disabled を確認。 |
| AVP 1/2/4本起動 | pass | 1本、2本、4本の API 起動成功と視聴回数更新を確認。日本語・スペースを含むパスのケースを含む。 |
| AVP 外付けHDD | skipped | 実在する外付けHDD候補がなかったため。 |
| AVP 不正パス | pass | 不正な実行ファイル設定で 500 と日本語エラー detail を確認し、設定は復元。 |
| 主要ページ | pass | `/`, `/tier2`, `/watch-later`, `/search`, `/ranking`, `/analysis`, `/settings`, `/avp` が 200。 |
| バックアップ/スキャン/Runtime | pass | backup API、selection scan、library scan、runtime status を確認。 |
| 復元 | pass | リネームされた実ファイルを元名へ戻し、DB はスナップショットと SHA-256 一致。対象リネーム動画の実ファイル存在も確認。 |
| data/artifacts tracked 差分 | pass | `git status --short -- data artifacts` に差分なし。 |

### 自動チェック

| コマンド | 結果 |
|---|---:|
| `python -m pytest` | pass: 161 passed, 64 warnings |
| `cd frontend && npm run typecheck` | pass |
| `cd frontend && npm run lint` | pass |
| `cd frontend && npm run build` | pass |
| `git diff --check` | pass |
| report leak check | pass |

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
