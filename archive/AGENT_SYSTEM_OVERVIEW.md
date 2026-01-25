# ClipBox 現行仕様ドキュメント（Agent向け）  
生成日時: 2026-01-02  
対象リポジトリ: Atsuki0620/ClipBox（ローカル最新状態を参照）

本書はリポジトリに存在する実装内容のみを基準とし、推測を排除する。各仕様記述には根拠となるファイル/関数/SQL を括弧で併記する。

---

## 参照ソース一覧
- `streamlit_app.py`（UI・起動フロー・タブ構成・イベントハンドラ）
- `config.py`（デフォルト設定値・スキャン対象パス・DBパス・定数）
- `setup_db.py`（DB初期化 CLI）
- `run_clipbox.bat`（Windows 起動バッチ）
- `requirements.txt`（依存パッケージ）
- `core/database.py`（SQLite 接続・スキーマ定義・インデックス）
- `core/video_manager.py`（動画取得/再生/統計/履歴記録）
- `core/scanner.py`（ファイルスキャン・アクセス検知ユーティリティ）
- `core/models.py`（Video / ViewingHistory dataclass）
- `core/settings.py`（動的設定 app_settings.json 読み書き）
- `core/history_repository.py`（play_history 挿入）
- `core/config_store.py`（user_config.json 読み書き）
- `core/snapshot.py`（スナップショット生成・比較）
- `tests/` 以下: `test_scanner.py`, `test_history_repository.py`, `test_video_manager.py`
- `docs/` 既存: 技術仕様書 / 要件定義書 / 開発メモ（参照のみ）

---

## 0) TL;DR（Agent向け要約）
- UIは Streamlit 単一ページ、6タブ構成：動画一覧/ランダム再生/統計/最近見ていないお気に入り/スナップショット/設定（`streamlit_app.py:main()`）。
- DBは SQLite `data/videos.db`、起動時に毎回 `init_database()` で不足テーブルを補完（`streamlit_app.py:check_and_init_database()`）。
- スキャンは `FileScanner.scan_and_update()` が `videos` を INSERT/UPDATE、起点はサイドバーと設定保存後の自動実行（`streamlit_app.py:scan_files`, `scan_files_for_settings`）。
- 再生は行ボタン/タイトルクリック/ランダム再生で `_handle_play()` 経由、OS 既定プレイヤー起動 + `viewing_history` 追加 + `play_history` 追加（`streamlit_app.py:_handle_play()`）。
- ファイルアクセス検知あり：起動時1回と手動ボタンで `detect_recently_accessed_files()` → `viewing_history` 追記（`streamlit_app.py:detect_and_record_file_access()`）。
- 設定は `data/user_config.json` に保存。library_roots/default_player/db_path を GUI で編集可能（`core/config_store.py`, `streamlit_app.py:render_settings()`）。
- スナップショット機能: `data/snapshots/yyyymmdd_HHMM.db` に現状態を丸ごと保存し、2つ選んで差分比較可能（`core/snapshot.py`, `streamlit_app.py:render_snapshot()`）。
- 統計は DB 集計のみ（視聴回数ランキング全件、最近見ていないお気に入り）；UIで最小視聴回数フィルタと並び順変更が可能（`streamlit_app.py:render_statistics()`）。
- .gitignore に `data/snapshots/` 追加済み。機微なパス含むためリポジトリに含めない（`.gitignore`）。
- テストは最小限：scanner のプレフィックス抽出と play_history 挿入の正当性を確認（`tests/test_scanner.py`, `tests/test_history_repository.py`）。

---

