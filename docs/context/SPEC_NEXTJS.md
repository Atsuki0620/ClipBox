# SPEC_NEXTJS — Next.js 版 画面・状態仕様の正本

対象読者: Coding agent（Claude Code / Codex）、レビュアー。
位置づけ: **Next.js 版（FastAPI + Next.js）の現行仕様の正本**。画面の挙動・状態の意味・操作の結果を固定する。
用語の定義は `GLOSSARY.md`、DB は `DATA_MODEL.md`、HTTP API は `API_SPEC.md`、手動合否は `ACCEPTANCE_CRITERIA.md` を参照（competing 時の優先順位は `AGENTS.md` の正本台帳）。

> この文書は**既存実装の言語化**であり、仕様変更ではない。記述には可能な限りコード出典を併記する。
> 仕様を変えたい場合は、コードと本書を同一 PR で更新し、レビューで突き合わせること。

---

## 0. 最重要: 状態の永続境界（DB か localStorage か）

ClipBox の状態は **3 種類の永続先**を持つ。AI はこの境界を越えて実装してはならない
（例: 「AVP候補を DB に保存」「あとで見るを localStorage に保存」は**禁止**）。

| 状態 | 永続先 | スコープ | 出典 |
|---|---|---|---|
| お気に入りレベル `current_favorite_level` | **DB** | 全端末共通 | `core/video_manager.py` |
| あとで見る `watch_later` | **DB** | 全端末共通 | `videos.watch_later` |
| いいね（likes） | **DB** | 全端末共通 | `likes` テーブル |
| 判定履歴 `judgment_history` / 視聴履歴 `viewing_history` / 再生ログ `play_history` | **DB** | 全端末共通 | `DATA_MODEL.md` |
| 未選別 `needs_selection` / 選別済み `is_selection_completed` | **DB ＋ ファイル名プレフィックス**（二重持ち） | 全端末共通 | §5 |
| AVP候補 `avpCandidateIds` | **localStorage** `clipbox-avp` | そのブラウザのみ | `frontend/src/lib/store.ts:77-122` |
| AVP再生対象 `avpPlayTargetIds` | **localStorage** `clipbox-avp` | そのブラウザのみ | `store.ts:77-122` |
| 再生中ハイライト `singlePlayingId` / `avpPlayingIds` | **localStorage** `clipbox-playback` | そのブラウザのみ | `store.ts:135-149` |
| フィルタ/ソート/ページ（Tier1 の `useLibraryStore`、Tier2 の `useState`） | **メモリのみ**（永続なし） | セッション内・リロードで消える | `store.ts:60-75`（persist なし） |

**含意**: localStorage の状態（AVP候補・再生対象・再生中ハイライト）は、別ブラウザ・別PC・ストレージ削除で**黙って消える**。
DB の状態（あとで見る・レベル・いいね）はサーバ機の `videos.db` に残り、どの画面からでも一貫する。

---

## 1. 画面一覧（App Router / `frontend/src/app`）

| ルート | 画面 | 責務 | 主担当（page / 状態） |
|---|---|---|---|
| `/` | Tier1 ライブラリ | 未判定動画の一次判定（ライブラリ/ランダム/運命の1本の3サブタブ） | `app/page.tsx` + `useLibraryStore`（メモリ）／カードは `displayContext="tier1"` |
| `/tier2` | Tier2 セレクション | `!` 付きセレクション動画の選別（同3サブタブ）。`selection_folder` 必須 | `app/tier2/page.tsx` + ページ内 `useState`（store 化していない）／`displayContext="tier2"` |
| `/avp` | AVP再生 | AVP候補の確認・再生対象（最大4本）選択・並列再生 | `app/avp/page.tsx` + `useAvpStore`（localStorage）／`displayContext="avp"` |
| `/ranking` | ランキング | 視聴回数/視聴日数/いいね/総合 のランキング | `app/ranking/page.tsx` |
| `/analysis` | 分析ダッシュボード | 期間別の視聴・判定トレンド、各種分布（Recharts） | `app/analysis/page.tsx` |
| `/search` | 検索 | 本質的ファイル名のキーワード検索 | `app/search/page.tsx` |
| `/settings` | 設定 | ライブラリルート/プレイヤー/AVPパス、バックアップ、スキャン | `app/settings/page.tsx` + `getConfig`/`updateConfig` |

