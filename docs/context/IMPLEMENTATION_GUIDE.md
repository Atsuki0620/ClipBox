# ClipBox 実装ガイド

---

## 1. システムアーキテクチャ

### 1.1 3層構成

ClipBoxは厳格な3層アーキテクチャを採用しています。

```
UI層 (Streamlit)
  streamlit_app.py
  ui/library_tab.py
  ui/unrated_random_tab.py
  ui/selection_tab.py
  ui/search_tab.py
  ui/analysis_tab.py
  ui/extra_tabs.py
  ui/cache.py                ← @st.cache_data 関数（UIキャッシュ）
  ui/components/
    video_card.py
    display_settings.py
    kpi_display.py

Core層 (Python) - UI非依存
  core/app_service.py        ← UIファサード
  core/video_manager.py      ← ビジネスロジック
  core/scanner.py            ← ファイルスキャナー
  core/database.py           ← DB接続・操作
  core/models.py             ← データモデル
  core/config_store.py       ← ユーザー設定管理
  core/migration.py          ← DBマイグレーション
  core/snapshot.py           ← スナップショット管理
  core/counter_service.py    ← カウンターサービス
  core/analysis_service.py   ← 分析サービス
  core/history_repository.py ← 履歴リポジトリ
  core/file_ops.py           ← ファイル操作
  core/like_service.py       ← いいね機能
  core/selection_service.py  ← セレクション固有ロジック
  core/logger.py             ← RotatingFileHandler ロガー

Data層 (SQLite)
  data/videos.db
```

**重要**: Core層では`st`（Streamlit）をインポートしない。`ui/cache.py`に`@st.cache_data`関数を集約済み。

### 1.2 設計原則

1. **レイヤー分離**: UI層とCore層の依存は一方向のみ（UI → Core）
2. **本質的ファイル名による識別**: パスではなくファイル名（プレフィックス除去後）で動画を識別
3. **グレースフルデグラデーション**: エラー時もクラッシュせず動作継続
4. **is_available スコープ制約**: scan_and_update() の is_available=0 更新は実際にスキャンしたディレクトリ配下のみ

---

## 2. ディレクトリ構成

```
ClipBox/
├── streamlit_app.py          # メインエントリーポイント
├── config.py                 # 設定定数
├── CLAUDE.md                 # AIガイダンス（約60行）
├── CHANGELOG.md              # 変更履歴
│
├── ui/                       # UI層
│   ├── library_tab.py        # 動画一覧タブ
│   ├── unrated_random_tab.py # 未判定ランダムタブ
│   ├── selection_tab.py      # セレクションタブ
│   ├── search_tab.py         # 検索タブ
│   ├── analysis_tab.py       # 分析タブ
│   ├── extra_tabs.py         # 設定タブ等
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
│   ├── config_store.py       # ユーザー設定管理
│   ├── migration.py          # DBマイグレーション
│   ├── snapshot.py           # スナップショット管理
│   ├── counter_service.py    # カウンターサービス
│   ├── analysis_service.py   # 分析サービス
│   ├── history_repository.py # 履歴リポジトリ
│   ├── file_ops.py           # ファイル操作ユーティリティ
│   ├── like_service.py       # いいね機能
│   ├── selection_service.py  # セレクション固有ロジック
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
| `streamlit_app.py` | メインエントリーポイント、セッション状態管理、タブ切り替え |
| `ui/library_tab.py` | 動画一覧タブのUI |
| `ui/unrated_random_tab.py` | 未判定ランダムタブのUI |
| `ui/selection_tab.py` | セレクションタブのUI |
| `ui/search_tab.py` | 検索タブのUI |
| `ui/analysis_tab.py` | 分析・統計タブのUI |
| `ui/extra_tabs.py` | 設定タブ等のUI |
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
| `core/config_store.py` | ユーザー設定のJSON永続化 |
| `core/migration.py` | DBスキーマのマイグレーション |
| `core/snapshot.py` | 統計スナップショット管理 |
| `core/counter_service.py` | カウンター機能 |
| `core/analysis_service.py` | 統計分析 |
| `core/history_repository.py` | 再生履歴リポジトリ |
| `core/file_ops.py` | ファイル操作ユーティリティ |
| `core/like_service.py` | いいね機能（追加・取得） |
| `core/selection_service.py` | セレクション固有ビジネスロジック |
| `core/logger.py` | RotatingFileHandler（5MB×3世代、data/clipbox.log） |

---

## 4. UI構成

### 4.1 タブ構成

```
streamlit_app.py
├── 📁 動画一覧        (library_tab.py)
│   └── フィルタリング可能な動画一覧
│   └── ソート機能
│   └── 動画カード表示
│
├── 🎲 未判定ランダム   (unrated_random_tab.py)
│   └── 未判定動画のランダム選択
│   └── シャッフル機能
│   └── 判定UI
│
├── 🔍 セレクション     (selection_tab.py)
│   └── !プレフィックス動画の管理
│   └── フォルダスキャン → カード表示 → 再生・判定
│
├── 🔎 検索             (search_tab.py)
│   └── ファイル名・出演者検索
│
├── 📊 分析             (analysis_tab.py)
│   └── カウンター表示
│   └── 視聴回数ランキング
│   └── 統計グラフ
│   └── セレクション成果分析
│
└── ⚙️ 設定             (extra_tabs.py)
    └── ライブラリ設定
    └── データベース管理
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
| 視聴履歴記録 | `core/database.py` | `insert_play_history()` | ✅ |
| 判定中フラグ設定 | `core/video_manager.py` | `VideoManager.set_is_judging()` | ✅ |

