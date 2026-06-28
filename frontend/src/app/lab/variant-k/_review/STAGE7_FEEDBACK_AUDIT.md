# 統合 Variant K — フィードバック反映 網羅監査（記録）

> **位置づけ**: 統合 Variant K（`/lab/variant-k/*`・段階1〜6 マージ済み）の全体レビューで、各画面レビューのフィードバックが実装に未反映のものが多数見つかったため、`docs/nextjs-ui-renovation-feedback.md`（フィードバックの正本）と `frontend/src/app/lab/variant-k/_review/INTEGRATED_VARIANT_K_PLAN.md`（実装計画）に現行実装を突き合わせて、**未反映・部分反映・要確認を1か所に網羅記録**したもの。
>
> **本書は記録であり、挙動仕様の正本（`docs/context/SPEC_NEXTJS.md`）・フィードバック正本（`docs/nextjs-ui-renovation-feedback.md`）を上書きしない。** 本ラウンドはコード修正をしない。**次ラウンドで本書を基に修正する。**
>
> 表記ルール: `Pull request` を略さない／「ライブラリ」は Tier1/Tier2 のタブ名のみ／「全Tier」は使わず「Tier1・Tier2を両方表示」。

## 監査方法

- 突き合わせた根拠（read-only で全読）:
  - フィードバック正本: `docs/nextjs-ui-renovation-feedback.md`
  - 実装計画: `frontend/src/app/lab/variant-k/_review/INTEGRATED_VARIANT_K_PLAN.md`
  - 実装: `frontend/src/app/lab/variant-k/`（`_components` / `_data` / `tier1` / `tier2` / `watch-later` / `avp` / `ranking` / `search` / `settings`）
- 凡例: ✅ 反映済み ／ ⚠️ 部分反映 ／ ❌ 未反映 ／ ❓ 計画と齟齬（要確認）

---

## 1. 注力すべき未反映（フィードバックが明示要求・実装に無い）

### 1-A. ❌ Tier1 ライブラリ：カード⇄テーブル切替・ページャが無い
- **根拠**: 計画 §10 Tier1「ライブラリはカード⇄テーブル切替を内包」／feedback 付録 §3-1.2「カードモードにも機能するページャ（全N件・1ページあたり 50/100/200 可変・ページ送り）」。
- **現状**: `tier1/Tier1Library.tsx` はカードグリッドのみ。テーブル表示トグルなし、ページャなし（「全 N 件」テキストのみ）。
- **修正方針**: ライブラリにカード/テーブル切替と機能するページャ（ページサイズ可変・前後送り）を追加。テーブル表示はランキング/検索の `VariantKActionTable` 土台を流用できるか検討。

### 1-B. ❌ ランキング／検索：Tier1・Tier2 列がプルダウン操作になっていない
- **根拠**: feedback ランキング改善要望「Tier1列/Tier2列は 未判定/Lv0〜Lv4・未選別/Lv0〜Lv4 のプルダウン操作候補」／検索「レベル操作は Tier1レベル/Tier2レベルに揃える」「Tier1/Tier2変更後も行は即時に消さず値だけ更新」／計画 §10。
- **現状**: `ranking/RankingTable.tsx`・`search/SearchResults.tsx` の Tier1/Tier2 列は `tier1Label`/`tier2Label` の静的テキスト。レベル変更不可。
- **修正方針**: Tier1/Tier2 列を行内プルダウン（Tier1=未判定/Lv0〜Lv4、Tier2=未選別/Lv0〜Lv4）に。変更時は行を即時除去せず値・行表示のみ更新（メモリ状態）。`useVariantKRowStates` にレベル変更ハンドラを追加する形を検討。

### 1-C. ⚠️ AVP：主要ボタンに Tooltip（title）が付いている
- **根拠**: feedback AVP「主要ボタン（再生対象に追加／候補から外す／全候補をクリア／再生対象をクリア／一括いいね／AVPで再生）には Tooltip を付けない（ボタン名で分かる・画面を重くしない）」。
- **現状**: `avp/AvpPlaySet.tsx`・`avp/AvpCandidateTable.tsx` の上記ラベル付きボタンに `title=` が付与されている。
- **修正方針**: ラベルで自明な主要ボタンの `title` を外す。利用不可で disabled の「再生対象に追加」の理由表示など、必要箇所のみ残す。

### 1-D. ⚠️ 検索：詳細フィルタが畳まれていない／詳細列（保存先）トグルが無い
- **根拠**: feedback 検索「詳細フィルタはキーワード以外を畳む」「詳細列ONでは保存先のみ追加（実パスでなく匿名化・分類化）」。
- **現状**: `search/SearchFilters.tsx` は全フィルタ常時展開。`search/SearchResults.tsx` に詳細列（保存先）トグルなし。
- **修正方針**: キーワード以外を開閉式（折りたたみ）に。保存先の詳細列トグル（匿名化表示）を追加。

