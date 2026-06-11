# Next.js版 リファクタリング・ディレクトリ整理 診断レポート（2026-06-11）

位置づけ: **歴史資料（日付付きレポート）**。正本ではない。判断時点のスナップショット。
現行の正本は `docs/context/`（特に `SPEC_NEXTJS.md` / `AI_WORKFLOW.md` / `TESTING.md`）。

## 背景

PR31（Next.js版大型改善）+ PR32（仕様正本化・AI作業ワークフロー・品質ゲート整備）が入った段階。
いま欲しいのは新機能ではなく **安定利用** と **AIが安全に作業できる状態**。一方で Next.js 版はまだ新しく構造の危うさが残る可能性があり、大規模リファクタは安定化前の挙動を壊すリスクもある。本レポートは **リファクタを実行せず、必要性・優先度・タイミングを診断** する。

### 確認済みの事実
- ドキュメント正本が極めて成熟。`SPEC_NEXTJS.md` は §0（DB↔localStorage 永続境界・コード出典付き）・§5（プレフィックス↔DBカラム）・§9（総合スコア式 `analysis_service.py:691-855` 出典付き）・§12（AI禁止リスト）まで整備。`AGENTS.md` に正本台帳あり。
- バックエンドは構造が綺麗。API層は `core/app_service.py` ファサード経由のみで DB アクセス（`api_app.py:9`）。書き込みサイトは11箇所で名前付き関数に集約。`models.py`(dataclass)↔`api/schemas.py`(Pydantic) は `VideoOut.from_video()` で1:1変換。
- pytest が手厚い（composite スコア含む主要挙動をカバー）。frontend は型/lint/手動スモークで担保（自動テストランナーは方針として未導入）。
- 規模実測（frontend）: `analysis/page.tsx` 959 / `tier2/page.tsx` 383 / `settings/page.tsx` 499 / `ranking/page.tsx` 306 / `VideoCard.tsx` 234 / `api.ts` 286 / `store.ts` 170 / `types.ts` 271 行。
- 規模実測（core）: `analysis_service.py` 872 / `video_manager.py` 475 / `database.py` 381 / `app_service.py` 296 行。

---

## 1. 総評

**結論: いま大きなリファクタリングはすべきでない。安定利用を優先し、効果が確実な「小さなドキュメント/ルール追記」だけ行う。コード構造の大整理は開始条件（§9）を満たすまで保留する。**

1. **ドキュメント正本が構造の弱さを大きく補っている。** AIが壊しやすい3大ポイント（DB↔localStorage境界・レベル↔プレフィックス・総合スコア式）はすべて SPEC §0/§5/§9 にコード出典付きで固定され、§12 に禁止リストがある。リファクタの主目的（AI作業精度）の多くがコードを動かさず達成済み。
2. **バックエンドは整理の必要性が低い。** 層分離・書き込み集約・型変換が綺麗で、いま触る純益が小さく回帰リスクだけ残る。
3. **フロントには実在する痛みがあるが、いずれも局所的で「安定利用の障害」ではない。** `analysis/page.tsx`(959行) 肥大、`VideoCard` の `displayContext` 多態（5分岐）、`tier2` の useState 7個インライン、queryKey のマジック文字列散在、手書きレスポンス型のドリフト懸念。
4. **いま大整理すると安定化前に挙動を壊す。** frontend は自動テストが無く、回帰は手動スモーク頼み。大きな分割/移動はこの担保と相性が悪い。

**安定利用との関係**: 現状の構造は安定利用の妨げになっていない。今は使い込んで「どこが繰り返し痛むか」を観測するフェーズ。
**AI作業精度との関係**: 精度を最も上げるのは構造の美化ではなく「正本ドキュメントとコードの対応をさらに明示すること」。挙動ゼロ変更で達成でき、リスクもない。

---

## 2. 構造上のリスク一覧

