# CHANGELOG

AIへの引き継ぎノート。主要な変更を遡及記録。

---

## 2026-06-03 — Phase 3-A: FastAPI 基盤構築（最小・read-only）

**目的**: MIGRATION_PLAN の Phase 3-A を実装。FastAPI が `core/` を共有して `videos.db` から実データを read-only で配信できることを最小構成で実証する。Streamlit(8501) と並走しても DB へ書き込まない。`core/`・`ui/`・`streamlit_app.py`・`data/` は一切変更せず、新規ファイルのみ。

**関連ファイル**: `api_app.py`（新規）, `api/__init__.py`・`api/schemas.py`・`api/videos.py`（新規）, `tests/api/`（新規）, `run_api.bat`（新規）, `requirements.txt`（fastapi/uvicorn/httpx 追加）

- `api_app.py`: FastAPI エントリーポイント（既定 `127.0.0.1:8000`）。CORS で `localhost:3000` を許可。`GET /api/health` を提供。**lifespan は read-only**（起動時 `check_database_exists()` の確認のみ。`init_database`/`run_startup_migration` は実行せず DB 初期化は Streamlit に委ねる＝並走中の SQLite 同時書き込み回避）
- `api/schemas.py`: Pydantic モデル `VideoOut`（snake_case、派生 `is_selection_completed`/`is_judged` を含む。日時は ISO8601 文字列で素通し）, `VideosResponse`, `HealthResponse`。`VideoOut.from_video()` で dataclass → モデル変換
- `api/videos.py`: `GET /api/videos`。フィルタ（levels/performers/storage/availability/show_unavailable/show_deleted/needs_selection_filter/exclude_selection）を `app_service.create_video_manager().get_videos()` にマップ。サーバー側ソート（level/modified/created/title）+ ページング（page/page_size, 上限200）。ファサード経由のみ（core 変更不要）
- **設計**: `api/` は `core.app_service` のみを呼ぶ（ファサード一本化）。`streamlit` 非 import。view_count/last_viewed ソート・filter-options・mutation・wrapper は Phase 3-B 送り
- **検証**: `pytest tests/` 32 passed（既存27 + 新規API5）。uvicorn 起動で `/api/health`→`{status:ok, db_exists:true}`、`/api/videos?page_size=3`→実データ total=214、`/docs`(OpenAPI) 200 を確認。`git status` で `core/`・`ui/`・`streamlit_app.py`・`data/videos.db` に差分なし

---

## 2026-06-03 — Phase 3 準備: FastAPI/Next.js 移行計画の立案（ドキュメントのみ）

**目的**: Phase 2 の移行仕様書を土台に、FastAPI（バックエンド API）+ Next.js（フロントエンド）への移行を「Streamlit を動かしたまま安全に進める」ための実装計画を立案。コードは一切変更しない。

**関連ファイル**: `docs/context/MIGRATION_PLAN.md`（新規）

- バックエンドは **FastAPI** を採用（`analysis_service` の pandas DataFrame を Pydantic/JSON 直列化・自動 OpenAPI で扱える点、Next.js 側の型生成が容易な点が理由）。既存 docs の「Flask」表記は FastAPI 実装への読み替え（REST パス・スキーマは不変）と冒頭で明示
- `MIGRATION_PLAN.md`: 6タスクを報告フォーマット（結論・推奨/詳細/注意点・リスク）で記述 — (1)技術選定（FastAPI+uvicorn / Next.js App Router+TS / shadcn/ui、ポート8000推奨、`next build && next start`）、(2)ディレクトリ構成（`api_app.py`+`api/`、`frontend/`、`ui`と`api`を物理分離）、(3)FastAPI 実装計画（read系→中核mutation→統計→分析→スキャンの順、Pydantic response model + DataFrame→dict/list + datetime ISO8601、`TestClient`+既存`tmp_db`再利用）、(4)Next.js 実装計画（画面実装順、`VideoCard`等の再利用部品、TanStack Query=サーバー状態 / Zustand=クライアント横断状態、AVPはPhase4対象外）、(5)5フェーズ分割（各Phaseに**DB書き込み主体**を明記）、(6)リスク（SQLite同時書き込み・起動時migration競合・subprocess再生・CORS等）
- **検証**: `git status` で `core/`・`ui/`・`streamlit_app.py`・`data/` に差分なし（変更は docs/ と本ファイルのみ）。`pytest tests/` 全件グリーン（コード未変更の回帰なし確認）

