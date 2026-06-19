# AI_WORKFLOW — AI が ClipBox を安全に変更するための作業手順（正本）

対象読者: Coding agent（Claude Code / Codex）、レビュアー。
位置づけ: **AI 作業の単一入口**。「何をどの順で読み、どこで止まり、何を実行し、PR に何を書くか」を一本化する。
仕様そのもの（画面挙動・用語・スコア式・禁止事項）は再掲せず、各正本へリンクする。記述が食い違ったときの優先順位は `AGENTS.md` の正本台帳に従う。

> このファイルは手順の正本であり、機能仕様の正本ではない。機能の意味は `SPEC_NEXTJS.md` ほかを見ること。

---

## §A 作業開始前に読む（この順で）

1. `AGENTS.md`（ルート）— 正本台帳・設計原則・**禁止事項**・ビルド/テストコマンド。
2. `docs/context/OVERVIEW.md` — 3層構成（Next.js 3000 / FastAPI 8000 / 旧 Streamlit 8501）と現行導線。
3. `docs/context/SPEC_NEXTJS.md` — 画面・状態の挙動。特に変更が触れる領域の節を読む:
   - 状態の永続境界（DB か localStorage か）→ **§0**
   - ファイル名プレフィックス↔DB カラムの二重持ち → **§5**
   - 総合スコア式 → **§9**
   - AI 禁止リスト → **§12**
4. 領域別の正本（必要時）: 用語 `GLOSSARY.md` / DB `DATA_MODEL.md` / API `API_SPEC.md` / 手動合否 `ACCEPTANCE_CRITERIA.md`。
5. フロント変更時: `frontend/AGENTS.md`（Next.js 16 破壊的変更の注意）。

> 「AI向け仕様サマリ」を新設しない方針。意味の正本は上記であり、本書はそこへの導線に徹する。

### 作業種別ごとの追加で読むもの

| 作業種別 | 追加で読むもの |
|---|---|
| docs only | 変更対象 doc とリンク先。品質確認は `TESTING.md` §2 / §5 |
| repo structure cleanup | `REPO_STRUCTURE.md`、`TESTING.md`、移動候補の参照検索結果 |
| frontend behavior change | `SPEC_NEXTJS.md` の該当節、`frontend/AGENTS.md`、`TESTING.md` の frontend ゲート |
| backend/API change | `API_SPEC.md`、`DATA_MODEL.md`（DBに触れる場合）、`TESTING.md` の backend ゲート |
| Phase 5 archive | `PHASE5_STREAMLIT_ARCHIVE.md`、`ACCEPTANCE_CRITERIA.md`、`REPO_STRUCTURE.md` |
| CI/test workflow change | `TESTING.md`、`.github/PULL_REQUEST_TEMPLATE.md`、既存の `requirements*.txt` / `frontend/package.json` |

---

## §B 計画必須か / 小修正OK か（着手前の判断）

**先に計画（plan）を出してから実装する** — いずれかに該当:
- 新規 API エンドポイントの追加・既存 API の入出力変更。
- DB スキーマ / migration の変更。
- 状態の**永続先**（DB ⇄ localStorage）、AVP の上限、総合スコア式・係数、レベル↔プレフィックス対応に**触れる**変更。
- 複数画面・複数レイヤ（core / api / frontend）にまたがる変更。
- 既存挙動の**意味が変わりうる**変更（フィルタの定義、ソート基準、自動解除条件 等）。

**そのまま実装してよい（小修正）** — すべてに該当:
- 文言・スタイル・型注釈・コメント・ドキュメントのみ。
- 単一コンポーネント内の表示バグ修正で、不変条件（§D）に触れない。
- テストの追加・修正。
- 局所的で副作用が閉じている変更。

---

## §C 止まってユーザー確認する条件（迷ったら止まる）

以下は実装に進まず `AskUserQuestion` で確認する:
- §D の禁止事項に**抵触しうる**変更。
- 仕様が docs 間で**食い違う** / どれが「正本」か判断できない。
- DB データの**破壊的変更**（一括更新・削除・スキーマ破壊的変更）。
- **Streamlit と FastAPI の同時書き込み**が絡む検証（`SQLITE_BUSY` リスク。Streamlit 停止＋DB バックアップが前提）。
- `VideoCard` の **`displayContext` に新しい値を追加**する変更（現状 `tier1`/`tier2`/`avp` の3値で固定。第4値は多態の複雑化＝開始条件に直結する。`SPEC_NEXTJS.md` §6）。
- **queryKey / invalidate の設計変更**（キーの構造変更・共有キーの分割等）。invalidate 漏れはキャッシュ不整合を生む。
- ユーザーの意図がコード/会話から確定できない設計判断。

---

## §D 変更してはいけない挙動（不変条件・要点）

完全なリストは **`AGENTS.md` 末尾「禁止事項」** と **`SPEC_NEXTJS.md` §12**。要点のみ:
- 状態の**永続先（DB か localStorage か）を移動しない**（§0）。
- **レベル↔ファイル名プレフィックス**の対応、`essential_filename` の UNIQUE 性を変えない（§5）。
- **あとで見るの自動解除条件**（判定/選別完了）を変えない（§4）。
- **AVP 上限4本・候補上限なし**、**総合スコア式・係数**（A=1, B=3, T1=+0.5, T2=+0.3）を理由なく変えない（§6 / §9）。
- archived（`is_judging` / `counters` 等）を現行機能と誤認して復活させない（§10 / §11）。

---

## §E テスト方針・品質ゲート（正本: `TESTING.md`）