| 領域 | 対象 | リスク内容 | 重大度 | 今すぐ対応 | 推奨対応 |
|---|---|---|---|---|---|
| ディレクトリ | ルート `archive/`（`docs/archive/` とは別） | `counter_service.py` `history_repository.py` `config_store.py` `video_manager_methods.py` 等、**import 可能に見える死んだ .py** が多数。§12 が禁じる `is_judging`/`counters` 復活の温床。AIが検索で拾い「現行」と誤認しうる | **High** | △（ドキュメントで警告） | `AI_WORKFLOW.md` に「ルート `archive/` は歴史資料・import禁止」を明記。物理移動は将来 |
| ドキュメント | `docs/context/IMPLEMENTATION_GUIDE.md` | 正本扱いなのに本文は「UI層 (Streamlit)」を主層として記述し Next.js/FastAPI を add-on 扱い（L78「並走期間の DB 書き込み主体は当面 Streamlit」）。歴史資料マーカー無し。AIが Streamlit を現行主UIと誤認しうる | **Medium-High** | △（doc注記のみ） | 冒頭に「Streamlit期記述を含む。現行UIは Next.js（SPEC_NEXTJS が正本）」注記 |
| フロント | `app/analysis/page.tsx`（959行） | 期間/可用性/複数ランキング/トレンド/分布が同居。修正影響が読めずAIが触ると広がりやすい | **Medium** | × | 将来の分割候補。今はスモークで保護 |
| フロント | `components/VideoCard.tsx` | `displayContext` 依存の分岐5箇所（`:87-89,:121-126,:130-142,:200-223`）、props8個。第4文脈で破綻しやすい | **Medium** | × | 開始条件到達で variant 分離。SPEC §2/§3/§6 に出典あり当面可読 |
| フロント | `lib/api.ts` ↔ `lib/types.ts` | レスポンス型は手書き。`api/schemas.py` 変更時に型エラーにならず黙ってドリフトしうる | **Medium** | × | API_SPEC.md を契約の正本として維持。将来は契約テスト/型生成 |
| フロント | queryKey 設計 | 20+ キーがマジック文字列で8ファイルに散在。invalidate漏れ/タイポのリスク | **Medium** | × | 将来 `lib/queryKeys.ts` ファクトリ化 |
| フロント | `app/tier2/page.tsx` | フィルタ状態を useState 7個でインライン（Tier1は store、AVPは別store）。状態管理パターンが画面ごとにバラバラ | **Medium** | × | 将来 Tier2 も store 化を検討 |
| バックエンド | `core/analysis_service.py`（872行） | ランキング/トレンド/分布/KPI/変換が同居。最大ファイル | **Low** | × | 単一ドメインで凝集は保てている。閾値超過で分割 |
| バックエンド | `core/video_manager.py`（475行） | get/play/level/watch_later/プレフィックス解析が同居だが「動画状態管理」で凝集 | **Low** | × | 当面維持 |
| 整合 | `play_history` テーブル | 書き込みのみで読み出しエンドポイント無し（監査用）。AIが「未使用＝消してよい」と誤認しうる | **Low** | △ | DATA_MODEL/SPEC §10 に既述。維持 |
| 移行残 | Streamlit前提のコメント | `store.ts:46` `VideoCard.tsx:92` 等。Streamlit並走中のため現役・死にコードではない | **Low** | × | SPEC §11 が差分を明示 |

> 補足: `frontend/AGENTS.md` は**実在**（AI_WORKFLOW §A の参照は正しい）。`busy_timeout`/WAL 未設定は意図的（Streamlit 並走の同時書き込み回避）。

---

## 3. 今すぐやってよい小さな整理候補（挙動ゼロ変更・docs/コメントのみ）

| 候補 | 目的 | リスク | 効果 |
|---|---|---|---|
| `AI_WORKFLOW.md` に「ルート `archive/` は import/参照禁止」を明記 | 死んだ .py 復活事故の予防 | ほぼ無 | 高 |
| `AI_WORKFLOW.md` に「リファクタ/移動 着手前チェック」節を新設 | 大整理の暴発防止 | ほぼ無 | 中〜高 |
| `AI_WORKFLOW.md §C` に「`displayContext` 新値追加」「queryKey/invalidate 設計変更」を plan 必須として追加 | 多態/キャッシュの暴走防止 | ほぼ無 | 中 |
| `SPEC_NEXTJS.md §1` に「主担当コンポーネント/store」列を追加 | 仕様→コードの入口を明示 | ほぼ無 | 高 |
| `SPEC_NEXTJS.md §6` に「`displayContext` の3値は固定」注記 | コンポーネント多態の暴走防止 | ほぼ無 | 中 |
| `VideoCard.tsx` 冒頭 docstring に `displayContext` 3値と SPEC 出典を明記 | 多態の読み筋固定 | ほぼ無 | 中〜高 |
| `IMPLEMENTATION_GUIDE.md` 冒頭に Streamlit期注記 | 主UI誤認の防止 | ほぼ無 | 高 |
| `core/database.py` に「`busy_timeout`/WAL は意図的に未設定」コメント | 善意の「修正」事故を防ぐ | ほぼ無 | 中 |
| ルート `pr_body.md` 削除 | 直下のノイズ低減 | 低 | 低 |

> いずれも **ファイル移動・リネーム・分割を含まない**。

---

## 4. 今はやらない方がよい整理候補

| 候補 | なぜ今やらないか | 先に必要な前提 |
|---|---|---|
| ルート `archive/` の物理削除/移動 | import パスや過去調査の参照が壊れうる。挙動確認が手動頼み | 現行コードが未参照と確認＋DBバックアップ |
| `VideoCard` の variant 分割 | 全ライブラリ画面が依存。frontend自動テスト無しで回帰検知できない | 手動スモーク固定＋開始条件到達 |
| `analysis/page.tsx` 分割 | 安定利用の障害ではない。グラフ描画を壊すと検知が手動頼み | 分析画面の手動回帰チェックリスト |
| `lib/queryKeys.ts` ファクトリ化 | 全ページの invalidate に波及。置換ミスでキャッシュ不整合 | 影響範囲の棚卸し（本レポートで一覧化済み） |
| `analysis_service.py` の分割 | 現状は単一ドメインで凝集。純益が小さい | ファイルがさらに伸びる兆候 |
| `api.ts` 機能別分割 | フラットでも286行で読める | エンドポイント増加 |
| Tier2 useState→store 化 | 挙動が安定。動かす理由が弱い | Tier2 にフィルタ共有要件 |

