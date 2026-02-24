# ClipBox コードレビュー：リスク・問題点分析レポート

**作成日**: 2026-02-24
**対象ブランチ**: feature/streamlit-ui-implementation
**レビュー対象**: コアモジュール全体、UIモジュール全体、テストコード

---

## カテゴリ A：バグ・データ破損リスク

### 問題 A-1：外付けHDD未接続時の `is_available=0` 一括上書き

**該当箇所**: `core/scanner.py` の `FileScanner.scan_and_update` (110-138行目)
**深刻度**: 🔴 高
**カテゴリ**: バグ・破損リスク
**説明**:
`scan_and_update` は全スキャンディレクトリを巡回した後、DB上の全動画レコードのうち `self.found_files` に含まれなかったものを一律 `is_available=0` に更新する（126-138行目）。しかし、スキャン前の `directory.exists()` チェック（122行目）により、外付けHDDが未接続の場合はそのディレクトリのスキャン自体がスキップされる。結果として、HDD上の全動画が「見つからなかった」と判定され、一括で `is_available=0` にフォールバックする。一方、`scan_single_directory`（140-157行目）は指定ディレクトリのみをスキャンし、他レコードの `is_available` には一切触れない安全な設計になっている。この非対称性により、ユーザーがサイドバーの「ファイルをスキャン」ボタンを押しただけで、接続されていないドライブ上の全動画の利用可能フラグが失われる。

---

### 問題 A-2：`essential_filename` 衝突時のサイレント上書き

**該当箇所**: `core/scanner.py` の `FileScanner._process_file` (171-224行目)、`core/database.py` の `videos` テーブル定義 (47行目)
**深刻度**: 🟡 中
**カテゴリ**: バグ・破損リスク
**説明**:
`essential_filename` は `UNIQUE` 制約を持つが、異なるフォルダに同名のファイルが存在する場合（例: `FolderA/作品.mp4` と `FolderB/作品.mp4`）、`_process_file` は `WHERE essential_filename = ?` で既存レコードを検索し（195-198行目）、存在すればパス・レベル・保存場所等を上書きする（203-214行目）。2つ目のファイルがスキャンされた時点で、1つ目のファイル情報が完全に消失する。ファイルサイズやパスの組み合わせによる同一性の検証は行われていない。`file_size` カラムは `_process_file` の INSERT では設定されるが、UPDATE では設定されないため（203-214行目の SET句に `file_size` がない）、既存レコードの `file_size` は古い値のまま残り、判別の手がかりとしても使えない。

---

### 問題 A-3：`viewing_history` と `play_history` の二重管理によるトランザクション不整合

**該当箇所**: `core/video_manager.py` の `play_video` (196-203行目)、`streamlit_app.py` の `_handle_play` (81-96行目)、`core/database.py` の `insert_play_history` (208-228行目)
**深刻度**: 🟡 中
**カテゴリ**: バグ・破損リスク
**説明**:
再生操作は3つの独立したトランザクションに分割されている。(1) `play_video` 内で `viewing_history` に INSERT（video_manager.py:197-203、`get_db_connection` のコンテキスト内で自動コミット）、(2) `_handle_play` 内で `insert_play_history` を呼出し（streamlit_app.py:82-90）、これは `database.py:221` で別の `get_db_connection` を開く。(3) `counter_service.auto_start_counters` もさらに別の接続を開く（後述 B-4）。`insert_play_history` が例外を投げた場合（streamlit_app.py:95-96で catch される）、`viewing_history` には記録があるが `play_history` にはないという不整合が生じる。逆に、`play_video` が成功した後の呼び出し元がクラッシュした場合も同様。

---

### 問題 A-4：`likes` テーブルへの無制限追記（レート制御なし）

**該当箇所**: `core/like_service.py` の `add_like` (12-36行目)、`ui/library_tab.py` の `make_like_handler` (339-345行目)
**深刻度**: 🟢 低
**カテゴリ**: バグ・破損リスク
**説明**:
`add_like` は呼び出される度に無条件で `likes` テーブルに1行を INSERT する。UNIQUE制約やタイムスタンプベースのスロットリングは存在しない。Streamlit のボタンクリックは `st.rerun(scope="fragment")` で画面が再描画されるまでの間に複数回発火しうる。また、ネットワーク遅延などで `st.rerun` が遅れた場合、ユーザーが連打すると同一動画に対して短時間で複数レコードが挿入される。現時点では「いいね数」は累積表示のため機能破壊にはならないが、分析ランキングの精度に影響する。

---

### 問題 A-5：`migration_history.txt` ベースのマイグレーション管理の脆弱性

**該当箇所**: `core/migration.py` の `is_migration_completed` (21-27行目)、`mark_migration_completed` (29-32行目)
**深刻度**: 🟡 中
**カテゴリ**: バグ・破損リスク
**説明**:
マイグレーションの完了判定はデータベース外のテキストファイル `migration_history.txt` に依存している。このファイルが削除・破損された場合、`is_migration_completed` は常に `False` を返し、全マイグレーションが再実行される。`migrate_level_0_to_minus_1` の場合、再実行されると既に正しくレベル0に設定されたプレフィックス付きファイル（`_file.mp4`）は条件分岐で除外されるため実害は限定的だが、将来の破壊的マイグレーション（カラム削除やデータ変換）では深刻な問題となる。また、DBトランザクションの成功（73行目の `conn.commit()`）とファイル書き込み（74行目の `mark_migration_completed`）が原子的でないため、DBだけ変更されてファイルが書かれないケースが起こりうる。

