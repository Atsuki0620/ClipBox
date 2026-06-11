# ClipBox

複数ストレージ（Cドライブ・外付けHDD）の動画を管理し、視聴履歴・お気に入りレベル・セレクションを追跡するローカル専用ツール。**3層構成**（Next.js `:3000` + FastAPI `:8000` + 旧 Streamlit `:8501` 並走）で、Streamlit から Next.js + FastAPI へ移行中。

## 正本ルール（competing 時の優先順位）

仕様が食い違ったら **「現行=正本」が「歴史資料」に優先**する。正本台帳と詳しい優先順位は `AGENTS.md` 冒頭に集約（CLAUDE.md と同じものを指す）。Next.js 版の画面・状態の挙動は **`docs/context/SPEC_NEXTJS.md` が正本**。用語は `GLOSSARY.md`、DB は `DATA_MODEL.md`、API は `API_SPEC.md`。`PROJECT_OVERVIEW.md` と `docs/archive/` は歴史資料（現行と誤認しない）。

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
5. **書き込みは一方のサーバーのみ** — Next.js(FastAPI) と Streamlit の同時書き込みは SQLite `SQLITE_BUSY`（`busy_timeout`/WAL 未設定）。Next.js の write 検証時は Streamlit を停止し DB バックアップを取る。
6. **状態の永続先を移動しない** — あとで見る/レベル/いいね=DB、AVP候補/再生対象/再生中ハイライト=localStorage（`SPEC_NEXTJS.md` §0）。

## プレフィックス規則

`####_`(Lv4) `###_`(Lv3) `##_`(Lv2) `#_`(Lv1) `_`(Lv0) なし(未判定/-1)
特殊: `!`=セレクション未選別, `+`=セレクション完了（画面表示は「選別済み」。レベルプレフィックスと組み合わせ可）

本質的ファイル名（essential_filename）= すべてのプレフィックスを除去したファイル名 → DB の UNIQUE 識別子

## よくある変更パターン

| やりたいこと | 見るファイル |
|---|---|
| フィルタ条件の追加 | `core/video_manager.py` `get_videos()` |
| 統計・集計の追加 | `core/analysis_service.py` |
| DBカラム追加 | `core/database.py` `init_database()` + `core/migration.py` |
| キャッシュクリアの追加 | `streamlit_app.py` の各ハンドラ + `ui/cache.py` |
| スキャンロジックの変更 | `core/scanner.py` `scan_and_update()` |
| 設定の追加 | `core/config_utils.py` + `data/user_config.json` |

## 既知の重要な設計上の注意

- `scan_and_update()` はスキャンで見つからなかった**全動画**を `is_available=0` に更新する。
  全ドライブが未接続でスキャンが0件の場合のみ更新をスキップ（安全ガード）。
  セレクションフォルダの個別スキャンには `scan_single_directory()` を使うこと。

## 実行方法

```bat
run_dev.bat        REM FastAPI(8000) + Next.js(3000) 一括起動（推奨）
```
```bash
streamlit run streamlit_app.py    # 旧 UI（移行完了まで並走用）
```

## 詳細ドキュメント（docs/context/）

正本（現行）:
- `SPEC_NEXTJS.md` — **Next.js 版 画面・状態の挙動仕様（正本）**
- `OVERVIEW.md` — 現行の全体像・導線
- `GLOSSARY.md` — 用語の正本
- `DATA_MODEL.md` — DBテーブル定義・クエリ例・マイグレーション履歴
- `API_SPEC.md` — HTTP API 仕様
- `ACCEPTANCE_CRITERIA.md` — 手動受け入れ基準
- `IMPLEMENTATION_GUIDE.md` — システム構造・機能実装マップ・データフロー
- `../decisions/` — ADR（アーキテクチャ決定記録）

歴史資料（正本ではない）:
- `PROJECT_OVERVIEW.md` — Streamlit 期の概要
- `../archive/` — 移行作業の記録（MIGRATION_PLAN / MIGRATION_MAP）

## AIへのコード変更ルール

1. 変更前にファイルを必ず Read する
2. core/ を変更したら `pytest tests/` でテストを通す
3. DBスキーマを変更したら `DATA_MODEL.md` を更新する
4. データを変更する操作の後は `ui_cache.xxx.clear()` を呼ぶ
5. 新機能追加や機能修正、バグ改善などすべての実行記録は `CHANGELOG.md` に追記する
6. 新ファイルを作成したらモジュール先頭に docstring を書く
   （役割・【設計制約】・【依存関係】を含める。`core/video_manager.py` を参考にすること）
