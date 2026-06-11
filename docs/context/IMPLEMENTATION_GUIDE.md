# ClipBox 実装ガイド

> **注意（現行との読み合わせ）**: 本書はシステム構造・実装マップの参照資料だが、**UI 層の記述に Streamlit 期の前提が残る**（下記「UI層 (Streamlit)」等）。
> **現行の主 UI は Next.js（`localhost:3000`）+ FastAPI（`localhost:8000`）** であり、Streamlit は移行完了まで並走する旧 UI。
> 画面・状態の挙動の正本は **`SPEC_NEXTJS.md`**、用語は `GLOSSARY.md`、競合時の優先順位は `AGENTS.md` の正本台帳に従う（現行＝正本 ＞ 歴史的記述）。
> 並走期間の DB 書き込みは一方のサーバーのみ（同時書き込みは `SQLITE_BUSY`。`SPEC_NEXTJS.md` §11）。

---

## 1. システムアーキテクチャ

### 1.1 3層構成

ClipBoxは厳格な3層アーキテクチャを採用しています。

```
UI層 (Streamlit)
  streamlit_app.py
  ui/tier1_tab.py            ← Tier 1（一次判定）画面 @st.fragment
  ui/tier2_tab.py            ← Tier 2（二次判定）画面 @st.fragment
  ui/library_tab.py
  ui/unrated_random_tab.py
  ui/selection_tab.py
  ui/search_tab.py
  ui/analysis_tab.py
  ui/ranking_tab.py
  ui/avp_tab.py
  ui/extra_tabs.py
  ui/cache.py                ← @st.cache_data 関数（UIキャッシュ）
  ui/components/
    video_card.py
    display_settings.py
    kpi_display.py

API層 (FastAPI) - Streamlit と並走・core を共有（Phase 3 完了）
  api_app.py                 ← エントリーポイント（CORS・ルーター登録・read-only lifespan）
  api/videos.py              ← 一覧・単体・検索・ランダム・セレクション・filter-options
  api/stats.py               ← KPI・selection-kpi・view-counts・last-viewed・ranking
  api/actions.py             ← play / level（mutation・404/409/500 マッピング）
  api/likes.py               ← like 追加 / likes 一括取得
  api/admin.py               ← scan/library・scan/selection・config(GET/PUT)・backup
  api/analysis.py            ← 分析データ・履歴・応答時間・ランキング・トレンド/分布
  api/avp.py                 ← Awesome Video Player 並列再生
  api/runtime.py             ← runtime lamp 状態 / サービス停止（dev/ops 用）
  api/schemas.py             ← Pydantic レスポンス/リクエストモデル（snake_case）
  api/_params.py             ← 配列クエリ（カンマ区切り/repeated 両対応）
  api/_serialization.py      ← pandas DataFrame → JSON 安全 list[dict]

Core層 (Python) - UI非依存
  core/app_service.py        ← UIファサード
  core/video_manager.py      ← ビジネスロジック
  core/scanner.py            ← ファイルスキャナー（protected_roots 対応）
  core/database.py           ← DB接続・操作
  core/models.py             ← データモデル
  core/config_utils.py       ← ユーザー設定管理（JSON読み書き）
  core/migration.py          ← DBマイグレーション
  core/analysis_service.py   ← 分析サービス
  core/file_ops.py           ← ファイル操作（create_file_scanner）
  core/like_service.py       ← いいね機能
  core/selection_service.py  ← セレクション固有ロジック
  core/runtime_control.py    ← サービス状態判定/停止（psutil・dev/ops 用）
  core/logger.py             ← RotatingFileHandler ロガー
Archive層
  archive/                  ← archived 実装の復旧元

Data層 (SQLite)
  data/videos.db
```

**重要**: Core層では`st`（Streamlit）をインポートしない。`ui/cache.py`に`@st.cache_data`関数を集約済み。