---

### 問題 A-6：`st.cache_data` と `st.rerun()` の組み合わせによる古いデータの表示

**該当箇所**: `core/app_service.py` の `get_view_counts_and_last_viewed` (71-79行目)、`get_kpi_stats_cached` (148-153行目)、`get_filter_options` (59-68行目)
**深刻度**: 🟡 中
**カテゴリ**: バグ・破損リスク
**説明**:
以下の具体的シナリオで古いデータが表示される：

1. **再生直後**: ユーザーが動画を再生 → `play_video` で `viewing_history` に INSERT → `st.rerun(scope="fragment")` が実行 → しかし `get_view_counts_and_last_viewed`（TTL=10秒）はキャッシュから古い視聴回数を返す → カード上の「視聴N回」バッジが更新されない
2. **判定直後**: 判定操作 → `set_favorite_level_with_rename` でDBを更新 → `st.rerun(scope="fragment")` → `get_kpi_stats_cached`（TTL=10秒）はキャッシュから古いKPI（未判定数・判定率）を返す → KPIカードが最大10秒間古い値を表示
3. **分析タブ**: `_load_cached_analysis_data`（TTL=600秒、`ui/analysis_tab.py`:32-36行目）は10分間キャッシュするため、その間のすべての変更（再生・判定・いいね）が反映されない

---

### 問題 A-7：Windows における `st.ctime` のセマンティクス誤解

**該当箇所**: `core/scanner.py` の `_process_file` (192行目)
**深刻度**: 🟢 低
**カテゴリ**: バグ・破損リスク
**説明**:
192行目のコメント「Windowsでは st_ctime がファイル作成時刻を示す」は基本的に正しいが、不完全である。Windows の `st_ctime` は「ファイルシステム上でのエントリ作成時刻」であり、以下の状況で「オリジナルのファイル作成日時」と乖離する：(1) ファイルを別ボリュームにコピーすると、コピー先ではコピー実行時が `ctime` になる、(2) 同一ボリューム内の移動では `ctime` が保持されるが、別ボリュームへの移動（コピー＋削除）では更新される、(3) ファイルが OneDrive 同期でダウンロードされた場合、ダウンロード時刻が `ctime` になることがある。このため `file_created_at` に記録される値が、ユーザーが期待する「元のファイル作成日」と異なる場合があり、「ファイル作成:新しい順」ソートの結果が直感に反することがある。

---

### 問題 A-8：`detect_recently_accessed_files` の `st.atime` 依存による機能不全リスク

**該当箇所**: `core/scanner.py` の `detect_recently_accessed_files` (258行目)
**深刻度**: 🔴 高
**カテゴリ**: バグ・破損リスク
**説明**:
この関数はファイルの最終アクセス時刻（`st.atime`）を元に「最近視聴されたファイル」を検出する仕組みだが、Windows Vista 以降では `NtfsDisableLastAccessUpdate` レジストリ値がデフォルトで `1`（無効）に設定されている。これにより NTFS ボリューム上のファイルに対する読み取りアクセスで `atime` が更新されない。結果として、`detect_recently_accessed_files` は実質的にファイル作成時やコピー時の `atime` を返し続け、新規アクセスを正確に検知できない。`FILE_ACCESS_DETECTED` タイプの視聴履歴記録は事実上機能しない環境が大多数と推測される。現在は起動時の自動検知が無効化されている（streamlit_app.py:157行目）ものの、サイドバーの「視聴履歴を検知」ボタンからは手動実行可能であり、誤検知による不正確な視聴履歴の蓄積リスクがある。

---

### 問題 A-9：`_process_file` で UPDATE 時に `file_size` が更新されない

**該当箇所**: `core/scanner.py` の `_process_file` (203-214行目)
**深刻度**: 🟢 低
**カテゴリ**: バグ・破損リスク
**説明**:
既存レコードの UPDATE 文（203-214行目）では `current_full_path`, `current_favorite_level`, `storage_location`, `last_file_modified`, `file_created_at`, `is_available`, `needs_selection`, `last_scanned_at` が更新されるが、`file_size` が SET 句に含まれていない。初回 INSERT 時にのみ `file_size` が記録され、以降のスキャンではファイルサイズが変更されても反映されない。分析ダッシュボードの容量集計（`analysis_tab.py`）に影響する。`performer` も同様に UPDATE 時に更新されない。

---

### 問題 A-10：`init_database` の二重呼び出し

**該当箇所**: `streamlit_app.py` の `check_and_init_database` (161行目、170-171行目)
**深刻度**: 🟢 低
**カテゴリ**: バグ・破損リスク
**説明**:
`check_and_init_database` 内で `app_service.init_database()` が2回呼び出されている（162行目と171行目）。`CREATE IF NOT EXISTS` と `ALTER TABLE` のカラム存在チェックにより実害はないが、無駄なDB操作であり、マイグレーション的な ALTER TABLE 文が毎回2度実行される。特に `UPDATE videos SET is_judging = 0 WHERE is_judging IS NULL` のような UPDATE 文（database.py:131行目）が2回走る可能性がある。