---

## 2026-06-03 — Phase 2: Flask/Next.js 移行のための仕様書化（ドキュメントのみ）

**目的**: Flask（バックエンド API）+ Next.js（フロントエンド）への移行を「迷わず実行できる」状態にするための設計文書を新規作成。コードは一切変更しない。

**関連ファイル**: `docs/context/API_SPEC.md`（新規）, `docs/context/ACCEPTANCE_CRITERIA.md`（新規）, `docs/context/MIGRATION_MAP.md`（新規）

- `API_SPEC.md`: `core/app_service.py` を起点に Flask エンドポイントを6グループ（動画一覧・検索 / 再生・判定 / いいね / 統計・分析 / スキャン・設定 / DBバックアップ）で定義。共通事項に API 境界方針（app_service wrapper 一本化）・ローカル専用実行環境前提・Video レスポンススキーマ（snake_case、派生 `is_selection_completed` 含む）・論理削除ポリシー（一覧系のみ既定除外、単体取得は削除済みも返す）・ソート/ページング方針を明記。ファイル不在時の副作用（`is_available=0` 更新）を再生・判定エンドポイントに明記。分析画面は個別エンドポイントに分割。AVP は HTTP API 対象外として独立節に明記
- `ACCEPTANCE_CRITERIA.md`: Tier1/Tier2（各 ライブラリ/ランダム/運命の1本）・ランキング・分析・検索・AVP・設定の合否基準を日本語チェックリストで記述。異常系はファイル不在時の実挙動（履歴・レベル不変、可用性のみ更新）に整合
- `MIGRATION_MAP.md`: 現行 Streamlit UI 関数（`ui/*.py`, `streamlit_app.py`, `ui/cache.py`）と将来の Flask API の対応を画面単位の表で列挙
- **検証**: `git status` で `core/`・`ui/`・`streamlit_app.py` に差分なし（変更は docs/ と本ファイルのみ）。`pytest tests/` 全件グリーン（コード未変更の回帰なし確認）

---

## 2026-06-03 — Phase 1 追加整理: 残存デッドコード削除（調査サマリー実行）

**目的**: 読み取り専用の追加調査で特定した、active tree に残る未使用ヘルパーを削除。直近慣行に合わせ archive/ 退避ではなく直接削除（復旧は git 履歴）。

**関連ファイル**: `core/models.py`, `core/app_service.py`, `docs/reports/CODE_REVIEW_20260224.md`

- `core/models.py` から未使用4つを削除: `Video.display_name`（表示は essential_filename 直接利用に統一）・`Video.get_truncated_title()`・`create_badge()`（UI は `video_card._create_badge` を使用、重複）・`level_to_display()`（表示名は `FAVORITE_LEVEL_NAMES` に一本化）。併せて未使用となった `from config import FAVORITE_LEVEL_NAMES` import を除去
- `core/app_service.py` から未使用ラッパー `scan_and_update(scanner, conn)`（bare版）を削除。UI は `scan_and_update_with_connection()` のみ使用、テストは `scanner.scan_and_update()` を直接呼ぶため影響なし
- `CODE_REVIEW_20260224.md`: A-8 / B-3 / C-3 / C-5 を「✅ 解決済み (2026-06-03)」に更新（解決済み 11→15件）
- **保持**: `Video.is_judged()` は未使用だが今回サマリー対象外のため据え置き（次回検討候補）
- **検証**: `py_compile` OK、`pytest` 27 passed、Streamlit 起動して全7画面（Tier 1/2・ランキング・分析・検索・AVP・設定）を Playwright でスクショ・例外チェック → すべて例外0件、動画カード描画・ソート・KPI 正常を確認

