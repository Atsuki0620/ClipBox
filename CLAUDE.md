# ClipBox

Python + Streamlit の動画ファイル管理システム。複数ストレージ（Cドライブ・外付けHDD）の動画を管理し、視聴履歴・お気に入りレベルを追跡する。

## ディレクトリ構成（主要ファイル）

- `streamlit_app.py` — メインエントリーポイント
- `config.py` — 設定定数
- `core/` — ビジネスロジック（UI非依存）
- `ui/` — Streamlit UI層（タブ・コンポーネント・キャッシュ）
- `tests/` — pytest ユニットテスト（conftest.py に tmp_db フィクスチャ）
- `data/videos.db` — SQLite DB
- `data/user_config.json` — ユーザー設定（git除外）
- `docs/context/` — 詳細ドキュメント（常に最新）

## 設計原則（絶対守ること）

1. **core/ に `import streamlit` しない** — `@st.cache_data` 関数は `ui/cache.py` に集約
2. **DB接続は `get_db_connection()` 経由のみ** — `sqlite3.connect()` 直接呼び出し禁止
3. **N+1クエリ禁止** — ループ内で DB 呼び出しをしない
4. **論理削除を尊重** — クエリに `is_deleted = 0` を付ける

## プレフィックス規則

`####_`(Lv4) `###_`(Lv3) `##_`(Lv2) `#_`(Lv1) `_`(Lv0) なし(未判定/-1)
特殊: `!`=セレクション未選別, `+`=セレクション完了（レベルプレフィックスと組み合わせ可）

本質的ファイル名（essential_filename）= すべてのプレフィックスを除去したファイル名 → DB の UNIQUE 識別子

## よくある変更パターン

| やりたいこと | 見るファイル |
|---|---|
| フィルタ条件の追加 | `core/video_manager.py` `get_videos()` |
| 統計・集計の追加 | `core/analysis_service.py` |
| DBカラム追加 | `core/database.py` `init_database()` + `core/migration.py` |
| キャッシュクリアの追加 | `streamlit_app.py` の各ハンドラ + `ui/cache.py` |
| スキャンロジックの変更 | `core/scanner.py` `scan_and_update()` |
| 設定の追加 | `core/config_store.py` + `data/user_config.json` |

## 既知の重要な設計上の注意

- `scan_and_update()` の `is_available=0` 更新は **実際にスキャンしたディレクトリ配下のみ**。未接続ドライブの動画を誤って落とさないための安全策。

## 実行方法

```bash
streamlit run streamlit_app.py
```

## 詳細ドキュメント（docs/context/）

- `PROJECT_OVERVIEW.md` — プロジェクト概要・ビジネスルール・設定
- `IMPLEMENTATION_GUIDE.md` — システム構造・機能実装マップ・データフロー
- `DATA_MODEL.md` — DBテーブル定義・クエリ例・マイグレーション履歴
- `../decisions/` — ADR（アーキテクチャ決定記録）

## AIへのコード変更ルール

1. 変更前にファイルを必ず Read する
2. core/ を変更したら `pytest tests/` でテストを通す
3. DBスキーマを変更したら `DATA_MODEL.md` を更新する
4. データを変更する操作の後は `ui_cache.xxx.clear()` を呼ぶ
5. 新機能追加後は `CHANGELOG.md` に追記する
6. 新ファイルを作成したらモジュール先頭に docstring を書く
   （役割・【設計制約】・【依存関係】を含める。`core/video_manager.py` を参考にすること）
