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
| `requirements.txt` | active | CI・標準セットアップ用の Python 依存 |
| `requirements/` | active | 開発用依存（`dev.txt`）と Windows/ローカル由来の pin（`lock.txt`） |
| `config.py` | active | ローカル設定の既定値・定数 |
| `docs/context/` | active | 現行の正本ドキュメント |
| `docs/decisions/` | active | ADR |
| `docs/analysis/` | active / local-only | 直下の Markdown は公開可能な分析資料。`notebooks/`、`data/`、`private/`、`outputs/` は git 管理外 |
| `archive/legacy-code/` | legacy | Phase 1 で隔離した旧コード断片。現行コードから import・参照・復活しない |
| `archive/legacy-code/setup/` | legacy | 旧セットアップ対（`setup_db.py` / `verify_setup.py`）。通常導線では実行しない |
| `archive/legacy-docs/` | legacy | `archive/` 直下にあった旧設計・旧実装メモ（Markdown）の集約先。現行正本ではない |
| `archive/streamlit/` | legacy | Streamlit 旧 UI（`streamlit_app.py` / `ui/` / `run_clipbox.bat`）。Phase 5 で archive 済み。通常導線では使わない。起動は `archive/streamlit/run_clipbox.bat` |
| `archive/` | legacy | 旧コード・旧 UI・歴史資料の隔離先。現行コードから import しない。扱いは `archive/README.md` を参照 |
| `docs/archive/` | legacy | 移行作業の計画・記録。扱いは `docs/archive/README.md` を参照 |
| `docs/reports/` | legacy | 日付付き診断・レビュー・作業記録 |
| `data/` | local-only | DB、ユーザー設定、実データ。コミット対象にしない |
| `artifacts/` | generated | 実行・確認で生成される成果物置き場 |
| `.pytest_cache/` / `__pycache__/` | generated | テスト・Python 実行キャッシュ |
| `venv/` | local-only | ローカル Python 仮想環境 |
| `.playwright-mcp/` | local-only | ローカル確認用の補助ディレクトリ |
| `demo.html` | legacy | `.gitignore` 対象の未追跡ローカルファイル。旧デモ/確認用で現行実行経路ではない（2026-06-19 監査時は実体なし） |

---

## 3. `archive/` と `docs/archive/` の違い

- `archive/`: 実行対象ではない古いコード断片や旧設計資料を隔離する場所。ここから現行コードへ import / 参照してはならない。
- `docs/archive/`: 移行計画や対応表など、作業記録として読む歴史資料を置く場所。
- `archive/README.md`: ルート `archive/` の禁止事項、再利用前の確認観点、現行正本への導線。
- `docs/archive/README.md`: `docs/archive/` の読み方と、現行正本ではないことの明示。

どちらも現行仕様の正本ではない。現行仕様は `docs/context/` の正本台帳に従う。

### Phase 1 の物理移動（2026-06-20 実施済み）

Pull request #53 の導入判断に基づき、現行領域から参照されない旧 Python コード12件を `archive/legacy-code/` へ内容無変更で移動した。

- `archive/` 直下にあった旧コード10件は `archive/legacy-code/` へ移動済み。
- `archive/unused_tabs/` にあった旧 UI 断片2件は `archive/legacy-code/unused_tabs/` へ移動済み。
- `archive/streamlit/` は旧 Streamlit UI の退避先として別枠のまま変更しない。

### 構成整理の最終化（2026-06-20 実施済み）

Phase 1 後の構成整理として、次を実施した。詳細は `docs/reports/REPO_ROOT_CLEANUP_SUMMARY_20260620.md`。

- `archive/setup_db.py` と `archive/verify_setup.py` を `archive/legacy-code/setup/` へ移動。旧 Streamlit UI（`archive/streamlit/streamlit_app.py`）の表示文字列 `python archive/setup_db.py` は当時の記録として残す（非稼働 UI のため実害なし）。
- `archive/` 直下にあった旧設計・旧実装メモ（Markdown）を `archive/legacy-docs/` へ集約。`archive/README.md` は直下に残す。
- `docs/context/PROJECT_OVERVIEW.md`（Streamlit 期の概要）を `docs/archive/PROJECT_OVERVIEW_STREAMLIT.md` へ移動し、現行正本の参照を更新。

---

## 4. Streamlit の扱い（Phase 5 archive 済み）

Streamlit 旧 UI（`streamlit_app.py`、`ui/`、`run_clipbox.bat`）は Phase 5（2026-06-17）で `archive/streamlit/` へ移動済み。現行導線ではない **legacy** として扱い、削除はしない（比較・退避用）。詳細は `PHASE5_STREAMLIT_ARCHIVE.md` §8。Runtime 状態 lamp（`core/runtime_control.py` のポート 8501 監視）は現行機能として残るため、archive 後も `core/` に Streamlit 検出仕様が残ること自体は正常。

---

## 5. 今後の整理ルール

- 実行対象コードは `core/`、`api/`、`frontend/`、`scripts/`、`tests/` に寄せる。
- 歴史資料は `docs/archive/` に寄せる。
- 実行対象ではない古いコード断片は `archive/legacy-code/` 配下に明示的に隔離する。
- `archive/` 配下のコードは、現行コードから import / 参照がないことを `rg` で確認してから移動・削除する。
- `archive/` 配下の物理整理や復活は、参照更新と検証を伴う単独 Pull request とする。
- `data/` 配下の実データ、`data/user_config.json`、DB ファイル、動画ファイルはコミットしない。
- 公開可能な分析 Markdown は `docs/analysis/` 直下に置く。Notebook・分析データ・コピー DB・出力は同ディレクトリ内の ignore 対象サブディレクトリへ置き、ルート `notebooks/` は再作成しない。
- ルート直下に新しい一時ファイルや調査ファイルを増やさない。必要なら `docs/reports/` または `artifacts/` に置く。