**API層（FastAPI）**: UI層と同じく core に一方向依存する。各ルーターは `core.app_service` のファサード経由でのみ
DB にアクセスし、`streamlit` を import しない。Streamlit(8501) と並走（既定 8000）し、起動時 lifespan は read-only
（`init_database`/`run_startup_migration` は実行せず DB 初期化は Streamlit に委ねる＝SQLite 同時書き込み回避）。
全ドメインエンドポイント（AVP 起動・分析トレンド `/analysis/{viewing,judgment}-trend` を含む）+ 運用 `/api/runtime` 系が
API_SPEC に準拠。詳細は `docs/context/API_SPEC.md`。**Runtime は既定で無効**で `CLIPBOX_ENABLE_RUNTIME_CONTROL=1`
（`api_app.create_app()` が参照）のときのみ公開。runtime lamp / 停止は `core/runtime_control.py`（psutil）を介する dev/ops 用で、
使い方は `docs/runtime-controls.md` を参照。

**フロントエンド（Next.js / Phase 4-A〜）**: `frontend/` の Next.js(App Router)+TypeScript+Tailwind v4+shadcn/ui。
FastAPI を `http://localhost:8000/api` 経由で叩く（`lib/api.ts`）。サーバー状態は TanStack Query、フィルタ等の
クライアント横断状態は Zustand（`lib/store.ts`）。Tier1 / Tier2 / ランキング / 分析 / 検索 / AVP / 設定を実装済み。
**並走期間の DB 書き込み主体は当面 Streamlit**であり、Next.js からの再生/判定/いいねは Streamlit 停止 +
DB バックアップ前提で検証する（SQLite 同時書き込み回避）。再生はサーバー機でプレイヤーが開く。

**Next.js ルート**:
- `/`: Tier1（ライブラリ / ランダム / 運命の1本）
- `/tier2`: Tier2 セレクション（ライブラリ / ランダム / 運命の1本）
- `/ranking`: ランキング
- `/analysis`: 分析ダッシュボード
- `/search`: 横断検索（キーワード + 保存場所、結果はクライアントページング）
- `/avp`: AVP 並列再生（選択済み動画 / 再生対象 / 評価待ち）
- `/settings`: 設定（config / scan / backup）

### 1.2 設計原則

1. **レイヤー分離**: UI層とCore層の依存は一方向のみ（UI → Core）
2. **本質的ファイル名による識別**: パスではなくファイル名（プレフィックス除去後）で動画を識別
3. **グレースフルデグラデーション**: エラー時もクラッシュせず動作継続
4. **is_available 一括更新**: scan_and_update() はスキャンで見つからなかった全動画を is_available=0 に更新する（スキャン0件時のみスキップ）

---

## 2. ディレクトリ構成

