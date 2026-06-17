# ClipBox

複数ストレージ（Cドライブ・外付けHDD）の動画ファイルを管理し、視聴履歴・お気に入りレベル・セレクションを追跡するローカル専用ツール。

## 構成

| サーバー | URL | 役割 |
|---|---|---|
| Next.js | `localhost:3000` | 現行 UI（フロントエンド） |
| FastAPI | `localhost:8000` | バックエンド API |
| Streamlit | `localhost:8501` | 旧 UI（`archive/streamlit/` に archive 済み・通常利用では使わない） |

現在の主導線は **Next.js + FastAPI** です。Streamlit 旧 UI は Phase 5 で `archive/streamlit/` へ移し、通常利用導線から外しました（削除はせず、比較・退避用に残しています）。旧 UI を確認する場合のみ `archive/streamlit/run_clipbox.bat` で起動します。

## 起動方法

### 一括起動（推奨）

```bat
run_dev.bat
```

FastAPI（8000）と Next.js dev サーバー（3000）を同時起動します。  
起動時に DB バックアップとマイグレーション確認を行い、ヘルスチェック完了後に Web UI を開きます。
通常利用はこの一括起動だけで完結します（Streamlit 旧 UI は archive 済みで通常導線には含めません）。

---

### 個別起動

#### FastAPI（バックエンド API）

```bat
run_api.bat
```

`http://localhost:8000/docs` で OpenAPI UI を確認できます。内部的には `api_app.py` を起動します。

#### Next.js（現行 UI）

```bash
cd frontend
npm run dev
```

`http://localhost:3000` で開きます。FastAPI（`localhost:8000`）が起動している前提です。

本番ビルドで起動する場合:

```bash
cd frontend
npm run build
npm run start
```

#### Streamlit（旧 UI・archive 済み・通常利用では使わない）

旧 UI は `archive/streamlit/` に archive 済みです。比較・退避目的で確認する場合のみ、リポジトリルートから:

```bat
archive\streamlit\run_clipbox.bat
```

このランチャーはリポジトリルート基準で `archive\streamlit\streamlit_app.py` を起動します（`http://localhost:8501`）。旧 UI は現行導線ではないため、Next.js + FastAPI 側で write 中は起動しないでください（WAL 未設定のため SQLite 同時書き込みは失敗し得ます）。

## 前提環境

- Python 3.11+（venv 推奨）
- Node.js 20 LTS 以上

### Python 依存のインストール

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Node 依存のインストール

```bash
cd frontend
npm install
```

## 注意事項

- **書き込み操作（再生・判定・スキャン）は一方のサーバーのみで実行する**こと。  
  archive 済みの Streamlit 旧 UI を起動して Next.js（FastAPI）と同時に書き込むと、WAL 未設定のため `sqlite3` 既定の約5秒のロック待ち後に `database is locked`（`SQLITE_BUSY` 相当）になり得ます。通常は Streamlit を起動しないため問題になりません。
- 旧 UI で書き込み確認を行う場合は **Next.js + FastAPI を停止し、DB バックアップを取ってから** 実施してください。
- 「再生」ボタンはサーバー機（FastAPI が動いているPC）上でプレイヤーを起動します。リモートブラウザからは操作できません。

## 移行ステータス

各画面の挙動仕様は `docs/context/SPEC_NEXTJS.md`、手動受け入れ基準は `docs/context/ACCEPTANCE_CRITERIA.md` を参照。

| 画面 | ステータス |
|---|---|
| Tier 1（ライブラリ/ランダム/運命の1本）`/` | ✅ 完了（1画面3サブタブ＝Streamlit構成に整合） |
| 検索 `/search` | ✅ 完了 |
| Tier 2 セレクション `/tier2` | ✅ 完了 |
| ランキング `/ranking` | ✅ 完了 |
| 分析ダッシュボード `/analysis` | ✅ 完了（Recharts） |
| 設定 `/settings` | ✅ 完了（設定編集・スキャン・バックアップ） |
| AVP再生 `/avp` | ✅ 完了 |
| あとで見る `/watch-later` | ✅ 完了（未処理 / 確認・見直し / 処理済み候補、一括解除） |
| Phase 5: Streamlit archive | ✅ archive 済み（`archive/streamlit/`） |

> 移行作業の計画・対応表（歴史資料）は `docs/archive/MIGRATION_PLAN.md` / `docs/archive/MIGRATION_MAP.md`。

## リポジトリ構成と整理方針

- 現行仕様・作業手順の入口: `docs/context/OVERVIEW.md` / `docs/context/AI_WORKFLOW.md`
- ルート構成の説明: `docs/context/REPO_STRUCTURE.md`
- Phase 5 の Streamlit archive 条件: `docs/context/PHASE5_STREAMLIT_ARCHIVE.md`
- フロントエンド固有の起動・技術情報: `frontend/README.md`

実データ、個人設定、DBファイル、動画ファイルはコミット対象外です。`data/` 配下を扱う変更では、秘匿情報や実データが混入していないことを必ず確認してください。