---

## 2026-06-03 — Phase 1 追加整理: 未接続削除UI・KPI共通化・Streamlit warning対応

**目的**: Phase 1 準備の追加判断に基づき、復旧前提ではなく不要と判断した未接続コードを削除し、Tier 1/2 KPI 表示と用語 docs の一貫性を上げる。

**関連ファイル**: `core/video_manager.py`, `ui/analysis_tab.py`, `ui/components/kpi_display.py`, `ui/tier2_tab.py`, `streamlit_app.py`, `ui/{avp,extra,library,search,selection,unrated_random}_tab.py`, `docs/context/{DATA_MODEL,GLOSSARY}.md`

- `VideoManager.mark_as_deleted()` を削除。削除 UI は当面作らない方針のため、未接続の論理削除操作を active code から外した
- `ui/analysis_tab.py` の未使用 Matplotlib helper `_annotate_bars()` を削除。現行の分析描画は Plotly 経路に統一されている
- Streamlit の deprecated `use_container_width=True` を `width="stretch"` に置換
- KPI 表示を `KpiCard` / `render_metric_cards()` に抽象化し、Tier 2 は `render_selection_kpi_cards()` から共通コンポーネントを利用するよう変更
- `DATA_MODEL.md` を GLOSSARY 方針へ追従。概念名は「セレクション完了」、画面表示は「選別済み」、「ライブラリ取り込み済み」は使わない方針を明記
- `viewing_history` は集計用、`play_history` は再生ログ詳細として役割を明確化

---

## 2026-06-02 — Phase 1 追加整理: active 側の旧本体・shim・旧入口を除去
**目的**: Phase 1 アーカイブ済み機能の実体や後方互換 shim が active tree に残り、docs 上の「退避済み」と実ファイルの状態がずれていたため、復旧元を `archive/` に一本化する。
**関連ファイル**: `core/scanner.py`, `core/config_store.py`, `core/history_repository.py`, `ui/unrated_random_tab.py`, `ui/selection_tab.py`, `streamlit_app.py`, `core/app_service.py`, `core/video_manager.py`, `core/file_ops.py`, `ui/library_tab.py`, `ui/components/video_card.py`, `config.py`, `core/models.py`, `docs/context/{GLOSSARY,DATA_MODEL,PROJECT_OVERVIEW,IMPLEMENTATION_GUIDE}.md`, `CLAUDE.md`

- ファイルアクセス検知の active 本体 `detect_recently_accessed_files()` を `core/scanner.py` から除去。復旧元は `archive/detect_file_access.py`
- 後方互換 shim `core/config_store.py` / `core/history_repository.py` を active tree から除去。復旧元は `archive/`
- 旧トップレベル入口 `render_unrated_random_tab()` / `render_selection_tab()` を除去し、Tier 1/2 から呼ばれる下位モード関数だけを active に残した
- active ファイル内の commented archived code を削除。互換のための DB カラム・テーブル定義は残す
- 表示名の正本を `FAVORITE_LEVEL_NAMES` に寄せ、レベル表記を `LvN` に統一
- session key の `filter_actors` を `filter_performers` に移行し、旧キーは起動時に引き継いで削除
- 用語整理: `!` は現行の未選別 prefix、`?` は旧表記扱い。概念名は「セレクション完了」、画面表示は「選別済み」、「ライブラリ取り込み済み」は使わない
- `viewing_history` は集計用、`play_history` は再生ログ詳細として docs に明記

---

## 2026-06-02 — Phase 1 追加整理: archived 本体を archive/ に集約

**目的**: docs 上は archived とされているのに `core/` / `ui/` に tracked な実ファイルが残っていた状態を解消し、復旧元を `archive/` に一本化する。

**関連ファイル**: `core/settings.py`, `core/counter_service.py`, `core/snapshot.py`, `ui/analysis_tab_v2.py`, `archive/{settings,counter_service,snapshot,analysis_tab_v2}.py`, `core/app_service.py`, `core/video_manager.py`, `streamlit_app.py`, `tests/test_video_manager.py`, `docs/context/DATA_MODEL.md`

