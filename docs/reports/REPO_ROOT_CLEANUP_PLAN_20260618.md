# REPO_ROOT_CLEANUP_PLAN_20260618

対象読者: Coding agent / レビュアー。
位置づけ: Streamlit archive（Pull request #49）完了後の **ルート整理の次段階を調査・計画する** ためのメモ。本書は計画のみで、ファイルの物理移動・削除・リネームは行わない。現行の分類正本は `docs/context/REPO_STRUCTURE.md`、棚卸しの先行版は `docs/reports/REPO_ROOT_INVENTORY_20260616.md`。

---

## 2.1 現在の前提

- Streamlit 旧 UI（`streamlit_app.py` / `ui/` / `run_clipbox.bat`）は Pull request #49 で `archive/streamlit/` へ移動済み（`main` に merge 済み）。ルート直下に旧 UI ファイルは無い。
- 現行 UI は Next.js + FastAPI。Streamlit 旧 UI は archive 済みで、通常利用では起動しない。
- 現行の実行対象は `run_dev.bat`、`run_api.bat`、`api_app.py`、`api/`、`core/`、`frontend/`、`scripts/`、`tests/`。
- Runtime 状態 lamp（ポート 8501 監視・`core/runtime_control.py`）は現行機能として残る。
- `data/`、`artifacts/`、DB、動画ファイル、個人設定（`data/user_config.json` 等）は触らない。

---

## 2.2 ルート直下の棚卸し（2026-06-18 時点・`REPO_STRUCTURE.md` と矛盾させない）

分類は `REPO_STRUCTURE.md` §1 の active / legacy / generated / local-only に「要調査」を加える。`data/` 配下は深掘りしない。

### active（現行の実行経路・テスト・設定）

| パス | 役割 |
|---|---|
| `api/` / `api_app.py` | FastAPI ルーター・HTTP API 層・アプリ入口 |
| `core/` | UI 非依存のドメインロジック・DB 操作・分析 |
| `frontend/` | Next.js 現行 UI |
| `scripts/` | 起動時バックアップ・マイグレーション補助 |
| `tests/` | pytest バックエンド/API テスト |
| `run_dev.bat` / `run_api.bat` | 一括起動 / API 単体起動 |
| `config.py` / `requirements*.txt` | 設定・依存 |
| `.github/` / `.githooks/` | CI・Pull request テンプレ・ローカル hook |
| `AGENTS.md` / `CLAUDE.md` / `README.md` / `CHANGELOG.md` | ルート正本・引き継ぎ |
| `docs/context/` / `docs/decisions/` | 現行正本ドキュメント・ADR |

### legacy（歴史資料・現行実行経路から参照しない）

| パス | 役割 |
|---|---|
| `archive/`（`archive/streamlit/` を含む） | 旧コード断片・歴史資料。`archive/streamlit/` は Pull request #49 で移動した Streamlit 旧 UI |
| `docs/archive/` | 移行計画・対応表（`MIGRATION_MAP.md` / `MIGRATION_PLAN.md` / `README.md`） |
| `docs/reports/` | 日付付き診断・レビュー・作業記録（本書を含む） |
| `docs/context/PROJECT_OVERVIEW.md` | Streamlit 期の概要。**既に【歴史資料】バナー付きで正本ではない**（追加対応は不要） |

### generated / local-only（多くは既に gitignore 済み・未追跡）

| パス | 分類 | 備考 |
|---|---|---|
| `_ul` | generated | **disk 上に存在するが gitignore 済み・未追跡**（`.gitignore` L257）。追跡されていない |
| `demo.html` | legacy/local | **gitignore 済み・未追跡**（`.gitignore` L258）。旧デモ |
| `video_analysis.ipynb` | local-only | **gitignore 済み・未追跡**（`.gitignore` L231 `*.ipynb`。個人の動画パス混入防止のため commit 禁止） |
| `data/` | local-only | DB・個人設定・実データ。中身を深掘りしない |
| `artifacts/` | generated | 実行・確認の成果物置き場 |
| `venv/` / `.playwright-mcp/` / `.claude/` | local-only | ローカル環境依存 |
| `__pycache__/` / `.pytest_cache/` | generated | 実行キャッシュ |

### 要調査

| 対象 | 内容 |
|---|---|
| `archive/` 直下の旧 `.py`（例: `setup_db.py` / `counter_service.py` / `snapshot.py` / `config_store.py` / `history_repository.py` / `analysis_tab_v2.py` / `unused_tabs/` 等） | 現行コード（`core`/`api`/`frontend`/`tests`/`scripts`）からの import / 参照が無いことの確認と分類 |
| `archive/` 直下の日本語名 md・旧設計資料 | 歴史資料としての分類整理（現行正本と誤認しないこと） |
| `notebooks/` | 追跡物は `ranking_fairness_notes.md` / `ranking_fairness_round2_summary.md` の md 2点のみ（`.ipynb`/`.csv` 等は gitignore）。ランキング公平化の検討資料 = **削除候補にしない** |

### ドキュメントのズレ（記録）

`docs/context/REPO_STRUCTURE.md` §2 と `docs/reports/REPO_ROOT_INVENTORY_20260616.md` は `_ul` / `demo.html` / `video_analysis.ipynb` をルート直下エントリとして列挙しているが、実態は **gitignore 済み・未追跡**（git の管理対象ではない）。補正は **現行正本の `REPO_STRUCTURE.md` のみ**で行う。`docs/reports/REPO_ROOT_INVENTORY_20260616.md` は日付付きの履歴記録のため遡及修正せず、2026-06-18 時点の実態は本書が記録する。

---

## 2.3 次にやるべき整理タスク案（リスクが低い順・各 = 単独 Pull request）