---

## 5. 将来のリファクタリング候補

| 候補 | 痛み | 期待効果 | 実施開始条件 | 推奨粒度 |
|---|---|---|---|---|
| `VideoCard` variant 分離 | 5分岐・props8・第4文脈で破綻 | 文脈ごと責務明確化 | 4値目が必要 or 同分岐に3回手が入る | 中（1PR・スモーク必須） |
| `analysis/page.tsx` 分割 | 959行・複数関心同居 | 影響局所化 | クエリ/グラフ追加時 | 中（機能追加と同一PR） |
| `lib/queryKeys.ts` ファクトリ | キー散在・invalidate漏れ | タイポ防止・一括変更 | invalidate漏れ起因バグ発生 | 小〜中 |
| `store.ts` 分割明確化 | 3ストア同居 | 肥大時の可読性 | 200行超 or 第4ストア | 小 |
| `api.ts` 機能別グループ化 | フラット・型ドリフト懸念 | 契約追跡が容易 | エンドポイント増 or 契約テスト導入 | 中 |
| `analysis_service.py` 分割 | 872行 | 単機能化 | 1000行超 or 新ランキング種別 | 中 |
| 共通フィルタ部品 | Filter系が3つ並立 | UI重複削減 | フィルタ仕様が3画面で揃う | 中 |
| ルート`archive/` 物理整理 | 死んだ.py誤認 | 探索安全性向上 | docs警告後・現行未参照確認 | 小（移動のみ・独立PR） |

---

## 6. ディレクトリ整理の必要性

- **安定利用の障害になっているか**: なっていない。主要ツリー（`frontend/`・`core/`・`api/`・`docs/context/`）は責務が明確。
- **AI作業の障害になっているか**: 1点だけ実在 — リポジトリ直下の `archive/`（`docs/archive/` とは別）に import 可能に見える Streamlit 期の死んだ Python が大量にある。`pr_body.md` も置き忘れの可能性。
- **今すぐ移動/リネームすべきか**: 物理移動は今はしない。`AI_WORKFLOW.md` に「import/参照禁止」を明記して誤認を封じる。
- **触らない方がよいもの**: `frontend/src`・`core/`・`api/`・`docs/context/` 構成。整っており動かす純益が小さい。
- **将来的な構成案（今は実施しない）**: ルート `archive/` を `docs/archive/legacy-streamlit/` へ集約 or `.py` を import 不可化。独立PRで、現行コード未参照を確認後。

---

## 7. ドキュメント追記の要点（本PRで対応）

- `AI_WORKFLOW.md`: 新節「§H リファクタ/移動 着手前チェック」（開始条件・移動は単独PR・archive import禁止）＋ §C に displayContext/queryKey の plan 必須化。
- `SPEC_NEXTJS.md`: §1 に「主担当コンポーネント/store」列、§6 に「`displayContext` 3値固定」注記。
- `VideoCard.tsx` / `store.ts`: 冒頭コメントに多態・永続境界＋SPEC 出典。
- `IMPLEMENTATION_GUIDE.md`: 冒頭に Streamlit期注記。
- `core/database.py`: `busy_timeout`/WAL 意図的未設定コメント。

---

## 8. 当面の方針（ユーザー確認済み 2026-06-11）

| 確認事項 | 決定 |
|---|---|
| 当面の方針 | **B案: docs/ルール追記のみ**（挙動ゼロ変更で AI 作業精度を底上げ） |
| ルート `archive/` の物理整理 | **将来は許容（独立PRで）**。今回は実施しない |
| 将来の整理候補の優先順位 | **① VideoCard 多態分離 → ② analysis/page.tsx 分割 → ③ queryKeys ファクトリ化 → ④ api.ts/型ドリフト対策** |
| ルート `pr_body.md` | **削除してよい**（本PRで削除） |

---

## 9. リファクタリング開始条件（clipbox向け）

次のいずれかを満たしたら、その対象に限って整理PRを計画する:
- 同じ修正が **3回以上** 同じ複数ファイル（例 `VideoCard.tsx` + 各 page）に波及した。
- AI/レビューで同じ概念（DB↔localStorage 境界、Tier1/Tier2/AVP の別、judged_at ソート等）を **2回以上** 誤解した。
- `VideoCard` の `displayContext` 分岐が **6箇所** を超えた、または4値目が必要になった。
- `store.ts` が **200行超**、または第4ストアが必要になった。
- `api.ts` の型と `api/schemas.py` の不一致に起因するバグが **1件** 発生した。
- 仕様正本（SPEC）とコードの対応を **説明できない箇所** が現れた。
- 手動スモーク/pytest で **守れていない挙動** に起因する回帰が出た。
- `analysis_service.py` が **1000行超**、または `analysis/page.tsx` にクエリ/グラフ追加が来た。