- `core/settings.py` / `core/counter_service.py` / `core/snapshot.py` / `ui/analysis_tab_v2.py` の active tree 側の重複を除去。実装本体は `archive/` 配下の退避済みコピーを復旧元とする
- archived 済みモジュールへのコメントアウト import / re-export を active code から除去
- `DATA_MODEL.md` に `is_judging` / `counters` / archived viewing_method の扱いを追記
- archived 機能に対する skip テストを削除

---

## 2026-06-02 — Phase 1 追加整理: デッドコード／死にUI／孤立 shim の退避（壁打ち合意 #1-8）

**目的**: Flask/Next.js 移行前に、Phase 1 アーカイブの波及で死んだコードと未使用要素を整理。方式は Phase 1 と同じ（archive/ 退避＋コメントアウトでコード保持）。

**関連ファイル**: `core/video_manager.py`, `core/app_service.py`, `core/file_ops.py`, `ui/library_tab.py`, `streamlit_app.py`, `tests/test_video_manager.py`, `tests/test_history_repository.py`, `archive/{config_store,settings,history_repository,video_manager_methods}.py`

- **死にUI: 「判定中のみ表示」フィルタ無効化**: `is_judging` は Phase 1 で `set_judging_state` が退避され常に0となり、ONにすると0件になる死にUIだった。`library_tab.py` のチェックボックス・`get_videos(show_judging_only=...)` 呼び出し・signature・`video_manager.get_videos` の `show_judging_only` 引数/分岐・`streamlit_app.py` の `filter_judging_only` 初期化をコメントアウト。`test_get_videos_filters_judging_only` を skip 化
- **VideoManager 未使用/重複メソッド退避**: `set_favorite_level`（`set_favorite_level_with_rename` の重複）・`get_random_video`・`get_viewing_stats`・`get_videos_with_stats`・`record_file_access_as_viewing`（ファイルアクセス検知退避により孤立）をコメントアウト。本体は `archive/video_manager_methods.py` に集約
- **core/settings.py アーカイブ**: 当初「スキャン設定と共用のため残す」とされたが、実際はスキャンと無関係で唯一の利用者（ファイルアクセス検知）が退避済の孤立モジュールと判明。`archive/settings.py` に退避し、`app_service` の `get_last_access_check_time`/`update_last_access_check_time` import・re-export をコメントアウト
- **孤立ファサード/re-export 整理** (`app_service.py`): `record_file_access_as_viewing`・`detect_recently_accessed_files`(＋`file_ops` 側 re-export)・`detect_recently_accessed_files_with_connection`・`insert_play_history`（video_manager は `core.database` を直接利用）をコメントアウト。`video_manager.py` の未使用 import `get_last_viewed_map` を除去
- **shim 退避**: `config_store.py`（どこからも未 import）・`history_repository.py`（test専用）を `archive/` に退避。`test_history_repository.py` は `core.database` 直参照に変更しカバレッジ維持
- **対象外**: docs 陳腐化更新（別タスク）、`mark_as_deleted`／コメント残骸／archive 内 .pyc（低優先で見送り）
- **検証**: `pytest` 27 passed / 2 skipped、`py_compile` OK、Streamlit 起動して Tier 1（判定中フィルタ消滅を確認）・分析ダッシュボードが例外なく描画されることを Playwright で確認

---

## 2026-06-02 — Phase 1 バグ修正: Tier 1/2 フラグメントエラー修正 + Tier 1 KPI 追加

**関連ファイル**: `ui/tier1_tab.py`, `ui/tier2_tab.py`

