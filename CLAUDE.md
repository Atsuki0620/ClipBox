# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際にClaude Code (claude.ai/code) へのガイダンスを提供します。

## プロジェクト概要

ClipBoxは、PythonとStreamlitで構築された動画ファイル管理システムです。複数のストレージ場所（Cドライブと外付けHDD）にあるローカル動画ファイルを管理し、視聴履歴を追跡し、フィルタリング・検索機能を提供します。ファイル名ベースの識別スキームを使用して、ファイルの移動や名前変更を追跡します。

## 開発コマンド

### セットアップとインストール
```bash
# 仮想環境の作成
python -m venv venv

# 仮想環境の有効化
venv\Scripts\activate  # Windows
source venv/bin/activate  # Unix/Mac

# 依存関係のインストール
pip install -r requirements.txt

# データベースの初期化
python setup_db.py
```

### アプリケーションの実行
```bash
# Streamlitアプリの起動
streamlit run streamlit_app.py

# 代替方法: バッチファイルを使用（Windows）
run_clipbox.bat
```

### テスト
```bash
# すべてのテストを実行
pytest

# カバレッジ付きで実行
pytest --cov=core

# 特定のテストファイルを実行
pytest tests/test_scanner.py

# 特定のテストを実行
pytest tests/test_scanner.py::test_extract_essential_filename_with_prefix
```

### データベース操作
```bash
# データベースの内容を確認
python inspect_database.py

# セットアップの検証
python verify_setup.py
```

## アーキテクチャ

### レイヤードアーキテクチャ

プロジェクトは、StreamlitからFlask/FastAPIへの将来の移行を見据えた厳格な3層アーキテクチャに従っています：

```
UI層 (streamlit_app.py)
    ↓
コア層 (core/*.py - ビジネスロジック、再利用可能)
    ↓
データ層 (core/database.py, SQLite)
```

**重要**: コア層はUIフレームワークに依存しない状態を保つ必要があります。`core/`モジュール内でStreamlit (`st`) をインポートしないでください。

### 主要なアーキテクチャパターン

1. **本質的ファイル名による識別**: ファイルはパスではなく「本質的ファイル名」（プレフィックスを除いた名前）で識別されます。これにより以下を追跡できます：
   - ドライブ間の移動（C: ↔ 外付けHDD）
   - ディレクトリの再編成
   - お気に入りレベルの変更（プレフィックスの変更: `###_`, `##_`, `#_`, `_`）

2. **プレフィックスシステム**: ファイル名のプレフィックスがお気に入りレベルを示します：
   - `###_file.mp4` = レベル3（最もお気に入り）
   - `##_file.mp4` = レベル2（お気に入り）
   - `#_file.mp4` = レベル1（やや気に入っている）
   - `_file.mp4` = レベル0（通常、アンダースコアプレフィックス付き）
   - `file.mp4` = レベル0（プレフィックスなし）

3. **マルチストレージサポート**: システムはCドライブと外付けHDDのファイルを扱い、利用可能性のステータスを追跡します。

### コアモジュール

#### `core/scanner.py`
- `extract_essential_filename(filename)`: プレフィックス付きファイル名からお気に入りレベルと本質的ファイル名を抽出
- `FileScanner`: ディレクトリをスキャンして動画ファイルを検出し、データベースを更新
- `detect_recently_accessed_files()`: 前回チェック以降にアクセスされたファイルを検出（視聴履歴用）

#### `core/video_manager.py`
- `VideoManager`: メインのビジネスロジッククラス
  - `get_videos()`: フィルタ条件に基づく動画取得
  - `get_random_video()`: フィルタ付きランダム選択
  - `play_video()`: プレイヤーで動画を起動し、視聴履歴を記録
  - `record_file_access_as_viewing()`: ファイルアクセスイベントを視聴履歴に変換

#### `core/database.py`
- `get_db_connection()`: SQLite接続用のコンテキストマネージャ（自動コミット/ロールバック）
- `init_database()`: テーブルとインデックスを作成
- スキーマには以下を含む: `videos`, `viewing_history`, `play_history`, `settings`, `counter_snapshots`

#### `core/models.py`
- `Video`: `display_name`プロパティを持つ動画メタデータのデータクラス
- `ViewingHistory`: 視聴イベントのデータクラス

#### `core/config_store.py`
- ユーザー設定の永続化（JSONベース）
- ライブラリルート、デフォルトプレイヤー、データベースパスを管理

#### `core/history_repository.py`
- play_historyテーブル用のリポジトリパターン
- `insert_play_history()`: メタデータ付きで再生イベントを記録

#### `core/snapshot.py`
- 統計用のカウンタースナップショット管理
- お気に入りレベル別の動画数を時系列で追跡

#### `core/counter_service.py`
- 動画カウントと統計サービス
- お気に入りレベル別、利用可能性別などのカウントを提供

### データベーススキーマ

