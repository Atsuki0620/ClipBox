# Repository Guidelines

## プロジェクト構成と配置

ClipBox は複数ストレージ（Cドライブ・外付けHDD）の動画ファイルを管理し、視聴履歴・お気に入りレベル・セレクションを追跡する**ローカル専用ツール**です。現在は **3層構成**で、Streamlit から Next.js + FastAPI へ移行中（移行完了まで Streamlit と並走）。

| サーバー | URL | 役割 |
|---|---|---|
| Next.js | `localhost:3000` | 新フロントエンド（現行 UI） |
| FastAPI | `localhost:8000` | バックエンド API（`api_app.py` + `api/`） |
| Streamlit | `localhost:8501` | 旧 UI（移行完了まで並走） |

- ドメインロジックと DB 操作は `core/` 配下（UI フレームワーク非依存。例: `core/video_manager.py`, `core/analysis_service.py`）。
- フロントエンドは `frontend/`（Next.js 16 App Router / React 19 / TypeScript / Zustand / TanStack Query / Recharts）。
- 設定は `config.py` と `data/user_config.json`（生成・git 除外）、テストは `tests/`（pytest）、設計資料は `docs/` に置かれています。
- 動画や一時ファイルは `data/` 配下（リポジトリには含めない）。**言語は日本語**でユーザーと対話すること。

## 正本台帳（competing 時の優先順位）— 作業前に必読

仕様はコードと以下のドキュメントで固定する。**記述が食い違ったときは「現行=正本」が「歴史資料」に優先する**。
さらに正本同士では、対象領域ごとに以下が勝つ。

| 領域 | 正本（current source of truth） |
|---|---|
| AI の作業手順（読む順・計画/小修正の境界・PRチェック） | `docs/context/AI_WORKFLOW.md` |
| 品質ゲート・回帰確認（テスト範囲・手動確認・完了条件） | `docs/context/TESTING.md` |
| Next.js 画面・状態の挙動 | `docs/context/SPEC_NEXTJS.md` |
| 用語の意味 | `docs/context/GLOSSARY.md` |
| DB スキーマ・履歴 | `docs/context/DATA_MODEL.md` |
| HTTP API | `docs/context/API_SPEC.md` |
| 手動受け入れ基準 | `docs/context/ACCEPTANCE_CRITERIA.md` |
| 現行の全体像・導線 | `docs/context/OVERVIEW.md` |
| AI 向け設計原則・変更ルール | `CLAUDE.md` |

**歴史資料（正本ではない・現行と誤認しない）**: `docs/context/PROJECT_OVERVIEW.md`（Streamlit 期の概要）、`docs/archive/`（移行作業の記録）、`docs/reports/`（日付付きレビュー）。

> 迷ったらまず `OVERVIEW.md` → `SPEC_NEXTJS.md` を読む。`CLAUDE.md` の設計原則と本台帳は同じ内容を指す。
> **コードを変更する作業は `docs/context/AI_WORKFLOW.md`（読む順・計画/小修正の境界・止まる条件・テスト方針・PRチェック）に従う。**

## ビルド・テスト・開発コマンド

- 一括起動（Windows・推奨）: `run_dev.bat`（起動時 DB バックアップ → マイグレーション → FastAPI + Next.js 起動 → ヘルス待ち）
- API のみ: `run_api.bat` / Streamlit のみ: `run_clipbox.bat`
- Python 依存: `python -m pip install -r requirements.txt`
- Node 依存: `cd frontend && npm install`
- 単体テスト（バックエンド）: `python -m pytest`（`tests/` を自動検出）
- 静的チェック: `python -m py_compile streamlit_app.py core/*.py api/*.py`
- フロントエンド開発: `cd frontend && npm run dev`（本番は `npm run build && npm run start`）

> フロントエンドには自動テストが無い。フロント変更は型/ビルド通過と `ACCEPTANCE_CRITERIA.md` の手動シナリオで確認する。Next.js 16 は破壊的変更があるため、`frontend/AGENTS.md` の注意に従う。

## コーディングスタイルと命名

- Python: 4 スペースインデント、型ヒント必須、f-string 優先。関数・変数は `snake_case`、クラスは `PascalCase`。副作用は `core/` に寄せ、UI 層（Streamlit / API ハンドラ）は薄く保つ。
- TypeScript: 既存の `frontend/src` の規約に合わせる。API レスポンスは snake_case のまま扱う（`types.ts`）。
- ユーザー表示テキストは UTF-8 日本語。レベル表記は `未判定 / Lv0..Lv4` に統一（`GLOSSARY.md`）。

## 設計原則（絶対）

1. `core/` に `import streamlit` しない。`@st.cache_data` は `ui/cache.py` に集約。
2. DB 接続は `get_db_connection()` 経由のみ（`sqlite3.connect()` 直呼び禁止）。
3. N+1 クエリ禁止（ループ内 DB 呼び出し禁止）。
4. 論理削除を尊重（クエリに `is_deleted = 0`）。
5. **書き込みは Next.js(FastAPI) と Streamlit のどちらか一方のみ**で行う（同時書き込みは SQLite `SQLITE_BUSY`。`busy_timeout`/WAL 未設定）。Next.js の write 検証時は Streamlit を停止し DB バックアップを取る。

## 禁止事項（仕様の勝手な変更をしない）

詳細は `SPEC_NEXTJS.md` §12。要点:
- 状態の**永続先（DB or localStorage）を移動しない**（あとで見る=DB、AVP候補/再生対象/再生中ハイライト=localStorage）。
- **レベル↔ファイル名プレフィックス**の対応、`essential_filename` の UNIQUE 性を変えない。
- **あとで見るの自動解除条件**（判定/選別完了）を変えない。
- **AVP 上限4本・候補上限なし**、**総合スコア式・係数**（A=1,B=3,T1=+0.5,T2=+0.3）を理由なく変えない。
- archived（`is_judging` / `counters` 等）を「現行機能」と誤認して復活させない。

## テスト指針

`tests/` 直下に `test_*.py`。主要ユースケース（フィルタ組み合わせ、DB 更新/検知、表示ソート、API の正常系＋主要異常系）をカバー。
`core/` を変更したら `pytest tests/` を通すこと。失敗時メッセージは日本語で明確に。

## コミットとプルリクエスト

- Conventional Commits（`feat:`, `fix:`, `docs:`, `refactor:` ...）。
- PR には目的・変更概要・テスト結果（コマンドと要約）・影響範囲（DB 変更の有無、設定ファイルの追加の有無、フロント/バック/docs のどれか）を記載。
- すべての機能追加・修正・バグ改善は `CHANGELOG.md` に追記する。
- DB スキーマ変更時は `DATA_MODEL.md` を、画面・状態の挙動を変えたら `SPEC_NEXTJS.md` を同一 PR で更新する。

## セキュリティと設定の扱い

`data/` 配下の実データ・個人設定（`user_config.json`）はコミットしない（`.gitignore` 済み）。パス情報変更時はサンプルを提示し、秘匿情報は含めない。ログ・スクリーンショット共有時は個人情報の混入に注意。
