# ClipBox

複数ストレージ（Cドライブ・外付けHDD）の動画ファイルを管理し、視聴履歴・お気に入りレベル・セレクションを追跡するローカル専用ツール。

## 構成

| サーバー | URL | 役割 |
|---|---|---|
| Streamlit | `localhost:8501` | 現行 UI（移行完了まで並走） |
| FastAPI | `localhost:8000` | バックエンド API |
| Next.js | `localhost:3000` | 新フロントエンド（移行中） |

## 起動方法

### 一括起動（推奨）

```bat
run_dev.bat
```

FastAPI（8000）と Next.js dev サーバー（3000）を同時起動します。  
**Streamlit は別途** 以下のコマンドで起動してください（移行期間中の並走用）。

---

### 個別起動

#### Streamlit（旧 UI）

```bash
streamlit run streamlit_app.py
```

`http://localhost:8501` で開きます。

#### FastAPI（バックエンド API）

```bash
uvicorn api_app:app --host 127.0.0.1 --port 8000 --reload
```

`http://localhost:8000/docs` で OpenAPI UI を確認できます。

#### Next.js（新フロントエンド）

```bash
cd frontend
npm run dev
```

`http://localhost:3000` で開きます。

本番ビルドで起動する場合:

```bash
cd frontend
npm run build
npm run start
```

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
  Streamlit と Next.js（FastAPI）の両方から同時に書き込むと SQLite が `SQLITE_BUSY` になります。
- Next.js の write 検証を行う際は **Streamlit を停止し、DB バックアップを取ってから** 実施してください。
- 「再生」ボタンはサーバー機（FastAPI が動いているPC）上でプレイヤーを起動します。リモートブラウザからは操作できません。

## 残作業（`feature/streamlit-ui-implementation`）

詳細は `docs/context/MIGRATION_PLAN.md` タスク5 を参照。

| 画面 | ステータス |
|---|---|
| Tier 1（ライブラリ/ランダム/運命の1本）`/` | ✅ 完了（1画面3サブタブ＝Streamlit構成に整合） |
| 検索 `/search` | ✅ 完了 |
| Tier 2 セレクション `/tier2` | ✅ 完了 |
| ランキング `/ranking` | ✅ 完了 |
| 分析ダッシュボード `/analysis` | 🔲 未実装（プレースホルダ） |
| 設定 `/settings` | 🔲 未実装（プレースホルダ） |
| Phase 5: Streamlit archive | 🔲 全画面受け入れ完了後 |

### 分析ダッシュボード `/analysis` の実装メモ

- `GET /api/analysis/data`・`/analysis/viewing-history`・`/analysis/judgment-history`・`/analysis/response-time`・`/analysis/rankings`・`/analysis/selection-trend`・`/analysis/selection-distribution` を使う
- チャートは **Recharts**（Next.js 環境で最も相性が良い）を推奨
- 受け入れ条件は `docs/context/ACCEPTANCE_CRITERIA.md` の「分析ダッシュボード」節

### 設定 `/settings` の実装メモ

- `GET/PUT /api/config`・`POST /api/scan/library`・`POST /api/scan/selection`・`POST /api/backup` を使う
- 受け入れ条件は `docs/context/ACCEPTANCE_CRITERIA.md` の「設定」節
