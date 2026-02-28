# CHANGELOG

AIへの引き継ぎノート。主要な変更を遡及記録。

---

## 2026-02-28 — 新機能: ランキングタブ追加

**関連ファイル**: `core/analysis_service.py`, `core/app_service.py`, `ui/ranking_tab.py`, `streamlit_app.py`

### 概要
視聴回数・視聴日数・いいね数の3種ランキングを動画カードとして表示する「ランキング」タブを追加。ナビゲーション位置はセレクションと分析ダッシュボードの間。

### 変更内容
- `core/analysis_service.py`: `_df_row_to_video()` ヘルパーと `get_ranked_videos_for_tab()` を追加
  - 集計期間（30日/90日/1年/全期間）・Lv3フィルター・利用可否フィルター・表示件数に対応
  - 同スコア時は `last_viewed_at` 降順でタイブレーク
- `core/app_service.py`: `get_ranked_videos_for_tab` を re-export
- `ui/ranking_tab.py`: ランキングタブ全実装（新規作成）
  - 1〜3位に🥇🥈🥉メダルバッジ、4位以降は #N 表示
  - いいね時に `_fetch_ranking.clear()` でキャッシュ無効化
  - `@st.cache_data(ttl=60)` で60秒キャッシュ
- `streamlit_app.py`: import 追加・ナビに「ランキング」挿入・main() に分岐追加

---

## 2026-02-28 — バグ修正: 未判定ランダムタブ・スキャン

**関連ファイル**: `core/video_manager.py`, `core/scanner.py`, `streamlit_app.py`, `tests/test_video_manager.py`, `tests/test_scanner.py`

### 未判定ランダムタブのバッジ更新バグ修正
- **原因**: `unrated_videos` セッションキャッシュ内の `Video` オブジェクトが DB 更新後も古い値のまま残る
- `streamlit_app.py` `_handle_play`: 再生成功後に `unrated_videos` 内の該当 Video の `is_judging=True` を即時反映 → 「判定中」バッジが表示されるよう修正
- `streamlit_app.py` `_handle_judgment`: 判定成功後に `current_favorite_level=new_level`, `is_judging=False` を即時反映 → 「未判定」バッジが判定後も残るバグを修正
- `tests/test_video_manager.py`: `test_set_favorite_level_updates_db_level` を追加（回帰テスト）

### スキャン: 兄弟ディレクトリ誤判定バグ修正
- **原因**: `startswith()` による文字列前方一致でパス比較していたため、`data_selection/` が `data/` のスキャン対象と誤認識される
- `core/scanner.py` `scan_and_update()`: パス比較を `startswith()` → `Path.is_relative_to()` に変更
- `tests/test_scanner.py`: `test_scan_does_not_falsely_mark_sibling_dir_unavailable` を追加

### 未判定ランダム: 不在ファイル除外
- **原因**: 外付けHDD未接続時、`is_available=1` のまま保持される HDD 上の動画が未判定ランダムに表示され、再生時に「ファイルが見つかりません」エラーになる
- `core/video_manager.py` `get_unrated_random_videos()`: DB取得後に `Path.exists()` で実在確認し、不在ファイルを除外
- ドライブ単位で接続確認をキャッシュし高速化（全件取得 + フィルタ方式）
- `tests/test_video_manager.py`: `test_get_unrated_random_videos_excludes_nonexistent_files` を追加

### スキャン: セレクションフォルダの同期
- `streamlit_app.py` `scan_files()` / `scan_files_for_settings()`: スキャン後に `app_service.scan_selection_folder()` を呼び出し、セレクションフォルダの `is_available` を同期するよう修正

---

## 2026-02-28 — Phase 3: 依存関係・層分離

**関連ファイル**: `requirements.txt`, `requirements-lock.txt`, `core/app_service.py`, `streamlit_app.py`

- `requirements.txt`: 全パッケージにバージョン上限を追加（例: `streamlit>=1.30.0,<3.0.0`）
- `requirements-lock.txt`: `pip freeze` で生成（ロックファイル）
- `core/app_service.py`: `run_startup_migration()` を追加。DBマイグレーションをAppServiceに委譲
- `streamlit_app.py`: `Migration` 直接利用 → `app_service.run_startup_migration()` に変更