- **根本原因**: `render_tier1_tab` / `render_tier2_tab` に `@st.fragment` がなく、サブ関数内の `st.rerun(scope="fragment")` が fragment スコープ外から呼ばれ `StreamlitAPIException` が発生していた
- **修正**: 両ファイルに `@st.fragment` を追加。Streamlit はネストフラグメントをサポートするため `render_library_tab`（内側 fragment）との共存は問題なし
- **KPI 追加**: `render_tier1_tab` に `render_kpi_cards()` を追加。Tier 2 と同様のパターンで画面最上部に固定表示
- **session_state 初期化**: `render_tier1_tab` に `unrated_fate_video` の初期化を追加（`render_unrated_fate_mode` が前提とするキー）
- **動作確認**: Playwright でランダムタブ再生・運命の1本（Tier 1・Tier 2 両方）が全てエラーなしで動作確認済み

---

## 2026-06-02 — Phase 1: 整理・削減（アーカイブ + サイドバー再構成）

**関連ファイル**: `streamlit_app.py`, `core/video_manager.py`, `core/app_service.py`, `ui/components/video_card.py`, `ui/unrated_random_tab.py`, `ui/selection_tab.py`, `ui/tier1_tab.py`（新規）, `ui/tier2_tab.py`（新規）, `docs/context/GLOSSARY.md`（新規）

### アーカイブした機能（`archive/` に保存、呼び出し箇所はコメントアウト）

- **ファイルアクセス検知** (`detect_and_record_file_access`): サイドバーの「📊 視聴履歴を検知」ボタンと関数本体を無効化。→ `archive/detect_file_access.py`
- **判定中バッジ** (`is_judging`): `video_card.py` のバッジ描画と `_handle_play` / `_handle_judgment` の `set_judging_state` 呼び出しを無効化。DBカラム `is_judging` は保持。→ `archive/video_manager_methods.py`
- **手動視聴記録** (`mark_as_viewed`): 外部呼び出しなし、VideoManager からコメントアウト。→ `archive/video_manager_methods.py`
- **カウンター機能** (`counter_service.py`): `auto_start_counters` の全呼び出し箇所を無効化。`counters` テーブル・データは保持。→ `archive/counter_service.py`
- **スナップショット** (`snapshot.py`): `app_service.py` の re-export を無効化。→ `archive/snapshot.py`
- **分析ダッシュボード v2** (`analysis_tab_v2.py`): サイドバー選択肢から削除、import を無効化。→ `archive/analysis_tab_v2.py`

### サイドバー再構成

- **Tier 1 / Tier 2 構造**: サイドバーを「Tier 1・Tier 2・ランキング・分析ダッシュボード・検索・AVP再生・設定」の7項目に再編
- **`ui/tier1_tab.py`** 新規作成: ライブラリ（`render_library_tab`）・ランダム・運命の1本の3サブタブで Tier 1 画面を構成
- **`ui/tier2_tab.py`** 新規作成: セレクション KPI + ライブラリ・ランダム・運命の1本の3サブタブで Tier 2 画面を構成
- `ui/unrated_random_tab.py`: `_render_random_mode` / `_render_unrated_fate_mode` を public 化（tier1_tab から呼び出し）
- `ui/selection_tab.py`: `_render_library_mode` / `_render_random_mode` / `_render_fate_mode` を public 化（tier2_tab から呼び出し）

### その他

- **`docs/context/GLOSSARY.md`** 新規作成: Coding agent 向け用語集
- `tests/test_video_manager.py`: アーカイブ済みの `test_set_judging_state_start_and_finish` に `@pytest.mark.skip` を追加

---

## 2026-06-01 — 新機能: 未判定ランダムタブに「運命の1本」追加

**関連ファイル**: `ui/unrated_random_tab.py`, `core/video_manager.py`, `streamlit_app.py`

- **サブタブ化**: 未判定ランダムタブを「🔀 ランダム（従来のグリッド表示）」と「🎯 運命の1本」の2サブタブ構成に変更
- **運命の1本**: 未判定動画（`favorite_level = -1`）から純粋ランダムで1本を選出・自動再生・判定できる。ボタン押下で即座にプレイヤー起動
- **判定後**: カードを残したまま、再度ボタンを押すと次の1本を選出（手動）
- **`get_unrated_fate_video()`**: `VideoManager` に新メソッドを追加。`get_unrated_random_videos(1)` を委譲し、ドライブ確認・ファイル存在チェック込みの純粋ランダム選出を実現
- **session_state 同期**: `_handle_play` / `_handle_judgment` に `unrated_fate_video` の状態同期を追加（`is_judging` / `current_favorite_level` の即時反映）