共通カード: `components/VideoCard.tsx`（`displayContext` で Tier1/Tier2/AVP の表示差を切替）、グリッドは `components/VideoGrid.tsx`。
共通: 「再生」は **FastAPI 実行マシン上**でプレイヤーを起動する（リモートブラウザからは不可。`VideoCard.tsx:160` のツールチップ）。

---

## 2. Tier1（一次判定）

**何をする画面か**: 未判定動画（`current_favorite_level = -1`）に初めてお気に入りレベルを付ける。
クエリは `exclude_selection=true` 固定で、セレクション（`!`/`+`）は**常に表示しない**（選別は Tier2 の責務。`ACCEPTANCE_CRITERIA.md` Tier1 L25）。

- **未判定とは**: `current_favorite_level = -1`、かつファイル名にレベルプレフィックスが無い動画。
- **レベル判定とは**: `PUT /api/videos/{id}/level` → `set_favorite_level_with_rename()`。
  ファイルをリネーム（プレフィックス付与/変更）→ DB の `current_favorite_level` 更新 → `judgment_history` 追記、を**単一トランザクション**で行う。
- **判定済みになったとき何が起きるか**:
  1. ファイル名にレベルプレフィックス（`####_`〜`_`）が付く。
  2. `current_favorite_level` が 0〜4 になる。
  3. `judgment_history` に1行追加（`was_selection_judgment = 0`）。
  4. **`watch_later` が 1 だった場合は自動的に 0 に解除**される（§4）。
  5. 「未判定」フィルタ表示中なら、その動画は**一覧から外れる**（§7）。
- **あとで見るとの関係**: 判定を先送りしたい動画に付けるブックマーク。判定すると自動解除（§4）。
- **AVP候補との関係**: Tier1/検索のカードに「AVP候補」チェックボックスがある（`VideoCard.tsx:130-143`、`displayContext` が tier2/avp 以外でのみ表示）。AVP候補は **localStorage**。あとで見る・判定とは独立（§3 / §4）。
- **判定日時ソート（`sort=judged_at`）の意味**: `judgment_history` の最新 `judged_at` を基準に並べる（`types.ts:120` の SortField）。「最近判定した順」に確認するためのソート。未判定（履歴なし）の扱いは実装に従う。

判定状態フィルタ（`JudgmentStatus`）: `all / unrated / judged`。`levels` への写像は `frontend/src/app/page.tsx`。

---

## 3. Tier2（二次判定 / セレクション）

**Tier2対象とは**: `selection_folder` 配下にあり `!` プレフィックスを持つ動画（`needs_selection = 1`）。
一次判定済みの中から物理的にセレクションフォルダへ移したものを、二次審査する。

- **ファイル名プレフィックスの意味**（例 `!###_作品.mp4`）:
  - `!` … セレクション**未選別**（`needs_selection = 1` かつ `is_selection_completed = 0`）。
  - `###_` … レベル（この例は Lv3）。`!` とレベルは**組み合わせ可能**。
  - `+` … セレクション**完了**（`is_selection_completed = 1`、画面表示「選別済み」）。
- **未選別とは**: `needs_selection = 1` かつ `is_selection_completed = 0`。バッジ「未選別」（`VideoCard.tsx:121-123`）。
- **選別済みとは**: `is_selection_completed = 1`（ファイル名が `+` で始まる）。バッジ「選別済み」（`VideoCard.tsx:124-126`）。
- **Tier1 の Lv 表示と Tier2 の未選別表示の違い**:
  - Tier1: レベルは「未判定 / Lv0..Lv4」を表示。
  - Tier2: `displayContext="tier2"` のとき、`needs_selection` かつ表示レベルが -1 なら**「未選別」**を表示する（`VideoCard.tsx:86-89`）。同じ -1 でも文脈で表示語が変わる点に注意。