---

## 2. 文言・細部の未反映（軽微だが記録）

| # | 状態 | 項目 | 根拠 | 現状 / 修正方針 |
|---|---|---|---|---|
| 2-1 | ⚠️ | AVP 一括いいねのボタン名 | feedback 候補「4本をまとめていいね／再生対象をまとめていいね」 | `avp/AvpPlaySet.tsx` は「一括いいね」。→ feedback 候補名へ寄せる |
| 2-2 | ❌ | AVP 候補テーブルのタイトル省略＋全名 Tooltip | feedback「タイトルは省略表示、全名は Tooltip」 | `avp/AvpCandidateTable.tsx` は省略・Tooltip なし。→ truncate＋全名 Tooltip |
| 2-3 | ⚠️ | ランキング 詳細フィルタの畳み込み | feedback/計画「表示範囲/期間/最低レベル/保存先/詳細列ON は詳細フィルタに入れる」 | `ranking/page.tsx` はインライン常時表示。→ 開閉式の詳細フィルタへ |
| 2-4 | ⚠️ | サイドバーのブランドマーク | feedback 付録 §2-1「ClipBox 左に自作 SVG（`clipbox-mark.svg`・箱＋再生三角等）」 | `_components/VariantKSidebar.tsx` は lucide `FlaskConical`。副題削除は✅。→ 自作 SVG ロゴへ差し替え |
| 2-5 | ⚠️ | あとで見る PC幅5列 | feedback/計画「PC幅5列」 | `watch-later/WatchLaterSectionBlock.tsx` は `auto-fit/minmax(11rem,1fr)`（5列固定でない）。→ 5列基準に寄せるか確認 |
| 2-6 | ⚠️ | AVP「AVPで再生」ボタンの目立たせ | feedback「下段2×2の右上に固定して目立たせる」 | セクションヘッダ内でクリア/一括いいねと並ぶ小ボタン。→ 主操作として強調 |

---

## 3. 計画と齟齬・要確認（superseded か gap か判断が要る）

| # | 項目 | 内容 | 確認したいこと |
|---|---|---|---|
| 3-1 | ❓ Tier1 ランダムの主ボタン名と多本引き | feedback 付録 §3-2「主ボタン＝シャッフル」「引き数 5/10/15/20（単位"本"削除）」。統合計画 §10 は「未判定かつ再生可能固定で1本提示」に簡素化。現状 `tier1/Tier1Random.tsx` は単一カード＋「引き直す」 | 統合計画で上書き済み（gap でない）か、付録どおり多本提示＋「シャッフル」に戻すか |
| 3-2 | ❓ AVP の総合スコア／順位が公式再計算でない | feedback/計画は AVP 上段に総合スコア＋総合順位（再生可能だけ/全動画 で母集団切替）。現状 `avp/shared.ts` は静的 mock `score`/`rank`（小数 `128.4 pt`）で、ランキング/検索（公式再計算の整数）と桁が不一致。段階6で「AVP は mock 据え置き」と決めた経緯あり | AVP も公式再計算（`_data/variantKScore.ts`）へ寄せて整合させるか |
| 3-3 | ❓ ランキング/検索のスコア桁感 | 公式再計算で整数（例 9180）になり大きく見える。係数・式は不変が前提（変更しない） | 表示桁の見せ方のみ調整余地があるか（式・係数・タイブレークは触らない） |

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

---

## 5. 次ラウンド修正の優先順位

1. **§1（A 項目）** から着手: Tier1 カード/テーブル＋ページャ → ランキング/検索の Tier プルダウン → AVP 主要ボタン Tooltip 整理 → 検索 詳細フィルタ畳み＋保存先詳細列。
2. **§2（細部）** をまとめて反映（ボタン名・タイトル省略・詳細フィルタ畳み・SVG ロゴ・5列・AVP再生強調）。
3. **§3（要確認）** はユーザー回答後に対応方針を確定してから実装。
4. 各修正後に `cd frontend && npm run typecheck && npm run lint`、節目で `npm run build`。Playwright で該当画面を再取得し `_review/`（例 `stage7/`）に保存。

## 6. 要ユーザー確認

- §3-1 Tier1 ランダム（単一固定で確定か、多本＋「シャッフル」に戻すか）。
- §3-2 AVP 総合スコア/順位（公式再計算へ統一するか、mock 据え置きか）。
- §3-3 ランキング/検索のスコア桁の見せ方（式は不変・表示のみ調整するか）。
- §2-5 あとで見るの 5列固定にするか（現状 auto-fit）。
- §2-6 AVP「AVPで再生」の強調度（右上固定の主操作にどこまで寄せるか）。