---

## 2026-05-24 — 新機能: AVP並列再生タブ追加

**関連ファイル**: `ui/avp_tab.py`（新規）, `ui/components/video_card.py`, `ui/library_tab.py`, `ui/unrated_random_tab.py`, `ui/selection_tab.py`, `ui/search_tab.py`, `streamlit_app.py`, `ui/extra_tabs.py`, `core/config_utils.py`

- **AVP再生タブを新設**: サイドバーに「AVP再生」タブを追加。ライブラリ・ランダム・セレクション・検索の各タブでチェックした動画を一覧表示し、最大4本を選択してAwesome Video Playerで並列再生する
- **チェックボックス追加**: 全タブの `render_video_card` / `render_search_video_card` に `show_avp_checkbox` 引数を追加。カード左上に小さいチェックボックスを表示し、チェック状態はセッション全体の `avp_selected_ids: set[int]` で横断管理
- **AVP並列再生フロー**: ①各タブでチェック → ②AVP再生タブを開く → ③チェック済み一覧から再生する本数（1〜4本）を選択 → ④「▶ AVPでN本再生」ボタンでAVP起動 → ⑤下段に評価カード即時表示 → ⑥判定
- **設定タブ**: AVP実行ファイルパスの入力欄を追加。`user_config.json` の `avp_exe_path` キーで管理（デフォルト: `C:\Program Files (x86)\Awesome Video Player\AVPlayer.exe`）
- **サイドバーカウント表示**: チェック済み本数が1本以上のとき「AVP再生 (N)」と件数を表示
- **事前テスト済み**: Awesome Video Player に複数ファイルをコマンドライン引数で渡すと画面分割で並列再生されることを確認済み

---

## 2026-05-24 — 新機能: 「🎯 運命の1本」タブ追加

**関連ファイル**: `core/video_manager.py`, `ui/selection_tab.py`

- セレクションタブに「🎯 運命の1本」タブを新設（ライブラリ・ランダムと並列）
- **選出ロジック**: `needs_selection=True` の動画を前回視聴からの経過日数で重み付けして `random.choices()` で1本選出。未視聴は経過9999日扱い
- **UIフロー**: ボタン押下で自動再生 → 既存の評価UI（レベル選択・いいね）で判定 → 評価後も動画表示を維持。次の1本はボタン再押下で選出
- `VideoManager.get_fate_video(folder_path_str)` を `core/video_manager.py` に追加
- `get_last_viewed_map` を `core/database.py` から直接インポートして利用

---

## 2026-03-09 — 機能改善: ランキングタブ（集計期間・デフォルト・総合ランキング追加）

**関連ファイル**: `core/analysis_service.py`, `ui/ranking_tab.py`, `streamlit_app.py`

- **集計期間を整理**: 30日・90日を削除し180日を追加。デフォルトを「全期間」に変更
- **表示件数デフォルト変更**: 10件 → 20件
- **「総合」ランキング追加**: 視聴回数(×1.0)・視聴日数(×1.2)・いいね数(×1.5) を正規化合算し、レベル乗数（Lv4=1.5〜未判定=0.0）を掛けた複合スコア（最大555pt）。未判定動画は除外される
- **セッション状態の防衛的初期化**: 旧セッションに "30日"/"90日" が残っていた場合に "全期間" へリセット

---

## 2026-03-09 — 機能改善: ランキングタブのレベルフィルタをラジオボタンに変更

**関連ファイル**: `core/analysis_service.py`, `ui/ranking_tab.py`