## 2026-02-28 — Phase 2: ロギング

**関連ファイル**: `core/logger.py`（新規）, `core/scanner.py`, `core/settings.py`, `core/video_manager.py`, `core/database.py`, `.gitignore`

- `core/logger.py` 新規作成: `RotatingFileHandler`（`data/clipbox.log`, 5MB×3世代）
- 上記4ファイルの `print()` を `logger.xxx()` に全置換
- `.gitignore` に `data/clipbox.log*` を追加

## 2026-02-28 — Phase 1: テスト補強

**関連ファイル**: `tests/test_video_manager.py`, `tests/test_scanner.py`, `core/database.py`, `tests/test_backup.py`（新規）

- `test_video_manager.py`: `test_set_judging_state_start_and_finish`, `test_set_favorite_level_file_not_found_leaves_db_unchanged` 追加
- `test_scanner.py`: `test_scan_only_updates_is_available_for_scanned_dirs`, `test_scan_does_not_change_is_available_when_no_files_found` 追加
- `core/database.py`: `create_backup()` を追加（`BACKUP_DIR` に `.db` を生成）
- `tests/test_backup.py`: バックアップ機能のテスト新規作成

## 2026-02-25 — コードレビュー Top5 修正

**関連ファイル**: `core/scanner.py`, `core/counter_service.py`, `core/video_manager.py`, `streamlit_app.py`, `ui/cache.py`, `tests/conftest.py`

- **A-1** `core/scanner.py`: `scan_and_update()` の `is_available=0` 更新を実際にスキャンしたディレクトリ配下のレコードのみに限定。外付けHDD未接続時の誤フラグ落とし防止
- **B-4** `core/counter_service.py` + `core/video_manager.py`: `auto_start_counters(event_time, conn)` に `conn` 引数を追加しネスト接続による `SQLITE_BUSY` を排除
- **A-6** `streamlit_app.py`: `_handle_play`, `_handle_judgment`, `scan_files`, `detect_and_record_file_access` の後に `ui_cache.xxx.clear()` を追加
- **C-1** `ui/cache.py` 新規作成: `@st.cache_data` 関数を `core/app_service.py` から移動。core/ から `import streamlit` を削除
- **C-6** `tests/conftest.py` 新規作成: `tmp_db` フィクスチャで DB パスパッチを一元化

## 2026-02-23 — セレクション機能実装

**関連ファイル**: `core/scanner.py`, `core/database.py`, `core/models.py`, `core/video_manager.py`, `core/selection_service.py`（新規）, `ui/selection_tab.py`（新規）, `core/analysis_service.py`, `streamlit_app.py`

- `!` プレフィックス付き動画（セレクション未選別）の管理機能を追加
- `+` プレフィックス（セレクション選別完了）の対応
- `extract_essential_filename()` を4タプル返却に変更: `(level, essential, needs_selection, is_selection_completed)`
- `videos` テーブルに `needs_selection` カラム追加
- `judgment_history` テーブルに `was_selection_judgment` カラム追加
- セレクションタブ（`ui/selection_tab.py`）を新規追加
- 分析タブにセレクション成果分析セクションを追加
- 検索タブ（`ui/search_tab.py`）を追加

## 2026-02-21 — いいね機能実装

**関連ファイル**: `core/like_service.py`（新規）, `core/database.py`, `ui/components/video_card.py`

- `likes` テーブルを追加
- `core/like_service.py`: `add_like()`, `get_like_counts()` を実装
- 動画カードにいいねボタンを追加
- 利用不可動画でもいいね操作を許可

## 2026-01-25 — Phase 1: Streamlit UI 実装（初期）

**関連ファイル**: 全ファイル

- 3層アーキテクチャ（UI / Core / Data）の確立
- `core/video_manager.py`: ビジネスロジック中核
- `core/scanner.py`: ファイルスキャン・プレフィックス解析
- `core/database.py`: SQLite接続管理（コンテキストマネージャ）
- `core/models.py`: Video, ViewingHistory データクラス
- `core/counter_service.py`: カウンター機能
- `core/analysis_service.py`: 統計分析
- 動画一覧タブ・未判定ランダムタブ・分析タブ・設定タブの実装
