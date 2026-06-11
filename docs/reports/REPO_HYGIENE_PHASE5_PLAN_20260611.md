# Repo Hygiene / Phase 5 準備計画（2026-06-11）

対象読者: Coding agent / レビュアー。
位置づけ: Next.js + FastAPI 移行後のリポジトリ整理を、挙動変更なしで段階的に進めるための実行計画。仕様の正本ではない。仕様判断は `AGENTS.md` の正本台帳に従う。

---

## 1. 目的

新機能追加ではなく、次の作業を安全に進めるための土台を作る。

- ルートディレクトリの整理方針を固定する。
- Phase 5 で Streamlit を archive へ寄せる前提条件を整理する。
- CI / 品質ゲートを、既存の `TESTING.md` と矛盾しない形で導入する。
- ドキュメント正本を圧縮する前に、何を正本として残し、何を歴史資料へ寄せるかを明確化する。

この計画自体は挙動変更を含まない。

---

## 2. 現状確認

2026-06-11 時点の main 最新で確認した構成。

- ルートには実行入口（`run_dev.bat` / `run_api.bat` / `run_clipbox.bat`）、現行入口（`api_app.py` / `streamlit_app.py`）、設定（`config.py`）、依存ファイル、`demo.html`、`video_analysis.ipynb`、`_ul` などが混在している。
- `docs/context/` には正本が集約されているが、`IMPLEMENTATION_GUIDE.md` など一部は Streamlit 期の記述を含むため、現行仕様の正本とは区別が必要。
- `docs/archive/` は移行作業記録、ルート `archive/` は Streamlit 期の歴史資料・未使用コードを含む。両者は用途が異なる。
- `frontend/README.md` は create-next-app 既定文面のままで、ClipBox 固有の開発入口としては弱い。
- `.github/` は `PULL_REQUEST_TEMPLATE.md` のみで、CI workflow は未導入。

---

## 3. 分割方針

1本の巨大PRにせず、以下の3PRを main から順に作る。前PRがマージされるまで次PRは作らない。

| 順番 | ブランチ | 主目的 | 変更種別 |
|---|---|---|---|
| 1 | `docs/repo-hygiene-phase5-plan` | 本計画を追加し、後続PRの境界を固定する | docs only |
| 2 | `chore/archive-root-cleanup` | ルート整理と Streamlit archive 準備 | chore/docs |
| 3 | `ci/add-quality-gates` | CI workflow と品質ゲートを追加 | ci/docs |

---

## 4. PR1: 計画追加

### 対象

- `docs/reports/REPO_HYGIENE_PHASE5_PLAN_20260611.md`
- `CHANGELOG.md`

### やること

- A〜D の作業境界を明文化する。
- 後続PRの開始条件、禁止事項、検証コマンドを明記する。
- PR2/PR3では仕様変更を混ぜないことを固定する。

### やらないこと

- ファイル移動、削除、リネーム。
- CI workflow の追加。
- Streamlit コードの削除。
- UI / API / DB / 既存仕様の変更。

---

## 5. PR2: ルート整理 + Streamlit archive 準備

### 開始条件

- PR1 が main にマージ済み。
- 作業前に `main` を `git pull --ff-only` で最新化する。
- `rg` で移動候補の import / 参照が現行コードに無いことを確認する。

### 候補作業

- ルートに残る一時・調査・デモ系ファイルを分類し、必要なら archive 配下へ移す。
- ルート `archive/` の役割を明記する README を追加する。
- Streamlit は削除せず、旧UIとして維持する。`run_clipbox.bat` / `streamlit_app.py` / `ui/` はこのPRでは原則動かさない。
- `frontend/README.md` を ClipBox 向けの最小導線に置き換えるか、ルート README への参照に寄せる。

### 明確にやらないこと

- `streamlit_app.py` の削除。
- `ui/` の削除。
- `core/` の Streamlit 依存復活。
- ルート `archive/` 内の旧コードを現行コードへ import / 参照すること。
- 実データ、DB、動画、`data/user_config.json` の追加。

### 検証

- `rg` による参照確認。
- `git diff --check`。
- 移動対象が Python 実行経路に触れる場合は `python -m pytest`。
- フロント関連の README / 設定に触れる場合は `cd frontend && npm run typecheck` と `cd frontend && npm run lint`。

---

## 6. PR3: CI / 品質ゲート整備

### 開始条件

- PR2 が main にマージ済み。
- `docs/context/TESTING.md` の品質ゲートと矛盾しない。

### 候補作業

- `.github/workflows/` に最小 CI を追加する。
- Backend: `python -m pytest`。
- Frontend: `npm run typecheck` / `npm run lint`。
- CI は実データ・ローカルDB・動画ファイルに依存しない構成にする。

### 明確にやらないこと

- 新しいテストフレームワークの導入。
- E2E の追加。
- DB スキーマ変更。
- API / UI 挙動変更。

### 検証

- ローカルで `python -m pytest`。
- ローカルで `cd frontend && npm run typecheck`。
- ローカルで `cd frontend && npm run lint`。
- GitHub Actions 上で同等の workflow が通ること。

---

## 7. ドキュメント正本の圧縮方針

圧縮は「削ること」ではなく、正本と歴史資料を誤認しない導線にすることを目的にする。

- `AGENTS.md` は正本台帳と禁止事項の入口として残す。
- `docs/context/AI_WORKFLOW.md` は作業手順の正本として残す。
- `docs/context/TESTING.md` は品質ゲートの正本として残す。
- `docs/context/SPEC_NEXTJS.md` は Next.js 画面・状態仕様の正本として残す。
- `docs/context/OVERVIEW.md` は初見向け入口として残す。
- `docs/context/PROJECT_OVERVIEW.md`、`docs/archive/`、ルート `archive/` は歴史資料であり、現行仕様として扱わない。

実際の圧縮は、正本間の重複箇所を特定してから小さく行う。仕様変更を伴う削除や要約はしない。

---

## 8. 不変条件

全PRで以下を守る。

- 新機能追加をしない。
- UI挙動、API仕様、DBスキーマ、既存機能の仕様を変えない。
- Streamlit を削除しない。
- `core/` に `import streamlit` を持ち込まない。
- DB 接続経路、論理削除条件、永続先境界を変えない。
- 実データ、個人設定、DBファイル、動画ファイルをコミットしない。
- `archive/` の旧コードを現行機能として復活させない。

---

## 9. PR本文に書くこと

各PRは `.github/PULL_REQUEST_TEMPLATE.md` に沿って、最低限以下を明記する。

- 目的。
- 変更範囲。
- 仕様との対応: 現行仕様維持、挙動変更なし。
- DB / API / フロント影響: 変更なし、または該当範囲を明記。
- 実行した検証コマンドと結果。
- 未確認項目と理由。
- 次PRで扱うこと。