```
ClipBox/
├── streamlit_app.py          # メインエントリーポイント（Streamlit）
├── api_app.py                # FastAPI エントリーポイント（Streamlit と並走）
├── run_api.bat               # uvicorn 起動スクリプト
├── config.py                 # 設定定数
├── CLAUDE.md                 # AIガイダンス（約60行）
├── CHANGELOG.md              # 変更履歴
│
├── api/                      # API層（FastAPI ルーター。core.app_service のみ呼ぶ）
│   ├── videos.py             # 動画 read 系
│   ├── stats.py              # KPI・ランキング
│   ├── actions.py            # play / level（mutation）
│   ├── likes.py              # いいね
│   ├── admin.py              # scan・config・backup
│   ├── analysis.py           # 分析（DataFrame→JSON）
│   ├── avp.py                # AVP 起動
│   ├── runtime.py            # runtime lamp 状態 / サービス停止（dev/ops 用）
│   ├── schemas.py            # Pydantic モデル
│   ├── _params.py            # 配列クエリパース
│   └── _serialization.py     # DataFrame 直列化
│
├── scripts/                  # 補助スクリプト
│   └── startup_backup.py     # 起動時 DB バックアップ（1日1回・最新10世代保持）
│
├── run_dev.bat               # uvicorn + next dev 一括起動、疎通確認後にブラウザを開く
├── run_clipbox.bat           # Streamlit 起動（起動時バックアップ付き）
│
├── frontend/                 # Next.js フロントエンド（Phase 4-A〜。API 経由で core に依存）
│   └── src/
│       ├── app/              # App Router（/, tier2, ranking, analysis, search, avp, settings）
│       ├── components/       # VideoCard・VideoGrid・KpiCard・LibraryWorkspace・LibraryFilterBar・VideoActionPanel・SidebarNav・ui/
│       └── lib/              # api.ts（fetch ラッパ）・types.ts・store.ts(zustand)・levels.ts
│                             #   分析チャートは recharts を使用
│
├── ui/                       # UI層
│   ├── tier1_tab.py          # Tier 1（一次判定）画面 @st.fragment
│   ├── tier2_tab.py          # Tier 2（二次判定）画面 @st.fragment
│   ├── library_tab.py        # ライブラリサブタブ（Tier 1 から呼び出し）
│   ├── unrated_random_tab.py # ランダム/運命の1本サブタブ（Tier 1）
│   ├── selection_tab.py      # セレクションサブタブ群（Tier 2 から呼び出し）
│   ├── search_tab.py         # 検索タブ
│   ├── analysis_tab.py       # 分析タブ
│   ├── ranking_tab.py        # ランキングタブ
│   ├── avp_tab.py            # AVP 並列再生タブ
│   ├── extra_tabs.py         # 設定タブ
│   ├── cache.py              # @st.cache_data 関数群
│   ├── _theme.css            # グローバルスタイル
│   └── components/
│       ├── video_card.py     # 動画カード表示
│       ├── display_settings.py # 表示設定UI
│       └── kpi_display.py    # KPI表示
│
├── core/                     # Core層（UIに依存しない）
│   ├── app_service.py        # UIファサード
│   ├── video_manager.py      # ビジネスロジック
│   ├── scanner.py            # ファイルスキャナー
│   ├── database.py           # DB接続・操作
│   ├── models.py             # データモデル
│   ├── config_utils.py       # ユーザー設定管理（JSON読み書き）
│   ├── migration.py          # DBマイグレーション
│   ├── analysis_service.py   # 分析サービス
│   ├── file_ops.py           # ファイル操作ユーティリティ
│   ├── like_service.py       # いいね機能
│   ├── selection_service.py  # セレクション固有ロジック
│   ├── runtime_control.py    # サービス状態判定/停止（psutil・dev/ops 用）
│   └── logger.py             # RotatingFileHandler ロガー
│
├── data/                     # データ
│   ├── videos.db             # SQLiteデータベース
│   ├── user_config.json      # ユーザー設定
│   ├── clipbox.log           # ログファイル（git除外）
│   └── backups/              # バックアップ
│
├── tests/                    # テスト
│   ├── conftest.py           # 共通フィクスチャ（tmp_db）
│   ├── test_scanner.py
│   ├── test_video_manager.py
│   ├── test_analysis_service.py
│   ├── test_backup.py
│   ├── api/                  # FastAPI テスト（TestClient + tmp 隔離 conftest）
│   │   ├── conftest.py       # api_isolation（config/backup/scan を tmp へ）
│   │   └── test_*.py
│   └── ...
│
├── docs/                     # ドキュメント
│   ├── context/              # 常に最新の参照ドキュメント
│   ├── decisions/            # ADR（アーキテクチャ決定記録）
│   └── reports/              # 作業成果物（日付付き・更新しない）
│
└── archive/                  # アーカイブ（非アクティブ）
```

---

## 3. モジュール責務

### 3.1 UI層

| ファイル | 責務 |
|---------|------|
| `streamlit_app.py` | メインエントリーポイント、セッション状態管理、ナビゲーション分岐 |
| `ui/tier1_tab.py` | Tier 1（一次判定）画面。KPI固定表示＋3サブタブ（@st.fragment） |
| `ui/tier2_tab.py` | Tier 2（二次判定）画面。KPI固定表示＋3サブタブ（@st.fragment） |
| `ui/library_tab.py` | ライブラリサブタブ。全動画一覧・フィルタ・ページネーション |
| `ui/unrated_random_tab.py` | ランダム/運命の1本サブタブ（Tier 1 内で呼び出し） |
| `ui/selection_tab.py` | セレクションサブタブ群（Tier 2 内で呼び出し） |
| `ui/search_tab.py` | 検索タブのUI |
| `ui/analysis_tab.py` | 分析・統計タブのUI |
| `ui/ranking_tab.py` | ランキングタブのUI |
| `ui/avp_tab.py` | AVP並列再生タブのUI |
| `ui/extra_tabs.py` | 設定タブのUI |
| `ui/cache.py` | @st.cache_data デコレータ付きキャッシュ関数群 |
| `ui/components/video_card.py` | 動画カードコンポーネント（再利用可能） |
| `ui/components/display_settings.py` | 表示設定UI |
| `ui/components/kpi_display.py` | KPI表示コンポーネント |