- **あとで見るとの関係**: Tier2 でも `watch_later` を使える。選別完了で自動解除（§4）。`/api/videos/selection` も `watch_later` 絞り込みに対応（`types.ts:158`）。
- **判定日時ソート**: Tier1 と同じく `sort=judged_at`（`was_selection_judgment` の別なく `judgment_history.judged_at` を基準）。
- 状態フィルタ（`SelectionStatus`）: `all / unselected / completed`（`types.ts:124`）。

判定（選別確定）は Tier1 と同じ `set_favorite_level_with_rename()` を通り、`judgment_history.was_selection_judgment = 1` で記録される。

---

## 4. あとで見る（watch_later）

**目的**: 判定/選別の**先延ばし**。「今は決めないが後で見たい」動画のブックマーク。

- **AVP候補ではない**: あとで見る（DB・全端末共通）と AVP候補（localStorage・そのブラウザのみ）は**別物**。混同しない。
- **再生しただけでは解除しない**: `play_video()` は `watch_later` を変更しない。
- **判定済み/選別済みで自動解除**: `set_favorite_level_with_rename()` が、判定（`level ≥ 0`）または選別完了（`+` 付与）で `watch_later = 0` にする（`videos.watch_later` の説明 / `DATA_MODEL.md:58`）。
- **Tier1/Tier2 両方で使う**: どちらの画面のカードにもブックマークボタンがある（`VideoCard.tsx:190-198`、アイコンのみ・title 属性で説明）。
- **DB 永続状態**: `videos.watch_later`（`toggle_watch_later` が 1↔0 反転、`is_deleted = 0` 条件付き）。
- 絞り込み: 「あとで見るのみ」で `watch_later = true` の動画だけ表示。判定/選別完了するとそのフィルタから外れる（§7）。

---

## 5. ファイル名プレフィックスと DB カラムの対応（二重持ち）

状態は **DB カラム**と**ファイル名プレフィックス**の両方に存在する。**正本は DB**、ファイル名は人間が Explorer 上で識別するための写像。両者の同期は `set_favorite_level_with_rename()` が担う。

| プレフィックス | DB 状態 |
|---|---|
| `####_` / `###_` / `##_` / `#_` / `_` | `current_favorite_level` = 4 / 3 / 2 / 1 / 0 |
| なし | `current_favorite_level` = -1（未判定） |
| `!` | `needs_selection = 1`, `is_selection_completed = 0` |
| `+` | `is_selection_completed = 1`, `needs_selection = 0` |

- **本質的ファイル名（essential_filename）**: すべてのプレフィックスを除去したファイル名。`videos.essential_filename`（UNIQUE）。動画の同一性の唯一の識別子。プレフィックスやパスが変わっても不変。
- **乖離のリスク**: リネーム成功〜DB commit の間にプロセスが落ちると DB とファイル名が食い違いうる。`resync_selection_completed`（起動時冪等再同期）が `is_selection_completed` を補正する（`DATA_MODEL.md:318`）。
- AI は **レベル↔プレフィックスの対応**と **essential_filename の UNIQUE 性**を勝手に変えてはならない（ADR `docs/decisions/001-essential-filename.md`）。

---

## 6. AVP（並列再生）

AVP（Awesome Video Player）は最大4本を画面分割で同時再生する外部プレイヤー（`avp_exe_path`）。
**3つの状態を厳密に区別**する。いずれも localStorage 永続（そのブラウザのみ）。

| 概念 | 変数 | 上限 | localStorage | 役割 |
|---|---|---|---|---|
| **AVP候補** | `avpCandidateIds` | **上限なし** | `clipbox-avp` | Tier1/検索で「AVP候補」チェックした動画のプール |
| **AVP再生対象** | `avpPlayTargetIds` | **最大4本**（`MAX_AVP_PLAY_TARGET=4`） | `clipbox-avp` | 候補の中から今回 AVP で再生する動画 |
| **再生中ハイライト** | `avpPlayingIds` | 最大4本 | `clipbox-playback` | 直近 AVP 再生した動画の見た目強調（§7） |