---

## カテゴリ B：パフォーマンス劣化リスク

### 問題 B-1：ページネーションの全件取得・Python側スライス

**該当箇所**: `ui/library_tab.py` の `render_library_tab` (258-313行目)、`core/video_manager.py` の `get_videos` (21-85行目)
**深刻度**: 🔴 高
**カテゴリ**: パフォーマンス
**説明**:
`get_videos()` はフィルタ条件に合致する全レコードを `fetchall()` でメモリに取得する（video_manager.py:83-85行目）。その後、library_tab.py ではキーワードフィルタ（268行目：Python の `in` 演算子で全件を線形探索）、ソート（295-299行目：Python の `sorted` で全件ソート）、ページスライス（311-313行目）をすべて Python 側で実行する。動画数が 5,000-10,000 件規模になった場合：
- メモリ: `Video` オブジェクト 10,000 個の生成コスト
- CPU: `normalize_text` によるキーワードフィルタは全文字列を NFKC 正規化するため O(N × 文字列長)
- 毎回のページ遷移で全件取得+ソートが繰り返される（キャッシュなし）

`selection_tab.py`（157-179行目）も同一パターンで、さらに `current_full_path.lower().startswith()` による Python 側パスフィルタが追加されている。

---

### 問題 B-2：`IN (?, ?, ...)` プレースホルダの SQLite 上限超過

**該当箇所**: `core/analysis_service.py` の `calculate_period_view_count` (138行目)、`get_viewing_history` (181行目)、`get_judgment_history` (208行目)、`get_view_days_ranking` (389行目)、`get_like_count_ranking` (264行目)、`core/like_service.py` の `get_like_counts` (53行目)
**深刻度**: 🟡 中
**カテゴリ**: パフォーマンス
**説明**:
これらの関数はすべて `video_ids` リストを `IN ({placeholders})` 句に展開する。SQLite のデフォルト `SQLITE_MAX_VARIABLE_NUMBER` は 999 である（SQLite 3.32.0 以降は 32766 に引き上げられたが、ビルド設定依存）。`analysis_tab.py` では `df_filtered["id"].tolist()` でフィルタ後の全動画IDを渡しており（例: 194行目）、動画数が 1,000 件を超えると `sqlite3.OperationalError: too many SQL variables` が発生する可能性がある。`calculate_period_view_count` では `period_start` と `period_end` の2パラメータも加わるため、実質 997 件が上限となる。`get_like_counts` も `library_tab.py`:293行目で全ページ分の `video_ids` を渡しているが、こちらは1ページ最大200件のため現状は安全。

---

### 問題 B-3：`snapshot.py` の非原子的な複数 `executemany` による不完全スナップショット

**該当箇所**: `core/snapshot.py` の `create_snapshot` (26-230行目)
**深刻度**: 🟢 低
**カテゴリ**: パフォーマンス
**説明**:
`create_snapshot` は1つのスナップショットDB（`dst`）に対して、メタ情報（115-118行目）、動画データ（130-155行目）、viewing_history（163-166行目）、play_history（174-190行目）、ランキング（200-206行目）、forgotten_favorites（220-226行目）を順次 `executemany` で書き込む。`sqlite3.connect(snapshot_path) as dst` のコンテキストマネージャは正常終了時にコミットするが、途中の `executemany` で例外が発生すると（例: ソースDBの読み取りエラー）、ロールバックが発生しスナップショットファイル自体は空になる。ただし `_ensure_snapshot_dir` で作成済みのDBファイルは残り続けるため、空のスナップショットファイルが `list_snapshots` で列挙されてしまう。

---

### 問題 B-4：`auto_start_counters` のネスト接続による SQLite ロック競合

**該当箇所**: `core/video_manager.py` の `play_video` (160行目, 205行目)、`record_file_access_as_viewing` (333行目, 339行目)、`core/counter_service.py` の `auto_start_counters` (24行目)
**深刻度**: 🟡 中
**カテゴリ**: パフォーマンス
**説明**:
`play_video` では `get_db_connection()` コンテキスト内（160行目で開始）で `viewing_history` への INSERT（197行目）を実行した後、同じコンテキスト内（205行目）で `counter_service.auto_start_counters` を呼び出す。`auto_start_counters` は内部で新たに `get_db_connection()` を開く（counter_service.py:24行目）。外側の接続はまだコミットされていない（`get_db_connection` のコンテキストマネージャは `yield` 後の `conn.commit()` でコミットするため）書き込みトランザクション中であり、内側の接続が `UPDATE counters` を実行しようとすると、SQLite のデフォルトロックモード（`journal_mode=delete`）では `SQLITE_BUSY` エラーが発生しうる。`record_file_access_as_viewing`（333行目）でも同一パターンが存在し、ループ内で複数回 `auto_start_counters` が呼ばれるためリスクが高い。

---

### 問題 B-5：OneDrive パス上での `rglob` スキャンの遅延リスク

