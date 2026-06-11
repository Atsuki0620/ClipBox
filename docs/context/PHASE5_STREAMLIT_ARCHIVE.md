# PHASE5_STREAMLIT_ARCHIVE — Streamlit archive 準備条件

対象読者: Coding agent / レビュアー。
位置づけ: Streamlit 旧 UI を削除ではなく archive へ移すための前提条件を固定する。機能仕様の正本ではない。

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