- **AVP候補とあとで見るの違い**: AVP候補は「並列再生キューに入れる」localStorage 状態。あとで見るは「判定を先延ばす」DB 状態。目的も永続先も別。
- **AVP再生対象の選択**: `/avp` で候補カードの「再生対象」チェック（`avp/page.tsx:123-127`）。利用不可、または既に4本選択済みのときは無効化（`avp/page.tsx:114-115`）。
- **AVP再生後の viewing_history 記録**: `POST /api/avp/play` → `record_avp_viewing()` が再生対象に `viewing_history`（`APP_PLAYBACK`）を記録する。**候補追加では記録しない**（再生したときだけ記録）。
- **再生対象のクリア**: 再生成功時に `clearAvpPlayTargetIds()` で対象を空にする（`avp/page.tsx:62`）。エラー時はクリアしない。
- **候補の掃除**: `getVideosByIds` の `missing_ids` を `pruneIds()` で候補/対象から除去（削除済み動画の dangling 防止。`avp/page.tsx:37-41`）。

> **`displayContext` は3値で固定**（`tier1` / `tier2` / `avp`）。`VideoCard` の表示差はこの値の分岐で表現する。**第4値の追加は多態の複雑化に直結する**ため、足す前に `AI_WORKFLOW.md` §C で停止しユーザー確認すること。

---

## 7. 再生中ハイライト（playback highlight）

`store.ts:127-149` / `clipbox-playback`。

- **「過去に再生済み」という意味ではない**。視聴履歴の表示ではない。
- **「直近再生中として扱う動画」**を示す見た目の強調（カードに amber 枠、`VideoCard.tsx:101-103`）。
- **単体再生は1本**（`singlePlayingId`）、**AVP再生は最大4本**（`avpPlayingIds`）。single と avp は排他（一方をセットすると他方をクリア。`store.ts:141,143`）。
- **次の再生まで保持**: 別の動画を再生するまで強調は残る。
- **localStorage 永続**: リロード・タブ移動を越えて保持。ハイドレーション後にのみ反映（SSR 不一致回避、`store.ts:151-170`）。
- **注記（語感の差）**: 有効期限が無いため、実態は「**最後に再生した動画**」。1週間前に再生した動画でも、次の再生をするまで「再生中」強調が残る。`削除された動画 ID は自動 prune されない`（候補と違いクリーンアップ無し）点も既知（Prompt1 リスク R5）。

---

## 8. 操作の結果、一覧から「消える」条件（混乱しやすい）

ライブラリ系タブでは、操作の結果フィルタ条件から外れて**一覧から消える**ことがある。バグではない。

| 操作 | 表示中フィルタ | 消える理由 |
|---|---|---|
| レベル判定（level≥0） | Tier1「未判定」 | `current_favorite_level` が -1 でなくなる |
| 判定 or 選別完了 | 「あとで見るのみ」 | `watch_later` が自動解除される（§4） |
| 選別確定（`+`） | Tier2「未選別のみ」 | `is_selection_completed = 1` になる |
| 不在ファイルの再生/判定 | 「利用可能のみ」 | 失敗時に当該動画が `is_available = 0` 化される |

例外: **ランダム / 運命の1本**タブは `invalidateKeys = []`（`VideoCard.tsx:43`）でリスト再取得しないため、判定してもその場では消えず、バッジだけ即時更新される（再抽選で次回外れる）。

---

## 9. ランキング（総合スコア）

`core/analysis_service.py:691-855`。種別は `view_count / view_days / likes / composite`（`types.ts:92`）。