**videos** テーブル:
- `essential_filename` (UNIQUE): 識別用のプレフィックス除去後のファイル名
- `current_full_path`: 現在の絶対パス
- `current_favorite_level`: プレフィックスから抽出（0-3+）
- `is_available`: ファイルが現在存在するかどうか
- `is_deleted`: 論理削除フラグ
- `storage_location`: 'C_DRIVE' または 'EXTERNAL_HDD'

**viewing_history** テーブル:
- すべての視聴イベントを追跡
- `viewing_method`: 'APP_PLAYBACK', 'MANUAL_ENTRY', 'FILE_ACCESS_DETECTED'

**play_history** テーブル:
- プレイヤー、トリガー、library_rootを含む詳細な再生ログ

**counter_snapshots** テーブル:
- トレンド分析用の動画数の日次スナップショット

### 設定

`config.py` には以下を含む:
- `SCAN_DIRECTORIES`: スキャン対象のPathオブジェクトのリスト
- `DATABASE_PATH`: SQLiteデータベースの場所
- `VIDEO_EXTENSIONS`: サポートされるファイルタイプ
- `FAVORITE_LEVEL_NAMES`: レベルの表示名

ユーザー固有の設定は `data/user_config.json` に保存（git除外対象、`core/config_store.py` を参照）。

## 開発ガイドライン

### 新機能の追加

1. **常にレイヤー分離を維持する**: ビジネスロジックは`core/`に、UIコードは`streamlit_app.py`に配置
2. **本質的ファイル名パターンを使用する**: ファイル識別を扱う際は`extract_essential_filename()`を使用
3. **論理削除を尊重する**: 削除済みアイテムを特に表示する場合を除き、クエリで`is_deleted = 0`をチェック
4. **モックデータでテストする**: `create_test_data.py`を使用してテストファイルを生成

### ファイルスキャンロジック

ファイルをスキャンする際：
1. 実際のファイル名から本質的ファイル名とお気に入りレベルを抽出
2. データベースに本質的ファイル名が存在するかチェック
3. 存在する場合: `current_full_path`, `current_favorite_level`, `is_available`, `storage_location`, `last_scanned_at`を更新
4. 新規の場合: すべてのメタデータとともに挿入
5. スキャンで見つからなかったファイルを`is_available = 0`としてマーク

### データベース接続

常にコンテキストマネージャを使用:
```python
from core.database import get_db_connection

with get_db_connection() as conn:
    cursor = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,))
    # 成功時にconn.commit()が自動的に実行される
    # 例外時にconn.rollback()が自動的に実行される
```

### テスト戦略

- コアロジック（scanner, video_manager）のユニットテスト
- テストでデータベース接続をモック
- エッジケースをテスト: ファイル不在、プレフィックスのバリエーション、ファイル移動
- パターンについては`tests/test_scanner.py`と`tests/test_video_manager.py`を参照

## 重要なデータフロー

### 視聴履歴の記録

3つの方法（優先順位順）:
1. **APP_PLAYBACK**: ユーザーがUIで再生ボタンをクリック → `VideoManager.play_video()` → viewing_historyに挿入
2. **FILE_ACCESS_DETECTED**: ファイルアクセス時刻の定期スキャン → ユーザー確認 → viewing_historyに挿入
3. **MANUAL_ENTRY**: ユーザーが明示的に視聴済みとしてマーク → viewing_historyに挿入

### ランダム動画選択

1. フィルタ条件を適用（favorite_level, performer, storage_location, show_unavailable）
2. データベースから一致する動画をクエリ
3. Pythonの`random.choice()`で選択
4. メタデータとともにユーザーに表示
5. ユーザーが再生をクリック → 視聴履歴を記録

## 既知のパターンと規約

- **Streamlitのセッションステートキー**: コンポーネント名でプレフィックスを付ける（例: `user_config`, `last_access_check_time`）
- **Datetimeの扱い**: 新規レコードには`datetime.now()`を使用、SQLiteにはTEXTとして保存
- **パスの扱い**: 全体で`pathlib.Path`を使用、データベースには文字列として保存
- **エラーハンドリング**: グレースフルデグラデーション（例: ファイルが見つからない場合、エラー表示するがクラッシュしない）
- **プレイヤーの起動**: Windowsでは`subprocess.Popen()`をshell=Trueで使用

## 日本語サポート

- UIとドキュメントは日本語
- ファイルパスには日本語文字が含まれる可能性がある（OneDriveパスなど）
- すべてのテキスト操作にUTF-8エンコーディングを使用
- データベースはUnicodeストレージを使用（SQLiteのTEXT型）

## 将来の移行計画

コードはStreamlitからFlask/FastAPIへの移行を想定して構造化されています（フェーズ2）:
- コア層は既にUIに依存しない
- `streamlit_app.py`のみ書き直しが必要
- データベーススキーマは両方のアーキテクチャをサポート
- 計画されている機能: サムネイル、気分タグ、プレイリスト、ML推薦