**該当箇所**: `config.py` の `SCAN_DIRECTORIES` (12-16行目)、`core/scanner.py` の `_scan_directory` (167行目)
**深刻度**: 🟢 低
**カテゴリ**: パフォーマンス
**説明**:
デフォルトの `SCAN_DIRECTORIES` には OneDrive 配下のパス（`C:\Users\atsuk\OneDrive\ドキュメント\data\ClipBox_TEST`）が含まれている。`_scan_directory` は `directory.rglob("*")` で全ファイルを再帰的に列挙する（167行目）。OneDrive の「ファイルオンデマンド」機能が有効な場合、クラウド専用ファイル（プレースホルダ）に対する `file_path.stat()` の呼び出し（186行目）がファイルのダウンロードをトリガーする可能性がある。大量のクラウド専用ファイルが存在する場合、スキャンが数分〜数十分ブロックされるリスクがある。また、OneDrive の同期プロセスとの I/O 競合により、ファイルのロック・アクセス拒否エラーが散発する可能性もある。

---

## カテゴリ C：保守性・拡張性の問題

### 問題 C-1：コア層への `streamlit` 依存（設計原則違反）

**該当箇所**: `core/app_service.py` (13行目, 59行目, 71行目, 82行目, 148行目)
**深刻度**: 🔴 高
**カテゴリ**: 保守性
**説明**:
`CLAUDE.md` に明記された「コア層はUIフレームワークに依存しない状態を保つ。`core/`モジュール内でStreamlit (`st`) をインポートしないこと」という設計原則に対し、`core/app_service.py` は以下で違反している：
- 13行目: `import streamlit as st`
- 59行目: `@st.cache_data(ttl=30)` on `get_filter_options()`
- 71行目: `@st.cache_data(ttl=10)` on `get_view_counts_and_last_viewed()`
- 82行目: `@st.cache_data(ttl=30)` on `get_metrics()`
- 148行目: `@st.cache_data(ttl=10)` on `get_kpi_stats_cached()`

これにより Flask/FastAPI への移行時に `app_service.py` も書き直しが必要となり、「コア層はそのまま再利用可能」という前提が崩れている。キャッシュは UI 層（または専用のキャッシュ層）に配置すべきである。

---

### 問題 C-2：`_row_to_video()` の重複実装

**該当箇所**: `core/video_manager.py` の `_row_to_video` (264-291行目)、`ui/unrated_random_tab.py` の `_row_to_video` (20-38行目)
**深刻度**: 🟡 中
**カテゴリ**: 保守性
**説明**:
ほぼ同一の `sqlite3.Row → Video` 変換ロジックが2箇所に存在する。両者とも条件付きでカラムの存在を `row.keys()` でチェックし、デフォルト値にフォールバックする構造。新しいカラム（例: 将来の `mood_tag` や `playlist_id`）が追加された場合、片方のみ更新されて片方が取り残されるリスクがある。実際に `is_judging` と `needs_selection` カラムが追加された際には両方に修正が必要だった。`unrated_random_tab.py` が `VideoManager._row_to_video` を使わず独自実装している理由は、直接 DB クエリを実行しているため `VideoManager` インスタンスを介さない設計になっているが、これ自体がレイヤー分離の問題（UI層から直接DBアクセス: `unrated_random_tab.py`:100行目 `get_db_connection()`）を含んでいる。

---

### 問題 C-3：後方互換 shim ファイルの乱立

**該当箇所**: `core/config_store.py`、`core/history_repository.py`、`core/file_ops.py`
**深刻度**: 🟢 低
**カテゴリ**: 保守性
**説明**:
以下の3ファイルは実質的に re-export のみを行う shim である：
- `core/config_store.py` → `core/config_utils.py` を re-export（7行）
- `core/history_repository.py` → `core/database.py` の `insert_play_history` を re-export（7行）
- `core/file_ops.py` → `core/scanner.py` の `FileScanner` と `detect_recently_accessed_files` を re-export（15行）

新規開発者が機能の実装場所を探す際、`config_store.py` と `config_utils.py` のどちらが「正」なのか判別が困難。IDE の定義ジャンプで shim に到達し、さらにジャンプが必要になる。現在これらの shim を直接インポートしている外部コードが存在しないなら、削除して import パスを統一すべきである。

---

### 問題 C-4：`app_service.py` のファサード責務の曖昧さ

**該当箇所**: `core/app_service.py` 全体 (1-176行目)
**深刻度**: 🟡 中
**カテゴリ**: 保守性
**説明**:
`app_service.py` は2種類の異なる責務を混在させている：
1. **単純な re-export**（27-29行目 `init_database = init_database` 等、合計20以上のエイリアス）：UI層の import パスを集約するためだけの行
2. **独自ロジックを持つ関数**（59-68行目 `get_filter_options`、101-104行目 `scan_and_update_with_connection` 等）：DB接続の管理やキャッシュデコレータの付与

この混在により、「新機能のロジックをどこに書くべきか」が不明確になる。例えば `detect_library_root`（47-56行目）は純粋なビジネスロジックだが、`@st.cache_data` 付き関数と同じファイルに配置されている。新規開発者は「app_service に書く」「domain モジュールに書いて app_service で re-export する」「domain モジュールを直接呼ぶ」の3択で迷うことになる。

---

### 問題 C-5：`FAVORITE_LEVEL_NAMES` と `level_to_display()` の二重管理

