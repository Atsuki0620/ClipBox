# 統合 Variant K — フィードバック反映 網羅監査（記録）

> **位置づけ**: 統合 Variant K（`/lab/variant-k/*`・段階1〜6 マージ済み）の全体レビューで、各画面レビューのフィードバックが実装に未反映のものが多数見つかったため、`docs/nextjs-ui-renovation-feedback.md`（フィードバックの正本）と `frontend/src/app/lab/variant-k/_review/INTEGRATED_VARIANT_K_PLAN.md`（実装計画）に現行実装を突き合わせて、**未反映・部分反映・要確認を1か所に網羅記録**したもの。
>
> **本書は記録であり、挙動仕様の正本（`docs/context/SPEC_NEXTJS.md`）・フィードバック正本（`docs/nextjs-ui-renovation-feedback.md`）を上書きしない。** 監査は 2026-06-28、修正実装は 2026-06-29 に完了（§3-4 のみ延期）。各項目の見出しに対応状況を明記している。経緯は `CHANGELOG.md` 参照。
>
> 表記ルール: `Pull request` を略さない／「ライブラリ」は Tier1/Tier2 のタブ名のみ／「全Tier」は使わず「Tier1・Tier2を両方表示」。

## 実装ステータス（2026-06-29 時点・対応済みを各項目に明記）

- **✅ 対応済み（2026-06-29）**: §1（1-A〜1-E）・§2（2-1〜2-8）・§7（7-A〜7-D）・§3-1・§3-2 はコード実装＋検証（`npm run typecheck`/`lint`/`build` 通過・Tier1/ランキング/AVP を Playwright スモーク）まで完了。§3-3 は「式不変・表示現状維持」で**対応不要**の決定。詳細は `CHANGELOG.md`（2026-06-29 エントリ）。各項目の見出しにも対応状況を反映した。
- **共通部品（新設）**: `_components/VariantKCardActions.tsx`（1段アイコン操作）・`_components/VariantKLevelButtons.tsx`（汎用レベルボタン）・`_components/VariantKLevelSelect.tsx`（テーブル行内 Tier プルダウン）。
- **⏸ 延期（唯一の未対応）= §3-4**: サンプルDB接続前の API 束（判定日/選別日マップ・per-video 視聴日数・任意集合の総合スコア/順位）。core/・api/ の本体バックエンド作業で variant-k（UI LAB モック）の範囲外。**さらにこれらの API が本当に必要かは未確定**で、**variant-k 自体がその必要性を検証する位置づけ**（ユーザー確定 2026-06-29）。必要性が確定したら別 Pull request で対応する。

## 監査方法

- 突き合わせた根拠（read-only で全読）:
  - フィードバック正本: `docs/nextjs-ui-renovation-feedback.md`
  - 実装計画: `frontend/src/app/lab/variant-k/_review/INTEGRATED_VARIANT_K_PLAN.md`
  - 実装: `frontend/src/app/lab/variant-k/`（`_components` / `_data` / `tier1` / `tier2` / `watch-later` / `avp` / `ranking` / `search` / `settings`）
- 凡例（監査時点）: ✅ 反映済み ／ ⚠️ 部分反映 ／ ❌ 未反映 ／ ❓ 計画と齟齬（要確認）。
  - 対応後の状態: ✅ 対応済み（2026-06-29）／ ✅ 対応不要 ／ ⏸ 延期（本体作業・別 Pull request）。各項目の見出しに反映済み。

---

## 1. 注力すべき未反映（監査時点）→ 全項目 対応済み（2026-06-29）

### 1-A. ✅ 対応済み（2026-06-29） Tier1 ライブラリ：カード⇄テーブル切替・ページャ
- **根拠**: 計画 §10 Tier1「ライブラリはカード⇄テーブル切替を内包」／feedback 付録 §3-1.2「カードモードにも機能するページャ（全N件・1ページあたり 50/100/200 可変・ページ送り）」。
- **対応内容**: `tier1/Tier1Library.tsx` にカード/テーブル切替セグメントと機能するページャ（全N件・50/100/200・前後送り）を追加。テーブルは `_components/VariantKActionTable` を流用。`tier1/shared.ts` に `paginate`/`pageCount` を追加。

