# REPO_ROOT_INVENTORY_20260616

対象読者: Coding agent / レビュアー。
位置づけ: `docs/context/REPO_STRUCTURE.md` の分類に沿った、2026-06-16 時点のルート直下棚卸し。

---

## 1. 前提

この棚卸しはルート直下の存在確認に限定する。`data/` は実データ、個人設定、DB、動画ファイルを含み得るため、中身を深掘りしない。

今回の作業では、ファイルやディレクトリの物理移動、削除、リネームは行わない。

---

## 2. active

現行の Next.js + FastAPI 実行経路、またはそのテスト・設定。

| パス | 役割 |
|---|---|
| `api/` | FastAPI ルーター、スキーマ、HTTP API 層 |
| `api_app.py` | FastAPI アプリケーション入口 |
| `core/` | UI 非依存のドメインロジック、DB 操作、分析処理 |
| `frontend/` | Next.js 現行 UI |
| `scripts/` | 起動時バックアップ、マイグレーションなどの補助スクリプト |
| `tests/` | pytest によるバックエンド/API テスト |
| `run_dev.bat` | FastAPI + Next.js 一括起動 |
| `run_api.bat` | FastAPI 単体起動 |
| `.github/` | GitHub Actions / Pull request テンプレート |
| `.githooks/` | ローカル Git hook |
| `requirements.txt` | Python 依存 |
| `requirements-lock.txt` | Python 依存ロック |
| `requirements-dev.txt` | 開発用 Python 依存 |
| `config.py` | ローカル設定の既定値・定数 |
| `AGENTS.md` | Coding agent 向けリポジトリ指示 |
| `CLAUDE.md` | AI 向け設計原則・変更ルール |
| `README.md` | 利用者向け概要 |
| `CHANGELOG.md` | 主要変更の引き継ぎ記録 |
| `.gitignore` | Git 除外設定 |
| `.gitattributes` | Git 属性設定 |

主要 docs:

| パス | 役割 |
|---|---|
| `docs/context/` | 現行正本ドキュメント |
| `docs/decisions/` | ADR |

---

## 3. legacy-active

旧 UI だが、移行完了まで運用上残すもの。

| パス | 役割 |
|---|---|
| `streamlit_app.py` | 旧 Streamlit UI 入口 |
| `ui/` | Streamlit UI 層 |
| `run_clipbox.bat` | Streamlit 旧 UI 起動 |

これらは Phase 5 完了まで削除・大規模移動しない。扱いは `docs/context/PHASE5_STREAMLIT_ARCHIVE.md` に従う。

---

## 4. legacy

歴史資料、旧実装、現行実行経路から参照しないもの。

| パス | 役割 |
|---|---|
| `archive/` | 旧コード断片・歴史資料 |
| `docs/archive/` | 移行作業の計画・記録 |
| `docs/reports/` | 日付付き診断・レビュー・作業記録 |
| `notebooks/` | 分析・検証ノート |
| `demo.html` | 旧デモ / 確認用ファイル |
| `video_analysis.ipynb` | 分析メモ |

`archive/` や `docs/archive/` は現行仕様の正本ではない。現行仕様は `docs/context/` を参照する。

---

## 5. generated / local-only

実行時生成物、キャッシュ、ビルド成果物、またはローカル環境依存ファイル。

| パス | 分類 | 役割 |
|---|---|---|
| `artifacts/` | generated | 実行・確認で生成される成果物置き場 |
| `.pytest_cache/` | generated | pytest キャッシュ |
| `__pycache__/` | generated | Python 実行キャッシュ |
| `_ul` | generated | 空のローカル生成物。必要に応じて後続整理対象 |
| `.playwright-mcp/` | local-only | ローカル確認用の補助ディレクトリ |
| `.claude/` | local-only | ローカル AI ツール補助設定 |
| `venv/` | local-only | ローカル Python 仮想環境 |
| `data/` | local-only | DB、ユーザー設定、実データ |

`data/` 配下は中身を深掘りしない。実データ、個人設定、DB、動画ファイルは触らず、コミット対象にしない。

---

## 6. 今回の結論

- 現行実行経路は `api/`、`api_app.py`、`core/`、`frontend/`、`scripts/`、`tests/`、起動バッチ、設定・依存ファイルに集約されている。
- Streamlit 関連の `streamlit_app.py`、`ui/`、`run_clipbox.bat` は legacy-active として残す。
- `archive/`、`docs/archive/`、`docs/reports/` は歴史資料・作業記録であり、現行仕様の正本として扱わない。
- generated / local-only は整理対象に見えても、実データやローカル環境依存を含むため、別作業で明示的に扱う。