### 3.2 Core層

| ファイル | 責務 |
|---------|------|
| `core/app_service.py` | UI層とCore層の橋渡し（ファサード）、マイグレーション起動 |
| `core/video_manager.py` | 動画の取得、再生、判定、視聴履歴記録 |
| `core/scanner.py` | ディレクトリスキャン、プレフィックス解析 |
| `core/database.py` | DB接続（コンテキストマネージャ）、テーブル初期化、バックアップ |
| `core/models.py` | Video, ViewingHistoryなどのデータクラス |
| `core/config_utils.py` | ユーザー設定のJSON永続化（`data/user_config.json`） |
| `core/migration.py` | DBスキーマのマイグレーション |
| `core/analysis_service.py` | 統計分析 |
| `core/file_ops.py` | ファイル操作ユーティリティ（FileScanner ラッパー） |
| `core/like_service.py` | いいね機能（追加・取得） |
| `core/selection_service.py` | セレクション固有ビジネスロジック |
| `core/logger.py` | RotatingFileHandler（5MB×3世代、data/clipbox.log） |
| ~~`core/snapshot.py`~~ | **archived** → `archive/snapshot.py` |
| ~~`core/counter_service.py`~~ | **archived** → `archive/counter_service.py` |
| ~~`core/config_store.py`~~ | **archived** → `archive/config_store.py`（`config_utils.py` が実体） |
| ~~`core/history_repository.py`~~ | **archived** → `archive/history_repository.py` |
| ~~`core/settings.py`~~ | **archived** → `archive/settings.py`（ファイルアクセス検知と共に退避） |

---

## 4. UI構成

### 4.1 ナビゲーション構成（サイドバー）

```
サイドバー radio 選択肢:
  Tier 1  / Tier 2 / ランキング / 分析ダッシュボード / 検索 / AVP再生 / 設定

streamlit_app.py
├── 🎬 Tier 1 — 一次判定   (tier1_tab.py)
│   ├── KPI カード（未判定数・判定済み数・判定率・本日の判定数）
│   └── サブタブ:
│       ├── 📚 ライブラリ   (library_tab.py)
│       │   └── 全動画一覧・フィルタ・ソート・ページネーション
│       ├── 🔀 ランダム     (unrated_random_tab.render_random_mode)
│       │   └── 未判定動画のランダム選択・判定
│       └── 🎯 運命の1本   (unrated_random_tab.render_unrated_fate_mode)
│           └── 純粋ランダムで1本選出・再生・判定
│
├── 🎯 Tier 2 — 二次判定   (tier2_tab.py)
│   ├── KPI カード（未選別数・選別済み数・選別率・本日の選別数）
│   └── サブタブ:
│       ├── 📚 ライブラリ   (selection_tab.render_library_mode)
│       │   └── セレクション動画一覧・選別フィルタ
│       ├── 🎲 ランダム     (selection_tab.render_random_mode)
│       │   └── 未選別動画のランダム選択・選別判定
│       └── 🎯 運命の1本   (selection_tab.render_fate_mode)
│           └── 経過日数重み付きで1本選出・再生・選別判定
│
├── 🏆 ランキング           (ranking_tab.py)
│   └── 視聴回数・視聴日数・いいね数ランキング
│
├── 📊 分析ダッシュボード   (analysis_tab.py)
│   └── 視聴推移・判定推移・統計グラフ
│
├── 🔎 検索                 (search_tab.py)
│   └── ファイル名・出演者検索
│
├── 🎬 AVP再生              (avp_tab.py)
│   └── チェックした動画を最大4本並列再生
│
└── ⚙️ 設定                 (extra_tabs.py)
    └── ライブラリパス・セレクションフォルダ・プレイヤー設定
```