### 1-B. ✅ 対応済み（2026-06-29） ランキング／検索：Tier1・Tier2 列を行内プルダウン化
- **根拠**: feedback ランキング改善要望「Tier1列/Tier2列は 未判定/Lv0〜Lv4・未選別/Lv0〜Lv4 のプルダウン操作候補」／検索「レベル操作は Tier1レベル/Tier2レベルに揃える」「Tier1/Tier2変更後も行は即時に消さず値だけ更新」／計画 §10。
- **対応内容**: `ranking/RankingTable.tsx`・`search/SearchResults.tsx` の Tier1（未判定/Lv0〜Lv4）・Tier2（未選別/Lv0〜Lv4・対象外は「—」）列を `_components/VariantKLevelSelect` の行内 Select に変更。`_components/useVariantKRowStates.ts` に `setTier1Level`/`setTier2Level` を追加。ranking/search の `page.tsx` で行の所属・並びをフィルタ/ソート変更時のみ再計算（id で固定）し、値編集では行を即時除去・並べ替えしない。

### 1-C. ✅ 対応済み（2026-06-29） AVP：主要ボタンの Tooltip（title）を整理
- **根拠**: feedback AVP「主要ボタン（再生対象に追加／候補から外す／全候補をクリア／再生対象をクリア／一括いいね／AVPで再生）には Tooltip を付けない（ボタン名で分かる・画面を重くしない）」。
- **対応内容**: `avp/AvpPlaySet.tsx`・`avp/AvpCandidateTable.tsx` の上記主要ボタンから `title` を撤去。利用不可・最大4本などの disabled 理由を示す箇所のみ残置。

### 1-D. ✅ 対応済み（2026-06-29） 検索：詳細フィルタの畳み込み／詳細列（保存先）トグル
- **根拠**: feedback 検索「詳細フィルタはキーワード以外を畳む」「詳細列ONでは保存先のみ追加（実パスでなく匿名化・分類化）」。
- **対応内容**: `search/SearchFilters.tsx` でキーワードを常時表示・それ以外を漏斗 Popover に畳み（有効数バッジ付き）、「詳細列（保存先）」トグルを追加。`search/SearchResults.tsx` は ON 時に保存先（Cドライブ/外付けHDD の匿名化分類）列を追加。`search/shared.ts` に `activeSearchFilterCount` を追加。

### 1-E. ✅ 対応済み（2026-06-29） 設定：手動バックアップボタンを撤去
- **根拠**: feedback 設定「手動バックアップボタンは置かない」／設定 scan-first レビュー `frontend/src/app/lab/settings/_review/COMPARISON_SCAN_FIRST.md` §2「手動バックアップボタンは置かない」。
- **対応内容**: `settings/SettingsBackupTab.tsx` から手動バックアップボタン（dashed ブロックごと）を撤去し、履歴モックを全て「スキャン前（自動）」に統一。docstring も「手動バックアップボタンは置かない」に更新。

---

## 2. 文言・細部の未反映（監査時点）→ 全項目 対応済み（2026-06-29）

| # | 状態 | 項目 | 根拠 | 対応済み（2026-06-29）の内容 |
|---|---|---|---|---|
| 2-1 | ✅ 済 | AVP 一括いいねのボタン名 | feedback 候補「4本をまとめていいね／再生対象をまとめていいね」 | `avp/AvpPlaySet.tsx` のボタン名を「一括いいね」→「再生対象をまとめていいね」に変更 |
| 2-2 | ✅ 済 | AVP 候補テーブルのタイトル省略＋全名 Tooltip | feedback「タイトルは省略表示、全名は Tooltip」 | `avp/AvpCandidateTable.tsx` のタイトルセルを truncate＋全名 `title` に変更 |
| 2-3 | ✅ 済 | ランキング 詳細フィルタの畳み込み | feedback/計画「表示範囲/期間/最低レベル/保存先/詳細列ON は詳細フィルタに入れる」 | `ranking/page.tsx` の詳細フィルタを漏斗 Popover（有効数バッジ付き）に畳み込み。`ranking/shared.ts` に `activeRankingFilterCount` を追加 |
| 2-4 | ✅ 済 | サイドバーのブランドマーク | feedback 付録 §2-1「ClipBox 左に自作 SVG（`clipbox-mark.svg`・箱＋再生三角等）」 | `_components/VariantKSidebar.tsx` の `FlaskConical` を自作マーク `ClipBoxMark`（箱＋再生三角・トークン色）へ差し替え。`public/clipbox-mark.svg` も追加 |
| 2-5 | ✅ 済 | あとで見る PC幅5列 | feedback/計画「PC幅5列」 | `watch-later/WatchLaterSectionBlock.tsx` のグリッドを `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`（PC幅5列基準）へ変更 |
| 2-6 | ✅ 済 | AVP「AVPで再生」ボタンの目立たせ | feedback「下段2×2の右上に固定して目立たせる」 | `avp/AvpPlaySet.tsx` の「AVPで再生」を 2×2 セクション右上の主操作として強調（primary・大きめ） |
| 2-7 | ✅ 済 | 検索の利用不可タイトル横バッジ | feedback 検索「利用不可はタイトル横バッジ＋行全体をグレーアウト」 | `search/SearchResults.tsx` のタイトルセルに利用不可時「利用不可」バッジを併記（行薄表示は維持） |
| 2-8 | ✅ 済 | ランキング/検索の詳細フィルタの見た目統一 | feedback/計画「詳細フィルタ」 | ランキング・検索とも詳細フィルタを漏斗 Popover（有効数バッジ）に統一 |

