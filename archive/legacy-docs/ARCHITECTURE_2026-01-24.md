# ClipBox アーキテクチャ概要
**作成日**: 2026-01-24
**バージョン**: 1.0

---

## システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI層 (Streamlit)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   streamlit_app.py                       │   │
│  │  - メインエントリーポイント                              │   │
│  │  - セッション状態管理                                    │   │
│  │  - サイドバーフィルタ                                    │   │
│  │  - タブ切り替え                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────┼───────────────────────────┐     │
│  │                           ▼                           │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │     │
│  │  │ library_tab │  │unrated_tab  │  │analysis_tab │   │     │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │     │
│  │        ui/                                            │     │
│  └───────────────────────────────────────────────────────┘     │
│                              │                                   │
│  ┌───────────────────────────┼───────────────────────────┐     │
│  │                           ▼                           │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │     │
│  │  │ video_card  │  │display_set  │  │ kpi_display │   │     │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │     │
│  │        ui/components/                                 │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Core層 (Python)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │app_service  │  │video_manager│  │  scanner    │             │
│  │(ファサード) │  │(ビジネス)   │  │(ファイル)   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │config_store │  │  migration  │  │  snapshot   │             │
│  │(設定管理)   │  │(DB移行)     │  │(統計)       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│        core/                                                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data層 (SQLite)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    database.py                           │   │
│  │  - get_db_connection() コンテキストマネージャ            │   │
│  │  - init_database() テーブル作成                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────┼───────────────────────────┐     │
│  │                           ▼                           │     │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │     │
│  │  │ videos  │  │viewing_ │  │  play_  │  │judgment_│ │     │
│  │  │         │  │history  │  │history  │  │history  │ │     │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │     │
│  │        data/clipbox.db                                │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## ファイル構成

```
ClipBox/
├── streamlit_app.py          # メインエントリーポイント (370行)
├── config.py                 # 設定定数
├── setup_db.py               # DB初期化スクリプト
│
├── ui/                       # UI層
│   ├── library_tab.py        # 動画一覧タブ (196行)
│   ├── unrated_random_tab.py # 未判定ランダムタブ (173行)
│   ├── analysis_tab.py       # 分析タブ (414行)
│   ├── extra_tabs.py         # その他タブ (113行)
│   ├── _theme.css            # グローバルスタイル
│   └── components/
│       ├── video_card.py     # 動画カード表示 (295行)
│       ├── display_settings.py # 表示設定UI (74行)
│       └── kpi_display.py    # KPI表示 (100行)
│
├── core/                     # Core層（UIに依存しない）
│   ├── app_service.py        # UIファサード (141行)
│   ├── video_manager.py      # ビジネスロジック (470行)
│   ├── scanner.py            # ファイルスキャナー
│   ├── database.py           # DB接続・操作
│   ├── models.py             # データモデル
│   ├── config_store.py       # ユーザー設定管理
│   ├── migration.py          # DBマイグレーション
│   ├── snapshot.py           # スナップショット管理
│   ├── counter_service.py    # カウンターサービス
│   └── history_repository.py # 履歴リポジトリ
│
├── data/                     # データ
│   ├── clipbox.db            # SQLiteデータベース
│   └── user_config.json      # ユーザー設定
│
├── tests/                    # テスト
│   ├── test_scanner.py
│   └── test_video_manager.py
│
└── docs/                     # ドキュメント
    ├── IMPROVEMENT_SPEC_2026-01-24.md
    ├── ARCHITECTURE_2026-01-24.md
    └── IMPLEMENTATION_GUIDE_2026-01-24.md
```

---

## データベーススキーマ

