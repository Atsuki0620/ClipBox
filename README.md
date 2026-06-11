# ClipBox

複数ストレージ（Cドライブ・外付けHDD）の動画ファイルを管理し、視聴履歴・お気に入りレベル・セレクションを追跡するローカル専用ツール。

## 構成

| サーバー | URL | 役割 |
|---|---|---|
| Next.js | `localhost:3000` | 現行 UI（フロントエンド） |
| FastAPI | `localhost:8000` | バックエンド API |
| Streamlit | `localhost:8501` | 旧 UI（移行完了まで並走） |

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

#### Next.js（現行 UI）

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