---

## 3. 計画と齟齬・要確認 → 3-1/3-2 対応済み・3-3 対応不要・3-4 のみ延期（2026-06-29）

| # | 状態 | 項目 | 確定方針と対応 |
|---|---|---|---|
| 3-1 | ✅ 対応済み（2026-06-29） | Tier1 ランダムの主ボタン名と多本引き | ユーザー回答「多本提示に戻す」。`tier1/Tier1Random.tsx` を 主ボタン＝シャッフル・引き数 5/10/15/20 の N 本提示に変更（運命の1本は単一のまま）。`tier1/shared.ts` に `drawN` を追加 |
| 3-2 | ✅ 対応済み（2026-06-29） | AVP の総合スコア／順位を公式再計算へ統一 | ユーザー回答「公式再計算に統一」。`avp/shared.ts` の mock `score`/`rank` 表示を廃し、`_data/variantKScore` の `compositeScore` ＋ scope 母集団（再生可能だけ/全動画）の `rankVideos` 由来順位（`avpRankMap`）に統一。桁・式がランキング/検索と一致 |
| 3-3 | ✅ 対応不要（2026-06-29） | ランキング/検索のスコア桁感 | ユーザー回答「式は不変・表示は現状維持」。公式の整数表示（3桁区切り）のまま据え置き。式・係数・タイブレークは不変 |
| 3-4 | ⏸ 延期（必要性も未確定） | サンプルDB接続前の API 束 | 判定日/選別日マップ・per-video 視聴日数・任意集合の総合スコア/順位。core/・api/ の本体バックエンド作業で variant-k（UI LAB モック）の範囲外。**これらの API が本当に必要かは未確定**で、**variant-k 自体がその必要性を検証する場**（ユーザー確定 2026-06-29）。必要性が固まったら別 Pull request で対応する。新規メトリクス定義はしない |

---

## 4. 反映できている主な項目（確認済み・修正不要）

- ✅ 視聴日数を主役・視聴回数を全画面で非表示（`VariantKVideoCard` ほか）。
- ✅ 更新日/登録日を出さない・作成日/判定日/選別日を使用。
- ✅ 該当Tierバッジ（Tier1/Tier2 のみ・Lv 等は書かない・初期ON）、色は Tier1=青/Tier2=ティール（`_components/theme.ts`）。
- ✅ あとで見る（DB相当）と AVP候補（localStorage相当）の非混同・AVP再生で自動解除しない見せ方。
- ✅ 利用不可：テーブルは行薄表示＋操作 disabled、カードはバッジ＋薄表示。
- ✅ ランキング ソート（ヘッダクリック 降順→昇順、対象=総合スコア/視聴日数/いいね）・種別セレクト廃止・既定=再生可能だけ。
- ✅ 検索 キーワード未入力で空状態・順位列なし・結果非永続・既定=全動画。
- ✅ 設定 scan-first 上部タブ・自動保存（保存ボタンなし）・スキャン3段＋進捗＋折りたたみ・Tier2未設定スキップ・メタ/バッジ項目分離（AVP候補初期OFF）・レベル表示対象（該当Tierのみ既定／「全Tier」不使用）。
- ✅ Runtime control：サイドバー下部・Streamlit 非表示・FastAPI/Next.js 個別（ランプ/状態/ポート）・「アプリを停止」1ボタン。
- ✅ Tier2：該当Tier=Tier2 のみ・初期フィルタ すべて（未選別＋選別済み）・選別日表示・案1/案2 文言トグル。
- ✅ displayContext 3値固定・サムネなし・運命の1本の履歴撤去。
- ✅ AVP：候補上限なし・再生対象最大4本・スロット番号非表示・上段テーブル/下段2×2構成。
- ✅ analysis：採用判断対象外の仮ページとして維持し、再設計していない。

