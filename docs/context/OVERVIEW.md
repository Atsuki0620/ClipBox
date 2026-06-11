# OVERVIEW — ClipBox 現行全体像と導線

対象読者: 初見の Coding agent・レビュアー。**現行（Next.js + FastAPI 版）の全体像**と、各正本への入口を示す。
画面・状態の挙動は `SPEC_NEXTJS.md`、用語は `GLOSSARY.md`、DB は `DATA_MODEL.md`、API は `API_SPEC.md` を参照。

> Streamlit 期の概要は `PROJECT_OVERVIEW.md`（歴史資料）。本書が現行の概要。

---

## 1. これは何か

複数ストレージ（Cドライブ・外付けHDD）に分散した動画ファイルを管理し、視聴履歴・お気に入りレベル・セレクションを追跡する**ローカル専用ツール**（Windows・単一ユーザー想定）。

主な作業フロー:
- **Tier1（一次判定）**: 未判定動画にお気に入りレベル（Lv0〜Lv4）を付ける。
- **Tier2（二次判定/セレクション）**: `selection_folder` の `!` 付き動画を選別する。
- **AVP**: 候補から最大4本を選び画面分割で並列再生。
- **あとで見る / ランキング / 分析 / 検索 / 設定**。

---

## 2. アーキテクチャ（3層・移行中）

```
┌─────────────────────────────┐   ┌──────────────────────────────┐
│ Next.js 16 (localhost:3000) │   │ Streamlit (localhost:8501)   │
│ App Router / React 19 / TS  │   │ 旧 UI・移行完了まで並走       │
│ Zustand / TanStack Query /  │   └──────────────┬───────────────┘
│ Recharts                    │                  │
└──────────────┬──────────────┘                  │
               │ HTTP (/api)                      │
┌──────────────▼──────────────┐                  │
│ FastAPI (localhost:8000)    │                  │
│ api_app.py + api/           │                  │
└──────────────┬──────────────┘                  │
               │                                  │
┌──────────────▼──────────────────────────────────▼──────────────┐
│ Core 層 (core/*.py) — UI 非依存。両 UI が共用                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                  ┌────────────▼────────────┐
                  │ SQLite (data/videos.db) │
                  └─────────────────────────┘
```

- **Core 層は UI に依存しない**（`import streamlit` 禁止）。Next.js/FastAPI と Streamlit が同じ `core/` を共用する。
- **書き込みは一方のサーバーのみ**（WAL 未設定。同時書き込みは `sqlite3` 既定の約5秒のロック待ち後に `database is locked`／`SQLITE_BUSY` 相当で失敗し得る）。

技術スタック: Next.js 16 / React 19 / TypeScript / Zustand / TanStack Query / Recharts（フロント）、FastAPI / Python 3.11+（API）、SQLite（DB）。Core の分析は Pandas。

---

## 3. 画面（Next.js ルート）

| ルート | 画面 |
|---|---|
| `/` | Tier1 ライブラリ（ライブラリ/ランダム/運命の1本） |
| `/tier2` | Tier2 セレクション |
| `/avp` | AVP再生 |
| `/ranking` | ランキング |
| `/analysis` | 分析ダッシュボード |
| `/search` | 検索 |
| `/settings` | 設定（バックアップ・スキャン） |

各画面の責務・操作・状態の意味は `SPEC_NEXTJS.md` を参照。

---

## 4. 起動

| 用途 | コマンド |
|---|---|
| 一括起動（推奨） | `run_dev.bat`（DBバックアップ → マイグレーション → FastAPI + Next.js → ヘルス待ち） |
| API のみ | `run_api.bat` |
| Streamlit のみ | `run_clipbox.bat` |

詳細・前提環境は `README.md`。

---

## 5. ドキュメント導線（正本台帳は `AGENTS.md`）

- 作業前にまず本書 → `SPEC_NEXTJS.md`。
- 用語=`GLOSSARY.md` / DB=`DATA_MODEL.md` / API=`API_SPEC.md` / 手動合否=`ACCEPTANCE_CRITERIA.md` / リポジトリ構成=`REPO_STRUCTURE.md` / Phase 5=`PHASE5_STREAMLIT_ARCHIVE.md` / 構造=`IMPLEMENTATION_GUIDE.md` / 決定記録=`docs/decisions/`。
- 歴史資料（現行と誤認しない）: `PROJECT_OVERVIEW.md`、`docs/archive/`、`docs/reports/`。