### videos テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | INTEGER PK | 主キー |
| essential_filename | TEXT UNIQUE | 本質的ファイル名（プレフィックス除去） |
| current_full_path | TEXT | 現在の絶対パス |
| current_favorite_level | INTEGER | お気に入りレベル (-1:未判定, 0-4) |
| file_size | INTEGER | ファイルサイズ |
| performer | TEXT | 出演者 |
| storage_location | TEXT | 'C_DRIVE' or 'EXTERNAL_HDD' |
| last_file_modified | DATETIME | ファイル更新日時 |
| created_at | DATETIME | レコード作成日時 |
| last_scanned_at | DATETIME | 最終スキャン日時 |
| notes | TEXT | メモ |
| file_created_at | DATETIME | ファイル作成日時 |
| is_available | BOOLEAN | ファイル存在フラグ |
| is_deleted | BOOLEAN | 論理削除フラグ |
| **is_judging** | **BOOLEAN** | **判定中フラグ（新規追加）** |

### viewing_history テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | INTEGER PK | 主キー |
| video_id | INTEGER FK | 動画ID |
| viewed_at | DATETIME | 視聴日時 |
| viewing_method | TEXT | 'APP_PLAYBACK', 'MANUAL_ENTRY', 'FILE_ACCESS_DETECTED' |

### judgment_history テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | INTEGER PK | 主キー |
| video_id | INTEGER FK | 動画ID |
| old_level | INTEGER | 変更前レベル |
| new_level | INTEGER | 変更後レベル |
| judged_at | DATETIME | 判定日時 |
| rename_completed_at | DATETIME | リネーム完了日時 |
| rename_duration_ms | INTEGER | リネーム所要時間 |
| storage_location | TEXT | ストレージ場所 |

---

## データフロー

### 動画再生フロー

```
ユーザー操作: 再生ボタンクリック
       │
       ▼
streamlit_app.py: _handle_play(video)
       │
       ├─► is_judging = 1 に更新 (F4対応)
       │
       ▼
video_manager.py: play_video(video)
       │
       ├─► subprocess.Popen() でプレイヤー起動
       │
       ▼
history_repository.py: insert_play_history()
       │
       ▼
viewing_history テーブルに記録
```

### 判定フロー

```
ユーザー操作: レベル選択 → 判定ボタンクリック
       │
       ▼
streamlit_app.py: _handle_judgment(video, level)
       │
       ├─► is_judging = 0 に更新 (F4対応)
       │
       ▼
video_manager.py: set_favorite_level_with_rename()
       │
       ├─► ファイルリネーム（プレフィックス変更）
       │
       ├─► videos テーブル更新
       │
       ▼
judgment_history テーブルに記録
```

---

## セッション状態管理

### 主要なセッション状態キー

| キー | 用途 | 初期値 |
|------|------|--------|
| `user_config` | ユーザー設定 | config_store から読み込み |
| `video_manager` | VideoManagerインスタンス | 初期化時に作成 |
| `selected_video` | 選択中の動画 | None |
| `display_settings` | 表示設定辞書 | デフォルト値 |
| `filter_levels` | レベルフィルタ | [4,3,2,1,0,-1] |
| `filter_storage` | ストレージフィルタ | 'ALL' |
| `unrated_shuffle_token` | シャッフル制御 | 0 |
| `unrated_sample_ids` | サンプルID配列 | None |

---

## 重要な設計原則

### 1. レイヤー分離
- **Core層はUIに依存しない**: `core/`モジュール内で`st`をインポートしない
- **UIはCoreを呼び出す**: `streamlit_app.py` → `app_service.py` → 各コアモジュール

### 2. 本質的ファイル名による識別
- ファイルはパスではなく「本質的ファイル名」で識別
- プレフィックス（`###_`, `##_`, `#_`, `_`）を除去した名前
- ファイル移動・リネームを追跡可能

### 3. プレフィックスシステム
```
###_file.mp4 = レベル3（最もお気に入り）
##_file.mp4  = レベル2
#_file.mp4   = レベル1
_file.mp4    = レベル0
file.mp4     = レベル-1（未判定）
```

### 4. グレースフルデグラデーション
- ファイルが見つからない場合もエラー表示してクラッシュしない
- 外付けHDD未接続時も動作継続