**総合（composite）スコアの式**:
```
base  = view_days × 1 + like_count × 3          # _COMPOSITE_A=1, _COMPOSITE_B=3
bonus = 1 + 0.5 × T1 + 0.3 × T2                 # T1=判定済み(level≥0), T2=選別済み(is_selection_completed)
score = round(base × bonus × 100)               # 整数化
```
- **因子**: 視聴日数（`view_days`）、いいね数、Tier1判定済みボーナス（+50%）、Tier2選別済みボーナス（+30%）。
- **score = 0 は除外**。タイブレーカーは `last_viewed_at` 降順。未判定動画も T1=0（ボーナスなし）で対象に含む。
- 期間: `180日 / 1年 / 全期間`。最低レベル: `なし / Lv3+ / Lv4のみ`。

**スコアに入れない理由（固定仕様）**:
- **視聴回数を入れない**: 1日に何度も再生して水増しされるのを避け、「何日見たか（`view_days`）」で実際の定着を測るため。
- **レベル値を入れない**: 高 Lv ほど機械的に上位化するのを避け、判定済み/選別済みは**バイナリのボーナス**（+50%/+30%）に留める。
- **あとで見る / AVP候補を入れない**: あとで見るは「未判定の先延ばし」、AVP候補は「再生キュー（localStorage）」であり、いずれも作品の良し悪しの評価ではないため。

係数（A=1, B=3, T1=+0.5, T2=+0.3）は調整用定数。**理由なく変更しない**（変更時は本書とコードを同一 PR で更新）。

---

## 10. DB / 履歴（要点・正本は DATA_MODEL.md）

| 対象 | 役割 | 備考 |
|---|---|---|
| `videos` | 動画メタデータと状態 | `current_favorite_level` / `watch_later` / `needs_selection` / `is_selection_completed` / `is_available` / `is_deleted` |
| `judgment_history` | 判定（レベル変更）の履歴 | `was_selection_judgment`（0=Tier1 / 1=Tier2）、`judged_at`（判定日時ソートの基準） |
| `viewing_history` | 集計用の視聴履歴 | 視聴回数・ランキング・分析の**基準**。`APP_PLAYBACK`（単体再生・AVP再生とも記録） |
| `play_history` | 再生ログ詳細 | プレイヤー/トリガー/ルート等の監査用。集計基準ではない |
| `likes` | いいね | ランキング・総合スコアの因子 |
| `watch_later`（列） | あとで見る | DB永続。判定/選別完了で自動解除（§4） |
| `needs_selection` / `is_selection_completed`（列） | セレクション状態 | ファイル名 `!`/`+` と二重持ち（§5） |

archived（DB列/テーブルは残るが機能は停止。生きていると誤認しない）: `is_judging`、`counters`、`viewing_method` の `FILE_ACCESS_DETECTED`/`MANUAL_ENTRY`。

---

## 11. Streamlit 版との違い（移行で変わった点）

- UI は Streamlit（`localhost:8501`）→ **Next.js（`localhost:3000`）+ FastAPI（`localhost:8000`）**。`core/` は両者で共用。
- **AVP候補/再生対象/再生中ハイライトは Next.js で新設**された localStorage 状態（Streamlit には無い概念）。
- **あとで見る（watch_later）**・**総合ランキング（composite）**・**判定日時ソート**も移行期（PR0〜PR8）で追加。
- 書き込みは**どちらか一方のサーバーのみ**で行う（同時書き込みは SQLite `SQLITE_BUSY`。`busy_timeout`/WAL は未設定）。Next.js の write 検証時は Streamlit を停止し DB バックアップを取ること（README 注意事項）。

---

## 12. AI 作業上の固定事項（禁止リスト）

- 状態の**永続先（DB or localStorage）を移動しない**（§0）。
- **レベル↔プレフィックスの対応**・**essential_filename の UNIQUE 性**を変えない（§5）。
- **あとで見るの自動解除条件**（判定/選別完了）を変えない（§4）。
- **AVP上限4本・候補上限なし**を変えない（§6）。
- **総合スコア式・係数**を理由なく変えない（§9）。
- **再生中ハイライト ≠ 視聴済み**を取り違えない（§7）。
- Streamlit 前提のコード/記述を「現行」と誤認して復活させない（§11）。