### 4.2 キャッシュ管理

`ui/cache.py` に `@st.cache_data` 関数を集約:

```python
from ui import cache as ui_cache

# キャッシュクリア（データ変更後に呼ぶ）
ui_cache.get_filter_options.clear()
ui_cache.get_view_counts_and_last_viewed.clear()
ui_cache.get_metrics.clear()
ui_cache.get_kpi_stats_cached.clear()
```

---

## 5. 機能実装マップ

### 5.1 スキャン機能

| 機能 | ファイル | 関数 | 状態 |
|------|---------|------|------|
| ディレクトリスキャン | `core/scanner.py` | `FileScanner.scan_and_update()` | ✅ |
| プレフィックス解析 | `core/scanner.py` | `extract_essential_filename()` | ✅ |
| ストレージ判定 | `core/scanner.py` | `determine_storage_location()` | ✅ |
| 利用可能性更新 | `core/scanner.py` | `FileScanner.scan_and_update()` | ✅ |

### 5.2 再生機能

| 機能 | ファイル | 関数 | 状態 |
|------|---------|------|------|
| 動画再生 | `core/video_manager.py` | `VideoManager.play_video()` | ✅ |
| 視聴集計記録 | `core/video_manager.py` | `viewing_history` INSERT (`APP_PLAYBACK`) | ✅ |
| 再生ログ詳細記録 | `core/database.py` | `insert_play_history()` → `play_history` | ✅ |
| 判定中フラグ設定 | ~~`core/video_manager.py`~~ | ~~`VideoManager.set_judging_state()`~~ | **archived** → `archive/video_manager_methods.py` |

### 5.3 判定機能

| 機能 | ファイル | 関数 | 状態 |
|------|---------|------|------|
| レベル変更 + リネーム | `core/video_manager.py` | `VideoManager.set_favorite_level_with_rename()` | ✅ |
| 判定履歴記録 | `core/video_manager.py` | 同上（judgment_historyへ挿入） | ✅ |
| 判定中フラグ解除 | ~~`core/video_manager.py`~~ | `is_judging` DB列は互換のため保持 | **archived** |

### 5.4 統計機能

| 機能 | ファイル | 関数 | 状態 |
|------|---------|------|------|
| カウンター機能 | ~~`core/counter_service.py`~~ | ~~`get_counters_with_counts()`~~  | **archived** |
| 視聴回数ランキング | `core/analysis_service.py` | `get_view_count_ranking()` | ✅ |
| 視聴日数ランキング | `core/analysis_service.py` | `get_view_days_ranking()` | ✅ |
| いいね数ランキング | `core/analysis_service.py` | `get_like_count_ranking()` | ✅ |

### 5.5 いいね機能

| 機能 | ファイル | 関数 | 状態 |
|------|---------|------|------|
| いいね追加 | `core/like_service.py` | `add_like()` | ✅ |
| いいね数取得 | `core/like_service.py` | `get_like_counts()` | ✅ |
| UIカード表示 | `ui/components/video_card.py` | `render_video_card()` | ✅ |

### 5.6 セレクション機能

| 機能 | ファイル | 関数 | 状態 |
|------|---------|------|------|
| !プレフィックス検知 | `core/scanner.py` | `extract_essential_filename()` | ✅ |
| セレクションフォルダスキャン | `core/selection_service.py` | `scan_selection_folder()` | ✅ |
| セレクションKPI取得 | `core/selection_service.py` | `get_selection_kpi()` | ✅ |
| セレクション判定 | `core/video_manager.py` | `set_favorite_level_with_rename()` | ✅ |
| セレクション分析 | `core/analysis_service.py` | セレクション分析関数 | ✅ |

---

## 6. データフロー

### 6.1 ファイルスキャンフロー

