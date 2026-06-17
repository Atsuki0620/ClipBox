# PHASE5_STREAMLIT_ARCHIVE — Streamlit archive 準備条件と実施結果

対象読者: Coding agent / レビュアー。
位置づけ: Streamlit 旧 UI を削除ではなく archive へ移すための前提条件を固定し、加えて §8 に 2026-06-17 の実施結果（Pull request #49）を記録する。機能仕様の正本ではない。

---

## 1. Phase 5 の目的

Next.js + FastAPI 版を現行 UI として安定運用できる状態にしたうえで、旧 Streamlit UI を実行導線から外し、リポジトリ内で legacy として明確に隔離する。

Phase 5 は **即削除ではない**。受け入れ完了前に Streamlit を消すと、移行漏れの確認手段と比較対象を失うため、archive 準備は段階的に行う。

---

## 2. Streamlit をすぐ消さない理由

- 旧 UI は移行完了まで比較対象として使う。
- `core/` は Streamlit と FastAPI が共有しており、UI だけを消しても共有ロジックの検証は残る。
- 書き込み機能の移行漏れや手動受け入れ未完了の画面がある場合、旧 UI が退避経路になる。
- `archive/` 内の古い機能を現行機能と誤認して復活させないため、移動条件を明文化する必要がある。

---

## 3. 実行条件

Phase 5 archive 作業は、以下を満たしてから着手する。

- `ACCEPTANCE_CRITERIA.md` の全画面シナリオが完了している。
- Next.js / FastAPI の主要書き込み動作を確認済み。
  - 再生履歴
  - レベル判定
  - Tier2 選別
  - あとで見る
  - いいね
  - 設定保存
  - スキャン / バックアップ
- DB バックアップ手順を確認済み。
- Streamlit と Next.js の機能差分が「移行済み / 廃止 / 保留」に分類済み。
- Streamlit と FastAPI の同時書き込みを避ける運用が確認済み。

---

## 4. Phase 5 で移動候補となるもの

- `streamlit_app.py`
- `ui/`
- `run_clipbox.bat`
- Streamlit 専用 docs
- Streamlit 専用の起動・確認メモ

移動する場合は、現行コードからの import / 参照がないことを確認し、挙動変更を混ぜない単独 PR で行う。

---

## 5. Phase 5 でも削除しないもの

- `core/`
- `api/`
- `frontend/`
- `tests/`
- `scripts/`
- shared な設定・DB 操作
- DB スキーマ、マイグレーション、分析ロジック

これらは Next.js + FastAPI 版でも利用する現行要素であり、Streamlit archive と同時に削除・変更しない。

---

## 6. 禁止事項

- 受け入れ未完了のまま Streamlit を削除しない。
- `archive/` の旧コードや archived 機能を現行機能として復活させない。
- UI挙動、API仕様、DBスキーマ変更を Streamlit archive PR に混ぜない。
- 実データ、DB、動画、個人設定をコミットしない。
- `core/` に Streamlit 依存を追加しない。

---

## 7. PR に書くこと

- `ACCEPTANCE_CRITERIA.md` の確認結果。
- Streamlit / Next.js 差分分類の結果。
- DB バックアップ手順の確認結果。
- 移動対象と、現行コードから import / 参照されていないことの確認結果。
- 未確認項目と理由。

---

## 8. Phase 5 実施結果（2026-06-17）

Streamlit 旧 UI を `archive/streamlit/` へ移動し、通常利用導線を Next.js + FastAPI に一本化した。

### 受け入れ判断

- `docs/reports/ACCEPTANCE_RUN_20260616.md` の最新総合判定を `ready_for_streamlit_archive` に整合。2026-06-17 の write-enabled acceptance rerun で主要画面・主要 write 操作・AVP・バックアップ・スキャン・Runtime status・自動チェック・復元確認が通過済み。
- 残 skipped / 対象外（archive 阻害なし）: AVP 外付けHDD（実在候補なし）、Runtime control 停止ボタン（作業環境を止めるため必須条件にしない）、初回 read-only 表の未確認（初回時点の記録・2回目で補完）。

### archive 対象（`git mv` で移動・履歴保持）

- `streamlit_app.py` → `archive/streamlit/streamlit_app.py`
- `ui/`（`__init__.py` / `_theme*.css` / `components/` / 各 `*_tab.py`）→ `archive/streamlit/ui/`
- `run_clipbox.bat` → `archive/streamlit/run_clipbox.bat`（リポジトリルート基準 + `PYTHONPATH` で起動可能に補正。`streamlit_app.py` 本体は無改変）

### 残したもの（現行・移動しない）

- `core/`・`api/`・`frontend/`・`tests/`・`scripts/`・`config.py`（共有・Streamlit 専用ではない）。
- Runtime 状態 lamp / 停止制御（`core/runtime_control.py`・`frontend/.../SidebarNav.tsx`・関連テスト）。ポート 8501 と cmdline マーカー `streamlit_app.py`（部分一致）で検出するため、archive 後も無改変で動作。通常は Streamlit を起動しないため lamp は "stopped" を示す。

### 移動しなかったもの（理由）

- `docs/context/PROJECT_OVERVIEW.md`（Streamlit 期の概要）: 既に歴史資料として隔離済み。移動すると AGENTS.md / OVERVIEW.md / CLAUDE.md からの参照が広範に崩れるため、本作業では動かさない。
- `config.py`: Next.js + FastAPI 側でも使う共有設定のため残す。

### 残参照の扱い

- `.github/workflows/ci.yml` の `py_compile` 対象から `streamlit_app.py` を除外（archived 旧 UI は CI コンパイルゲート対象外）。
- README / OVERVIEW / REPO_STRUCTURE / AGENTS / CLAUDE の Streamlit 並走・ルート直下パス・起動手順を archive 後の構成へ更新。
- 歴史資料（`docs/archive/`・`docs/reports/` の日付付き記録・ルート `archive/`）の Streamlit 記述は当時の記録として保持。

### 確認コマンド

```
python -m compileall api core
python -m pytest
cd frontend && npm run typecheck && npm run lint && npm run build
git diff --check
git status --short -- data artifacts   # 差分なし
```

### データ非接触

`data/` 配下の DB・個人設定・動画ファイル、`artifacts/` は移動・変更していない。Streamlit archive は実データに触れていない。archived 旧 UI の対話起動による実画面確認は、並走書き込み禁止（`CLAUDE.md` 設計原則5）に従い実施しない。