## 0.1) 想定外/追加機能一覧
| 機能名 | 概要 | エントリポイント | 実装箇所 | 永続化 | 利用状況 |
| --- | --- | --- | --- | --- | --- |
| ファイルアクセス検知 | OS最終アクセス時刻から新規アクセスを検知し視聴履歴へ記録 | 起動時自動＋サイドバー「視聴履歴を検知」 | `streamlit_app.py:detect_and_record_file_access()` + `core.scanner:detect_recently_accessed_files()` | `viewing_history` に viewing_method='FILE_ACCESS_DETECTED' | 実行箇所あり（起動時・ボタン） |
| スナップショット保存 | 現在のDB/設定/フィルタ/ランキング/履歴100件を別SQLiteに保存 | タブ「📸 スナップショット」ボタン | `core/snapshot.py:create_snapshot()` | `data/snapshots/*.db` | 実行箇所あり |
| スナップショット比較 | 2つのスナップショット間で総数・視聴回数差分・新規/欠落を算出 | 同タブ「比較する」 | `core/snapshot.py:compare_snapshots()` | スナップショットを読み取り | 実行箇所あり |
| 自動DB再初期化 | 起動時毎回 `init_database()` を走らせ不足テーブルを補完 | `streamlit_app.py:check_and_init_database()` | `core/database.py:init_database()` | videos.db | 常時実行 |
| 設定保存時の即時再スキャン | 設定変更保存後に `FileScanner` を走らせ反映 | 設定タブ「保存」 | `streamlit_app.py:render_settings()` -> `scan_files_for_settings()` | videosテーブル | 実行箇所あり |
| 再生履歴専用テーブル | OS再生トリガーごとに `play_history` へ記録 | 再生ハンドラ `_handle_play()` | `core/history_repository.py:insert_play_history()` | play_history | 実行箇所あり |
| 動的設定ファイル | 最終アクセス検知日時を app_settings.json に保持 | アクセス検知処理 | `core/settings.py` | data/app_settings.json | 実行箇所あり |
| snapshot_meta にフィルタ/設定保存 | スナップショット時のUIフィルタ・設定をメタに格納 | スナップショット | `core/snapshot.py:create_snapshot()` | snapshots/*.db | 実行箇所あり |

### 0.2) 未使用／死んでいるように見える実装（省略禁止）
| 場所 | 内容 | 未使用に見える根拠 | 影響 |
| --- | --- | --- | --- |
| `core/video_manager.py:mark_as_viewed()` | viewing_history に MANUAL_ENTRY を追加するユーティリティ | UI/他モジュールからの呼び出しがコード上存在しない | 既存UIで露出なし。将来の手動記録追加時はこの関数を流用可 |
| `config.py:BACKUP_DIR` | DBバックアップ保存先パス定数 | バックアップ処理を呼ぶコードがリポジトリ内に無い | 定数のみ定義、実処理未実装。拡張時はここを利用 |
| `create_test_data.py`, `inspect_database.py`, `verify_setup.py` | データ生成・DB検査・セットアップ確認用スクリプト | `streamlit_app.py` ほかからインポートや実行されない | 手動ユーティリティとして孤立。必要なら CLI で個別実行 |
| `tests/test_video_manager.py` | VideoManager 初期化のみをテストし、残りは TODO | 実質的な振る舞い検証が未実装 | カバレッジ不足。拡張時に追記が必要 |
| `run_clipbox.bat` 冒頭のコメント文字化け | 先頭コメントが文字化けしているが機能に影響なし | bat ファイルは Streamlit 起動のみ実行 | 起動には影響なしだが可読性低下 |

---

## 1) システム概要
- 目的: ローカル動画（～5000件想定）をお気に入りレベル/登場人物/保存場所で管理し、即再生・履歴記録・統計表示・スナップショット比較を行う。
- 実行環境: Windows + Python + Streamlit 前提。既定メディアプレイヤーに `start "" <path>` で渡す（`core/video_manager.py:play_video()`）。
- 永続化: SQLite 単一ファイル `data/videos.db`。設定は `data/user_config.json`（ユーザー編集）、`data/app_settings.json`（自動書込）、スナップショットは `data/snapshots/*.db`。
- ラッパー方式: Streamlit UIで再生トリガー → OSプレイヤー起動 → `viewing_history` / `play_history` へ確実に記録。

## 2) ユーザー利用想定（運用シナリオと内部処理）
- 初回セットアップ〜初回起動: `setup_db.py` で DB 作成（`core/database.py:init_database()`）または起動時の自動初期化（`streamlit_app.py:check_and_init_database()`）。  
- ライブラリ設定: 設定タブで複数パスを入力し保存 → `user_config.json` へ書込（`core/config_store.py:save_user_config()`）→ 即スキャン `scan_files_for_settings()` で `videos` を更新。  
- 一覧から再生: 「動画一覧」行のタイトル/再生ボタン → `_handle_play()` → OS既定プレイヤー起動 + `viewing_history` 挿入(APP_PLAYBACK) + `play_history` 挿入。  
- ランダム再生: 「🎲 ランダム再生」 → `VideoManager.get_random_video()` → `_handle_play(trigger="random_play")`。  
- スキャンによるDB更新: サイドバー「ファイルをスキャン」or 設定保存後 → `FileScanner.scan_and_update()` が `videos` を INSERT/UPDATE。  
- ファイルアクセス検知: 起動時1回＋サイドバー「視聴履歴を検知」 → `detect_recently_accessed_files()` で atime 差分を検出し `viewing_history` に FILE_ACCESS_DETECTED で追記。  
- 統計ランキング等: 「📊 統計」タブで `get_viewing_stats()` の結果を表示。最小視聴回数フィルタと昇降順切替を UI が保持。  
- 最近見ていないお気に入り: 専用タブで view_count>=5 かつ30日未視聴を表示（同じ統計結果から抽出）。  
- スナップショット取得・比較: 「📸 スナップショット」タブで `create_snapshot()` により snapshots/*.db を生成し、2つ選択して `compare_snapshots()` で差分表示。  

## 3) リポジトリ構造（Source Map）
| パス | 役割 |
| --- | --- |
| `streamlit_app.py` | UI層・イベント処理・タブ構成 |
| `config.py` | デフォルト定数（SCAN_DIRECTORIES, DATABASE_PATH, 拡張子など） |
| `setup_db.py` | DB初期化CLI |
| `run_clipbox.bat` | Windows起動バッチ |
| `core/database.py` | SQLite接続・スキーマ作成・インデックス |
| `core/video_manager.py` | 動画取得/再生/統計/履歴記録 |
| `core/scanner.py` | ファイルスキャン・アクセス検知ユーティリティ |
| `core/models.py` | dataclass モデル |
| `core/settings.py` | app_settings.json 読み書き（最終アクセスチェック） |
| `core/history_repository.py` | play_history への挿入 |
| `core/config_store.py` | user_config.json 読み書き |
| `core/snapshot.py` | スナップショット生成・読み込み・比較 |
| `tests/*` | 最小限の単体テスト |
| `docs/*` | 既存の要件・技術仕様・開発メモ |

### 機能実装箇所 対応表
| 機能 | 主な処理 | 実装箇所（ファイル/関数） | 永続化/副作用 |
| --- | --- | --- | --- |
| 再生処理 | OS 既定プレイヤー起動 | `core/video_manager.py:play_video()`（サブプロセス start） | プロセス起動、viewing_history 追加 |
| 再生履歴挿入 | play_history 追記 | `core/history_repository.py:insert_play_history()`、呼び出し `_handle_play()` | play_history INSERT |
| viewing_history 挿入 | 再生/手動/アクセス検知 | `video_manager.play_video()`（APP_PLAYBACK）、`mark_as_viewed()`（MANUAL_ENTRY）、`record_file_access_as_viewing()`（FILE_ACCESS_DETECTED） | viewing_history INSERT |
| 設定読み書き | user_config.json | `core/config_store.py:load_user_config()/save_user_config()` | JSON 読み書き |
| 動的設定 | 最終アクセス検知時刻 | `core/settings.py:get_last_access_check_time()/update_last_access_check_time()` | app_settings.json 読み書き |
| DB初期化 | テーブル/インデックス生成 | `core/database.py:init_database()` | CREATE TABLE/INDEX |
| スキャン | ディレクトリ走査→videos 更新 | `core/scanner.py:FileScanner.scan_and_update()` | videos INSERT/UPDATE |
| アクセス検知 | ファイル atime 参照→履歴追加 | `core.scanner:detect_recently_accessed_files()` → `VideoManager.record_file_access_as_viewing()` | viewing_history INSERT |
| 統計 | 視聴回数集計/忘却お気に入り | `core/video_manager.py:get_viewing_stats()` | SELECT 集計（DB read） |
| スナップショット保存 | 現DB/設定を別SQLiteに保存 | `core/snapshot.py:create_snapshot()` | snapshots/*.db 作成 |
| スナップショット比較 | 総数・視聴回数差分算出 | `core/snapshot.py:compare_snapshots()` | snapshots 読み取り |

## 4) 実行時コンポーネントと責務分離
- UI層: Streamlit (`streamlit_app.py`)  
  - 入力: ユーザー操作（ボタン/フォーム/フィルタ）  
  - 出力: DB/設定ファイル更新、外部プレイヤー起動、Snapshot DB生成  
  - 状態: `st.session_state` （user_config, selected_video, last_* フィルタ値 等）
- ドメイン層: `VideoManager`（`core/video_manager.py`）  
  - 入力: フィルタ条件、video_id  
  - 出力: Videoリスト、再生結果 dict、統計 dict  
  - 副作用: viewing_history への挿入（play_video, mark_as_viewed, record_file_access_as_viewing）
- スキャン層: `FileScanner`（`core/scanner.py`）  
  - 入力: scan_directories  
  - 副作用: videos テーブル INSERT/UPDATE
- 永続化層: `core/database.py` の接続・スキーマ（videos/viewing_history/play_history）
- 設定層: `config_store.py`（user_config.json）、`settings.py`（app_settings.json）、`config.py`（デフォルト）
- スナップショット層: `snapshot.py`（スナップショットDBの生成・比較）

## 5) データ永続化の全体像
### 5.1 SQLite DB（`core/database.py:init_database()`）
- パス: `config.DATABASE_PATH` (= `PROJECT_ROOT/data/videos.db`)
- テーブル & 主な列  
  - `videos` (id PK, essential_filename UNIQUE, current_full_path, current_favorite_level, file_size, performer, storage_location, last_file_modified, created_at default now, last_scanned_at, notes)  
  - `viewing_history` (id PK, video_id FK, viewed_at default now, viewing_method)  
  - `play_history` (id PK, file_path, title, internal_id, player, library_root, trigger, played_at default now)
- インデックス: essential_filename, favorite_level, performer, storage_location, viewing_history(video_id, viewed_at), play_history(file_path, played_at)
- 更新タイミング  
  - videos: スキャン時 INSERT/UPDATE（`core/scanner.py:_process_file()`）  
  - viewing_history: 再生時（APP_PLAYBACK, `video_manager.play_video`）、手動 mark（MANUAL_ENTRY）、アクセス検知（FILE_ACCESS_DETECTED）  
  - play_history: 再生ハンドラ `_handle_play()` 経由で insert_play_history

#### スキーマ詳細（CREATE TABLE 相当）
| テーブル | 列 | 型/制約 | 出典 |
| --- | --- | --- | --- |
| videos | id | INTEGER PK AUTOINCREMENT | `core/database.py:init_database()` |
|  | essential_filename | TEXT NOT NULL UNIQUE | 同上 |
|  | current_full_path | TEXT NOT NULL | 同上 |
|  | current_favorite_level | INTEGER DEFAULT 0 | 同上 |
|  | file_size | INTEGER | 同上 |
|  | performer | TEXT | 同上 |
|  | storage_location | TEXT | 同上 |
|  | last_file_modified | DATETIME | 同上 |
|  | created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | 同上 |
|  | last_scanned_at | DATETIME | 同上 |
|  | notes | TEXT | 同上 |
| viewing_history | id | INTEGER PK AUTOINCREMENT | 同上 |
|  | video_id | INTEGER NOT NULL FK videos(id) ON DELETE CASCADE | 同上 |
|  | viewed_at | DATETIME DEFAULT CURRENT_TIMESTAMP | 同上 |
|  | viewing_method | TEXT | 同上 |
| play_history | id | INTEGER PK AUTOINCREMENT | 同上 |
|  | file_path | TEXT NOT NULL | 同上 |
|  | title | TEXT NOT NULL | 同上 |
|  | internal_id | TEXT | 同上 |
|  | player | TEXT NOT NULL | 同上 |
|  | library_root | TEXT NOT NULL | 同上 |
|  | trigger | TEXT NOT NULL | 同上 |
|  | played_at | DATETIME DEFAULT CURRENT_TIMESTAMP | 同上 |

#### インデックス
| テーブル | インデックス | 列 | 目的 |
| --- | --- | --- | --- |
| videos | idx_essential_filename | essential_filename | 本質名での重複防止・検索 |
| videos | idx_favorite_level | current_favorite_level | お気に入りレベルフィルタ |
| videos | idx_performer | performer | 登場人物フィルタ |
| videos | idx_storage_location | storage_location | 保存場所フィルタ |
| viewing_history | idx_video_id | video_id | 履歴集計 |
| viewing_history | idx_viewed_at | viewed_at | 時系列照会 |
| play_history | idx_play_history_file_path | file_path | ファイル単位履歴検索 |
| play_history | idx_play_history_played_at | played_at | 時系列照会 |

### 5.2 設定ファイル
- `data/user_config.json`（`core/config_store.py`）  
  - キー: library_roots(list[str]), default_player(str), db_path(str)  
  - 優先順位: 読み込み時に `config.py` デフォルトとマージ。UI保存で上書き。
- `data/app_settings.json`（`core/settings.py`）  
  - キー: last_access_check_time(str ISO)  
  - 使用箇所: ファイルアクセス検知の前回チェック保持。
- `config.py`  
  - デフォルト: SCAN_DIRECTORIES, DATABASE_PATH, VIDEO_EXTENSIONS, FAVORITE_LEVEL_NAMES, FILE_ACCESS_DETECTION_DAYS, BACKUP_DIR。  
  - 現実運用では library_roots は user_config.json が優先（UIから保存）。
  - デフォルト値の参照は config_store の初期値に使われるが、実ランタイムは user_config.json を最優先。
- スナップショット（`data/snapshots/*.db`）  
  - テーブル: snapshot_meta, videos（表示名付き + view_count + last_viewed_at）, viewing_history_latest(100), play_history_latest(100), ranking, forgotten_favorites。  
  - 保存時に filters と user_config を JSON 文字列で meta に格納。

#### 設定ファイルのスキーマ例
| ファイル | キー | 型 | 例 | 読み書き関数 |
| --- | --- | --- | --- | --- |
| data/user_config.json | library_roots | list[str] | ["C:/videos", "E:/clips"] | `core/config_store.py:load_user_config()/save_user_config()` |
|  | default_player | str | "vlc" | 同上 |
|  | db_path | str | "C:/repo/data/videos.db" | 同上 |
| data/app_settings.json | last_access_check_time | str(ISO) or null | "2026-01-02T03:00:00.000000" | `core/settings.py:get_last_access_check_time()/update_last_access_check_time()` |
| config.py（定数） | SCAN_DIRECTORIES | list[Path] | [Path(r"C:\\...\\ClipBox_TEST")] | 参照のみ（初期値） |
|  | DATABASE_PATH | Path | PROJECT_ROOT/data/videos.db | 同上 |
|  | VIDEO_EXTENSIONS | list[str] | [".mp4", ".avi", ...] | 同上 |
|  | FAVORITE_LEVEL_NAMES | dict[int,str] | {0:"通常",1:"やや気に入っている",...} | 同上 |
|  | FILE_ACCESS_DETECTION_DAYS | int | 1 | 同上 |
|  | BACKUP_DIR | Path | PROJECT_ROOT/data/backups | 同上 |

## 6) 主要フロー（トリガー → 呼び出し → DB/ファイル更新 → 例外時挙動）

### 1. アプリ起動
- トリガー: `streamlit run streamlit_app.py` / `run_clipbox.bat`
- 呼び出し: `main()` → `init_session_state()`（user_config読込・VideoManager生成・初回アクセス検知）→ `check_and_init_database()`（毎回 init_database）
- 更新: `init_database()` が CREATE IF NOT EXISTS でテーブル補完。初回 `detect_and_record_file_access()` が viewing_history に FILE_ACCESS_DETECTED を追加する可能性。  
- 例外: init 失敗時 st.error で停止。DBなしは自動作成。

### 2. 動画一覧生成
- トリガー: タブ「動画一覧」描画
- 呼び出し: `render_sidebar()` でフィルタ取得 → `VideoManager.get_videos()`（お気に入り降順 & last_file_modified 降順）
- 更新: DB read のみ。該当0件なら st.info 表示。
- 例外: なし（空データ時のみメッセージ）。

### 3. 一覧クリック再生
- トリガー: 行タイトル or 「再生」ボタン
- 呼び出し: `_handle_play(video, trigger)` → `VideoManager.play_video()` → `insert_play_history()`
- 更新: viewing_history(APP_PLAYBACK) 追加、play_history 追加。OS既定プレイヤー起動。
- 例外: ファイル不存在/起動失敗で st.error、履歴は追加されない。

### 4. ランダム再生
- トリガー: 「🎲 ランダム再生」ボタン
- 呼び出し: `VideoManager.get_random_video()` → `_handle_play(trigger="random_play")`
- 更新/例外: 一覧再生と同じ。該当なしなら st.warning。

### 5. ファイルスキャン更新
- トリガー: サイドバー「ファイルをスキャン」or 設定保存後自動
- 呼び出し: `scan_files()` / `scan_files_for_settings()` → `FileScanner.scan_and_update()`
- 更新: videos INSERT/UPDATE、last_scanned_at 更新。essential_filename で一意管理。
- 例外: スキャン失敗は st.error 表示。

### 6. ファイルアクセス検知
- トリガー: 起動時初回、自動検知ボタン
- 呼び出し: `detect_and_record_file_access()` → `detect_recently_accessed_files()` → `record_file_access_as_viewing()`
- 更新: viewing_history に FILE_ACCESS_DETECTED 挿入、app_settings.json に last_access_check_time 更新。
- 例外: 取得失敗で st.error。

### 7. 統計表示
- トリガー: タブ「📊 統計」表示
- 呼び出し: `render_statistics()` → `VideoManager.get_viewing_stats()`
- 更新: DB read（ランキング、忘却お気に入り）。UIフィルタ値を session_state に保持。
- 例外: 履歴なしで st.info。

### 8. スナップショット取得/比較
- トリガー: タブ「📸 スナップショット」ボタン
- 呼び出し: `create_snapshot()` で snapshots/*.db 作成、`compare_snapshots()` で差分計算
- 更新: 新規スナップショットSQLite作成、読み取りのみ。
- 例外: 作成/比較失敗で st.error。

## 7) UI仕様（Agent向け）
- タブ: 動画一覧 / ランダム再生 / 統計 / 最近見ていないお気に入り / スナップショット / 設定（`main()`）。  
- サイドバー: フィルタ（お気に入り/登場人物/保存場所）、スキャン、視聴履歴検知、メトリクス。  
- 動画一覧: 行ごとにタイトルボタン＋「再生」ボタン。ID入力は廃止。行にはお気に入り/登場人物/保存場所/サイズ/最終更新を表示。  
- 統計タブ: ランキング全件を DataFrame、最小視聴回数フィルタ・昇降順切替。  
- 最近見ていないお気に入りタブ: 条件固定（view_count>=5 且つ 30日未視聴）。  
- スナップショットタブ: 取得ボタン、スナップショット選択と比較ボタン。  
- 設定タブ: library_roots 複数行、default_player ラジオ、db_path テキスト、保存でスキャン＆再描画。  
- session_state 主キー: user_config, selected_video, last_selected_levels/performers/locations, last_min_view_filter, last_order_filter, auto_detection_done など。

### UI要素→ハンドラ対応
| 画面/タブ | UI要素 | ハンドラ関数 | 副作用/更新 |
| --- | --- | --- | --- |
| サイドバー | お気に入りレベル multiselect | `render_sidebar()` | フィルタ値を返却 |
| サイドバー | 登場人物 multiselect | 同上 | フィルタ値を返却 |
| サイドバー | 保存場所 multiselect | 同上 | フィルタ値を返却 |
| サイドバー | 📁 ファイルをスキャン button | `scan_files()` | videos INSERT/UPDATE, rerun |
| サイドバー | 📊 視聴履歴を検知 button | `detect_and_record_file_access()` | viewing_history FILE_ACCESS_DETECTED 追加 |
| 動画一覧 | タイトルボタン | `_handle_play(trigger="title_click")` | OS再生 + viewing_history/play_history 追加 |
| 動画一覧 | ▶️ 再生 button | `_handle_play(trigger="row_button")` | 同上 |
| ランダム再生 | 🎲 ランダム再生 button | `render_random_play()` → `_handle_play("random_play")` | 同上 |
| 統計 | number_input 最小視聴回数 | `render_statistics()` | フィルタ値 session_state 保存 |
| 統計 | radio 並び順 | 同上 | ソート変更 |
| スナップショット | 📥 今すぐ取得 button | `render_snapshot()` → `create_snapshot()` | snapshots/*.db 作成 |
| スナップショット | selectbox(旧/新) + 🔍 比較 button | `render_snapshot()` → `compare_snapshots()` | 差分表示 |
| 設定 | text_area library_roots | `render_settings()` | user_config.json 更新 |
| 設定 | radio default_player | 同上 | user_config 更新 |
| 設定 | text_input db_path | 同上 | user_config 更新 |
| 設定 | 💾 保存 button | 同上 → `scan_files_for_settings()` → rerun | videos 更新 |

### session_state キー
| キー | 用途 | 設定箇所 |
| --- | --- | --- |
| user_config | 設定ファイルの内容をキャッシュ | `init_session_state()` |
| selected_video | 直近に再生/選択した Video | `_handle_play()` ほか |
| last_selected_levels/performers/locations | 直近のフィルタ条件 | `main()` 動画一覧取得時 |
| last_min_view_filter | 統計タブの最小視聴回数フィルタ | `render_statistics()` |
| last_order_filter | 統計タブの並び順 | `render_statistics()` |
| auto_detection_done | 起動時のアクセス検知を一度だけ行うフラグ | `init_session_state()` |

### rerun 発生条件
- スキャン成功後: `scan_files()` / `scan_files_for_settings()` が `st.rerun()`  
- 設定保存後: `render_settings()` 内で保存・スキャン後に `st.rerun()`  
- サイドバー・タブ切替・入力変更は Streamlit 標準の再描画挙動

## 8) 起動方法（Runbook）
1. 依存インストール: `pip install -r requirements.txt`  
2. DB初期化: `python setup_db.py`（またはアプリ起動時自動作成）。  
3. 起動: `run_clipbox.bat` をダブルクリック（`streamlit run streamlit_app.py` を実行）。CLIなら `streamlit run streamlit_app.py`。  
4. ブラウザで `http://localhost:8501` を開く。  
5. よくある失敗: DB破損/欠如 → 起動時にエラー表示（`check_and_init_database()`）。スキャン対象パス未設定 → 一覧空。プレイヤー未設定 → OS側の既定アプリ必要。

### run_clipbox.bat の役割
- 中身: `@echo off` → カレントをバッチ位置に移動 → `streamlit run streamlit_app.py` を実行（`run_clipbox.bat`）。
- 目的: CLI不要でダブルクリック起動を提供（Windows 想定）。

### よくある起動失敗と対処
| 事象 | 原因 | 対処 |
| --- | --- | --- |
| DB が無い/壊れている | videos.db 不存在/破損 | `python setup_db.py` で再作成。起動時の `init_database()` でも補完。 |
| 一覧が空 | SCAN_DIRECTORIES / library_roots が未設定、またはスキャン未実行 | 設定タブでパスを保存→スキャン。 |
| 再生できない | OSに既定プレイヤーが無い、ファイルパスが無効 | Windowsの関連付け確認、再スキャンでパス更新。 |
| ポート競合 | 他プロセスが 8501 使用 | `streamlit run streamlit_app.py --server.port 8502` などで回避。 |

## 9) 更新運用
- スキャン: サイドバーまたは設定保存後に実行。videosテーブルが最新に更新。  
- 設定変更: 設定タブで保存 → user_config.json更新 → 即スキャン → rerun。  
- DBバックアップ: BACKUP_DIR 定義のみ（`config.py:BACKUP_DIR`）。自動バックアップ実装は現状なし。  
- データ整合: ファイル移動で current_full_path が無効になると再生時にエラー（`play_video` で存在確認）。再スキャンで最新パスに更新される。

### 設定変更手順（保存と反映）
1. タブ「⚙️ 設定」で library_roots / default_player / db_path を入力。  
2. 「💾 保存」押下 → `save_user_config()` が user_config.json 更新 → `scan_files_for_settings()` が videos を更新 → `st.rerun()` でUI再描画。  
   - 失敗時は st.error 表示。  

### DBバックアップと復旧
- 現状、自動バックアップ機能なし。定数 BACKUP_DIR のみ定義（`config.py:BACKUP_DIR`）。  
- 手動で `data/videos.db` をコピーし BACKUP_DIR に保存する運用が想定されるが実装は無い。復旧は手動でファイルを置き換える。

### データ整合性の前提
- essential_filename は UNIQUE。ファイル名（プレフィックス除外）が重複すると登録不可。  
- ファイル移動/削除後は current_full_path が無効になり再生時エラー。再スキャンで新パスに更新。  
- storage_location 判定はドライブ文字のみで簡易。

## 10) 例外処理 / エラーハンドリング
- 再生ファイル不存在: play_video が error を返し UI で st.error 表示。  
- DBなし/テーブル不足: 起動時 `init_database()` を毎回実行して補完。  
- 設定ファイル破損: config_store.load_user_config は例外を握りつぶしデフォルトで継続。  
- ファイルアクセス情報取得失敗: scanner.detect_recently_accessed_files で print して継続。  
- スナップショット生成/比較失敗: UI で st.error 表示し処理中断。

## 11) 拡張ガイド（影響範囲）
- プレイヤー追加: `_handle_play()` の player 取得と history_repository.insert_play_history の引数に反映。UI 設定候補追加。  
- play_history 列追加: `core/database.py:init_database()` の CREATE TABLE 変更、`history_repository.insert_play_history()`、スナップショットの play_history_latest INSERT、比較ロジックが必要。  
- 一覧表示項目追加: `render_video_list()` の行表示と VideoManager の SELECT 列（現在 * 取得）。  
- スキャン要件変更: `core/scanner.py` の is_video_file / extract_performer / extract_essential_filename を変更。  
- 想定外機能の削除/拡張: ファイルアクセス検知 → `detect_and_record_file_access` と settings.last_access_check_time の呼び出し箇所。スナップショット → `core/snapshot.py` とタブ UI。

## 12) テスト検証
- 自動テスト: `pytest`（scanner のプレフィックス抽出、play_history 挿入の基本のみ）。  
- 手動検証の最低限:  
  1) 設定で library_roots を変更→保存→一覧が更新されること。  
  2) スキャン後、videos 件数が増えること。  
  3) 再生ボタン押下で viewing_history, play_history に行が増えること。  
  4) スナップショット取得→比較で総数差分が表示されること。  
  5) アクセス検知ボタンで FILE_ACCESS_DETECTED が入ること（ファイルを開いた後に実行）。

## 13) 既知の制約 / 未解決課題
- プレイヤーは OS 既定起動のみで選択起動不可（設定 default_player は履歴記録用メタだけ）。  
- データベースマイグレーション機構なし。スキーマ変更時は init_database 頼み。  
- ファイル名重複時は essential_filename UNIQUE 制約が競合する可能性あり（`videos` 定義）。  
- 外付けHDD判定はドライブ文字のみで厳密でない（`scanner.determine_storage_location()`）。  
- app_settings.json/user_config.json のバリデーションは緩く、破損してもデフォルトで上書きする。  
- バックアップ機能は未実装（定数のみ）。  
- テストカバレッジが低い（統計・スキャン全体・UI イベントは未検証）。  
- スナップショット生成が DB サイズと比例して重くなる。上限は設けていない（要件に従い全件保存）。  
- git管理除外: `data/snapshots/` に機微な絶対パスが含まれるため必ずコミット対象外とする（`.gitignore`）。

---

（終）
