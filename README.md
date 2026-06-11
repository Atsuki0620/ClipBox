# ClipBox

複数ストレージ（Cドライブ・外付けHDD）の動画ファイルを管理し、視聴履歴・お気に入りレベル・セレクションを追跡するローカル専用ツール。

## 構成

| サーバー | URL | 役割 |
|---|---|---|
| Next.js | `localhost:3000` | 現行 UI（フロントエンド） |
| FastAPI | `localhost:8000` | バックエンド API |
| Streamlit | `localhost:8501` | 旧 UI（移行完了まで並走） |

現在の主導線は **Next.js + FastAPI** です。Streamlit は旧 UI として残し、移行完了まで比較・退避用に並走します。Phase 5 は Streamlit の即削除ではなく、`docs/context/ACCEPTANCE_CRITERIA.md` の全画面手動受け入れ完了後に archive へ移す段階です。

## 起動方法

### 一括起動（推奨）

```bat
run_dev.bat
```

FastAPI（8000）と Next.js dev サーバー（3000）を同時起動します。  
起動時に DB バックアップとマイグレーション確認を行い、ヘルスチェック完了後に Web UI を開きます。
**Streamlit は別途** 以下のコマンドで起動してください（移行期間中の並走用）。

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

#### Streamlit（旧 UI）

```bat
run_clipbox.bat
```

または:

```bash
streamlit run streamlit_app.py
```

`http://localhost:8501` で開きます。移行完了までの旧 UI であり、Next.js 側の write 検証時は停止してください。

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

## 注意事項（移行期間中）

- **書き込み操作（再生・判定・スキャン）は一方のサーバーのみで実行する**こと。  
  Streamlit と Next.js（FastAPI）の両方から同時に書き込むと、WAL 未設定のため `sqlite3` 既定の約5秒のロック待ち後に `database is locked`（`SQLITE_BUSY` 相当）になり得ます。
- Next.js の write 検証を行う際は **Streamlit を停止し、DB バックアップを取ってから** 実施してください。
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
| Phase 5: Streamlit archive | 🔲 全画面の手動受け入れ完了後 |

> 移行作業の計画・対応表（歴史資料）は `docs/archive/MIGRATION_PLAN.md` / `docs/archive/MIGRATION_MAP.md`。

## リポジトリ構成と整理方針

- 現行仕様・作業手順の入口: `docs/context/OVERVIEW.md` / `docs/context/AI_WORKFLOW.md`
- ルート構成の説明: `docs/context/REPO_STRUCTURE.md`
- Phase 5 の Streamlit archive 条件: `docs/context/PHASE5_STREAMLIT_ARCHIVE.md`
- フロントエンド固有の起動・技術情報: `frontend/README.md`

実データ、個人設定、DBファイル、動画ファイルはコミット対象外です。`data/` 配下を扱う変更では、秘匿情報や実データが混入していないことを必ず確認してください。