**詳細は `docs/context/TESTING.md`（品質ゲート・回帰確認の正本）を見る。** ここは要点のみ。

| 変更種別 | 最低限のゲート |
|---|---|
| `core/` / API（FastAPI） | `python -m pytest`（全緑）。API I/O 変更時は `API_SPEC.md` 整合 |
| frontend | `npm run typecheck` ＋ `npm run lint`（両方通過）＋ §F スモーク。`SPEC_NEXTJS.md` §0 の永続境界を移動しない |
| DB スキーマ / migration | `python -m pytest` ＋ `DATA_MODEL.md` 更新 ＋ DB バックアップ前提 ＋ `run_migrations.py` を API 停止状態で確認 |
| 起動バッチ / scripts | 起動→`/api/health` 200→`/` 表示＋`startup_backup` 生成を実機確認 |
| docs のみ | 相互リンク切れがないこと |

> frontend に自動テストランナーは無い（`npm test` は存在しない）。型チェック＋lint＋手動スモークで担保。コマンド一覧と層別の手動確認（5分/15分/大型）・完了条件は `TESTING.md` に集約。

---

## §F 変更後スモークチェック（軽量・該当領域のみ）

フル基準は `ACCEPTANCE_CRITERIA.md`、層別（5分/15分/大型PR）の手順は `TESTING.md` §3。ここは「happy path が壊れていないか」の最小確認。

```markdown
- [ ] 起動: run_dev.bat で FastAPI(8000)+Next.js(3000) が起動し / が表示される
- [ ] Tier1: 一覧表示 → レベル判定 → 「未判定」フィルタから消える
- [ ] Tier2: フォルダ選択 → `!` 未選別表示 → 選別完了で「選別済み」表示
- [ ] AVP: 候補追加(上限なし) → 再生対象は最大4本まで → 再生中ハイライト表示
- [ ] あとで見る: トグル保存 → 判定/選別完了で自動解除 → 再生では解除されない
- [ ] ランキング: 総合スコア降順で表示、score 0 が出ない
- [ ] 分析: 各グラフ(Recharts)がエラーなく描画される
- [ ] 設定: 設定保存 → スキャン → バックアップ実行
```

---

## §G PR 本文チェックリスト

PR テンプレート（`.github/PULL_REQUEST_TEMPLATE.md`）が自動で本文に入る。最低限、以下を埋める:
- [ ] **目的** / **変更範囲**（backend / frontend / docs / DB）。
- [ ] **仕様との対応**: `SPEC_NEXTJS.md` の該当節。挙動変更がなければ「現行仕様維持」と明記。
- [ ] **DB / API / フロント影響**: 変更なしならその旨。ありなら該当 doc（DATA_MODEL / API_SPEC / SPEC §0）を同一 PR で更新。
- [ ] **テスト結果**: §E の必須コマンドと結果。
- [ ] **GitHub Actions CI**: PR 作成後に baseline CI が通ること。
- [ ] **手動確認結果**: §F の該当領域。
- [ ] **未対応 / 次PR**・**リスク**: 禁止事項（§D）に抵触しないことを確認。
- [ ] `CHANGELOG.md` に追記済み。

---

## §H リファクタリング / ファイル移動の着手前チェック

> 構造整理は「綺麗にしたい」ではなく **安定利用と AI 作業精度に効くか** で判断する。診断の正本は `docs/reports/REFACTOR_DIAGNOSIS_20260611.md`。

- **原則 plan 必須**（§B）。着手前に、その整理が **開始条件** を満たすことを PR 本文に記す。開始条件の例（診断レポート §9）:
  - 同じ修正が **3回以上** 同じ複数ファイルに波及した。
  - 同じ概念（DB↔localStorage 境界 / Tier1・Tier2・AVP の別 / judged_at ソート 等）を **2回以上** 誤解した。
  - `displayContext` 分岐が **6箇所** 超 or 4値目が必要 / `store.ts` が **200行超** / `analysis_service.py` が **1000行超**。
  - 型ドリフト（`api.ts` ↔ `api/schemas.py`）起因のバグが実際に発生した。
- **ファイル移動 / リネーム / 分割は単独 Pull request で行い、挙動変更を混ぜない**（diff のレビュー可能性を確保）。
- **`archive/legacy-code/`（`docs/archive/` や `archive/streamlit/` とは別）は旧コード断片の隔離先**。`counter_service.py` / `history_repository.py` / `config_store.py` / `video_manager_methods.py` 等の死んだ Streamlit 期コードがある。**import・参照・復活は禁止**（§D / `SPEC_NEXTJS.md` §10/§12 の `is_judging`/`counters` と接続）。復活は別の設計・検証作業として扱う。
- `archive/` の構造整理で DB・migration・起動スクリプトを実行せず、`data/` に触れない場合は、既存バックアップの件数・最新更新日時・サイズを読み取りだけで確認し、新規バックアップを省略できる。省略理由と確認結果を Pull request 本文に記載する。
- DB を開く必要が生じた場合、または DB・migration に触れる変更へ広がった場合は作業を停止する。新規バックアップを取得してから再開し、`TESTING.md` の DB ゲートに従う。
- 構造整理（挙動変更なし）のゲートは `TESTING.md` §2：`python -m pytest` 全緑 ＋ frontend は `npm run typecheck`/`lint` で確認する。変更が archived コードの物理移動と docs 更新だけで、現行実装・起動バッチ・migration に触れない場合は §F の runtime スモークを省略できる。省略理由を Pull request 本文に記載する。