### ランキングタブ: レベルフィルタの改善
- **目的**: 「Lv3のみ」トグルでは Lv4 を選択できなかった問題を解消
- `core/analysis_service.py`: `get_ranked_videos_for_tab()` の `lv3_only: bool` パラメータを `min_level: Optional[int] = None` に変更。`None`=フィルタなし、`3`=Lv3以上、`4`=Lv4のみ
- `ui/ranking_tab.py`: トグルをラジオボタン（「制限なし」「Lv3以上」「Lv4のみ」）に差し替え。列比率を `[4,1]` → `[3,2]` に変更

---

## 2026-03-09 — 機能追加: ライブラリタブにセレクション関連除外フィルタを追加

**関連ファイル**: `core/video_manager.py`, `ui/library_tab.py`, `streamlit_app.py`

### ライブラリタブ: セレクション関連ファイルの除外フィルタ
- **目的**: ライブラリタブに `[!]`（未選別）・`[+]`（セレクション完了）プレフィックスのファイルが混在する問題を解消
- `core/video_manager.py`: `get_videos()` に `exclude_selection: bool = False` パラメータを追加。`True` のとき `needs_selection = 0 AND is_selection_completed = 0` を WHERE 句に付加
- `streamlit_app.py`: `filter_hide_selection = True` をセッション状態の初期値として追加（デフォルトON）
- `ui/library_tab.py`: フィルタエクスパンダー内に「セレクション関連を除外」チェックボックスを追加、`get_videos()` 呼び出しに `exclude_selection` を渡す、`signature` にも含めてページリセットに対応

---

## 2026-03-03 — バグ修正: KPI計算の修正・セレクション関連改善

**関連ファイル**: `core/scanner.py`, `core/database.py`, `ui/components/kpi_display.py`, `ui/selection_tab.py`, `tests/test_scanner.py`

### A-1 差し戻し: scan_and_update() を旧動作に復元
- **経緯**: 2026-02-25のA-1修正（スキャン済みディレクトリ配下のみ is_available=0 更新）によりKPI数値が増加
- **原因**: Dドライブがlibrary_rootsに登録されている状態でDドライブ接続時にスキャンすると、Dドライブ動画が is_available=1 になりKPIに混入していた
- **修正**: `scan_and_update()` をスキャンで見つからなかった**全動画**を is_available=0 に更新する旧動作に戻す。スキャン済みディレクトリ0件のみスキップ（安全ガード維持）
- `tests/test_scanner.py`: `test_scan_only_updates_is_available_for_scanned_dirs` を旧動作確認テスト `test_scan_updates_all_not_found_videos_is_available` に書き換え、A-1固有の回帰テスト `test_scan_does_not_falsely_mark_sibling_dir_unavailable` を削除

### DBカラム追加: is_selection_completed
- **目的**: `+` プレフィックス（セレクション選別完了）動画を正確に管理するための専用フラグ
- `core/database.py`: `videos` テーブルに `is_selection_completed BOOLEAN DEFAULT 0` を追加、インデックス `idx_is_selection_completed` 追加、既存の `+` プレフィックスファイルを Python ループで移行
- `core/scanner.py`: `_process_file()` で `is_sel_completed` を UPDATE/INSERT に反映（以前は `_is_sel_completed` として捨てていた）

### KPI修正: セレクションフォルダの動画をKPI対象外に
- **原因**: セレクションフォルダ（`!`/`+` プレフィックス）の動画が未判定・判定済みKPIに混入していた
- `ui/components/kpi_display.py`: 未判定数・判定済み数のクエリに `AND needs_selection = 0 AND is_selection_completed = 0` を追加

### KPI修正: 本日の判定数からセレクション選別を除外
- **原因**: ライブラリ・未判定ランダムタブの「本日の判定数」がセレクションでの選別もカウントしていた
- `ui/components/kpi_display.py`: `today_judged_count` クエリに `AND was_selection_judgment = 0` を追加

### UI改善: セレクションランダムモードのデフォルトカラム数を5に変更
- `ui/selection_tab.py`: ランダムモードのカラム数ラジオボタンのデフォルトを 4 → 5 に変更（`index=1` → `index=2`）

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