**該当箇所**: `config.py` の `FAVORITE_LEVEL_NAMES` (25-32行目)、`core/models.py` の `level_to_display` (96-101行目)
**深刻度**: 🟢 低
**カテゴリ**: 保守性
**説明**:
お気に入りレベルの表示名が2箇所で独立管理されている：
- `config.py`: `{-1: '未判定', 0: 'レベル0', 1: 'レベル1', ..., 4: 'レベル4'}`
- `models.py`: `level_to_display()` は `-1 → "未判定"`, `0-4 → "Lv{n}"` を返す

表示形式が異なる（「レベル0」vs「Lv0」）ため、UIの場所によって同じレベルが異なる名前で表示される。`video_manager.py`:430行目では `FAVORITE_LEVEL_NAMES` を使い、`video_card.py`:121行目では `f"Lv{level}"` をハードコードしている。新しいレベルを追加する場合（例: レベル5）、`config.py`、`models.py`、`video_card.py` の3箇所を更新する必要がある。

---

### 問題 C-6：テストの `monkeypatch` 二重パッチ依存（本番DB書き込みリスク）

**該当箇所**: `tests/test_video_manager.py` (21-22行目)、`tests/test_analysis_service.py` (14-15行目)
**深刻度**: 🔴 高
**カテゴリ**: 保守性
**説明**:
テストは `config.DATABASE_PATH` と `core.database.DATABASE_PATH` の**両方**を `monkeypatch` で一時パスに差し替える必要がある。これは `database.py` が `from config import DATABASE_PATH` でモジュールレベルで変数をバインドするため、`config.DATABASE_PATH` を変更しても `database.DATABASE_PATH` には反映されないという Python のインポート仕様に起因する。もしパッチの一方を忘れた場合（例: `database.DATABASE_PATH` のパッチ漏れ）、テストは本番の `data/videos.db` に対して読み書きを行い、テストデータの挿入・削除が本番データを破壊する。現在のテストでは正しくパッチされているが、新しいテストファイルを追加する際にこのパターンを知らないとリスクが生じる。テスト用のフィクスチャとして共通化されていないことも問題。

---

### 問題 C-7：`Video` データクラスのフラグフィールド肥大化

**該当箇所**: `core/models.py` の `Video` クラス (14-31行目)
**深刻度**: 🟢 低
**カテゴリ**: 保守性
**説明**:
`Video` データクラスには、本来の動画メタデータ（ファイル名、パス、サイズ等）に加えて、用途固有のフラグが直接追加されている：
- `is_available` (28行目): ファイルの物理的な存在状態
- `is_deleted` (29行目): 論理削除フラグ
- `is_judging` (30行目): 判定作業中の一時状態
- `needs_selection` (31行目): セレクション対象フラグ

`CLAUDE.md` に記載されている将来計画（気分タグ、プレイリスト、ML推薦）が実装される際、`is_in_playlist`、`mood_tags`、`recommendation_score` 等のフィールドが追加され続けると、データクラスが肥大化し、`_row_to_video` の変換ロジックも複雑化する。また、`is_judging` は再起動をまたいで維持される永続的なDBフラグだが、実質的にはセッション中の一時状態であり、データモデルとしての位置づけが曖昧。

---

### 問題 C-8：UI層からの直接DBアクセス

**該当箇所**: `ui/unrated_random_tab.py` (100行目, 128行目)、`ui/analysis_tab.py` (501行目)
**深刻度**: 🟡 中
**カテゴリ**: 保守性
**説明**:
`unrated_random_tab.py` は `from core.database import get_db_connection` をインポートし、直接 SQL を実行している（100-114行目、128-137行目）。同様に `analysis_tab.py` も `_render_response_time_histogram` 内で直接 `get_db_connection()` を使っている（501行目）。これはレイヤードアーキテクチャの原則（UI → core → data）に違反し、SQLの変更がUI層に直接影響する。`VideoManager` や `analysis_service` を経由すべきである。

---

### 問題 C-9：`models.py` の `create_sort_key` における「タイトル:降順」の不正実装

**該当箇所**: `core/models.py` の `create_sort_key` (145行目)
**深刻度**: 🟢 低
**カテゴリ**: バグ・破損リスク
**説明**:
`"タイトル:降順"` のソートキーとして `name[::-1]`（文字列の反転）が使われている（145行目）。これは正規化後の文字列を逆順にしたものをキーとするため、正しい辞書順の逆ソートにはならない。例えば "abc" → "cba", "abd" → "dba" となり、逆順ソートでは "abd" > "abc" が期待されるが、"dba" < "cba" となるため結果が意図と異なる。

---

## 最終サマリー

### 1. 今すぐ対処すべき問題 Top 5

| 優先度 | 問題 | 理由 |
|--------|------|------|
| 1 | **A-1: 外付けHDD未接続時の `is_available=0` 一括上書き** | 日常的なスキャン操作でHDD上の全レコードのフラグが失われる。発生頻度が高く、データ復旧にはHDDを再接続してスキャンし直す必要がある。 |
| 2 | **C-6: テストの monkeypatch 二重パッチ依存** | 新テスト追加時にパッチ漏れすると本番DBが破壊される。テスト基盤の信頼性に直結する問題。共通フィクスチャを作成して一元化すべき。 |
| 3 | **B-4: `auto_start_counters` のネスト接続** | `play_video` と `record_file_access_as_viewing` の両方で発生しうる `SQLITE_BUSY` エラー。再生操作という主要機能パスで発生するため影響が大きい。 |
| 4 | **A-6: `st.cache_data` と `st.rerun()` による古いデータ表示** | 操作直後にKPIや視聴回数が更新されない体験は、日常利用でのストレス要因。特に判定後のKPI更新遅延はユーザーの作業テンポを阻害する。 |
| 5 | **C-1: コア層への streamlit 依存** | CLAUDE.md で明記された設計原則に反しており、将来の Flask/FastAPI 移行を困難にする。早期に修正しないと依存箇所が増え続ける。 |

