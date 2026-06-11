# REPO_STRUCTURE — リポジトリ構成と整理ルール

対象読者: Coding agent / レビュアー。
位置づけ: ClipBox のルート構成と、今後の整理時に守る分類ルールを示す。機能仕様の正本ではない。画面・状態の仕様は `SPEC_NEXTJS.md`、作業手順は `AI_WORKFLOW.md` を参照する。

---

## 1. 分類

| 分類 | 意味 |
|---|---|
| active | 現行の Next.js + FastAPI 実行経路、またはそのテスト・設定 |
| legacy-active | 旧 UI だが移行完了まで運用上残すもの |
| legacy | 歴史資料、旧実装、現行実行経路から参照しないもの |
| generated | 実行時生成物、キャッシュ、ビルド成果物 |
| local-only | 実データ、個人設定、ローカル環境依存ファイル |

---

## 2. ルート直下

| パス | 分類 | 役割 |
|---|---|---|
| `api/` | active | FastAPI ルーター、スキーマ、HTTP API 層 |
| `api_app.py` | active | FastAPI アプリケーション入口 |
| `core/` | active | UI 非依存のドメインロジック、DB 操作、分析処理 |
| `frontend/` | active | Next.js 現行 UI |
| `scripts/` | active | 起動時バックアップ、マイグレーションなどの補助スクリプト |
| `tests/` | active | pytest によるバックエンド/API テスト |
| `run_dev.bat` | active | FastAPI + Next.js 一括起動 |
| `run_api.bat` | active | FastAPI 単体起動 |
| `requirements.txt` / `requirements-lock.txt` | active | Python 依存 |
| `config.py` | active | ローカル設定の既定値・定数 |
| `docs/context/` | active | 現行の正本ドキュメント |
| `docs/decisions/` | active | ADR |
| `streamlit_app.py` | legacy-active | 旧 Streamlit UI 入口。Phase 5 完了まで削除しない |
| `ui/` | legacy-active | Streamlit UI 層。Phase 5 完了まで削除しない |
| `run_clipbox.bat` | legacy-active | Streamlit 旧 UI 起動 |
| `archive/` | legacy | 旧コード断片・歴史資料。現行コードから import しない。扱いは `archive/README.md` を参照 |
| `docs/archive/` | legacy | 移行作業の計画・記録。扱いは `docs/archive/README.md` を参照 |
| `docs/reports/` | legacy | 日付付き診断・レビュー・作業記録 |
| `data/` | local-only | DB、ユーザー設定、実データ。コミット対象にしない |
| `artifacts/` | generated | 実行・確認で生成される成果物置き場 |
| `.pytest_cache/` / `__pycache__/` | generated | テスト・Python 実行キャッシュ |
| `venv/` | local-only | ローカル Python 仮想環境 |
| `.playwright-mcp/` | local-only | ローカル確認用の補助ディレクトリ |
| `demo.html` | legacy | 旧デモ/確認用ファイル。現行実行経路ではない |
| `video_analysis.ipynb` | legacy | 分析メモ。現行実行経路ではない |
| `_ul` | generated | 空のローカル生成物。必要に応じて後続整理対象 |

---

## 3. `archive/` と `docs/archive/` の違い

- `archive/`: 実行対象ではない古いコード断片や旧設計資料を隔離する場所。ここから現行コードへ import / 参照してはならない。
- `docs/archive/`: 移行計画や対応表など、作業記録として読む歴史資料を置く場所。
- `archive/README.md`: ルート `archive/` の禁止事項、再利用前の確認観点、現行正本への導線。
- `docs/archive/README.md`: `docs/archive/` の読み方と、現行正本ではないことの明示。

どちらも現行仕様の正本ではない。現行仕様は `docs/context/` の正本台帳に従う。

### 今回は物理移動しないもの

`archive/*.py` と古い Markdown は、今回 `legacy-code/` や `legacy-docs/` へ移動しない。

理由:
- archive import 参照の検索では現行コードからの import は見つからないが、`streamlit_app.py` に `archive/setup_db.py` の表示文字列が残っている。
- `docs/context/` や `docs/reports/` には `archive/*.py` への歴史資料参照が複数ある。
- 物理移動は参照更新を伴うため、README 追加とは別の単独 PR に分ける。

将来 `legacy-code/` / `legacy-docs/` に分ける場合は、参照更新、現行コードからの import 不在確認、DB バックアップ要否の確認を同じ PR で明記する。

---

## 4. Phase 5 までの Streamlit 扱い

`streamlit_app.py`、`ui/`、`run_clipbox.bat` は旧 UI だが、Phase 5 完了までは **legacy-active** として扱う。削除や大規模移動は、`PHASE5_STREAMLIT_ARCHIVE.md` の条件を満たしてから行う。

---

## 5. 今後の整理ルール

- 実行対象コードは `core/`、`api/`、`frontend/`、`scripts/`、`tests/` に寄せる。
- 歴史資料は `docs/archive/` に寄せる。
- 実行対象ではない古いコード断片は `archive/` 配下に明示的に隔離する。
- `archive/` 配下のコードは、現行コードから import / 参照がないことを `rg` で確認してから移動・削除する。
- `archive/` 配下の物理整理（例: `legacy-code/` / `legacy-docs/` への移動）は、参照更新を伴う別 PR とする。
- `data/` 配下の実データ、`data/user_config.json`、DB ファイル、動画ファイルはコミットしない。
- ルート直下に新しい一時ファイルや調査ファイルを増やさない。必要なら `docs/reports/` または `artifacts/` に置く。