---

## 5. 対応の記録（2026-06-29 実施・優先順位どおり完了）

1. **§1（1-A〜1-E）** 実施済み: 設定の手動バックアップ撤去 → Tier1 カード/テーブル＋ページャ → ランキング/検索の Tier プルダウン → AVP 主要ボタン Tooltip 整理 → 検索 詳細フィルタ畳み＋保存先詳細列。
2. **§2（2-1〜2-8）** 実施済み: ボタン名・タイトル省略・詳細フィルタ畳み・SVG ロゴ・5列・AVP再生強調・利用不可バッジ。
3. **§3** 実施済み/確定: 3-1 多本化・3-2 公式統一・3-3 表示現状維持。3-4 のみ延期（本体作業・必要性も未確定）。
4. 検証: `cd frontend && npm run typecheck && npm run lint` 通過、`npm run build` 通過。Playwright で Tier1/ランキング/AVP をスモーク（コンソールエラーなし）。

## 6. 要ユーザー確認（すべて解消済み・2026-06-29）

- §3-1 Tier1 ランダム → **多本＋「シャッフル」に戻す**で確定・対応済み。
- §3-2 AVP 総合スコア/順位 → **公式再計算へ統一**で確定・対応済み。
- §3-3 ランキング/検索のスコア桁 → **式不変・表示は現状維持**で確定（対応不要）。
- §2-5 あとで見る5列 → **PC幅5列基準**で確定・対応済み。
- §2-6 AVP「AVPで再生」強調 → **2×2 右上の主操作として強調**で確定・対応済み。
- §3-4 サンプルDB接続前 API 束 → **延期**（本体バックエンド作業・別 Pull request）。ただし **API の必要性自体が未確定**で、variant-k で必要性を見極めてから着手する（唯一の残課題）。

---

## 7. 追加フィードバック（ユーザー指摘・2026-06-28／Tier1・カード共通部品）→ 全項目 対応済み（2026-06-29）

ユーザーの直接指摘を追記。参照は Tier1 ライブラリの旧 UI LAB レビュー `frontend/src/app/lab/tier1-library/_review/COMPARISON_J.md`。

> **統合方針との読み替え（重要・ユーザー回答 2026-06-28 で確定）**: COMPARISON_J は旧 Tier1 単独 LAB（Variant J）のレビューで、並び替え項目に **視聴回数 / 最終視聴** を含む。統合 Variant K は全画面で **視聴回数を廃し視聴日数へ一本化**しているため、移植時は **視聴回数→視聴日数** に読み替える（**視聴回数は復活させない**）。また **最終視聴（最終再生日）は表示・並び替え項目に入れず、作成日を優先する**（ユーザー回答「最終視聴よりも作成日を表示したい」）。

### 7-A. ✅ 対応済み（2026-06-29） Tier1 フィルタ機能（漏斗 → Popover パネル）
- **根拠**: COMPARISON_J §3「フィルタ（漏斗 → Popover パネル・全表示しない）」。https://github.com/Atsuki0620/ClipBox/blob/main/frontend/src/app/lab/tier1-library/_review/COMPARISON_J.md#3-フィルタ漏斗--popover-パネル全表示しない
- **要件**: 漏斗アイコン → Popover に畳む（常時全表示しない）。中身は **レベル(未/0–4)** ・ **保存先(C/HDD)** ・ **状態(すべて/未判定/判定済み)** の chip ＋ **再生可のみ** ＋ **「判定済みを薄くする」トグル（既定 ON）**。有効なフィルタ数を漏斗にバッジ表示。
- **対応内容**: `tier1/Tier1Library.tsx` に漏斗 Popover を新設し、レベル(未/0–4 chip)・保存先(C/HDD)・状態・再生可のみ・「判定済みを薄くする」（既定 ON・カード薄表示と連動）を収容。有効フィルタ数を漏斗にバッジ表示。`tier1/shared.ts` に `activeTier1FilterCount` を追加。