### 2. 動画コレクション拡大前に対処すべきパフォーマンス問題

| 問題 | 影響が顕在化する規模 | 説明 |
|------|---------------------|------|
| **B-1: 全件取得+Python側ソート** | 3,000件〜 | ページ遷移のたびに全件取得が繰り返され、レスポンスが目に見えて劣化する |
| **B-2: IN句プレースホルダ上限** | 1,000件〜 | 分析タブのランキング・視聴履歴クエリが `OperationalError` で失敗する |
| **B-4: ネスト接続のロック競合** | 同時操作増加時 | 再生操作が散発的に失敗する（件数増加で操作頻度も増加） |
| **B-5: OneDrive パスのスキャン遅延** | ファイル数増加時 | クラウド同期中のスキャンがブロックされ、UIが長時間フリーズする |

### 3. 技術的負債として記録にとどめてよい問題

| 問題 | 理由 |
|------|------|
| **A-2: essential_filename 衝突** | 同一名ファイルが異なるフォルダに存在するケースは、個人利用では稀。発生時の影響は限定的。 |
| **A-4: likes の無制限追記** | 現利用規模では連打によるレコード蓄積は微量。分析精度への影響も軽微。 |
| **A-5: migration_history.txt** | 現状の唯一のマイグレーションは再実行されても安全。将来の破壊的マイグレーション追加時に再設計すればよい。 |
| **A-7: st.ctime のセマンティクス** | ソート順が直感と異なる場合があるが、実害は限定的。 |
| **A-9: UPDATE時の file_size 未更新** | ファイルサイズが頻繁に変わる状況は稀。 |
| **A-10: init_database の二重呼び出し** | `CREATE IF NOT EXISTS` で安全。性能影響も微小。 |
| **B-3: snapshot の不完全ファイル** | 利用頻度が低い機能。空ファイルが残っても手動削除可能。 |
| **C-3: shim ファイルの乱立** | 新規 import の追加は止まっており、混乱は限定的。 |
| **C-4: app_service のファサード曖昧さ** | 現状のチーム規模（個人開発）では致命的ではない。 |
| **C-5: FAVORITE_LEVEL_NAMES 二重管理** | 新レベル追加頻度が低い限り問題は顕在化しない。 |
| **C-7: Video データクラスの肥大化** | 将来の機能追加時にリファクタリングすれば足りる。 |
| **C-9: タイトル降順ソートの不正実装** | 利用頻度が低いソート順。気づきにくいが実害も小さい。 |

---

## 対策方針：Top 5 問題への修正アプローチ

### 対策 1：A-1 — 外付けHDD未接続時の `is_available=0` 一括上書き

**方針: `scan_and_update` の `is_available=0` 更新を、スキャン対象ディレクトリ配下のレコードに限定する**

**現状の問題構造:**
```
scan_and_update(conn)
  ├── for dir in self.scan_directories:
  │     if dir.exists(): _scan_directory(dir)  ← HDD未接続なら丸ごとスキップ
  │
  └── SELECT * FROM videos                     ← 全レコードを取得
        └── found_filesに無い → is_available=0  ← HDD上の動画も含めて一律フラグ落とし
```

**修正の方向性:**

`is_available=0` の更新対象を「今回実際にスキャンしたディレクトリ配下のレコード」に限定する。具体的には、スキャンを実行した（`directory.exists()` が True だった）ディレクトリのリストを保持し、`is_available=0` 更新時に `current_full_path` が当該ディレクトリ配下であるレコードのみを対象にする。

```
scan_and_update(conn)
  ├── scanned_dirs = []
  ├── for dir in self.scan_directories:
  │     if dir.exists():
  │       _scan_directory(dir)
  │       scanned_dirs.append(dir)    ← 実際にスキャンしたdirを記録
  │
  └── SELECT * FROM videos
        └── current_full_path が scanned_dirs 配下 かつ found_filesに無い
              → is_available=0         ← スキャン対象外のディレクトリは触らない
```

**変更対象ファイル:**
- `core/scanner.py`: `scan_and_update` メソッド（110-138行目）