```
User → スキャンボタン → FileScanner.scan_and_update()
  └─ ディレクトリ走査
      └─ extract_essential_filename() でプレフィックス解析
      └─ determine_storage_location() でストレージ判定
      └─ DB: INSERT or UPDATE videos
  └─ スキャンで見つからなかった全動画 → is_available = 0
  └─ スキャン済みディレクトリが0件の場合は is_available の更新をスキップ（安全ガード）
```

### 6.2 動画再生フロー

```
User → 再生ボタン → VideoManager.play_video(video)
  └─ subprocess.Popen() で外部プレイヤー起動
  └─ INSERT play_history
  └─ INSERT viewing_history (APP_PLAYBACK)
  └─ キャッシュクリア（ui_cache.xxx.clear()）
  └─ st.rerun(scope="fragment")
```

※ `is_judging` フラグ更新（`set_judging_state`）は Phase 1 でアーカイブ済み。

### 6.3 判定フロー

```
User → レベル選択 + 判定ボタン → VideoManager.set_favorite_level_with_rename()
  └─ ファイルリネーム（プレフィックス変更）
  └─ [成功] UPDATE current_favorite_level, needs_selection=0
           INSERT judgment_history
           キャッシュクリア
           st.rerun(scope="fragment")
  └─ [失敗] エラーメッセージ表示、DB更新なし
```

### 6.4 視聴履歴記録フロー

現在有効な記録方式:

```
APP_PLAYBACK:
  再生ボタンクリック → play_video() → viewing_history INSERT
```

`viewing_history` は視聴回数・ランキング・分析の集計用、`play_history` は再生トリガーやプレイヤーなどの詳細ログ用。

archived（Phase 1 で無効化）:
- `FILE_ACCESS_DETECTED`: ファイルアクセス時刻検知 → `archive/detect_file_access.py`
- `MANUAL_ENTRY`: 手動マーク → `archive/video_manager_methods.py`

---

## 7. 主要コンポーネントの詳細

### 7.1 VideoManager

`core/video_manager.py`

ビジネスロジックの中核。動画の取得、再生、判定を担当。streamlitをインポートしない。

```python
class VideoManager:
    def get_videos(
        favorite_levels, performers, storage_locations,
        availability, show_unavailable, show_deleted,
        needs_selection_filter, exclude_selection
    ) -> List[Video]
    def get_videos_by_ids(video_ids) -> List[Video]
    def get_unrated_random_videos(n) -> List[Video]   # Tier 1 ランダム用
    def get_unrated_fate_video() -> Optional[Video]   # Tier 1 運命の1本用
    def get_fate_video(folder_path_str) -> Optional[Video]  # Tier 2 運命の1本用
    def play_video(video_id, *, player, trigger, ...) -> Dict
    def set_favorite_level_with_rename(video_id, level) -> Dict
```

### 7.2 FileScanner

`core/scanner.py`

ファイルスキャンとプレフィックス解析を担当。

```python
def extract_essential_filename(filename) -> Tuple[int, str, bool, bool]
# 戻り値: (お気に入りレベル, 本質的ファイル名, needs_selection, is_selection_completed)

class FileScanner:
    def scan_and_update(db_conn) -> None
    # 【重要】スキャンで見つからなかった全動画を is_available=0 に更新する（スキャン0件時はスキップ）
```

### 7.3 AppService

`core/app_service.py`

UI層とCore層の橋渡し。ファサードパターン。マイグレーション起動も担当。

```python
class AppService:
    def __init__(video_manager, scanner)
    def scan_library() -> None
    def get_filtered_videos(filters) -> List[Video]
    def run_startup_migration() -> None  # DBマイグレーション起動
```

---

## 8. セッション状態管理

Streamlitのセッション状態で管理されるキー:

| キー | 型 | 用途 | 初期値 |
|------|-----|------|--------|
| `user_config` | dict | ユーザー設定（JSON読み込み） | config_utilsから読み込み |
| `video_manager` | VideoManager | ビジネスロジックインスタンス | 初期化時に作成 |
| `selected_video` | Video | 選択中の動画（再生中強調表示） | None |
| `display_settings` | dict | 表示設定 | デフォルト値 |
| `filter_levels` | list | レベルフィルタ | [4,3,2,1,0,-1] |
| `filter_performers` | list | 登場人物フィルタ（DB/code の `performer`） | [] |
| `filter_storage` | str | ストレージフィルタ | 'ALL' |
| `filter_hide_selection` | bool | セレクション除外フィルタ | True |
| `unrated_shuffle_token` | int | Tier 1 ランダムシャッフル制御 | 0 |
| `unrated_sample_ids` | list | Tier 1 ランダムサンプルID | None |
| `unrated_fate_video` | Video\|None | Tier 1 運命の1本 選出結果 | None |
| `selection_fate_video` | Video\|None | Tier 2 運命の1本 選出結果 | None |
| `avp_selected_ids` | set[int] | AVP タブ横断チェック済みID | set() |
| `avp_launch_selected` | set[int] | AVP タブ内の再生対象ID | set() |
| `avp_playing_ids` | list[int] | AVP 再生中ID | [] |

Next.js 側では `frontend/src/lib/store.ts` の `useAvpStore` が `avpSelectedIds` / `avpLaunchSelectedIds` /
`avpPlayingIds` を保持する。動画カードの AVP チェックは最大4本に制限し、`/avp` で再生対象を選んで
`POST /api/avp/play` を呼ぶ。

---

## 9. エラーハンドリング

### 9.1 ファイル操作エラー

| エラー種別 | 検出方法 | 対応 |
|-----------|---------|------|
| ファイル不存在 | `Path.exists()` | エラー表示、DB更新なし |
| ファイル使用中 | `PermissionError` | エラー表示、DB更新なし |
| OneDrive同期中 | `PermissionError` | エラー表示、再試行促す |
| アクセス権限なし | `PermissionError` | エラー表示、DB更新なし |

### 9.2 データベースエラー

コンテキストマネージャで自動ロールバック:

```python
with get_db_connection() as conn:
    # 成功時: 自動commit
    # 例外時: 自動rollback
```

---

## 10. テスト戦略

### 10.1 ユニットテスト

```bash
# 全テスト実行
pytest

# カバレッジ付き
pytest --cov=core

# 特定ファイル
pytest tests/test_scanner.py
```

### 10.2 テスト対象

- `core/scanner.py`: プレフィックス解析のエッジケース、is_availableスコープ
- `core/video_manager.py`: 再生・判定ロジック、判定中フラグ
- `core/analysis_service.py`: 統計計算
- `core/database.py`: バックアップ機能

### 10.3 テストフィクスチャ

`tests/conftest.py` の `tmp_db` フィクスチャを使うこと（パッチ漏れ防止）:

```python
@pytest.fixture
def tmp_db(tmp_path, monkeypatch):
    # DATABASE_PATH をテスト用一時ファイルにパッチ
    # 複数テストファイルで共通利用
```

---

## 11. コーディング規約

### 11.1 モジュール docstring（必須）

core/ に新しいファイルを作るときは、ファイル先頭に必ず以下の形式で記述する：

```python
"""
[モジュールの役割を1-2行で説明]

【設計制約】
- [この層で禁止していること（例: streamlit を import しない）]
- [DB アクセス方法など制約事項]

【依存関係】
[依存モジュール名] → [このファイル] → [このファイルを使う側]
"""
```

参考実装: `core/video_manager.py`（最も充実した例）

### 11.2 重要な関数の docstring（推奨パターン）

ADR に記録されるような設計判断を含む関数には「なぜ」を書くこと：

```python
def my_function(param: Type) -> ReturnType:
    """
    1-2 行で何をする関数かを説明。

    【設計意図】なぜこの実装か、変更時の注意点など。
    特に: ADR で決定した内容・他の実装を却下した理由・スコープ制約。

    Args:
        param: パラメータの説明（None の場合の挙動も明記）

    Returns:
        戻り値の型と内容の説明
    """
```

参考実装: `core/scanner.py extract_essential_filename()`、`core/database.py get_db_connection()`