### 7-B. ✅ 対応済み（2026-06-29） Tier1 並び替え（2段 Popover）
- **根拠**: COMPARISON_J §4「並び替え（2段 Popover）」。https://github.com/Atsuki0620/ClipBox/blob/main/frontend/src/app/lab/tier1-library/_review/COMPARISON_J.md#4-並び替え2段-popover
- **要件**: 1段目＝項目（レベル / **作成日** / **視聴日数**（旧 視聴回数）/ タイトル / 判定日・日本語ラベル）、2段目＝**降順／昇順**。Popover に畳む。**最終視聴（最終再生日）は項目に入れない**（ユーザー回答 2026-06-28: 最終視聴より作成日を優先）。**視聴回数は復活させない**。
- **対応内容**: `tier1/Tier1Library.tsx` の並び替えを2段 Popover（項目＋方向）に置換。項目は **レベル / 作成日 / 視聴日数 / タイトル / 判定日 の5項目**、2段目は降順/昇順。最終再生日・視聴回数は入れない。`tier1/shared.ts` の `Tier1Sort` を `{ key, dir }` 化し `sortTier1` を方向対応に。

### 7-C. ✅ 対応済み（2026-06-29） カードデザインを他画面と共通部品化
- **根拠**: ユーザー指摘「他の画面と共通部品としてカードデザインは修正が必要」。COMPARISON_J §5「短いカード／操作1行（再生／♡／あとで／AVP）」。
- **対応内容**: 1段操作行を共通部品 `_components/VariantKCardActions.tsx`（ハンドラ未指定ボタンは非描画・watchLater は toggle/remove の出し分け）に集約し、`tier1/Tier1CardActions.tsx`・`tier2/Tier2CardActions.tsx`・`watch-later/WatchLaterCardActions.tsx`・`avp/AvpPlaySet.tsx`（2×2）を統一。レベル/選別ボタンも `_components/VariantKLevelButtons.tsx` に共通化（旧 `Tier1LevelButtons.tsx`・`Tier2LevelButtons.tsx` は削除）。画面差分は出すボタンの違いのみ。

### 7-D. ✅ 対応済み（2026-06-29） Tier1 レベル選択と操作ボタンのレイアウト
- **根拠**: ユーザー指摘。COMPARISON_J §5（数値レベルボタン＋操作1行）。
- **レベル選択（確定: 未/0/1/2/3/4 の6択）**: `tier1/Tier1CardActions.tsx` を `_components/VariantKLevelButtons.tsx`（未/0/1/2/3/4 の6択・「判定」ラベルなし）に置換。`未`＝未判定へ戻すを含み、統合計画 §9「Tier1 は未判定へ戻す操作を出さない」を本指摘で上書き。`useTier1MockCardState.setLevel` は -1（未判定）で判定日を null に戻す。
- **アクションボタン（横1段・アイコン化）**: 再生（アイコンのみ）／いいね（♡＋数）／あとで見る（栞 Bookmark）／AVP（`MonitorPlay`＝ナビ AVP と同一アイコン）を横1段に統合（共通部品 `VariantKCardActions`）。利用不可では再生・AVP を disabled。

> 注: 7-A・7-B・7-D は §1-A（Tier1 カード⇄テーブル切替・ページャ）と同じ Tier1 ライブラリ改修に含めて一括対応した。7-C は Tier1 で確定した1段操作行を共通部品化し Tier2/あとで見る/AVP へ展開済み。

### 7 関連の優先順位・要確認（§5・§6 への追補）
- **実施結果**: §1-A の Tier1 ライブラリ改修に 7-A（フィルタ Popover）・7-B（並び替え2段 Popover）・7-D（レベル＝未/0/1/2/3/4・操作1段）を含めて実施済み → 7-C（操作行の共通部品化）を Tier2/あとで見る/AVP へ展開済み。
- **確定（ユーザー回答 2026-06-28・解消済み）**:
  - 7-D: レベル選択は **未/0/1/2/3/4 の6択**（Lv0 を含む）。Tier1 で「未判定へ戻す」を出す（統合計画 §9 を上書き）。→ 対応済み。
  - 7-B: 並び替え項目は **視聴日数**（視聴回数は復活させない）。**最終視聴（最終再生日）は使わず作成日を優先**。→ 対応済み。