**設計上の注意点:**
- `scanned_dirs` を `self` 属性として保持するか、ローカル変数として扱うか。`scan_single_directory` との整合性を考慮すると、ローカル変数で十分
- パスの比較は `Path.resolve()` と `str.startswith()` の組み合わせで行う。Windows のパス区切り（`\` vs `/`）を考慮し、正規化後に比較する
- 既存の `scan_single_directory` は変更不要（もともと安全な設計）

**影響範囲:** 小（`scanner.py` 1メソッドの変更）。`scan_and_update` を呼び出すのは `app_service.scan_and_update_with_connection` のみ。

---

### 対策 2：C-6 — テストの monkeypatch 二重パッチ依存

**方針: 共通の pytest フィクスチャを `conftest.py` に作成し、DB パスのパッチを一元化する**

**現状の問題構造:**
```python
# 各テストファイルで毎回手動パッチ（片方忘れると本番DB破壊）
monkeypatch.setattr(config_module, "DATABASE_PATH", db_path)
monkeypatch.setattr(database, "DATABASE_PATH", db_path)
```

**修正の方向性:**

`tests/conftest.py` に共通フィクスチャを作成する。これにより、新テスト追加時にパッチ漏れが構造的に発生しなくなる。

```
tests/conftest.py (新規作成):
  @pytest.fixture
  def tmp_db(tmp_path, monkeypatch):
      db_path = tmp_path / "test.db"
      monkeypatch.setattr(config, "DATABASE_PATH", db_path)
      monkeypatch.setattr(database, "DATABASE_PATH", db_path)
      database.init_database()
      return db_path
```

**変更対象ファイル:**
- `tests/conftest.py`: 新規作成
- `tests/test_video_manager.py`: `tmp_db` フィクスチャを使うようにリファクタ
- `tests/test_analysis_service.py`: 同上（`_setup_temp_db` ヘルパーを `tmp_db` フィクスチャに置換）
- `tests/test_migration.py`: `test_migration.py` は独自の最小スキーマを使うため現状維持でも可

**根本対策の検討:**

パッチ漏れが問題の根本原因は、`database.py` がモジュールレベルで `from config import DATABASE_PATH` を行い、`get_db_connection` 内で `sqlite3.connect(DATABASE_PATH)` のように変数を直接参照していること。もしこれを `sqlite3.connect(config.DATABASE_PATH)` に変更すれば、`config.DATABASE_PATH` の1箇所だけパッチすればよくなる。ただし、この変更はアプリケーション全体のインポートチェーンに影響するため、フィクスチャ導入とは別タスクとして扱う。

**影響範囲:** テストコードのみ。プロダクションコードの変更なし。

---

### 対策 3：B-4 — `auto_start_counters` のネスト接続による SQLite ロック競合

**方針: `auto_start_counters` が外部から接続オブジェクトを受け取る（依存性注入）ように変更する**

**現状の問題構造:**
```
play_video():
  with get_db_connection() as conn:     ← 接続1（トランザクション中）
    conn.execute(INSERT viewing_history)
    auto_start_counters(viewed_at)       ← ここで接続2を開く
      └── with get_db_connection() as conn2:  ← SQLITE_BUSY リスク
            conn2.execute(UPDATE counters)
```

**修正の方向性:**

`auto_start_counters` と `_fetch_start_times` のシグネチャに `conn` パラメータを追加し、外側のトランザクションの接続を再利用する。

```
# 変更前
def auto_start_counters(event_time: datetime):
    with get_db_connection() as conn:
        ...

# 変更後
def auto_start_counters(event_time: datetime, conn):
    starts = _fetch_start_times(conn)
    ...
```

呼び出し側（`play_video`, `mark_as_viewed`, `record_file_access_as_viewing`）は既に `get_db_connection()` コンテキスト内にいるため、その `conn` を渡すだけでよい。

**変更対象ファイル:**
- `core/counter_service.py`: `auto_start_counters(event_time, conn)` にシグネチャ変更（`get_db_connection` を内部で開かない）
- `core/video_manager.py`: `play_video`（205行目）、`mark_as_viewed`（225行目）、`record_file_access_as_viewing`（339行目）の呼び出しに `conn` を渡す

**設計上の注意点:**
- `counter_service.reset_counter` は UI から直接呼ばれるため、内部で接続を開く現行の設計を維持してよい（ネスト接続にならないため）
- `get_counters_with_counts` も同様に単独呼び出しのため変更不要
- 後方互換のため `conn=None` をデフォルトにし、`None` の場合は従来どおり内部で接続を開くパターンも考えられるが、ネスト接続のリスクを見えにくくするため、明示的な引数必須が望ましい

**影響範囲:** `counter_service.py` と `video_manager.py` の変更。UI層のコード変更は不要（`video_manager` のメソッドシグネチャは不変）。

---

### 対策 4：A-6 — `st.cache_data` と `st.rerun()` による古いデータ表示

**方針: 書き込み操作の直後に `st.cache_data.clear()` で該当キャッシュを明示的に無効化する**

**現状の問題構造:**
```
ユーザー操作（再生/判定/いいね）
  └── DB書き込み成功
        └── st.rerun(scope="fragment")
              └── キャッシュされた古い値が返される（TTL内）
                    └── UI上のKPI・視聴回数が更新されない
```

**修正の方向性:**

Streamlit の `st.cache_data` は関数単位で `.clear()` メソッドを提供している。書き込み操作の成功後、影響を受けるキャッシュ関数の `.clear()` を呼び出す。

```
# 再生操作後
app_service.get_view_counts_and_last_viewed.clear()
app_service.get_kpi_stats_cached.clear()
app_service.get_metrics.clear()