### 5.3 判定機能

| 機能 | ファイル | 関数 | 状態 |
|------|---------|------|------|
| レベル変更 + リネーム | `core/video_manager.py` | `VideoManager.set_favorite_level_with_rename()` | ✅ |
| 判定履歴記録 | `core/video_manager.py` | 同上（judgment_historyへ挿入） | ✅ |
| 判定中フラグ解除 | `core/video_manager.py` | 同上 | ✅ |

### 5.4 統計機能

| 機能 | ファイル | 関数 | 状態 |
|------|---------|------|------|
| カウンター取得 | `core/counter_service.py` | `get_counter_values()` | ✅ |
| カウンターリセット | `core/counter_service.py` | `reset_counter()` | ✅ |
| 視聴回数ランキング | `core/analysis_service.py` | `get_viewing_ranking()` | ✅ |

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
| セレクション動画取得 | `core/selection_service.py` | `get_selection_videos()` | ✅ |
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
  └─ 実際にスキャンしたディレクトリ配下の未発見ファイル → is_available = 0
  └─ スキャンしていないディレクトリ（未接続HDD等）は is_available を変更しない
```

### 6.2 動画再生フロー

```
User → 再生ボタン → VideoManager.play_video(video)
  └─ UPDATE is_judging = 1
  └─ subprocess.Popen() で外部プレイヤー起動
  └─ INSERT play_history
  └─ INSERT viewing_history (APP_PLAYBACK)
  └─ キャッシュクリア（ui_cache.xxx.clear()）
```

### 6.3 判定フロー

```
User → レベル選択 + 判定ボタン → VideoManager.set_favorite_level_with_rename()
  └─ ファイルリネーム（プレフィックス変更）
  └─ [成功] UPDATE current_favorite_level, is_judging = 0
           INSERT judgment_history
           キャッシュクリア
           st.rerun()
  └─ [失敗] エラーメッセージ表示、DB更新なし
```

### 6.4 視聴履歴記録フロー

3つの記録方式があります:

```
APP_PLAYBACK:
  再生ボタンクリック → play_video() → viewing_history INSERT

FILE_ACCESS_DETECTED:
  定期スキャン → アクセス時刻変更検知 → ユーザー確認 → viewing_history INSERT

MANUAL_ENTRY:
  ユーザーが明示的にマーク → viewing_history INSERT
```

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
        show_judging_only, needs_selection_filter
    ) -> List[Video]
    def get_random_video(filters) -> Optional[Video]
    def play_video(video) -> None
    def set_favorite_level_with_rename(video, level) -> bool
    def set_is_judging(video_id, is_judging) -> None
```

### 7.2 FileScanner

`core/scanner.py`

ファイルスキャンとプレフィックス解析を担当。

```python
def extract_essential_filename(filename) -> Tuple[int, str, bool, bool]
# 戻り値: (お気に入りレベル, 本質的ファイル名, needs_selection, is_selection_completed)

class FileScanner:
    def scan_and_update(db_conn) -> None
    # 【重要】is_available=0の更新は引数directoriesのスキャン済みディレクトリ配下のみ
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
| `user_config` | dict | ユーザー設定 | config_storeから読み込み |
| `video_manager` | VideoManager | ビジネスロジックインスタンス | 初期化時に作成 |
| `selected_video` | Video | 選択中の動画 | None |
| `display_settings` | dict | 表示設定 | デフォルト値 |
| `filter_levels` | list | レベルフィルタ | [4,3,2,1,0,-1] |
| `filter_storage` | str | ストレージフィルタ | 'ALL' |
| `unrated_shuffle_token` | int | シャッフル制御 | 0 |
| `unrated_sample_ids` | list | サンプルID配列 | None |

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
