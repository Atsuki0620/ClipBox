# PHASE5_STREAMLIT_ARCHIVE_PREP_20260616

対象読者: Coding agent / レビュアー。
位置づけ: `docs/context/PHASE5_STREAMLIT_ARCHIVE.md` に基づく Phase 5 着手前の準備メモ。これは Phase 5 完了報告ではない。

---

## 1. 目的

Streamlit 旧 UI を archive へ移す前に、Next.js + FastAPI 版で現行 UI として必要な動作を確認し、移動してよいものと移動してはいけないものを分ける。

今回の作業では、Streamlit 関連ファイルの物理移動、削除、DB 変更、API 変更、UI 変更は行わない。

---

## 2. 着手前の確認条件

Phase 5 archive 作業に進む前に、少なくとも以下を確認する。

- `docs/context/ACCEPTANCE_CRITERIA.md` の全画面シナリオが完了している。
- Next.js / FastAPI の主要書き込み動作を確認済み。
- DB バックアップ手順を確認済み。
- Streamlit と FastAPI の同時書き込みを避ける運用を確認済み。
- Streamlit と Next.js の機能差分を「移行済み / 要確認 / 廃止」に分類済み。
- 現行コードから `streamlit_app.py` / `ui/` / `run_clipbox.bat` への依存有無を確認済み。

---

## 3. 書き込み動作確認

Next.js + FastAPI 側で以下の書き込みが期待どおり動くことを確認する。

| 対象 | 確認すること |
|---|---|
| 再生履歴 | 通常再生と AVP 起動後の履歴記録 |
| レベル判定 | `未判定 / Lv0..Lv4` の更新と表示反映 |
| Tier2 選別 | 未選別、選別完了、未選別に戻す操作 |
| あとで見る | 追加、解除、処理済み候補、一括解除、自動解除条件 |
| いいね | 追加とランキング / 分析側への反映 |
| 設定保存 | ユーザー設定の保存と再読込 |
| スキャン | ライブラリスキャン、セレクションスキャン、利用可否更新 |
| バックアップ | 起動時バックアップ、手動バックアップ |

---

## 4. DB バックアップと同時書き込み回避

Streamlit archive や Next.js write 検証を行う前に、DB バックアップを取る。

同時書き込みを避けるため、Next.js / FastAPI 側の書き込み検証中は Streamlit を停止する。ClipBox は WAL 未設定のため、Streamlit と FastAPI が同時に SQLite へ書き込むと `database is locked` / `SQLITE_BUSY` 相当で失敗し得る。

この準備メモでは `data/` 配下の DB、個人設定、動画ファイルを開かない。バックアップや実データ操作は別作業で明示的に行う。

---

## 5. 機能差分メモ

| 領域 | 状態 | メモ |
|---|---|---|
| Tier1 | 移行済み | ライブラリ、ランダム、運命の1本を Next.js 側の現行導線として扱う |
| Tier2 | 移行済み | 未選別、選別完了、未選別に戻す操作を現行仕様として扱う |
| 検索 | 移行済み | Next.js 側の検索画面を現行導線として扱う |
| ランキング | 移行済み | 総合スコア式と係数は `SPEC_NEXTJS.md` を正本とする |
| 分析 | 移行済み | 現行の分析画面を対象とし、旧 analysis v2 は復活させない |
| 設定 | 移行済み | 設定保存、スキャン、バックアップ導線を確認対象とする |
| AVP | 移行済み | 候補上限なし、再生対象最大4本の制約を維持する |
| あとで見る | 移行済み | DB 永続、自動解除条件、通常再生では解除しない挙動を維持する |
| Runtime | 移行済み | FastAPI / Next.js の起動状態表示を現行導線として扱う |
| スキャン | 移行済み | ライブラリとセレクションのスキャンを確認対象とする |
| バックアップ | 移行済み | 起動時と手動バックアップを確認対象とする |
| Streamlit 固有 UI | 要確認 | 旧 UI 固有の補助表示や操作で、現行導線に必要なものが残っていないか確認する |
| 旧 analysis v2 | 廃止 | archived 機能として扱い、現行機能として復活させない |
| `counters` / `is_judging` 系 | 廃止 | archived 機能として扱い、現行機能として復活させない |

---

## 6. 今回移動しないもの

今回の準備メモ追加では、以下を移動・削除・変更しない。

- `streamlit_app.py`
- `ui/`
- `run_clipbox.bat`
- `core/`
- `api/`
- `frontend/`
- `tests/`
- `scripts/`
- DB スキーマ、マイグレーション、分析ロジック
- `data/` 配下の実データ、DB、個人設定、動画ファイル

Streamlit archive の物理移動は、受け入れ確認、DB バックアップ、参照確認を終えた後の単独 Pull request で行う。

---

## 7. Pull request に書くこと

Phase 5 archive を実施する Pull request では、以下を明記する。

- `ACCEPTANCE_CRITERIA.md` の確認結果。
- 主要書き込み動作の確認結果。
- DB バックアップの実施結果。
- Streamlit と FastAPI の同時書き込みを避けたこと。
- 移動対象と、現行コードから import / 参照されていないこと。
- 未確認項目と理由。