# 判定操作後
app_service.get_kpi_stats_cached.clear()
app_service.get_filter_options.clear()
```

**具体的な適用箇所:**

| 操作 | 呼び出し元 | 無効化すべきキャッシュ |
|------|-----------|---------------------|
| 再生 (`_handle_play`) | `streamlit_app.py:81-94` | `get_view_counts_and_last_viewed`, `get_kpi_stats_cached`, `get_metrics` |
| 判定 (`_handle_judgment`) | `streamlit_app.py:98-114` | `get_kpi_stats_cached`, `get_filter_options` |
| スキャン (`scan_files`) | `streamlit_app.py:219-229` | `get_filter_options`, `get_metrics`, `get_kpi_stats_cached` |
| 視聴履歴検知 (`detect_and_record_file_access`) | `streamlit_app.py:28-62` | `get_view_counts_and_last_viewed`, `get_metrics` |

**変更対象ファイル:**
- `streamlit_app.py`: 各ハンドラーの `st.rerun()` 直前にキャッシュクリアを追加

**設計上の注意点:**
- `_load_cached_analysis_data`（TTL=600秒、`analysis_tab.py`:32行目）は分析タブ専用であり、操作ごとのクリアはやりすぎ。分析タブ上部に「データを更新」ボタンを設け、ユーザー主導でクリアする方が適切
- キャッシュクリアの呼び出しは UI 層（`streamlit_app.py`）に閉じるため、コア層の設計に影響しない
- 将来的には、書き込み系メソッドが自動的にキャッシュ無効化イベントを発行する仕組み（Observer パターン）も検討できるが、現段階では YAGNI

**影響範囲:** `streamlit_app.py` のみ。各ハンドラーに 1-3 行の `.clear()` 呼び出しを追加。

---

### 対策 5：C-1 — コア層への streamlit 依存

**方針: `app_service.py` を `core/` から `ui/` に移動し、キャッシュ層と純粋ファサードを分離する**

**現状の問題構造:**
```
core/app_service.py
  ├── import streamlit as st           ← 設計原則違反
  ├── @st.cache_data 付き関数 (4箇所)  ← UI依存のキャッシュ
  └── 単純な re-export (20行以上)       ← ファサード
```

**修正の方向性:**

`app_service.py` を役割に応じて分割する。

```
変更前:
  core/app_service.py  (streamlit依存 + re-export + ロジック が混在)

変更後:
  ui/cache.py          (st.cache_data 付き関数をここに集約)
  core/app_service.py  (streamlit非依存の純粋ファサード/ロジック)
```

**Step 1: `ui/cache.py` を新規作成**
`@st.cache_data` を使用する4関数を移動:
- `get_filter_options`
- `get_view_counts_and_last_viewed`
- `get_metrics`
- `get_kpi_stats_cached`

これらは `core/database.py` のヘルパーを呼ぶだけの薄いラッパーなので、UI層に置くのが自然。

**Step 2: `core/app_service.py` から `import streamlit as st` を削除**
残る関数は全て streamlit に非依存:
- `create_video_manager`, `record_file_access_as_viewing`, `set_favorite_level_with_rename`
- `detect_library_root`, `scan_and_update_with_connection`
- re-export 群

**Step 3: UI側の import パスを更新**
`streamlit_app.py`, `ui/library_tab.py`, `ui/analysis_tab.py` 等で `app_service.get_view_counts_and_last_viewed()` → `cache.get_view_counts_and_last_viewed()` に変更。

**変更対象ファイル:**
- `ui/cache.py`: 新規作成（キャッシュ付き関数を集約）
- `core/app_service.py`: `import streamlit` と `@st.cache_data` 関数を削除
- `streamlit_app.py`: import パスの更新
- `ui/library_tab.py`, `ui/selection_tab.py`, `ui/unrated_random_tab.py`, `ui/analysis_tab.py`: import パスの更新

**設計上の注意点:**
- `analysis_tab.py` 内の `_load_cached_analysis_data`（32行目）も `ui/cache.py` に移動する候補だが、分析タブ固有であるため `analysis_tab.py` に残してもよい
- re-export だけの行（`init_database = init_database` 等）は、将来的には呼び出し元が直接 `core.database` を import する形に段階的に移行するのが望ましいが、今回のスコープ外
- `ui/cache.py` から `core/` のモジュールを呼ぶのは `UI → core → data` のレイヤー方向に合致しており問題なし

**影響範囲:** 中（ファイル5-8個の import パス変更）。ただし機能の変更はなく、テストで検証可能。

---

### 対策実施の推奨順序

```
Phase 1 — 安全性確保（既存データの保護）
  ├── 対策2: conftest.py フィクスチャ（テスト基盤の整備を最優先）
  └── 対策1: scan_and_update の is_available 更新スコープ限定

Phase 2 — 安定性向上（日常操作の信頼性）
  ├── 対策3: auto_start_counters の接続注入
  └── 対策4: キャッシュ無効化の追加

Phase 3 — 設計改善（将来の拡張性）
  └── 対策5: app_service の分離
```

Phase 1 → 2 → 3 の順で実施することで、最もリスクの高い問題から解決しつつ、
各フェーズの変更が後続フェーズの作業を阻害しない構成になっている。
Phase 1 と Phase 2 は相互に独立しているため並行実施も可能。

---

*本レビューは 2026-02-24 時点のコードベースに基づく。*