### 案1: docs 整合のみ（最低リスク）
- 目的: `REPO_STRUCTURE.md`（現行正本）の `_ul` / `demo.html` / `video_analysis.ipynb` 記述を実態（gitignore 済み・未追跡）に合わせる。
- 対象候補: `REPO_STRUCTURE.md` §2 の該当行のみ。
- やってよいこと: 現行正本の表現補正、`archive/streamlit/` 反映の最終確認。
- やらないこと: ファイル移動・削除・コード変更。**`docs/reports/REPO_ROOT_INVENTORY_20260616.md` は日付付きの履歴記録のため現在形へ書き換えない**（2026-06-18 時点の実態は本書が記録する。さらに必要なら新しい日付の追記レポートを作る）。
- リスク: 極小（docs のみ）。
- 検証: `git diff --check` / `git status --short` / `git grep` で参照整合。
- 単独 PR 理由: docs のみで完結し、レビューが軽い。他作業と混ぜると差分が読みにくくなる。

### 案2: 生成物 / ignore 整理
- 目的: ルート直下の生成物・一時ファイルの扱いを明確化。
- 対象候補: `_ul`（空の生成物）、`demo.html`、`video_analysis.ipynb`。
- やってよいこと: 既に gitignore 済みのため **git 変更はほぼ不要**。必要なら `.gitignore` のコメント表現整理のみ。
- やらないこと: ローカル disk の物理削除は git 管理外＝ユーザー判断に委ね、PR では扱わない。`data/` には触れない。
- リスク: 低（ただし「やること」がほぼ無いことに留意）。
- 検証: `git status --short`（差分が出ないこと）。
- 単独 PR 理由: 実質作業が小さく、案1 と分けて目的を明確にする。

### 案3: 旧デモ・旧 Notebook の扱い決定
- 目的: `demo.html` / `video_analysis.ipynb` の今後の扱い（disk 保持か削除か）を文書化。
- 対象候補: 上記2ファイル（いずれも未追跡）。
- やってよいこと: 方針を `REPO_STRUCTURE.md` か本系統レポートに明記。
- やらないこと: 追跡していないファイルを git 操作しない。`notebooks/` の公平化メモは削除候補にしない。
- リスク: 低（docs のみ）。
- 検証: `git diff --check` / `git status --short`。
- 単独 PR 理由: 判断の記録が主目的で、調査・整理 PR と性質が異なる。

### 案4: archive 配下の古いコード断片の分類調査（読み取り専用）
- 目的: 将来の `legacy-code/` 化に備え、`archive/*.py` の「現行参照あり/なし」を確定。
- 対象候補: `archive/` 直下の旧 `.py` 群、`archive/unused_tabs/`。
- やってよいこと: `git grep` / import 解析で現行コードからの参照不在を確認し、分類表を新規レポートに作成。
- やらないこと: **物理移動・削除・リネームはしない**（調査のみ）。`archive/README.md` の方針に従う。
- リスク: 低（読み取り専用。結論は次の移動 PR の前提資料）。
- 検証: `git grep` 結果の要約、`python -m pytest`（コード未変更の回帰なし確認・任意）。
- 単独 PR 理由: 調査結果が独立した価値を持ち、移動を伴わないため安全に小さく出せる。

### 案5: docs/archive と archive の役割整理
- 目的: `archive/README.md` と `docs/archive/README.md` の役割重複・導線を点検。
- 対象候補: 両 README と `REPO_STRUCTURE.md` §3。
- やってよいこと: 説明文・相互リンクの整理（docs のみ）。
- やらないこと: ディレクトリ移動・統合。
- リスク: 低〜中（記述変更が広めになり得る）。
- 検証: `git diff --check` / リンク存在確認。
- 単独 PR 理由: docs 整理で完結し、コード/移動 PR と混在させない。

### 案6: `legacy-code/` / `legacy-docs/` の導入検討
- 目的: `archive/` 配下の物理再編（コード/資料の分離）の是非を判断。
- 対象候補: `archive/*.py` / `archive/*.md`。
- やってよいこと: 導入条件（参照更新を同一 PR・現行コードからの import 不在確認・DB バックアップ要否）を満たすかの検討。
- やらないこと: 今回は導入しない（大物・保留）。
- リスク: 高（参照更新を伴う大規模移動）。案4 の分類が前提。
- 検証: 実施時は `git grep` 全参照更新 + `python -m pytest` + frontend build。
- 単独 PR 理由: 移動規模が大きく、調査（案4）と分離必須。

---

## 2.4 今すぐやらないこと

- `archive/` 配下の大規模再編。
- `docs/archive/` の大規模移動。
- `core/` / `api/` / `frontend/` の構成変更。
- DB・migration 変更。
- UI 改善・総合ランキング公平化の分析実行・UI ラボ採用。
- `data/` / `artifacts/` / DB / 動画ファイル / 個人設定に触る作業。

---

## 2.5 推奨する次の一手（1つだけ）

**案4: `archive/` 直下の古いコード断片を「現行参照なし」確認つきで分類する調査 Pull request**（読み取り専用）。

理由:
- ルート直下の「生成物 / 一時ファイル」（`_ul` / `demo.html` / `video_analysis.ipynb`）は **既に gitignore 済み・未追跡** で、削除 PR としての実作業がほぼ無い。
- 一方 `archive/` の分類は、将来の `legacy-code/` / `legacy-docs/` 化（案6）という大物の安全な前提資料になり、**物理移動を伴わない読み取り専用調査**として単独 PR にしやすい。

次点（さらに最小）: **案1 の docs 整合 PR**。現行正本 `REPO_STRUCTURE.md` の `_ul` 等を「gitignore 済み・未追跡」と分かる表現に補正するだけ（日付付き履歴 `REPO_ROOT_INVENTORY_20260616.md` は書き換えない）。
