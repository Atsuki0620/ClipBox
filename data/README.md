# データディレクトリ

このディレクトリには、ClipBoxのデータファイルが格納されます。

## 設定ファイル

### user_config.json

**重要**: このファイルは個人のパス情報を含むため、`.gitignore` で管理されています。

#### 初期セットアップ

1. `user_config.json.example` をコピーして `user_config.json` を作成：
   ```bash
   cp data/user_config.json.example data/user_config.json
   ```

2. 実際の環境に合わせてパスを編集：
   ```json
   {
     "library_roots": [
       "実際の動画フォルダのパス1",
       "実際の動画フォルダのパス2"
     ],
     "default_player": "gom",
     "db_path": "実際のデータベースファイルのパス",
     "show_unavailable": false,
     "show_deleted": false
   }
   ```

#### 設定項目

| 項目 | 説明 | 型 | デフォルト |
|------|------|-----|-----------|
| `library_roots` | 動画ライブラリのルートパスのリスト | string[] | - |
| `default_player` | デフォルトの動画プレイヤー | string | "gom" |
| `db_path` | データベースファイルのパス | string | - |
| `show_unavailable` | 利用不可の動画を表示するか | boolean | false |
| `show_deleted` | 削除済みの動画を表示するか | boolean | false |

## データベースファイル

### videos.db

動画メタデータを格納するSQLiteデータベースです。個人データが含まれるため、`.gitignore` で管理されています。

## その他のファイル

### backups/

データベースのバックアップファイルが格納されます（`.gitignore` で管理）。

### snapshots/

スナップショットデータが格納されます（`.gitignore` で管理）。
