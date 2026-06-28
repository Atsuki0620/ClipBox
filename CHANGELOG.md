# CHANGELOG

AIへの引き継ぎノート。主要な変更を遡及記録。

## 記載方針

- CHANGELOG には主要変更の要約だけを書く。詳細比較・レビュー・調査記録は `docs/reports/` や `_review/` に置く。
- 実データ、個人情報、動画名、ローカルパスは書かない。
- 歴史資料や archived 機能を現行仕様として扱わない。現行仕様は `docs/context/` の正本台帳に従う。
- Pull request は `PR` と省略せず `Pull request` と表記する。

---

## 2026-06-29 — feat(ui-lab): 統合 Variant K フィードバック反映（監査§1/§2/§7）を実装

- `STAGE7_FEEDBACK_AUDIT.md` の §1（注力未反映）・§2（細部）・§7（Tier1/カード共通部品）を一括実装。すべて `/lab/variant-k/*` の UI LAB モックで、本体 API/DB/設定/localStorage/sessionStorage 仕様・総合スコアの係数/タイブレークは変更なし（状態はページ内メモリ相当）。
- 共通部品を新設: `_components/VariantKCardActions.tsx`（再生=アイコンのみ／いいね／あとで見る=栞／AVP候補=`MonitorPlay` の横1段アイコン操作・ハンドラ未指定は非描画）、`_components/VariantKLevelButtons.tsx`（options 駆動の汎用レベルボタン）、`_components/VariantKLevelSelect.tsx`（テーブル行内の Tier レベル Select）。Tier1/Tier2/あとで見る/AVP の操作行をこれらに統一（§7-C）。`VariantKRowActions` の state 型を使用フィールドのみに絞り Tier1 カード状態でも流用可能にした。
- Tier1 ライブラリ（§1-A/§7-A/§7-B/§7-D）: カード⇄テーブル切替＋機能するページャ（全N件・50/100/200・前後送り）を追加。フィルタを漏斗 Popover（レベル 未/0–4・保存先・状態・再生可のみ・「判定済みを薄くする」＋有効数バッジ）に畳み、並び替えを2段 Popover（項目＝レベル/作成日/視聴日数/タイトル/判定日、方向＝降順/昇順）に変更。レベル選択を 未/0/1/2/3/4 の6択（未＝未判定へ戻す）にし「判定」ラベルを削除。`useTier1MockCardState.setLevel` は -1（未判定）で判定日を null に戻す。
- Tier1 ランダム（§3-1）: 主ボタンを「シャッフル」、引き数 5/10/15/20 で N 本提示に変更（運命の1本は単一のまま）。
- ランキング/検索（§1-B）: Tier1（未判定/Lv0〜Lv4）・Tier2（未選別/Lv0〜Lv4）列を行内 Select 化。`useVariantKRowStates` に `setTier1Level`/`setTier2Level` を追加。行の所属・並びはフィルタ/ソート変更時のみ再計算（id で固定）し、値編集では行を即時除去・並べ替えしない。
- AVP（§1-C/§2-1/§2-2/§2-6/§3-2）: 主要ボタンの Tooltip を撤去（disabled 理由のみ残置）、「一括いいね」→「再生対象をまとめていいね」、候補タイトルを truncate＋全名 title、「AVPで再生」を主操作として強調。総合スコア/順位を mock 小数廃止し公式再計算（`_data/variantKScore`）へ統一（母集団=再生可能だけ/全動画で順位再計算・桁はランキング/検索と一致）。
- 検索/ランキング（§1-D/§2-3/§2-7/§2-8）: 詳細フィルタを漏斗 Popover に畳み（有効数バッジ）、検索に「詳細列（保存先）」トグルと利用不可タイトル横バッジを追加、ランキング詳細フィルタも開閉式に統一。
- 設定/シェル/あとで見る（§1-E/§2-4/§2-5）: 設定の手動バックアップボタンを撤去し履歴を自動取得中心に、サイドバーのブランドマークを自作 SVG（箱＋再生三角・`public/clipbox-mark.svg`）へ差し替え、あとで見るを PC幅5列基準に変更。
- 除外: §3-4（サンプルDB接続前 API 束）は本体作業として今回対象外。検証: `npm run typecheck`/`npm run lint`/`npm run build` 全通過、Tier1/ランキング/AVP を Playwright スモーク（コンソールエラーなし）。`docs/nextjs-ui-renovation-feedback.md` は不変。

---

## 2026-06-28 — docs(ui-lab): 統合 Variant K フィードバック反映の網羅監査を記録

- `frontend/src/app/lab/variant-k/_review/STAGE7_FEEDBACK_AUDIT.md` を新規作成。`docs/nextjs-ui-renovation-feedback.md`（フィードバック正本）と `_review/INTEGRATED_VARIANT_K_PLAN.md`（実装計画）に対し、統合 Variant K（段階1〜6 マージ済み）の現行実装を画面別に突き合わせ、未反映・部分反映・要確認を ✅⚠️❌❓ で網羅記録した。
- 主な未反映: Tier1 ライブラリのカード⇄テーブル切替＋ページャ欠如／ランキング・検索の Tier1・Tier2 列がプルダウン操作でない／AVP 主要ボタンの Tooltip 整理／検索の詳細フィルタ畳み込み＋保存先詳細列。細部（AVP 一括いいねボタン名・候補テーブルのタイトル省略＋全名 Tooltip・ランキング詳細フィルタ畳み込み・サイドバー自作 SVG ロゴ・あとで見る5列・AVP「AVPで再生」強調）と、要確認（Tier1 ランダムの多本引き、AVP 総合スコアの公式再計算統一、スコア桁の見せ方）も記載。
- ユーザー追加指摘（§7・Tier1/カード共通部品）も同ドキュメントに追記: Tier1 のフィルタ（漏斗 Popover・全表示しない）欠如／並び替え（2段 Popover・項目＋降順昇順）相違／カードデザインの他画面共通部品化／レベル選択を 未・1・2・3・4 にし「判定」ラベル削除／アクション（再生・いいね・あとで見る・AVP）を横1段＋アイコン化（再生=アイコンのみ・あとで見る=栞・AVP=AVPメニューと同アイコン）。根拠は `tier1-library/_review/COMPARISON_J.md` §3/§4。
- 本ラウンドは docs 記録のみ（コード・UI・API・DB・設定は変更なし）。修正は次ラウンドで本監査を基に実施する。`docs/nextjs-ui-renovation-feedback.md` には直接追記していない（正本は上書きしない）。

---

## 2026-06-28 — feat(ui-lab): 統合 Variant K 段階6（ランキング・検索・設定）を実装

- `frontend/src/app/lab/variant-k/ranking/` を作り込み、`/lab/variant-k/ranking` を 総合スコアで俯瞰する操作付きスコアテーブル（UI LAB モック）にした。新規: `page.tsx`（概要KPI＋詳細フィルタ＋詳細列ON/OFF＋既定=再生可能だけ）・`RankingTable.tsx`・`shared.ts`。通常列＝順位/タイトル/総合スコア/視聴日数/いいね/Tier1/Tier2/操作、詳細列ON で 基礎点/Tier1補正/Tier2補正/補正倍率/保存先 を追加。ソート可能ヘッダ（総合スコア/視聴日数/いいね）はクリックで降順⇔昇順、順位は現在の並び順での 1..N。
- `frontend/src/app/lab/variant-k/search/` を作り込み、`/lab/variant-k/search` を 高機能フィルタ＋操作付きテーブルにした。新規: `page.tsx`（キーワード未入力は空状態）・`SearchFilters.tsx`・`SearchResults.tsx`・`shared.ts`。フィルタ＝キーワード/保存先/利用可否/Tier1レベル/Tier2レベル/あとで見る/いいね/最低視聴日数。結果は永続化せず、順位列は出さない。既定の並びは Tier1行→Tier2行→総合スコア降順。
- 総合スコアは SPEC §9 の公式（`round((視聴日数＋いいね×3)×(1＋0.5×T1＋0.3×T2)×100)`）どおりに再計算する共通土台 `_data/variantKScore.ts` を新設し、ランキング/検索で共有。詳細列（基礎点/各補正/補正倍率）が総合スコアと整合する。係数・タイブレーク（score 降順→最終再生日降順→id 昇順）・score=0 除外は本体仕様どおりで変えていない。画面ソートの同点時も公式順位比較を使うようにした。AVP 画面（段階5）の mock score 表示は据え置き。テーブル行操作の共通土台 `_components/useVariantKRowStates.ts`・`_components/VariantKRowActions.tsx` も新設（ランキング/検索が各自インスタンス化・画面間で同期しない）。
- `frontend/src/app/lab/variant-k/settings/` を作り込み、`/lab/variant-k/settings` を scan-first の上部セグメントタブ（スキャン/表示/フォルダ/バックアップ・既定=スキャン・自動保存で保存ボタンなし）にした。新規: `page.tsx`・`useSettingsMockState.ts`・`SettingsScanTab`/`SettingsDisplayTab`/`SettingsFoldersTab`/`SettingsBackupTab`。スキャンは 自動バックアップ→Tier1→Tier2→結果確認 の流れ＋モック進捗（setInterval・実スキャンなし）＋結果サマリー＋詳細折りたたみ。完了時の経過秒は結果サマリーの所要秒に確定させる。Tier2 未設定は「Tier2未設定のためスキップ」。表示タブはメタ項目/バッジ項目とレベル表示対象（該当Tierのみ既定／Tier1・Tier2を両方表示）。フォルダタブは表示名「Tier1フォルダ/Tier2フォルダ」（内部キー library_roots/selection_folder は不変）。Runtime control は設定に置かずサイドバー下部のまま。
- UI LAB モックのみ。状態はすべてページ内メモリで、本体画面・API・DB・migration・設定ファイル・実データ・localStorage/sessionStorage 本体仕様は変更なし。`displayContext` に第4値は足さず、既存 Variant A〜K・lab 共通部品・Tier1/Tier2/あとで見る/AVP/analysis は無改変（新規 `_components` ファイルは追加のみ）。`_data/variantKMock.ts` は変更せず既存17行で対応。視聴回数/更新日/登録日/サムネイルは出していない。`_review/STAGE6_RANKING_SEARCH_SETTINGS.md` を追加。外側 SidebarNav の 390px 幅制約・既存 Recharts 警告は段階6の範囲外（未対応リスクとして再掲）。

---

## 2026-06-28 — feat(ui-lab): 統合 Variant K 段階5（あとで見る・AVP）を実装

- `frontend/src/app/lab/variant-k/watch-later/` を作り込み、`/lab/variant-k/watch-later` を 未処理／確認・見直し／処理済み候補 の3セクション構成のあとで見る消化画面（UI LAB モック）にした。新規: `page.tsx`・`useWatchLaterMockState.ts`・`shared.ts`・`WatchLaterSectionBlock`・`WatchLaterCard`・`WatchLaterCardActions`。セクション分類は Tier2 対象は Tier2 状態・それ以外は Tier1 状態で判定し、処理済みは最終再生（`last_played_at` をモックの /stats/last-viewed 相当として使用）の有無で確認・見直し／処理済み候補に分ける。ステータス文言は `Tier1 未判定` / `Tier1 Lv3` / `Tier2 未選別` / `Tier2 Lv2` のように Tier1/Tier2 を混同しない。
- `frontend/src/app/lab/variant-k/avp/` を作り込み、`/lab/variant-k/avp` を 上段＝AVP候補テーブル（`VariantKActionTable` 流用）／下段＝2×2再生セット（`VariantKVideoCard` 流用）の2段構成にした。新規: `page.tsx`・`useAvpMockState.ts`・`shared.ts`・`AvpCandidateTable`・`AvpPlaySet`。候補は上限なし、再生対象は最大4本、利用不可は再生対象に追加不可、AVPで再生は再生中ハイライトのみ（再生後クリアは想定文言）。候補テーブルは「再生可能だけ⇔全動画」順位母集団の軽量切替・総合スコア＋総合順位の表示・全候補をクリア／個別除外、2×2は外す・個別いいね・一括いいね（未いいねのみ）・再生対象をクリアを持つ。スロット番号（大きな 1/2/3/4）は出さない。
- あとで見る（DB相当）と AVP候補（localStorage相当）を別状態として保持し、UI 上でも列・文言・Tooltip で区別。解除ルールはタイトル横 Tooltip に集約し、「通常再生・AVP候補追加・AVP再生のいずれでも あとで見るを自動解除しない」前提で見せる。
- UI LAB モックのみ。状態はすべてページ内メモリで、本体画面・API・DB・migration・設定ファイル・実データ・localStorage/sessionStorage 本体仕様は変更なし。`displayContext` に第4値は足さず、既存 Variant A〜K・lab 共通部品・Tier1/Tier2 は無改変。`_data/variantKMock.ts` に3セクション/各状態確認用のダミー行（ids 13..17）を追加し、`_review/STAGE5_WATCH_LATER_AVP.md` を追加。視聴回数/更新日/登録日/サムネイルは出していない。外側 SidebarNav の 390px 幅制約・既存 Recharts 警告は段階5の範囲外（未対応リスクとして再掲）。

---

## 2026-06-28 — feat(ui-lab): 統合 Variant K 段階4（Tier2）を実装

- `frontend/src/app/lab/variant-k/tier2/` を作り込み、`/lab/variant-k/tier2` を ライブラリ／ランダム／運命の1本 の3タブと `案1: Tier1流用案` / `案2: Tier2専用文言強め案` の文言比較トグルを持つ UI LAB モックにした。新規: `Tier2Library`/`Tier2Random`/`Tier2Fate`・`Tier2Card`/`Tier2CardActions`/`Tier2LevelButtons`/`Tier2KpiBar`・`shared.ts`・`useTier2MockCardState.ts`。
- Tier2 の状態を video id 単位のページ内メモリで共有し、ライブラリ/ランダム/運命の1本で `未選別/Lv0..Lv4`、いいね、あとで見る、AVP候補、選別日が同期するようにした。`未選別 -> Lv0..Lv4` では選別日を当日に更新してあとで見るを自動解除し、`Lv0..Lv4 -> 未選別` では選別日を空扱いに戻す。
- ライブラリ=軽量KPI＋フィルタ(すべて/未選別/選別済み・再生可能だけ)＋並び替え(視聴日数/作成日/選別日)＋カードグリッド。ランダム=「Tier2対象・再生可能・未選別優先」固定の代表1件。運命の1本=大型「引く」・現在カード・最近見てない優先トグルの見た目・保持説明のみ（実 sessionStorage 非接触）。
- UI LAB モックのみ。本体画面・API・DB・migration・設定ファイル・実データ・localStorage/sessionStorage 本体仕様は変更なし。旧 `/lab/tier2-*/variant-k` は作らず、既存 Variant A〜K・lab 共通部品・Tier1 は無改変。`VariantKVideoCard` は `tierBadge="tier2"` / `statusLabel="選別"` / `dateLabel="選別日"` で流用し、視聴回数/更新日/登録日/サムネイル/Tier1 の判定操作は出していない。`_review/STAGE4_TIER2.md` を追加。

---

## 2026-06-28 — fix(ui-lab): 統合 Variant K の実装済み範囲を補正

- Tier1 のカード操作状態をカード単体ではなく video id 単位のページ内メモリ状態に変更。ライブラリ/ランダム/運命の1本で同じ動画の Lv・いいね・あとで見る・AVP候補が同期するようにした。
- Tier1 の Lv0..Lv4 操作で、モック上でも判定日更新・判定済み化・あとで見る自動解除を表現。未判定フィルタ中の対象カードは一覧から外れる。
- `VariantKVideoCard` に後方互換の `watchLater` prop を追加し、カード上部のあとで見るバッジをローカル状態と同期。操作ボタンに `aria-pressed` と状態に応じた `title` を追加。
- `lg` 未満用の横スクロールナビを統合シェルに追加し、サイドバー非表示時も Variant K 内の各画面へ遷移できるようにした。表記は `運命の1本`、Tier1 レベルボタンは `Lv0`..`Lv4` に統一。
- UI LAB モックのみ。本体画面・API・DB・migration・実データ・localStorage/sessionStorage 本体仕様は変更なし。Tier2/あとで見る/AVP/ランキング/検索/設定は引き続きプレースホルダー扱い。

---

## 2026-06-28 — feat(ui-lab): 統合 Variant K 段階3（Tier1）を実装

- `frontend/src/app/lab/variant-k/tier1/` を作り込み、`/lab/variant-k/tier1` を ライブラリ／ランダム／運命の1本 の3タブを持つ UI LAB モックにした（段階2のプレースホルダーを置換）。新規: `page.tsx`（3タブ軽量セグメント）・`Tier1Library`/`Tier1Random`/`Tier1Fate`・`Tier1Card`/`Tier1CardActions`/`Tier1LevelButtons`/`Tier1KpiBar`・`shared.ts`（フィルタ/ソート/抽選ピックの純関数）・`useTier1MockCardState.ts`（メモリのみのカード状態）。
- ライブラリ=軽量KPI＋フィルタ(すべて/未判定/判定済み・再生可能だけ)＋並び替え(視聴日数/作成日/判定日)＋5列カードグリッド、再生で再生中ハイライト(amber)。ランダム=「未判定かつ再生可能」固定・代表切替モック。運命の1本=履歴撤去・大型「引く」・保持は説明と見た目のみ（実 sessionStorage 非接触）。
- 共通部品 `VariantKVideoCard` に `statusLabel`/`statusValue`/`dateLabel`/`dateValue` を後方互換で追加し旧「Tier」メタ行を置換（Tier1=判定/判定日）。`_data/variantKMock.ts` に `VARIANT_K_TIER1_KPI`/`TIER1_TODAY_TREND` とダミー動画4件を追記。`_review/STAGE3_TIER1.md` 追加。
- UI LAB モックのみ。本体画面・API・DB・migration・設定ファイル・実データ・localStorage/sessionStorage 本体仕様は変更なし。既存 Variant A〜K・共有 `LevelButtons`/`Modern*`/`LabFrame` は無改変（Tier1 のレベルボタンは未判定を含めないため `Tier1LevelButtons` を別実装）。視聴回数/更新日/登録日は出さず、作成日/判定日/視聴日数を表示。あとで見る(DB相当)と AVP候補(localStorage相当)を別状態として混同しない。AVP候補バッジは初期OFF・未判定へ戻す操作とセレクション操作は出さない。`displayContext` 3値固定・Runtime control 本体仕様は不変。Streamlit 表示は復活させない。

---

## 2026-06-28 — feat(ui-lab): 統合 Variant K 段階2（統合シェル・共通部品の土台）を実装

- `frontend/src/app/lab/variant-k/` に統合 Variant K の土台を新設（案B: マルチルート＋`layout.tsx` 統合シェル）。`layout.tsx`（server）＋ランディング `page.tsx` ＋ 8画面プレースホルダー（`tier1`/`tier2`/`watch-later`/`avp`/`ranking`/`search`/`settings`/`analysis`）。各画面は段階3以降で作り込む設計メモ表示のみ。
- 共通部品 `_components/`: `VariantKShell`・`VariantKSidebar`（遷移ナビ・`usePathname`）・`VariantKRuntimeControl`（FastAPI/Next.js個別・「アプリを停止」は disabled モック・Streamlit非表示）・`VariantKBadge`・`VariantKVideoCard`（サムネなし）・`VariantKActionTable`・`VariantKEmptyState`・`VariantKTooltipLabel`・`VariantKSectionHeader`・`VariantKPlaceholder`・`theme.ts`（寒色モダン＋暫定バッジ色）・`navItems.ts`。合成データ `_data/variantKMock.ts`（`VariantKVideo` 型・snake_case・ダミー名8件＋Runtime モック）。Runtime control サイドバー下部は本段階2で作成し、計画書の「段階6で実装」は段階2版の確認/微修正へ読み替え。
- `frontend/src/app/lab/page.tsx` の `AREAS` に `/lab/variant-k` 入口を1件追加（既存エントリ不変）。`_review/STAGE2_SHELL_AND_COMPONENTS.md` を追加。
- UI LAB モックのみ。実 API・DB・migration・設定ファイル・実データ・localStorage/sessionStorage 本体仕様は変更なし。既存 Variant A〜K・共有 `Modern*`/`LabFrame` は無改変（variant-k 専用にフォーク）。`displayContext` 3値固定・永続境界・総合スコア式・AVP上限4本/候補上限なし・Runtime control 本体仕様は不変。Streamlit 表示は復活させない。

---

## 2026-06-28 — docs(ui): 統合 Variant K 実装計画書＋ワイヤー方針メモを作成

- `frontend/src/app/lab/variant-k/_review/INTEGRATED_VARIANT_K_PLAN.md` を新規作成。画面別に検討してきた UI 案（Tier1=variant-k / Tier2=案1・案2比較 / あとで見る=案B / AVP=案D改 / ランキング・検索=案D / 設定=scan-first 上部タブ / Runtime control=サイドバー下部）を、ナビ・カード・余白・ボタン・状態バッジ・情報密度・テーブル/カードの使い分け・用語で揃えた **統合 Variant K**（全画面整合モック）の着手前計画として整理。サンプルDB接続前の UI LAB モックに向けた準備で、**実装はしない**。
- 内容: 目的／参照ドキュメント／対象8画面（analysis は採用判断対象外で仮ページのみ）／UI LAB ディレクトリ構成 3 案と推奨（**案B: `lab/variant-k/<screen>` マルチルート＋`layout.tsx` 統合シェル**）／6段階の実装ステップ／全画面共通ルール（視聴日数主役・更新日/登録日廃止・該当Tierバッジ初期ON・AVP候補バッジ初期OFF・利用不可表示・テーブル/カード使い分け）／画面別ワイヤー方針／Tier2 案1・案2 比較／暫定デザイン項目（色・密度・余白・再生中ハイライト amber 暫定）／ユーザー確認チェックリスト／確認コマンド（typecheck + lint、節目で build。自動テストランナー無）／スクショ方針／旧 Tier1 variant-k 指示との関係明記。
- docs/計画のみ。本体画面・lab 以外の UI・API・DB・migration・localStorage 本体仕様・設定ファイル・実データ・既存 Variant A〜K の見た目は変更なし。`displayContext` 3値固定・永続境界・総合スコア式・APP_PLAYBACK 基準・AVP上限4本/候補上限なしは変更しない。`docs/nextjs-ui-renovation-feedback.md` へは直接追記していない（将来反映項目として計画書内に列挙）。

---

## 2026-06-28 — docs(ui): 全画面フィードバック棚卸しと H2（API取得可否）確認結果を記録

- `docs/nextjs-ui-renovation-feedback.md` に「全画面フィードバック棚卸し（2026-06-28）」を追記。分析を除く全画面の UI LAB フィードバック一巡を受けた棚卸しとして、確定判断を記録: AVP再生で あとで見る を自動解除しない本体変更は**サンプルDB版 Variant K の前に実装**（H1）／視聴回数は UI から外し `type=view_count` は後方互換で温存（M1）／Tier2 の Tier1流用 vs 専用文言は Variant K 試作で判断。
- H2（カード/テーブルに必要な値の既存 API 取得可否）を read-only で確認した結果を記録。作成日 `file_created_at`・保存先・利用可否・Tier状態・視聴回数・最終再生日は既存 API で取得可。**判定日/選別日**は core 関数 `get_latest_judged_at_map` は有るが HTTP 未公開、**視聴日数 `view_days`** は per-video マップ無し、**総合スコア/順位**は任意動画集合では引けず、サンプルDB前に **API 追加3件**（いずれも既存計算の流用・新規メトリクス定義は不要）が要ると整理。
- `docs/nextjs-ui-renovation-master-memo.md`（§3-C 進捗メモ）に棚卸し完了と次工程（統合 Variant K 作成 Prompt 起草）を追記。
- docs-only。実装・UI LAB・本体画面・API・DB・migration・設定ファイル・実データ・動画ファイルの変更はなし。`frontend/src/lib/types.ts` / `docs/context/API_SPEC.md` / `core/` は読み取りのみ。視聴履歴・ランキング計算式・APP_PLAYBACK 基準・`displayContext` 3値固定・内部 config キーは変更しない。

---

## 2026-06-27 — docs(ui): Runtime control・Tier2・全画面共通ルールを記録

- `docs/nextjs-ui-renovation-feedback.md` の Runtime control 欄を記入。配置はサイドバー下部のまま維持し設定画面へ移設せず、**Streamlit の状態表示・停止ボタンを UI から削除**、**FastAPI / Next.js を個別表示**（状態ランプ / 起動状態 / ポート番号 / 最終確認時刻）、停止は `FastAPI停止`/`Next.js停止` に分けず **`アプリを停止` の1ボタン**にまとめる方針を記録。Streamlit 関連コードの削除可否は実装時調査とし、今回は削除しない。
- Tier2 欄を記入。専用 UI を決め切らず **案1「Tier1 Variant K 流用案」/ 案2「Tier2専用文言強め案」** を比較する方針。カード/操作部品は原則 Tier1 流用、専用化候補は見出し・空状態・フィルタ文言など文章部分のみ。該当Tierバッジは `Tier2` のみ（Lv・未選別/選別済みは書かない）、初期フィルタは 未選別+選別済み、フィルタ候補 すべて/未選別/選別済み・既定すべて。
- `## 全画面共通フィードバック` を拡張し、統合 Variant K 前に固める共通ルールを追記（該当Tierバッジ詳細、バッジ初期表示、利用不可の表示、Tooltip 方針、テーブルとカードの使い分け、Runtime control 共通方針）。視聴回数→視聴日数一本化・更新日/登録日廃止は既存記載を維持。
- `docs/nextjs-ui-renovation-master-memo.md`（§3-A / §3-C）に短く追記。GLOSSARY は前タスクで追加済みのため変更なし。
- docs-only。実装・UI LAB・本体画面・API・DB・migration・設定ファイル・実データ・動画ファイル・Streamlit 関連コードの変更はなし。Runtime 仕様・既定無効・`displayContext` 3値固定・APP_PLAYBACK 基準は変更しない。

---

## 2026-06-27 — docs(ui): 設定画面UI LABレビュー結果と全画面共通の日付/視聴指標方針を記録

- `docs/nextjs-ui-renovation-feedback.md` の設定欄を更新し、UI LAB scan-first 系のうち **scan-first の上部タブ案** を採用候補として記録。スキャンは バックアップ → Tier1 → Tier2 の3段を維持し、進捗バー・現在処理表示・経過時間・完了後の所要時間・結果詳細の折りたたみを追加要望として整理（Tier2未設定はスキップ表示、手動バックアップボタンは置かない、スキャン前 DB バックアップ自動作成は維持）。カード表示設定を **メタ項目**（初期ON: ストレージ / 視聴日数 / 作成日）と **バッジ項目**（初期ON: 該当Tier / あとで見る / 利用不可）に分離し、該当Tierバッジを新設（Tier名のみ表示・Tier1/Tier2 で色分け・具体色は統合 Variant K で決定）。レベル表示対象は `該当Tierのみ`（既定）/ `Tier1・Tier2を両方表示` の2択として記録。
- 同ファイル冒頭に **全画面共通フィードバック** を追記。視聴回数ではなく視聴日数へ一本化（全画面で視聴回数表示を原則廃止・視聴履歴は削除しない）、更新日・登録日を全 UI から外す、使う日付は 作成日（動画ファイルの作成日 `file_created_at`）/ 判定日 / 選別日 を基本にする方針を記録。判定/選別日は設定項目名 `判定/選別日`・カード表示は Tier1=`判定日`・Tier2=`選別日`。
- `docs/nextjs-ui-renovation-master-memo.md`（§3-A / §3-C）と `docs/context/GLOSSARY.md`（視聴日数 / 作成日・登録日・更新日 / 判定日・選別日 / 該当Tierバッジ）に短く追記。詳細はフィードバック記録へ集約。
- docs-only。実装・UI LAB・本体画面・API・DB・migration・設定ファイル・実データ・動画ファイルの変更はなし。視聴履歴・ランキング計算式・APP_PLAYBACK 基準・`displayContext` 3値固定・内部 config キーは変更しない。

---

## 2026-06-27 — docs(ui): AVP UI LABレビュー結果を案D改方針で記録

- `docs/nextjs-ui-renovation-feedback.md` の AVP 欄を更新し、UI LAB 案A〜D をそのまま採用せず、案Dを発展させた案D改「上段候補テーブル / 下段再生セット2×2カード」を採用候補として記録。上段はランキング/検索整合の操作付き候補テーブル（タイトル/総合スコア/視聴日数/いいね/あとで/Tier1/Tier2/アクションの列構成、総合スコア列はポイント＋総合順位で順位は既定で再生可能だけ・トグルで全動画、いいね列は表示のみクリック不可、あとで見るはバッジでなく `あとで` 列、Tier1/Tier2は別列、バッジ非表示で利用不可は薄表示・再生中は行ハイライト）、下段は Tier1 ライブラリ動画カード整合の2×2再生セットカード（個別いいね＋一括いいねは未いいねのみON・いいね済みはそのまま、`AVPで再生`は下段右上固定、全候補クリアと再生対象クリアを両方）を整理。説明はタイトル横 Tooltip に集約し主要ボタンには Tooltip を付けない方針も記録。
- `docs/nextjs-ui-renovation-master-memo.md` の AVP 関連メモ（§3-A / §3-B / §3-C 進捗）を短く追記し、詳細はフィードバック記録へ集約。候補上限なし・再生対象最大4本・AVP候補/再生対象の状態境界・`displayContext` 3値固定、ランキング計算式・APP_PLAYBACK 基準・ランキング API 契約は変えない前提を明記。
- docs-only。実装・UI LAB・本体画面・API・DB・migration・設定ファイル・実データ・動画ファイルの変更はなし。

---

## 2026-06-27 — docs(ui): あとで見るUI LABレビュー結果と分析画面の扱いを記録

- `docs/nextjs-ui-renovation-feedback.md` に、あとで見るは UI LAB 案B「付与理由・状態説明強化型」ベース、案C上部サマリー不採用、3セクション維持、タイトル横 Tooltip、個別解除基本として記録。ステータス文言、DB/localStorage 境界、`displayContext` 3値固定、AVP再生非解除方針は今回実装しないことも明記。
- 分析画面は UI LAB A/B/C の採用判断対象から外し、本体 ClipBox を実データで使いながら別枠でフィードバックする方針へ更新。既存 UI LAB レポートは参考資料として残し、分析ロジック・集計SQL・APP_PLAYBACK 基準・ランキング計算式は変更しない。
- docs-only。実装・UI LAB・本体画面・API・DB・migration・設定ファイル・実データ・動画ファイルの変更はなし。

---

## 2026-06-27 — docs: analysis dashboard の正本整合確認と NextActionTab 分割候補を記録

- analysis-real-dashboard の main 合流後に `docs/context` と現行実装を突き合わせ、`/analysis` の4タブ構成、Stage D/E 操作、`judgment-trend?tier=1|2`、`likes-trend`、DB/localStorage境界、APP_PLAYBACK基準、`displayContext` 3値固定が正本記述と整合していることを確認。
- `ACCEPTANCE_CRITERIA.md` に `NextActionTab.tsx` の後続分割候補を短く追記。分割候補は KPI / 進捗 / 偏り指標 / 導線 / 候補セクション / 候補行 / query / mutation / formatter の責務単位に限定し、分割時も既存 API・既存 mutation・invalidate の意味・Tier1/Tier2 ラベルを維持する前提を明記。
- docs-only。実装コード、API、DBスキーマ、migration、設定ファイル、実データ、動画ファイルの変更はなし。

---

## 2026-06-27 — fix(ui): VideoCard の未選別表示を displayContext 非依存にし `/avp` 等でも選別状態を反映

- **症状**: `/avp` で選別動画を未選別に戻すとファイル名は正しく `!#_` になるが、レベルプルダウンが `Lv1` のままで「未選別」を表示しなかった。
- **原因**: VideoCard は `displayContext === "tier2"` のときだけ「未選別」表示・選択肢を出していたため、`/avp`（`displayContext="avp"`）では選別動画でも `未判定/Lv0-4` のままだった。
- **修正**: 「未選別」表示・選択肢の判定を **displayContext ではなくセレクション状態（`needs_selection || is_selection_completed`）** に基づくよう変更（`frontend/src/components/VideoCard.tsx`）。`/avp`・`/watch-later` 等どの画面でも選別動画は「未選別」を正しく表示し、未選別へ戻せる。Tier1 の通常動画は従来どおり `未判定/Lv0-4`。`/tier2` の挙動は不変。

---

## 2026-06-27 — fix(selection): 選別完了(+)動画を未判定にすると `+name` 不正状態になる既存バグを修正

- **症状**: `+###_name`（選別完了 Lv3）を未判定(`level=null`)にすると、`!###_` でなく `+name`（完了なのにレベル無し）になっていた。`/avp`・`/tier2`・Tier1 など `VideoCard` を使う全画面で再現する既存挙動（Stage D/E の新規バグではない）。
- **原因**: `set_favorite_level_with_rename` が `+` 始まりファイルに未判定リネームしても `+` を再付与していた（`core/video_manager.py`）。
- **修正**: セレクション動画の状態遷移を一貫化。`level>=0`→選別完了(`+`)、`未判定(-1)`→**未選別(`!`)へ差し戻す（元のレベルを維持**: `+###_name`→`!###_name`、`needs_selection=1` / `is_selection_completed=0`）。`+name` の不正状態を作らない。差し戻しは判定ではないため `judgment_history` は記録せず `watch_later` も解除しない（`PUT /unselect` と同等）。
- テスト追加: `test_selection_completed_to_unrated_reverts_to_unselected_keeping_level` / `test_selection_completed_relevel_keeps_plus`（`tests/test_video_manager.py`）。`API_SPEC.md` の PUT level 副作用に状態遷移を明記。

---

## 2026-06-27 — fix(analysis): NextActionTab の候補リスト無効化を広域化し stale 行を排除

- 判定/選別で動画はセクションを跨いで移動する（例: 未選別→選別完了で未選別リストから消える）が、`levelM`/`unselectM` が該当1サブリストしか無効化しておらず、別セクションに古い行が残り実状態と矛盾する操作を許していた。
- `levelM`/`unselectM` の候補リスト無効化を `["analysis","next-action","candidates"]`（全候補 prefix）へ広域化（`playM` と同じ粒度）。スケルトンは初回ロードのみのため点滅は増えない。

---

## 2026-06-27 — feat(analysis): NextActionTab に Stage E（Tier1/Tier2 判定・選別）を追加

- 未判定候補行に Tier1 レベルセレクト（未判定/Lv0〜Lv4）を追加。`setLevel` 経由で DB 更新・ファイル名リネーム・judgment_history 追記をサーバーに委譲（ロジック複製なし）。
- 未選別候補行に Tier2 選別セレクト（未選別/Lv0〜Lv4）を追加。「未選別」選択で `unselectVideo`、Lv 選択で `setLevel`。Tier2 セレクトに「未判定」の選択肢は出さない。
- レベル変更後は KPI（kpi/selection-kpi）・判定/選別トレンド・選別分布・偏り指標・該当候補リスト、および watch_later 系（SPEC §134/§135 の自動解除）を invalidate。
- 利用不可動画はレベル変更も disabled。`displayContext` は不変、新 API・DB スキーマ変更なし。

---

## 2026-06-27 — feat(analysis): NextActionTab に Stage D（再生・いいね・あとで見る・AVP）を追加

- 候補一覧の各行から再生・いいね・あとで見るトグル・AVP候補登録ができるようになった（read-only → 操作可能な作業面へ）。
- 再生エラーを含む全 mutation 失敗を行内に表示。再生は利用不可で抑止、いいね・あとで見るは利用不可でも可、AVP は利用不可で不可（`VideoCard` と同方針）。
- 再生後は `/analysis` 自身のソート済み候補（last_viewed 順）・view 系ランキング・偏り指標を、いいね後はいいねランキングを invalidate。いいね/あとで見るはタブ内「あとで見る」件数・候補リストも更新（SPEC §135 の自動解除に対応）。
- `id == null` の動画は read-only 行に落とし、操作行は別コンポーネントに分離（React Hooks ルール順守）。
- 既存 `likeVideo` / `toggleWatchLater` / `usePlayVideo` / `useAvpStore` を流用。新 API・DB スキーマ変更・`displayContext` 変更なし。Tier1判定・Tier2選別（Stage E）は別途。

---

## 2026-06-26 — feat(analysis): NextActionTab に read-only の次アクション候補一覧を追加（Stage C 相当）

- `NextActionTab` に未判定・未選別・あとで見る・利用不可の候補一覧（read-only）を追加。各カテゴリは `getConfig`、`listVideos`、`listSelectionVideos`、`getLastViewed`、`getViewCounts` で取得し、保存場所・利用可否・最終再生・再生回数をコンパクト行で表示。
- 次アクションは既存画面（`/`、`/tier2`、`/watch-later`、`/search`）への導線のみ。VideoCard 操作・DB 書き込み・localStorage 永続境界・`displayContext` 3値は変更なし。
- `/analysis` の共通フィルタ（period/availability/includeDeleted/topN 等）を `NextActionTab` に渡すよう `page.tsx` を更新。
- `SPEC_NEXTJS.md` と `ACCEPTANCE_CRITERIA.md` を read-only 候補一覧・既存画面への導線に更新。
- Stage D の操作実装（再生・いいね・あとで見る・Tier1判定・Tier2選別）は未着手。

---

## 2026-06-26 — feat(analysis): ダッシュボード Stage B の Tier/いいね推移を追加

- `GET /api/analysis/judgment-trend` に optional `tier=1|2` を追加。未指定時は既存どおり Tier1+Tier2 を含め、Tier1 は `was_selection_judgment=0`、Tier2 は `was_selection_judgment=1` に絞る。
- `GET /api/analysis/likes-trend` を追加。`likes.liked_at` 基準で day/week/month 集計し、`videos` と JOIN して `availability` / `include_deleted` / `period` と連動する。
- `WorkloadDistributionTab` に「Tier1 判定数推移」を追加し、`ViewingRelationTab` の判定推移を Tier1 固定に変更。あわせて「いいね数推移」を追加。
- API 仕様、型定義、API ラッパ、分析 API テストを更新。DB スキーマ・migration、Stage A の旧分析/次アクションタブ、`displayContext` 3値は変更なし。

---

## 2026-06-26 — feat(analysis): 4タブ構成への改修 Stage A

- `frontend/src/app/analysis/page.tsx` を 4 タブシェル（旧分析 / 作業量・結果分布 / 視聴との関係 / 詰まり・次アクション）に書き換え。フィルタ state は page.tsx で一元管理しタブへ props 渡し。
- `_tabs/LegacyAnalysisTab.tsx` — 現行 960 行の表示を挙動同一のまま抽出。9 query・KPI 5 枚・Recharts 8 パネル・ストレージ表・ランキング 3 表を保持。
- `_tabs/WorkloadDistributionTab.tsx` — 既存 API のみ。KPI 4 枚（Tier1未判定/今日判定・Tier2未選別/今日選別）＋ Tier1 レベル分布・Tier2 選別数推移・Tier2 選別レベル分布の 3 グラフ。
- `_tabs/ViewingRelationTab.tsx` — 既存 API のみ。APP 再生数推移・判定数推移（Tier1+Tier2 混在・Stage B で分離予定）・Tier2 選別数推移の 3 折れ線グラフ。
- `_tabs/NextActionTab.tsx` — Stage C/D/E 向けプレースホルダ（VideoCard 操作なし）。
- `_components/{EmptyMini,ChartPanel,LineTrendChart,BarValueChart,AnalysisFilterBar}.tsx` — 共通 UI 部品を page.tsx から抽出。ChartPanel は任意 `note` props でラベル注記に対応。
- 段階 A 制約厳守: バックエンド追加なし・DB変更なし・VideoCard操作なし・displayContext 3値固定。
- `npm run lint` ＋ `npx tsc --noEmit` エラーゼロ確認済み。

---

## 2026-06-26 — docs(ui): 検索UIフィードバックを案D採用候補へ更新

- `docs/nextjs-ui-renovation-feedback.md` の検索欄を更新し、UI LAB 既存3案はそのまま採用せず、案D「高機能フィルタ + 操作付きテーブル」を採用候補として記録。ランキングとは統合せず、検索はキーワードや条件で探してその場で処理する画面、ランキングは数値指標で並べる画面として責務を分ける方針を整理。
- `docs/nextjs-ui-renovation-master-memo.md` は検索関連メモを短く更新し、詳細はフィードバック記録へ集約。共通の操作付きテーブル土台は共有するが、検索結果の永続化、ランキング計算式、APP_PLAYBACK 基準、API 契約、DB スキーマ、設定キーは変えない前提を明記。
- docs-only。実装・UI LAB・本体画面・API・DB・migration・設定ファイル・実データ・動画ファイルの変更はなし。

---

## 2026-06-26 — docs(ui): ランキングUIフィードバックを案D方針へ更新

- `docs/nextjs-ui-renovation-feedback.md` のランキング欄を更新し、UI LAB 既存3案（A カードランキング / B テーブル / C 上位カード＋下位テーブル）は不採用、新方針は案D「操作付きスコアテーブル」として記録。Tier1 Variant J の「全体（テーブル表示）」を参考方向にし、通常表示・詳細列ON・行内アクション・詳細フィルタの方針を整理。
- `docs/nextjs-ui-renovation-master-memo.md` はランキング関連メモを短く更新し、詳細はフィードバック記録へ誘導。ランキング計算式、APP_PLAYBACK 基準、タイブレーク、表示範囲、`displayContext` 3値固定、`GET /api/ranking` の契約は変えない前提を明記。
- docs-only。実装・UI LAB・本体画面・API・DB・migration・設定ファイル・実データ・動画ファイルの変更はなし。

---

## 2026-06-25 — lab: 分析画面の UI LAB 3案と比較レポートを追加

- `frontend/src/app/lab/analysis/` に分析ダッシュボードの比較用モック3案（A 概況ダッシュボード / B 期間推移・グラフ重視 / C 進捗・偏り・次アクション）を追加。索引ページ・3 Variant・寒色テーマ・匿名ダミーデータ・ローカル部品（AnalysisKpi / AnalysisCharts / AnalysisListCard）を実装し、`/lab` ハブに1エントリを追加。共有部品（LabFrame / ModernSidebar）は read-only 流用。チャートは既存 Recharts ＋依存なしの div バーで、**新規依存は追加していない**。
- スクショ付き比較レポート `frontend/src/app/lab/analysis/_review/COMPARISON.md`（＋ `_review/COMPARISON/` に3枚）を追加。推奨は案A ベース＋案C 導線、案B 詳細タブ（採用判断はユーザーレビュー待ち・未確定）。
- `docs/nextjs-ui-renovation-feedback.md` の分析エントリを「UI LAB あり（A/B/C）」へ更新し、`docs/nextjs-ui-renovation-master-memo.md` §3-B/§3-C に作成状況と次ステップ（全画面フィードバック一巡→Variant K 統合方針）を追記。
- モック専用で実 DB/API/localStorage 非接続。**本体画面（`/analysis` ほか）・API・DB・migration・集計SQL・実データは未変更**。KPI・グラフ・進捗・偏りは UI 確認用ダミーで、本体の分析ロジック・APP_PLAYBACK 計算・ランキング式は不変。保存場所は匿名化分類のみ（実名・実パスなし）。`npm run lint` / `npm run typecheck` / `npm run build` パス。

---

## 2026-06-25 — lab: ランキング・検索画面の UI LAB 3案と比較レポートを追加

- `frontend/src/app/lab/ranking/`（カードランキング A / テーブル B / 上位カード＋下位テーブル C）と `frontend/src/app/lab/search/`（現状改善 A / Tier1・Tier2カード整合 B / 高機能フィルタ C）を UI LAB に新規追加。各エリアに索引ページ・3 Variant・寒色テーマ・モックデータ・ローカル部品を実装し、`/lab` ハブに2エントリを追加。共有部品（LabFrame / ModernSidebar / ConsoleCard / LevelButtons）は read-only 流用し、足りない表現はエリア配下のローカル部品（RankingFilterBar / RankingRow / RankingTable・SearchFilterPanel / SearchResultCard）で新設。
- スクリーンショット付き比較レポート `frontend/src/app/lab/{ranking,search}/_review/COMPARISON.md`（＋ `_review/COMPARISON/` に各3枚）を追加。推奨はランキング=案C有力、検索=案A基線＋案B合流が有力（いずれも採用判断はユーザーレビュー待ち・未確定）。
- `docs/nextjs-ui-renovation-feedback.md` のランキング・検索エントリを「UI LAB あり（A/B/C）」へ更新（採用判断は未記入のまま）。
- モック専用で実 DB/API/localStorage 非接続。**本体画面（`/ranking`・`/search`・`VideoCard`・`store.ts`）・API・DB・migration・実データは未変更**。ランキングの順位・スコアは UI 確認用のダミーで、本体 APP_PLAYBACK 総合計算式・タイブレークは不変。検索結果は別状態として永続化しない。保存場所は匿名化分類のみ（実パス・実フォルダ名・実動画名なし）。`npm run lint` / `npm run typecheck` パス。

---

## 2026-06-25 — docs(ui): Next.js UI改修フィードバック記録を汎用名へリネーム＋作業フロー追記

- `docs/nextjs-ui-tier1-improvement-brief.md` を `docs/nextjs-ui-renovation-feedback.md` へリネームし、Tier1専用の実装指示書から UI改修全体（Tier1 / Tier2 / あとで見る / AVP / ランキング / 分析 / 検索 / 設定 / Runtime control の9画面）のフィードバック記録へ再構成。画面ごとに採用判断 / 未決事項 / 改善要望 / 不具合メモを残す枠組みを新設し、既存の Tier1 variant-k 実装指示は付録として原文のまま保持。旧ファイル名を参照する箇所はリポジトリ内に無く、リンク切れは発生しない。
- `docs/nextjs-ui-renovation-master-memo.md` に §3-C「今後の作業フロー」を追記。UI LAB → 全画面フィードバック一巡 → 全画面統合版 Variant K → 実DB匿名化サンプルDB → サンプルDB接続 Variant K 版 ClipBox → 本体統合、の手順と、実DB接続時は本体 ClipBox を停止し同一実DBへ同時書き込みしない並列運用の注意点を明記。
- docs-only。実装・React/CSS・API・DB・migration・設定ファイル・実データ・動画ファイルの変更はなし。動画名・パス・個人情報は記載しない。

---

## 2026-06-25 — docs(lab): AVP画面に案D（上下分割・候補=上 / 再生セット=下リッチカード）を追加

- ユーザー要望（上下分割を採るが候補一覧を上に、下の再生セットは他画面と同じ動画カードでレベル判定/いいね/あとで見るができるように）に応え、`frontend/src/app/lab/avp/variant-d/` を追加。上=候補一覧（再生対象を選ぶボタン操作中心の `AvpCard`）、下=再生セット最大4本を**本体 `VideoCard` の見た目・操作を複製したモックカード `AvpRichCard`** で表示。
- `AvpRichCard` は本体カードと同じ shadcn プリミティブ・操作配置（再生 / レベル `Select` / いいね / あとで見る / 再生対象＋外す）を持つが、`@/lib/api`・`@tanstack/react-query`・`useAvpStore` を **import せず**、操作はページ内 `useState`（`useAvpLibrary`）のみ＝実 DB/API/localStorage 非接続・保存しない。下の編集は上の候補バッジにも反映（単一ソース）。
- 比較レポート `frontend/src/app/lab/avp/_review/COMPARISON.md` を4案構成に更新し、案D 節・スクショ2枚（`avp-d-candidates-top-set-bottom` / `avp-d-rich-card`）・評価表 D 列・推奨/未決を追記。`/lab` ハブと AVP 索引、各 variant の切替リストに D を追加。
- モック専用で実 DB/API/localStorage 非接続。AVP候補/再生対象=localStorage、あとで見る=DB の境界は不変更。本体 `/avp`・`VideoCard`・`store.ts`・API・DB・migration・実データの変更はなし。案A/B/C も変更なし（docs/lab のみ）。

---

## 2026-06-24 — docs(lab): AVP画面の UI 改善案3案を UI LAB に追加

- `frontend/src/app/lab/avp/` に AVP（並列再生）画面の比較用モック3案（A 左右分割 / B 上下分割 / C タブ分離）を追加。候補プール管理と再生対象選択（最大4本）の見せ方を比較する。サムネなし情報カード＋4枠スロット表現で実装し、共有プリミティブ（`ModernSidebar` / `LabFrame` / `ConsoleKpi`）と寒色テーマを read-only 再利用。再生対象の4本上限・候補上限なし・候補/対象の cascade は `usePlayTargets`（ページ内ローカル）で本体 `store.ts` の挙動を再現。
- スクリーンショット付き比較レポートを `frontend/src/app/lab/avp/_review/COMPARISON.md`（＋ `COMPARISON/` 配下に画像5枚）として追加。推奨は「案A ベース＋将来 案C 補助」。`/lab` ハブに索引エントリを1件追加。
- モック専用で実 DB/API/localStorage 非接続。AVP候補/再生対象=localStorage、あとで見る=DB の境界は不変更。本体 `/avp`・`VideoCard`・`store.ts`・API・DB・migration・実データの変更はなし（docs/lab のみ）。

---

## 2026-06-24 — docs(lab): あとで見る画面の UI 改善案3案を UI LAB に追加

- `frontend/src/app/lab/watch-later/` に「あとで見る」画面の比較用モック3案（A 現行改善 / B 付与理由 / C 作業台）を追加。3セクション（未処理 / 確認・見直し / 処理済み候補）構成は維持し、サムネなし情報カードで実装。共有プリミティブ（`ModernSidebar` / `LabFrame` / `LevelButtons`）と寒色テーマを read-only 再利用。
- スクリーンショット付き比較レポートを `frontend/src/app/lab/watch-later/_review/COMPARISON.md`（＋ `COMPARISON/` 配下に画像）として追加。推奨は「案B ベース＋案C サマリー任意」。`/lab` ハブに索引エントリを1件追加。
- モック専用で実 DB/API/localStorage 非接続。あとで見る=DB / AVP候補=localStorage の境界は不変更。AVP再生で自動解除しない方針は将来方針の可視化のみで本体挙動は変更しない。本体 `/watch-later`・`VideoCard`・API・DB・migration・実データの変更はなし（docs/lab のみ）。

---

## 2026-06-23 — docs(ui): Next.js UI改修 Phase 0 方針を整理

- `docs/nextjs-ui-renovation-master-memo.md` に Phase 0 の決定事項と UI LAB 不足画面の比較対象を追記し、設定は scan-first 上部タブ版を主案、Runtime control はサイドバー下部維持として整理。
- Tier1 の `/tier1` 正規URL化（`/` は redirect）と、AVP再生であとで見るを自動解除しない採用方針を、未実装の次回実装方針として `SPEC_NEXTJS.md` / `API_SPEC.md` / `ACCEPTANCE_CRITERIA.md` / メモに追記。
- 実装、React/CSS、API、DB、migration、設定ファイル、実データの変更はなし（docs-only）。

---

## 2026-06-21 — docs(reports): ランキング公平化後の実データスモーク確認を記録

- Pull request #60〜#64 のランキング公平化後、ユーザーが実データでスモーク確認を完了し、旧視聴履歴 purge は dry-run のみ確認したことを、公開情報だけのレポート `docs/reports/RANKING_APP_PLAYBACK_POST_MERGE_SMOKE_20260621.md` として記録（`docs/reports/README.md` の入口にも追加）。
- purge `--execute` は未実行。実装・UI・API・DB スキーマ・migration・ランキング式・生履歴 API の変更はなし（docs-only）。動画名・パス・件数・順位・個人情報は記載しない。

---

## 2026-06-21 — fix: PR #60〜#62 のレビュー指摘を反映

- ランキングの完全同点時の最終キーを `id ASC` に固定し、ID降順の入力と`top_n`境界でも最小IDを選ぶテスト、`availability=利用不可のみ`のAPI回帰テストを追加。
- 旧視聴履歴purgeの確認文字列・サービス稼働・DELETE後rollback・一時ファイルcleanup失敗をテストし、元のバックアップ処理エラーとcleanup失敗を併記するよう改善。
- ランキング表示範囲の3値ラベルを型で網羅し、「全動画」でも論理削除済みを除外する説明Tooltipをキーボード・スクリーンリーダーから利用可能にした。同期対象の`BACKUP_DIR`に関する運用確認も追加。API・DBスキーマ・migration・生履歴APIの契約は変更なし。

---

## 2026-06-21 — docs(analysis): ランキング基準の意思決定サマリーを確定

- 既存の匿名集計と検討経緯を統合した `docs/analysis/ranking_basis_decision_summary.md` を追加し、APP_PLAYBACKのみの集計、検証付き手動purge、ランキングの「再生可能だけ / 全動画」切替が採用済みであることを明記。
- 分析当時の「旧履歴を削除しない」「FILE完全除外と重み下げは未決定」という前提は時点情報として残し、現在の正本仕様と区別した。分析値、DB、API、UI、migrationは変更なし。

---

## 2026-06-21 — feat: ランキングの表示範囲を明示化

- ランキング画面の「利用不可を含む」Switchを「再生可能だけ / 全動画」のSelectへ変更。既定は再生可能だけで、全動画では利用不可動画もスコア順を維持して表示する。
- 公開APIは既存の `availability=利用可能のみ|利用不可のみ|すべて` を維持し、既定値・利用不可を含む順位・論理削除除外をAPIテストで固定。

---

## 2026-06-21 — fix: 視聴集計を APP_PLAYBACK に統一し旧履歴purgeを追加

- カードの視聴回数・最終再生、一覧ソート、ランキング4種の視聴因子/同点順、あとで見る分類、運命の「最近見てない優先」、分析集計を `APP_PLAYBACK` のみに統一。生視聴履歴API、likes、判定履歴、再生詳細ログの契約は変更なし。
- 共通定数 `VIEWING_METHOD_APP_PLAYBACK` を追加し、集計SQL・記録SQLはmethodをパラメータで指定。
- `scripts/purge_legacy_viewing_history.py` を追加。既定dry-run、サービス停止と確認文字列を必須化し、排他ロック中の同一スナップショットからDB/CSVを作成して整合性・件数・SHA-256検証後に旧2methodだけを削除。`NULL`・未知methodは保持し、0件再実行はno-op。自動migration/API/VACUUMには組み込まない。
- 旧methodが各集計へ寄与しないこと、生履歴では取得できること、purgeの非変更/対象限定削除/再実行/失敗中止を回帰テストで固定。

---

## 2026-06-20 — docs(analysis): APP_PLAYBACK ベース総合ランキング移行の比較所見を追加

- 総合ランキングを「現行（FILE_ACCESS_DETECTED 込み）」と「APP_PLAYBACK のみ（FILE をスコア除外・履歴は削除しない）」で比較した所見を `docs/analysis/ranking_app_playback_comparison_findings.md` に追加（公開・集計のみ）。再生可能だけ／全動画の 2 スコープで Top-N 入替を比較し、availability（外付け HDD 未接続）による不可視化が独立した体感要因であることを整理。全動画スコープの Top50/Top100 入替（25/47）は先行分析 C4/C5 と一致し再現性を確認。
- 数値は実 DB の読み取り専用コピー（`mode=ro` + `query_only=ON`）から算出した整数集計のみ。動画名・パス・出演者・生 timestamp・匿名対応表は本文に不掲載。比較 HTML・CSV・コピー DB 等のローカル生成物は `docs/analysis/private/`（`.gitignore`）に保持し公開しない。
- `docs/analysis/README.md` の公開資料リストを最新化（本所見 ＋ 既存の `ranking_fairness_multifactor_next_actions.md` を追記）。
- 分析・所見のみ。ランキング式・API・UI・DB スキーマ・migration・実 DB の履歴データは変更なし（実 DB への書き込みもなし）。

---

## 2026-06-20 — chore: repository boundary guardrails を追加

- ルート整理後の構成が再び荒れないよう、構成境界を機械チェックする `scripts/check_repo_boundaries.py` を追加。検査は (1) 現行コードから `archive/legacy-code/` / `archive/streamlit/` を参照・import していないか、(2) 一時 Notebook・DB コピー（`.db`/`.sqlite`/`.sqlite3` 本体と `*.db-wal`/`*.db-shm`/`*.db-journal` 等の SQLite サイドカー）・調査ファイルが tracked に混入していないか、(3) `docs/context/` の現行正本が存在し旧概要 `PROJECT_OVERVIEW.md` が復活していないか、の3点。`--inventory` は未追跡・ignore 済みファイルの棚卸しを**件数のみ**で参考表示する（具体的なファイル名・パスは出さない＝動画名・個人情報の漏洩防止／非失敗）。
- GitHub Actions に専用ジョブ `Repository boundary guardrails`（`.github/workflows/ci.yml`）を追加。Pull request / `main` push 時に実行。標準ライブラリ + git のみで動くため pip install 不要。既存ジョブ（python / sensitive-data-check / frontend）は非変更。
- `docs/context/REPO_STRUCTURE.md` §6（構成境界の自動チェック）と `docs/context/AI_WORKFLOW.md`（§E ゲート行・§H 整理後チェック）に運用手順を追記。
- `streamlit` という単語自体の検出（ポート 8501 監視など現行仕様）は禁止しない。Public API、DB、migration、現行実装、UI 挙動、ランキング式、旧 Streamlit UI の配置は変更なし（起動確認もしない）。

---

## 2026-06-20 — chore: archive / docs 構成整理の最終化

- `archive/` 直下の旧設計・旧実装メモ（Markdown 23件）を `archive/legacy-docs/` へ集約し、`archive/legacy-docs/README.md` を新設。
- `archive/setup_db.py` / `archive/verify_setup.py` を `archive/legacy-code/setup/` へ移動し、`archive/legacy-code/README.md` と `archive/legacy-code/setup/README.md`（実行禁止注記つき）を新設。
- `docs/context/PROJECT_OVERVIEW.md` を `docs/archive/PROJECT_OVERVIEW_STREAMLIT.md` へ移動し、`docs/context/` を現行正本だけの場所に整理。現行正本の参照（AGENTS.md / CLAUDE.md / OVERVIEW.md / REPO_STRUCTURE.md / IMPLEMENTATION_GUIDE.md / PHASE5）を更新。
- `docs/reports/README.md`（レポートの読み方・分類・命名規則）と `docs/reports/REPO_ROOT_CLEANUP_SUMMARY_20260620.md`（ルート整理完了サマリ）を追加。
- 旧 Streamlit UI（`archive/streamlit/streamlit_app.py`）の DB 未検出時の案内表示を新パス `python archive/legacy-code/setup/setup_db.py` へ補正し、通常導線では使わない旨と実行注意（バックアップ・目的確認）を併記。過去レポート・歴史資料内の当時のパスは時点資料として残置。
- Public API、DB、migration、現行実装、UI 挙動、ランキング式、`archive/streamlit/` の配置は変更なし。

---

## 2026-06-20 — chore: 分析資料と依存ファイルの配置を統一

- 公開可能な分析 Markdown を `docs/analysis/` 直下に集約し、ローカル専用の Notebook・データ・コピー DB・出力との境界を README と `.gitignore` に明記。
- 公平化 Round 2 のローカル Notebook は出力を保持したまま ignore 対象の正規配置へ移し、ルート `notebooks/`、旧分析 Notebook、空の一時ファイルを削除。
- 開発用依存とローカル pin を `requirements/` 配下へ移し、guardrail セットアップと品質・構成ドキュメントの参照を更新。
- Public API、DB、migration、現行実装、UI 挙動は変更なし。

---

## 2026-06-20 — chore: 旧コード断片を legacy-code へ隔離

- Pull request #53 の導入判断に基づき、現行領域から参照されない旧 Python コード12件を `archive/legacy-code/` へ内容無変更で移動。
- `archive/setup_db.py` と `archive/verify_setup.py`、`archive/streamlit/`、既存の歴史資料は現配置を維持し、`archive/legacy-docs/` は未導入。
- Public API、DB、migration、現行実装、UI挙動は変更なし。

---

## 2026-06-19 — docs: ルート構成の表現補正と archive 参照監査

- `REPO_STRUCTURE.md` で `_ul`、`demo.html`、`video_analysis.ipynb` が `.gitignore` 対象の未追跡ローカルファイルであることを明記。
- `archive/` 直下の旧 Python コードと `unused_tabs/` を分類し、現行領域からの import・旧ファイル名参照がないこと、物理移動を見送る理由を監査レポートへ記録。ファイル移動・削除、実装・DB・設定の変更はなし。

---

## 2026-06-17 - chore: Streamlit 旧UIを archive へ移動し導線を一本化

- acceptance レポートの最新総合判定を、2026-06-17 の write-enabled 確認結果に合わせ `ready_for_streamlit_archive` に更新（残 skipped / 対象外は理由つきで明記）。
- Streamlit 旧UI（`streamlit_app.py` / `ui/` / `run_clipbox.bat`）を `archive/streamlit/` へ移動し、通常利用導線を Next.js + FastAPI に整理（削除はせず比較・退避用に保持）。
- README / OVERVIEW / PHASE5 / REPO_STRUCTURE / AGENTS / CLAUDE を archive 後の構成に更新。CI の `py_compile` 対象から移動済みファイルを除外。
- `archive/streamlit/run_clipbox.bat` をリポジトリルート基準 + `PYTHONPATH` で起動可能に補正（`streamlit_app.py` 本体は無改変）。
- Runtime 状態 lamp（ポート 8501 監視）は現行機能として維持。`core/` / `api/` / `frontend/` / `data/` / `artifacts/` は移動・変更なし。

---

## 2026-06-17 - fix: ランダム/運命カードの write 後表示を最新化

- ランダム/運命タブなど `invalidateKeys=[]` の動画カードで、レベル判定・選別戻し・いいね後にカード単体を `GET /api/videos/{id}` で再取得し、タイトル tooltip のファイル名、レベル、選別状態、あとで見る状態を最新化するように修正。
- 一覧 query の再取得や再抽選は発生させず、ランダム/運命カード上の表示だけを更新する挙動を維持。
- カード write 後に `/watch-later` 一覧キャッシュも無効化し、別画面での判定・選別・いいね後にあとで見る一覧が古く残る可能性を低減。
- 受け入れ確認レポートの対象ブランチ、Pull request 状態、最新総合判定を整理。
- Public API / schema / DB 永続先は変更なし。

---

## 2026-06-16 — docs: 安定化ドキュメントと archive 準備メモを同期

- README の移行ステータスに `/watch-later` を追加し、未処理 / 確認・見直し / 処理済み候補と一括解除まで完了済みとして整理。
- `docs/context/ACCEPTANCE_CRITERIA.md` に、あとで見る、Tier2、共通動画カード、`/stats/last-viewed` 失敗時の受け入れ観点を追記。
- Turbopack の workspace root 誤検知対策は既存実装（ルート `package-lock.json` の ignore と `run_dev.bat` ガード）を確認済み。`.gitignore` / `run_dev.bat` / lockfile は変更なし。
- `docs/reports/PHASE5_STREAMLIT_ARCHIVE_PREP_20260616.md` を追加し、Streamlit archive 前の確認条件、書き込み確認、DBバックアップ、同時書き込み回避、今回は移動しない対象を整理。
- `docs/reports/REPO_ROOT_INVENTORY_20260616.md` を追加し、ルート直下の active / legacy-active / legacy / generated / local-only を棚卸し。
- CHANGELOG の記載方針を追加し、詳細な調査記録やレビュー記録を CHANGELOG に膨らませない運用を明記。
- 受け入れ基準と棚卸しメモの表現を、現行の運命の1本・Tier2状態表示・分析 notebook 扱いに合わせて補正。

---

## 2026-06-15 — fix: 「あとで見る」ボタンの反映不安定・画面ジャンプを修正

- 症状: カードの「あとで見る」を押してもボタン色が変わらない／`/watch-later` に出ない／反映時に画面が一瞬スケルトンへ飛ぶ／失敗してもエラーが無音。
- 原因はすべてフロント `frontend/src/components/VideoCard.tsx`。バックエンド（`toggle_watch_later`）は新値を確実に返しており変更なし。
  1. ボタンの見た目が `video.watch_later` prop のみに依存。ランダム/運命など `invalidateKeys=[]` の画面はリスト refetch しないため prop が更新されず色が変わらなかった → ローカル state `localWatchLater` を追加し、toggle 応答の `watch_later` で即時反映。
  2. 共通 `invalidate()` が `["watch-later-videos"]` を無効化していなかった → `watchLaterM` を専用 `onSettled` に変更し、toggle のたびに `/watch-later` のキャッシュを無効化。
  3. 画面ジャンプは toggle が list query を refetch し、Tier2/ランキングが `isLoading || isFetching` でスケルトン化していたため。あとで見るは `/watch-later` 以外の表示集合を変えないので、共通 `invalidate()`（list キー refetch）を呼ばないよう切り離して解消。
  4. error 集約に `watchLaterM.error` を追加し、API 失敗をカード上に表示。
- 設計境界は不変: 「あとで見る＝DB永続」「ランダム/運命は再抽選しない」。変更は `VideoCard.tsx` 1ファイル。

---

## 2026-06-15 — fix: Turbopack ルート誤検知によるアプリ表示不可を修正

- `ClipBox/` 直下に `package-lock.json` が残っていると Turbopack がワークスペースルートを `frontend/` でなくプロジェクト直下と誤認し、`data/videos.db` 等の書き込みのたびに全コンポーネントを再コンパイルして HTTP リクエストが数分間ハングしていた。
- `.gitignore` に `/package-lock.json`（先頭スラッシュ付き、ルート限定）を追加。`frontend/package-lock.json` には影響しない。
- `run_dev.bat` の起動時に `%ROOT%package-lock.json` が存在したら警告メッセージとともに自動削除するガードを追加。

---

## 2026-06-14 — fix(lab): UIラボのモバイル幅プレビューを補正

- `/lab` 配下の共通フレームで Variant 切替リンクを折り返し可能にし、狭幅でラベルが縦に潰れないようにした。
- ラボ内のモックサイドバー（`MockSidebar` / `ModernSidebar`）は `lg` 未満で非表示にし、本体サイドバーと二重表示になって本文幅が不足する問題を解消。
- カードグリッドと KPI バーは狭幅で1列から始め、`sm` / `md` 以降で列数を戻すように調整。
- 本体導線・実 API/DB/localStorage・モックデータ・既存本体画面の仕様は変更なし。

---

## 2026-06-14 — feat(lab): 設定画面 Variant J（設定コンソール）追加

**設定メニューをライブラリ J と同テイストで再設計**（モック専用・本体無変更）: `/lab/settings/variant-j`。
- 現行の素朴な縦積み（ライブラリ/動画カード表示/再生/DB ＋下部アクション）を、**左カテゴリレール＋右フォーム**に再編。
  カテゴリ: 基本設定／ライブラリ・パス／スキャン／表示・カード／AVP・再生／バックアップ／Runtime・サーバー／危険操作。
- **現行機能は全維持**（ライブラリルート/セレクションフォルダ/デフォルトプレイヤー/AVPパス/DBパス読取専用/カード表示4トグル/
  保存・再読込・バックアップ・セレクションスキャン・**ライブラリスキャン＝セッション内バックアップ必須ガード**・amber警告）。
- **状態サマリーを ConsoleKpi** で（動画数/最終スキャン/最終バックアップ/設定更新日時）。helper text と確認ダイアログを重視。
- **UI 検討（現行機能なし or 別所在）を明記して追加**: バックアップ履歴/スキャン履歴テーブル、表示密度・既定表示モード、
  Runtime・サーバー（現行は SidebarNav に実在＝3層の状態ランプ＋停止）、危険操作 danger zone（リセット/キャッシュ削除）。
- **共有部品3つを新設**（`lab/_components/`）: `SettingsSection`／`SettingsField`（＋`LabBadge`）／`DangerRow`。
  設定モックは `lab/_data/settingsMock.ts`（合成パス・履歴・Runtime状態。決定論的）。`ConsoleKpi`/`ModernSidebar`/`LabFrame` は read-only 再利用。
- 索引 `lab/settings/page.tsx` と `_review/COMPARISON_J.md`＋`SETTINGS_REFERENCE_RESEARCH.md`（参考サイト厳選）を追加。`/lab` ハブに設定エリアを追記。
  実 DB/API/localStorage 非接続・サムネ無し・寒色 THEME 流用。`npm run typecheck`／`lint` クリーン。

## 2026-06-14 — feat(lab): Tier1「ランダム」「運命の1本」Variant J 追加

**ライブラリ J と同テイストで Tier1 残り2タブの UI 案をラボ化**（モック専用・本体無変更）:
- **ランダム** `/lab/tier1-random/variant-j`: タブ左強調＋右クラスタに **本数（5/10/15/20）・シャッフル・条件 Popover**
  （未判定を優先/レベル/保存先/再生可のみ/あとで見るを含める）。候補は**ライブラリと同一カード**＋右上に **個別入れ替え（↻）**。
  「引く（シャッフル）／入れ替える／判定する」の主導線を前面化。乱数不使用＝トークン回転で決定論的（ハイドレーション安全）。
- **運命の1本** `/lab/tier1-fate/variant-j`: 右に **「最近見てない優先」トグル・運命の1本を引く・クリア**。
  主役カードは**控えめな特別感**（上端アクセント帯＋淡い ring・「今日の運命」見出し・**選出理由**チップ）。
  隣に **選出理由/最近見ていない候補** の補助パネル、下に **「前回引いた1本」＋保持キャプション**（画面遷移で消えない想定をモック表現）。
- **共有部品3つを新設**（`lab/_components/`）: `ConsoleCard`（J カードの抽出・`featured`/`corner`/`footer` スロット）、
  `ConsoleKpi`（簡略 KPI・セル可変＋バー/スパークライン）、`Tier1AreaTabs`（ライブラリ/ランダム/運命の1本＝エリア間リンク）。
- **`LabFrame` を後方互換で一般化**（`variants`/`indexHref`/`indexLabel` を追加・既定は現行と完全同一）。既存 A〜J は無変更で動作確認済み。
- 各エリアに**索引ページ**（`tier1-random/page.tsx`・`tier1-fate/page.tsx`）と **`_review/COMPARISON_J.md` ＋ `COMPARISON_J/`（画像）** を追加。
  `/lab` ハブに2エリアを追記。実 DB/API/localStorage 非接続・サムネ無し・寒色 THEME 流用。`npm run typecheck`／`lint` クリーン。

## 2026-06-14 — feat(lab): add Variant J（ライブラリ・コンソール＝最終統合）

**G/I/H のレビューを反映した最終統合案** `/lab/tier1-library/variant-j`（G 主軸＋I をモード内包＋H の chip 概念）:
- **KPI**: 配置は G 踏襲のまま、**判定率＝数値の右に横バー**／**本日の判定＝数値の右に直近30日の折れ線（スパークライン）**／高さを少し縮小。
- **ツールバー（1段）**: **タブを左に分離・強調**（セグメント塗り）。右クラスタは
  **検索＝虫眼鏡アイコンのみ（Popover で入力）**／**フィルタ＝漏斗→Popover**（レベル/保存先/状態の chip＋再生可＋**「判定済みを薄くする」トグル**・有効数バッジ）／
  **並び替え＝2段 Popover（項目＋昇順/降順・日本語）**／**カード⇄テーブルの表示モード切替**。あとで見るフィルタは廃止。
- **カード**: 高さを圧縮（縦に詰める）。判定済み/利用不可を**しっかり薄く**（opacity≈45、判定済みはトグル連動）。
  **あとで見るボタンと AVP ボタンを同サイズ**（等幅）・**あとで見る→「あとで」ラベル**。
- **テーブルモード**: I 相当の高機能テーブル（9列・行選択・行内レベル・行メニュー・ページネーション）を**ライブラリの表示モードとして内包**。薄表示は両モードに反映。
- 実装: `variant-j/`（`page.tsx`＋`shared.ts`＋`JKpiBar`/`JToolbar`/`JContent`）。**共有 Modern\* と A〜I は無変更**で `ModernSidebar`/`LevelButtons`/`useMockCard`/`labMock` を read-only 再利用。
  フィルタ/ソート/表示モード/薄表示は**コンポーネント内ローカル state**（DB/API/localStorage 非接続・サムネ無し・寒色）。
- `LabFrame` の切替に J を追加、索引（`/lab/tier1-library`）に J カードを追加（I/H 単体も継続展示）。

## 2026-06-14 — chore(lab): tier1-library にスコープ化 + _review を再編

**UIラボを機能スコープで整理**（今は Tier1 ライブラリタブのみ／今後の他タブ追加に備える）:
- ルートを移動: `lab/variant-{a..i}/` → **`lab/tier1-library/variant-{a..i}/`**。
  URL は `/lab/tier1-library/variant-x` に変更（旧 `/lab/variant-x` は廃止）。
- 索引を2層化: `/lab` を**探索エリアのハブ**に作り替え、Variant カード一覧は `/lab/tier1-library`（旧 `/lab` の内容を移植）。
- `_review/` を **`tier1-library/_review/` 配下**へ移動し再編。方針＝**md は直下に平置き＋同名フォルダに参照画像を格納**:
  - `COMPARISON_A-F.md` ＋ `COMPARISON_A-F/`（A〜F フル6枚）
  - `COMPARISON_G-I-H.md` ＋ `COMPARISON_G-I-H/`（G/I/H フル3＋切り抜き9）
  - `MODERN_UI_DESIGN_BRIEF.md` ＋ `MODERN_UI_DESIGN_BRIEF/`（参考10＋切り抜き15＋brief参照のA〜F複製6）
  - 日付サフィックスを除去してリネーム、旧 `_review/modern/` は廃止。md 内の画像/URL リンクを全て追従修正。
- 共有部品 `_components/`・`_data/labMock.ts` は **lab/ 直下のまま**（全タブで再利用）。本体・各 Variant の UI 実装内容は無変更。

## 2026-06-14 — feat(lab): add Variant G / I / H (Modern, dense, cool)

**A〜Fのユーザー評価を反映したモダン3案を追加**（寒色・高密度・横長カード）:
- `/lab/variant-g`（Modern Console・本命）: 目立つKPI（判定率バー）＋**タブとフィルタを1段に統合**＋
  D流カード（**数値レベルボタン**/再生/その他の3グループ）。判定済みは薄く。
- `/lab/variant-i`（Data Table Console）: 一覧を高機能テーブル化（行選択・**行内 数値レベル**・行メニュー(Popover)・
  ページネーション・数値右寄せ・判定済み行は薄く）。`table`プリミティブ無のため semantic `<table>`。
- `/lab/variant-h`（Library / Bookmark）: **ヒーロー検索**＋フィルタchip＋compact KPI＋高密度カード（"探す"志向）。
- 反映したフィードバック: 縦に詰めた短いカード・文字小さめ高密度・**5列固定**・**寒色のみ**・タブ/フィルタ1段・
  レベルは数値ボタンの単一表現（バッジ/濃淡ドットの重複を廃止）・**未判定の色付けはやめ判定済みを薄く**・
  KPIの判定率はバー可視化で同一段に集約。
- 新規共有部品: `_components/`（`ModernSidebar`/`ModernToolbar`/`LevelButtons`/`KpiBar`/`ModernCard`）。
  既存 `MockSidebar`/`MockFilterBar`/`useMockCard`/`labMock` は無変更で reuse。
- `LabFrame` の切替を A〜I に拡張、`/lab` 索引に G/I/H を追加（A〜F は無変更）。
- 制約遵守: サムネ/画像枠なし・実DB/API/localStorage 非接続・本体と A〜F 無変更・重複バッジなし・
  AVPはチェックボックス・運命の1本はTier1タブのまま・サイドバー7項目維持（見出しでグルーピングのみ）。
- 確認: `npm run typecheck`/`lint` パス。G/I/H とも HTTP 200・`<img>`0・横スクロール無・G/H=5列・I=テーブル9列15行・
  レベル数値ボタン群15・AVPチェックボックス・A〜F 回帰なし。

---

## 2026-06-14 — chore(lab): add Variant F (doc recommended baseline)

**参考ドック「ClipBox UI方向性 検討」の推奨案を再現した Variant F を追加**:
- `/lab/variant-f`（推奨ベースライン・デザイン寄り堅実版）: ドックの「案B 標準改善（推奨ベースライン）」を再現。
  暖色ペーパー（ストーン/トープ）＋純黒抑制のインクグレー＋**インディゴ・アクセント(#4f46e5)**。
  タイトル主役・**メタ1行ミュート**（同系色レベルドット付き）・日付ラベル（最終再生/更新）・**アクション分離**・
  統計は**コンパクトなサマリーバー**に集約。AVP のツールチップはドック準拠の「AVPで再生する候補に追加」。
- 共有 `_components/LabFrame.tsx` の切替を A〜F の6つに拡張、`/lab` 索引にも F カードを追加（A〜E は無変更）。
- 制約遵守: サムネ/画像枠/16:9 なし・実DB/API/localStorage 非接続・本体画面と既存 Variant は無変更・
  状態の重複バッジなし（レベルはプルダウン、AVP はチェックボックスのみ）・運命の1本は Tier1 タブのまま。
- 参考HTML内のモックに実在作品タイトルが含まれていたが、規約によりラボへは持ち込まず合成プレースホルダのまま。
- 確認: `npm run typecheck` / `npm run lint` パス。7 ルートとも HTTP 200・ラボ発の API 呼び出しなし。

---

## 2026-06-14 — chore(lab): add Variant D / E (aggressive variants)

**UIラボに本体から大きく離れた2案を追加**（A/B/C が本体に近すぎたため、レイアウト/カード形/操作設計を大胆に変更）:
- `/lab/variant-d`（判定ワークベンチ・UX戦略寄り）: 統計を「未判定→0 への進捗バー」に再構成。
  レベルを**カード上の大セグメント（未/0/1/2/3/4）**で1クリック判定。**ステータス・レーン**で判定状態を色分け
  （未判定=注意色で前面化 / 判定済み=レベル色の左帯 / 利用不可=グレー＋斜線）。
- `/lab/variant-e`（ボールド・エディトリアル・デザイン寄り）: 暖色テラコッタ1アクセント・純黒抑制・角丸大・柔らかい影。
  雑誌風タイポ階層（見出しはシステム明朝/セリフのフォールバックで表情付け・英字小ラベルは大文字トラッキング）。
  カード上端に**レベル色の無地カラーバンド**（暖色1色スケール／画像枠ではない）。
- 共有 `_components/LabFrame.tsx` の切替を A〜E の5つに拡張、`/lab` 索引にも D/E カードを追加（A/B/C は無変更）。
- 制約遵守: サムネ/画像枠/16:9 なし・実DB/API/localStorage 非接続・本体画面と A/B/C は無変更・状態の重複バッジなし・
  運命の1本は Tier1 タブのまま・サイドバー項目据え置き。
- 確認: `npm run typecheck` / `npm run lint` パス。6 ルートとも HTTP 200・ラボ発の API 呼び出しなし。
  ※A〜E の本格比較・スクショ比較は次ステップで実施。

---

## 2026-06-14 — chore(lab): add UI lab for card-design comparison

**UIラボ（モック専用・本体非影響）を追加**:
- `frontend/src/app/lab/` 配下に新ルートを追加。URL 直打ち専用（本体ナビからはリンクしない）。
  - `/lab`（索引）, `/lab/variant-a`（現行寄せ）, `/lab/variant-b`（暖色ニュートラル）, `/lab/variant-c`（高密度）。
- 動画カードはサムネなしの情報カード方式。3案で 色・余白・統計・密度・カード構成 を見比べる。
- 各 Variant は **ルート div の CSS 変数上書き**でテーマを分離（`globals.css` は変更しない）。
- 共通部品: `_components/`（LabFrame / MockSidebar / MockFilterBar / useMockCard）, `_data/labMock.ts`。

**設計制約（厳守済み）**:
- 実 DB / API / localStorage に一切接続しない（モック固定データとローカル state のみ）。
- 既存ファイルは無変更（`layout.tsx` / `globals.css` / `SidebarNav.tsx` / 各 page・component）。
- モックのファイル名は合成プレースホルダのみ（実タイトルを置かない）。
- 確認: `npm run typecheck` / `npm run lint` パス。4 ルートとも HTTP 200・ラボ発の API 呼び出しなし。

---

## 2026-06-13 - fix: watch-later review follow-ups

**あとで見る専用ページのレビュー指摘対応**:
- `/watch-later` の処理済み候補分類で `/stats/last-viewed` の取得失敗を空データ扱いせず、エラー表示と取得中保留を行うようにした。
- AVP 起動後に `watch_later` が自動解除される場合に備え、AVP 画面から `watch-later-videos` / `videos` / `selection-videos` も invalidate するようにした。
- 一括解除ダイアログの過去エラーを開閉時にリセットし、一括解除 SQL を SQLite 変数上限に合わせてチャンク処理するようにした。

---

## 2026-06-13 — feat: auto-clear processed watch-later items

**処理済み動画のあとで見る自動解除**:
- `like_service.add_like()` で、いいね追加成功と同一トランザクション内に処理済み動画の `watch_later` を解除。
- `app_service.record_avp_viewing()` で、AVP 起動成功後の視聴履歴記録と同一トランザクション内に処理済み動画の `watch_later` を解除。
- 通常再生 `play_video()` は変更せず、通常再生だけでは解除しない挙動を維持。
- `needs_selection=1` の Tier2 未選別は、レベル値が 0..4 でも自動解除対象外にした。

**処理済み候補と一括解除**:
- `/watch-later` の「処理済み候補」を、処理済み状態かつ `/stats/last-viewed` に最終再生日がある動画として表示。
- `POST /api/videos/watch-later/bulk-clear` を追加し、指定 ID の `watch_later` を一括解除できるようにした。
- 空配列、重複ID、0以下のID、存在しないID、削除済みIDは安全に無視する。

**テスト・docs**:
- 判定/選別完了、いいね、AVP起動、通常再生、一括解除の watch_later 条件を API テストで追加。
- `SPEC_NEXTJS.md` / `API_SPEC.md` / `GLOSSARY.md` / `ACCEPTANCE_CRITERIA.md` を更新。

**変更なし**:
- DB スキーマ、migration、watch_later の永続先、AVP候補/再生対象の localStorage 境界は変更なし。

---

## 2026-06-13 — feat: add watch-later page foundation

**あとで見る専用ページの土台追加**:
- Next.js に `/watch-later` ページを追加し、`GET /api/videos?watch_later=true` の既存 API で対象動画を全ページ取得するようにした。
- 表示を「未処理」「確認・見直し」「処理済み候補」の3セクションに分割。
  PR A では処理済み候補は空枠のみで、最終再生日に基づく抽出と一括解除は後続 PR の対象。
- 各カードは既存 `VideoCard` を再利用し、再生・レベル変更・いいね・AVP候補・あとで見る解除の既存操作を維持。
- `SidebarNav` に「あとで見る」を追加し、手動解除後は `["watch-later-videos"]` を invalidate して一覧から外れるようにした。

**ドキュメント更新**:
- `SPEC_NEXTJS.md` / `GLOSSARY.md` / `ACCEPTANCE_CRITERIA.md` に専用ページの分類と PR A の範囲を追記。

**変更なし**:
- 新規 API、DB スキーマ、migration、あとで見るの永続先変更はなし。

---

## 2026-06-13 — docs: GLOSSARY 用語集の現行化と API_SPEC 矛盾修正

**用語集の現行化**:
- `docs/context/GLOSSARY.md` を Next.js + FastAPI 版の用語正本として更新。
- セレクションを `selection_folder` 配下の未選別 `!` / 選別済み `+` を含む概念として整理。
- Tier2 ドロップダウン（`未選別 / Lv0..Lv4`）、`PUT /api/videos/{id}/unselect`、`未判定` を Tier2 選択肢に出さない点を明記。
- `viewing_history` と `play_history`、`is_judged` 派生値、last-viewed、カード表示設定、AVP localStorage/sessionStorage 境界、`displayContext`、Runtime control などを補足。

**API_SPEC の明確な矛盾修正**:
- `POST /api/avp/play` の副作用を現行実装へ合わせ、AVP 起動成功後に `viewing_history(APP_PLAYBACK)` を記録し、`play_history` は記録しないことを明記。
- `GET /api/config` のレスポンス例に `card_show_*` / `card_title_max_length` を反映し、`card_show_score` は廃止済み互換キーとして整理。

**変更なし**:
- docs-only。コード・API・DB の挙動変更なし。

---

## 2026-06-13 — fix: code review findings 1〜5（feature/tier2-display-card-settings フォローアップ）

**Finding 1 — AVP 再生後の invalidate 漏れ**:
- `avp/page.tsx` の `launchMutation` に `onSettled` を追加。`view-counts` / `last-viewed` を invalidate するようにした。

**Finding 2 — API_SPEC.md 未記載エンドポイント・設定フィールド**:
- `docs/context/API_SPEC.md` に `PUT /api/videos/{id}/unselect` セクションを追加。
- `PUT /api/config` のリクエストボディ説明に `card_show_*` / `card_title_max_length` を追記。

**Finding 3 — `unselect_video()` ファイル不在時に `is_available=0` を立てない**:
- `core/video_manager.py` の `unselect_video()` にて、ファイル不在時に `is_available = 0` を更新するよう修正。
  `play_video()` / `set_favorite_level_with_rename()` と同じパターンに統一。API 層が 409 を返せるようになった。

**Finding 4 — SPEC_NEXTJS.md のデフォルト値誤記**:
- `docs/context/SPEC_NEXTJS.md` §10 の `card_show_file_size` / `card_show_last_viewed` デフォルトを `true` → `false` に修正（実装と一致）。

**Finding 5 — Tier2 ドロップダウンで `!` 付き動画が「未判定」表示**:
- `VideoCard.tsx` の `isTier2Unselected` 判定に `|| displayLevel === -1` を追加。
  `needs_selection=true` の場合のみならず、DB 不整合等で `level=-1` の Tier2 動画も「未選別」と表示する。

**変更ファイル**: `core/video_manager.py`, `frontend/src/app/avp/page.tsx`, `frontend/src/components/VideoCard.tsx`, `docs/context/SPEC_NEXTJS.md`, `docs/context/API_SPEC.md`

---

## 2026-06-13 — fix: tier2 unselect action and last-viewed propagation（Pull request #40 フォローアップ）

**Tier2「未選別に戻す」機能追加**:
- `PUT /api/videos/{id}/unselect` エンドポイント追加（`api/actions.py`）。
- `app_service.unselect_video()` → `VideoManager.unselect_video()` でファイルを `!{level_prefix}{essential_filename}` にリネームし `needs_selection=1, is_selection_completed=0` を更新。レベル値は変更しない。
- Tier2 ドロップダウンの選択肢を「未選別 / Lv0..Lv4」に変更（「未判定」(-1) は除外）。「未選別」選択で `unselectM.mutate()`、Lv0..Lv4 選択で `levelM.mutate()` を呼ぶ。
- `VideoCard` に `localNeedsSelection` ローカル state を追加。ランダム/運命カードがリスト再フェッチしなくても選別操作の結果を即時反映する。

**`last-viewed` invalidate 修正**:
- `usePlayVideo.ts` の `onSettled` に `qc.invalidateQueries({ queryKey: ["last-viewed"] })` を追加。再生直後に最終再生日バッジが更新されるようになった。

**AVP ページへの `lastViewed` 追加**:
- `avp/page.tsx` に `getLastViewed` クエリを追加し `VideoCard` に `lastViewed` prop を渡すよう修正。AVP 画面でも最終再生日バッジが表示される。

**テスト追加**:
- `tests/test_video_manager.py` に `unselect_video` 向け3テスト追加（正常リネーム / level=-1 のみ! / ファイル不在エラー）。

**ドキュメント更新**:
- `docs/context/SPEC_NEXTJS.md`: AVP候補チェックボックスが Tier2 でも表示される旨を更新。未選別/選別済みバッジ廃止と Tier2 ドロップダウン仕様（`PUT /unselect`）を追記。`card_show_*` 設定セクション（§10）を新規追加。セクション番号を繰り下げ調整。

**変更ファイル**: `core/video_manager.py`, `core/app_service.py`, `api/actions.py`, `frontend/src/lib/api.ts`, `frontend/src/components/VideoCard.tsx`, `frontend/src/lib/usePlayVideo.ts`, `frontend/src/app/avp/page.tsx`, `tests/test_video_manager.py`, `docs/context/SPEC_NEXTJS.md`

---

## 2026-06-13 — chore: card UX adjustments 2（Pull request #40 追加修正）

**Tier2 AVP チェックボックス追加**:
- Tier2 カードにも AVP 候補チェックボックスを表示するよう修正（条件を `displayContext !== "avp"` のみに緩和）。

**スコアバッジ廃止**:
- VideoCard から `score` prop とスコアバッジ表示ブロックを削除。
- `useCardSettings` の `CardSettings` インターフェースと `DEFAULTS` から `card_show_score` を削除。
- 設定画面の「動画カード表示」から「スコアを表示」トグルを削除（関連 state / computed も除去）。
- ランキングページの `<VideoCard score={item.score} />` を削除。

**設定 UI 整理**:
- 設定画面の「タイトル最大文字数（0 = 制限なし）」入力欄を削除（バックエンド層・VideoCard ロジックは保持）。

**変更ファイル**: `frontend/src/components/VideoCard.tsx`, `frontend/src/lib/useCardSettings.ts`, `frontend/src/app/settings/page.tsx`, `frontend/src/app/ranking/page.tsx`

---

## 2026-06-13 — chore: card UX adjustments（Pull request #40 追加修正）

**バッジ整理・tooltip・AVPチェックボックス移動**:
- Tier2「選別済み」バッジを削除（プルダウンで状態が分かるため冗長）
- スコアバッジ表示条件を `score != null` に修正（`null` / `undefined` 両方ガード）
- 主要バッジに説明 tooltip を追加（ストレージ / 視聴回数 / ファイルサイズ / 最終再生日 / スコア / ファイル更新日 / レベル / 利用不可）
- AVP候補チェックボックスを独立行からバッジ行の先頭へ移動（縦スペース削減）
- `TBadge` ヘルパーコンポーネントを `VideoCard.tsx` 内に追加

**変更ファイル**: `frontend/src/components/VideoCard.tsx`, `CHANGELOG.md`

---

## 2026-06-13 — feat: align tier2 pending display and add card display settings

**Tier2未選別表示の整合**:
- `!###_` のような `!` プレフィックス付き動画（`needs_selection=true`）でレベルバッジと「未選別」バッジが二重表示されていた不具合を修正。
- `isTier2Unselected = displayContext === "tier2" && video.needs_selection` を導入し、レベルに依らず Tier2 未選別はドロップダウンに「未選別」を表示するよう統一。
- 重複していた「未選別」バッジを削除（ドロップダウンで既に示すため）。

**動画カード表示設定**:
- 設定画面に「動画カード表示」セクションを追加（ストレージ / ファイルサイズ / 最終再生日 / スコア / ファイル更新日 の ON/OFF スイッチ + タイトル最大文字数）。
- `user_config.json` に `card_show_*` / `card_title_max_length` フィールドを追加。既存設定ファイルがない場合はデフォルト（現行表示に合わせた ON/OFF）を使用。
- VideoCard にタイトルの tooltip（ホバーで実ファイル名を表示）と AVP チェックボックスの tooltip（「AVPで再生する候補に追加」）を追加。
- `useCardSettings` フック新規作成（`["config"]` キャッシュ共有で複数カード間でリクエスト1回）。
- VideoGrid に `lastViewed` クエリを追加。
- ランキングページから `score` を VideoCard に渡すよう修正。

**変更ファイル**: `api/schemas.py`, `core/config_utils.py`, `frontend/src/lib/types.ts`, `frontend/src/lib/useCardSettings.ts`（新規）, `frontend/src/components/VideoCard.tsx`, `frontend/src/components/VideoGrid.tsx`, `frontend/src/app/settings/page.tsx`, `frontend/src/app/ranking/page.tsx`

---

## 2026-06-12 — feat: improve fate pick state and playback UX

- 再生ボタンの「サーバー機でプレイヤーが起動します」tooltip を削除。
- Tier1/Tier2 の運命の1本を `sessionStorage`（`clipbox-fate-picks`）に別スロット保持し、復元時は `by-ids` で再取得。不整合時は該当スロットのみクリア。復元表示では自動再生しない。
- Fate タブに Tier1/Tier2 個別の「最近見てない優先」トグルを追加。値は `user_config.json` の hidden fields に保存し、設定画面には表示しない。
- Fate API に `recently_unwatched_priority` を追加。OFF は純ランダム、ON は `weight = 1 + days / 90`（0..180日丸め、未再生は最大重み）で抽選。
- 対象外: DB スキーマ、migration、AVP 上限、あとで見る自動解除条件、総合スコア式、設定画面の表示項目。

---

## 2026-06-12 — ci: add baseline quality gates

**目的**: Pull Request と `main` push で最低限の自動品質ゲートを実行し、Python / backend API / Next.js build の回帰を早期検知する。

**新規**:
- **`.github/workflows/ci.yml`**: GitHub Actions の baseline CI を追加。Python 3.11 で `requirements.txt` をインストールし、`py_compile` と `python -m pytest` を実行。Node.js 20 で `frontend/package-lock.json` を使って `npm ci`、`npm run build` を実行。

**更新**:
- **`docs/context/TESTING.md`**: CI で確認する範囲、Windows ローカルで確認する範囲、Next.js 画面確認は引き続き `ACCEPTANCE_CRITERIA.md` を使うことを追記。
- **`docs/context/AI_WORKFLOW.md`**: PR 前確認として GitHub Actions baseline CI の通過確認を追記。

**変更なし**:
- アプリ仕様、API、DB スキーマ、package の大幅更新、lint 導入、実データ追加は行わない。

---

## 2026-06-12 — chore: archive ディレクトリの扱いを明文化（挙動ゼロ変更）

**目的**: ルート `archive/` と `docs/archive/` を現行仕様の正本と誤認しないよう、読み方・禁止事項・今後の物理整理条件を明文化する。

**新規**:
- **`archive/README.md`**: ルート `archive/` は実行対象ではなく、歴史資料・旧コード断片の保管場所であることを明記。`archive/*.py` の再利用前に import 参照、仕様差分、テスト、DB バックアップ要否を確認する方針を追加。
- **`docs/archive/README.md`**: `docs/archive/` は移行作業・過去設計の記録であり、現行正本ではないことを明記。現行正本は `docs/context/` を参照する導線を追加。

**更新**:
- **`docs/context/REPO_STRUCTURE.md`**: 2つの README の役割、今回 `archive/*.py` / 古い Markdown を物理移動しない理由、将来 `legacy-code/` / `legacy-docs/` に分ける場合は参照更新を伴う別 PR にする方針を追記。

**変更なし**:
- 物理移動なし。`archive/*.py`、`archive/*.md`、Streamlit 関連 active files（`streamlit_app.py` / `ui/` / `run_clipbox.bat`）は触れない。
- UI挙動、API仕様、DBスキーマ、Next.js / FastAPI / Streamlit 実行コードには触れない。

> 検証: docs/README のみ。参照検索、`git diff --check`、Python 構文チェック、`python -m pytest`、`cd frontend && npm run build` を実行。

---

## 2026-06-11 — docs/chore: repo hygiene と Phase 5 archive 入口の明確化（挙動ゼロ変更）

**目的**: Next.js + FastAPI 移行後のリポジトリ整理を、巨大PRにせず段階的に進めるため、ルート構成・Phase 5 条件・ドキュメント正本入口・検証ゲートを明確化する。

**新規**:
- **`docs/context/REPO_STRUCTURE.md`**: ルート直下の active / legacy-active / legacy / generated / local-only 分類、`archive/` と `docs/archive/` の違い、今後の整理ルールを明文化。
- **`docs/context/PHASE5_STREAMLIT_ARCHIVE.md`**: Streamlit 旧 UI を即削除せず、全画面受け入れ完了後に archive へ移すための前提条件・移動候補・禁止事項を明文化。

**更新**:
- **`README.md`**: Next.js が現行 UI、FastAPI が API、Streamlit が旧 UI であること、各起動バッチの役割、Phase 5 は archive 条件付きであることを整理。
- **`frontend/README.md`**: create-next-app 初期説明を ClipBox 専用の Next.js 現行 UI 説明へ置換。
- **`docs/context/OVERVIEW.md`**: `REPO_STRUCTURE.md` / `PHASE5_STREAMLIT_ARCHIVE.md` への導線を追加。
- **`docs/context/AI_WORKFLOW.md`**: docs only / repo structure cleanup / frontend / backend/API / Phase 5 archive / CI/test workflow の読む順を追加。
- **`docs/context/TESTING.md`**: repo整理・docs-only・CI変更・Python構文・frontend build の確認コマンドを明記。
- **`docs/context/ACCEPTANCE_CRITERIA.md`**: Phase 5 判定で本書の全画面シナリオ完了を前提にする位置づけを明記。

**変更なし**:
- UI挙動、API仕様、DBスキーマ、既存機能、Streamlit 実装には触れない。

> 検証: docs/chore のみ。`git diff --check` / `python -m py_compile streamlit_app.py core/*.py api/*.py` / `cd frontend && npm run build` / `python -m pytest` を実行。

---

## 2026-06-11 — docs: SQLite ロック待ち説明の実態合わせ（挙動ゼロ変更）

**目的**: PR #33 で追記した「`busy_timeout`/WAL は意図的に未設定」「`SQLITE_BUSY` で即座に失敗」という説明が実挙動と矛盾していたため、文面のみを実態へ合わせる。コード挙動・`sqlite3.connect` の引数は変更しない。

**背景（実態）**: `core/database.py` は `sqlite3.connect(DATABASE_PATH)` で接続し `timeout` を指定していない。Python `sqlite3` の `timeout` 既定は **5.0 秒**で、これが busy timeout（5000ms）として効く。したがって:
- WAL は未設定（既定のロールバックジャーナル）… 記述は正しい。
- busy_timeout は「未設定」ではなく **既定5秒が効く** … 誤記を訂正。
- ロック競合時は「即座に失敗」ではなく **最大約5秒待機**し、解放されなければ `database is locked`（`SQLITE_BUSY` 相当）で失敗し得る。
- 同時書き込みは引き続き**運用上禁止**（書き込みは一方のサーバーのみ）。

**更新（docs/コメントのみ・挙動ゼロ変更）**:
- **`core/database.py`**: `get_db_connection()` のコメントを実態へ訂正（WAL 未設定／既定5秒の busy timeout／即時失敗にしたい場合の `timeout=0` は別PR扱い／同時書き込み禁止）。
- **`AGENTS.md` / `CLAUDE.md` / `docs/context/OVERVIEW.md` / `docs/context/SPEC_NEXTJS.md`（§11） / `README.md`**: 「`busy_timeout`/WAL 未設定」「`SQLITE_BUSY` になる」を「WAL 未設定。約5秒のロック待ち後に `database is locked`／`SQLITE_BUSY` 相当で失敗し得る」へ統一。
- **`docs/reports/REFACTOR_DIAGNOSIS_20260611.md`**: PR #33 由来の同記述を訂正。

> 対象外（歴史資料につき変更しない）: `archive/*`、`docs/archive/MIGRATION_PLAN.md`、`docs/decisions/003-sqlite-local.md`（busy_timeout 誤記なし）。
> 検証: 変更はコメント/docs のみ（Python 実コードは無変更）。`git diff --check` / `python -m py_compile streamlit_app.py core/*.py api/*.py` を実行。

---

## 2026-06-11 — docs: リファクタリング診断 + 構造整理ガードレールの追記（挙動ゼロ変更）

**目的**: Next.js 版の安定利用に向け、「今すぐ大きなリファクタをすべきか」を診断し、**コードは動かさず** AI 作業精度に効くドキュメント/コメントだけを追記する。
**診断結論**: 大きなリファクタは時期尚早。ドキュメント正本（SPEC §0/§5/§9/§12）が AI の壊しやすい点を既に固定し、バックエンドも層分離が綺麗。フロントの痛み（`analysis/page.tsx` 959行・`VideoCard` 多態5分岐・queryKey 散在・手書き型ドリフト）は局所的で安定利用の障害ではない。当面は **B案（docs/ルール追記のみ）**。

**新規**:
- **`docs/reports/REFACTOR_DIAGNOSIS_20260611.md`**: 診断レポート（歴史資料）。総評 / 構造リスク一覧 / 今やる小整理 / 今はやらない整理 / 将来候補 / ディレクトリ整理の要否 / **リファクタリング開始条件**。

**更新（挙動ゼロ変更・docs/コメントのみ）**:
- **`docs/context/AI_WORKFLOW.md`**: 新節「§H リファクタ/移動 着手前チェック」（開始条件・移動は単独PR・**ルート `archive/` は import/参照禁止**）。§C に「`displayContext` 新値追加」「queryKey/invalidate 設計変更」を plan 必須として追加。
- **`docs/context/SPEC_NEXTJS.md`**: §1 画面表に「主担当（page/状態）」列を追加（仕様→コードの入口を明示）。§6 に「`displayContext` は3値で固定」注記。
- **`docs/context/IMPLEMENTATION_GUIDE.md`**: 冒頭に「UI 記述に Streamlit 期前提が残る／現行主 UI は Next.js・`SPEC_NEXTJS.md` が正本」注記（主 UI 誤認の防止）。
- **`frontend/src/components/VideoCard.tsx`**: 冒頭コメントに `displayContext` 3値の意味と SPEC 出典、永続境界の注意を追記。
- **`frontend/src/lib/store.ts`**: 冒頭コメントに3ストアの永続境界（メモリ / `clipbox-avp` / `clipbox-playback`）と SPEC §0 参照を追記。
- **`core/database.py`**: WAL は未設定であること、busy_timeout は `sqlite3.connect()` の timeout 既定（5秒）が効くこと、同時書き込みは運用上禁止であることをコメントで明記。

**削除**:
- ルート `pr_body.md`（一時生成物の置き忘れ）。

> 検証: コード変更はコメント/docstring のみ（挙動不変）。`python -m pytest` ＋ frontend `npm run typecheck`/`lint` で確認。

---

## 2026-06-11 — test+docs: 品質ゲート・回帰確認の整備（総合スコア式テスト＋TESTING.md）

**目的**: Next.js 版に今後も AI 変更が入るため、変更のたびに壊れていないか確認できる品質ゲートを整える。
調査の結果バックエンドの自動テストは既に手厚く（22 ファイル・API 全ルート/migration/watch_later 自動解除/AVP 履歴を網羅）、
本対応は「テスト増」ではなく**(1) 現状の可視化と手順の明文化、(2) 唯一の未カバー領域＝総合スコア式に1件テスト追加**。

**新規**:
- **`docs/context/TESTING.md`**: 品質ゲート・回帰確認の正本。現状カバレッジ表 / 変更種別→必須ゲート / 手動確認3層（5分・15分・大型PR）/ 実コマンド / 完了条件（PR本文の書き方・未確認の明記）/ 自動テスト追加候補。

**追加（テスト）**:
- **`tests/api/test_stats.py`**: 総合（composite）スコア式テストを追加（SPEC_NEXTJS.md §9 の不変条件を固定）。
  - `test_ranking_composite_exact_score`: 視聴日数2・いいね1・T1・T2 → `round((2+3)*1.8*100)=900` を固定。
  - `test_ranking_composite_excludes_zero_score`: 履歴・いいね無し（score0）は結果から除外。
  - `test_ranking_composite_bonus_ordering`: 未判定(100) < 判定済み(150) < 選別済み(180) のボーナス順。

**更新**:
- **`docs/context/AI_WORKFLOW.md`**: §E（テスト方針）/§F（スモーク）を要約＋`TESTING.md` へのリンクに整理し、品質ゲートの情報源を一本化（重複排除）。
- **`AGENTS.md` / `CLAUDE.md`**: 正本台帳・詳細ドキュメント一覧に `TESTING.md`（品質ゲート）を追加。

> 検証: `python -m pytest` 全緑（**146 passed**。新規 composite 3件を含む）。

---

## 2026-06-11 — docs: AI 作業の足場整備（作業手順・PRテンプレート・テスト方針）

**目的**: 仕様の正本は固定済み（前項）だが、「AI が安全に作業を進める手順」が AGENTS.md / CLAUDE.md / SPEC §12 に散在していた。
作業開始時に読む順・計画必須/小修正OKの境界・止まる条件・変更種別ごとのテスト方針・PR本文の必須項目・変更後スモークを**一本化**する。
既存の禁止事項・用語・スコア式・フル受け入れ基準は再掲せずリンクで参照（重複回避）。**機能追加・リファクタは無し**。

**新規**:
- **`docs/context/AI_WORKFLOW.md`**: AI 作業の単一入口。§A 読む順 / §B 計画必須 vs 小修正OK の境界 / §C 止まってヒアリングする条件 /
  §D 変更してはいけない挙動（要点＋禁止リストへのリンク）/ §E テスト方針マトリクス（変更種別→必須チェック）/ §F 軽量スモーク / §G PR チェックリスト。
- **`.github/PULL_REQUEST_TEMPLATE.md`**: PR 本文テンプレート（目的/変更範囲/仕様との対応/DB・API・フロント影響/テスト結果/手動確認/未対応/リスク）。

**更新**:
- **`frontend/package.json`**: `scripts` に `"typecheck": "tsc --noEmit"` を追加（テスト方針を実行可能化。挙動への影響なし）。
- **`AGENTS.md`**: 正本台帳に `AI_WORKFLOW.md` 行を追加。コード変更は AI_WORKFLOW に従う旨を明記。
- **`CLAUDE.md`**: 「AIへのコード変更ルール」冒頭と詳細ドキュメント一覧に AI_WORKFLOW への導線を追加。
- **`frontend/AGENTS.md`**: ClipBox フロント固有規約（作業手順の正本・状態の永続境界・localStorage キー・変更後チェック）を追記。

---

## 2026-06-11 — docs: Next.js 版の仕様固定（正本ドキュメント整備）

**目的**: Next.js 版の現仕様がコード・PR本文・CHANGELOG に分散しており、AI が作業前に参照できる正本が無かった。
特に Next.js 由来の新概念（あとで見る/AVP候補/再生対象/再生中ハイライト/判定日時ソート/総合スコア/localStorage 永続 vs DB 永続の境界）が
どのドキュメントにも未定義だった。**コードは変更せず、既存実装の言語化と正本化のみ**（仕様変更なし。ランキング式等はコードと一致を確認済み）。

**新規**:
- **`docs/context/SPEC_NEXTJS.md`**: Next.js 版 画面・状態仕様の正本。状態の永続境界表（DB / localStorage / メモリ）、
  Tier1/Tier2/AVP/あとで見る/再生中ハイライト/ランキングの概念固定、「操作で一覧から消える条件」表、
  プレフィックス↔DBカラム対応、総合スコア式（`analysis_service.py:691-855` 出典）、AI 向け禁止リストを記載。
- **`docs/context/OVERVIEW.md`**: 現行（Next.js+FastAPI）の全体像・3層アーキ図・ルート一覧・各正本への導線。

**更新**:
- **`AGENTS.md`**（ルート）: Streamlit 前提の全面記述を 3層構成へ改訂。正本台帳＋競合時の優先順位、必読導線、禁止事項を追加。
- **`CLAUDE.md`**: 正本ルール（現行>歴史資料）と SPEC_NEXTJS への導線、設計原則に「並走書き込み禁止」「状態の永続先を移動しない」を追加。
- **`GLOSSARY.md`**: Next.js 新用語（あとで見る/AVP候補/AVP再生対象/再生中ハイライト/判定日時ソート/総合スコア/クライアント vs サーバ状態）を追加。`performer` 登場人物フィルタの廃止を明記。
- **`DATA_MODEL.md`**: 「ファイル名プレフィックスと DB 状態の対応」節を追加。SPEC_NEXTJS への相互リンク。
- **`API_SPEC.md`**: 本文の旧表記「Flask」→「FastAPI」を訂正（内容は変更なし）。
- **`README.md`**: 残作業表の `/analysis`・`/settings` を「未実装」→「完了」に訂正。`/avp` 行を追加。
- **`PROJECT_OVERVIEW.md`**: 冒頭に【歴史資料（Streamlit 期）】バナーを追加（内容は温存）。

**移動（歴史資料化）**:
- `docs/context/MIGRATION_PLAN.md` → `docs/archive/MIGRATION_PLAN.md`（歴史バナー追加）
- `docs/context/MIGRATION_MAP.md` → `docs/archive/MIGRATION_MAP.md`（歴史バナー追加）

**関連ファイル**: `docs/context/{SPEC_NEXTJS,OVERVIEW,GLOSSARY,DATA_MODEL,API_SPEC,PROJECT_OVERVIEW}.md`,
`docs/archive/{MIGRATION_PLAN,MIGRATION_MAP}.md`, `AGENTS.md`, `CLAUDE.md`, `README.md`

---

## 2026-06-11 — fix: PR31 マージ前整合（B-1/B-2/F-1/F-2/F-3/T-1）

**バックエンド**:
- **`api/videos.py`** `/videos/selection`: `watch_later` クエリパラメータを追加し、
  `app_service.get_videos(watch_later_filter=watch_later)` に渡すよう変更。Tier2 でも
  「あとで見る」絞り込みが可能になった。
- **`api/videos.py`** `/videos/by-ids` docstring: 「削除済み含む」誤記を
  「デフォルト削除済み除外」に修正（実装は `include_deleted=False` のまま変更なし）。

**フロントエンド**:
- **`VideoCard.tsx`**: `displayContext` に `"avp"` を追加。`avpPlayTarget` / `onAvpRemove`
  props を追加。`watch_later` ボタンの Tier2 制限を撤廃（全コンテキストで表示）。
  AVP候補チェックボックスを `"avp"` コンテキストでも非表示に。Tier2 × `needs_selection`
  × level -1 のとき SelectTrigger を「未選別」と表示する `levelDisplay` 変数を追加。
- **`avp/page.tsx`**: 候補一覧をカスタム行表示から `VideoCard(displayContext="avp")` グリッドに
  差し替え。再生中ハイライト（`useIsPlaying`）が自動で機能するようになった。
  `getLikes` / `getViewCounts` クエリを追加し likeCount / viewCount を供給。
- **`tier2/page.tsx`**: `watchLater` state を追加。`selectionParams` に `watch_later` を追加。
  `LibraryFilterBar` に `watchLater` / `onWatchLaterChange` を渡すよう変更。
- **`types.ts`** `SelectionVideoListParams`: `watch_later?: boolean` フィールドを追加。
- **`VideoGrid.tsx`**: `displayContext` の型に `"avp"` を追加。

**テスト**:
- `tests/api/test_videos_read.py` `_insert` ヘルパーに `watch_later=0` パラメータを追加。
- `test_selection_list_watch_later_filter` を新規追加（計 143件パス）。

---

## 2026-06-11 — fix: PR8 — Codex レビュー指摘 5件対応

**バックエンド**:
- **`core/video_manager.py`** `toggle_watch_later`: SELECT→計算→UPDATE の非アトミックな
  read-modify-write を `UPDATE ... SET watch_later = 1 - watch_later WHERE ... AND is_deleted = 0`
  の単一アトミック UPDATE に変更。rowcount=0 で KeyError を発生。
- **`core/video_manager.py`** `get_videos_by_ids`: `AND is_deleted = 0` フィルタを追加。
  `include_deleted: bool = False` パラメータを追加し、`GET /videos/{id}` エンドポイントのみ
  `include_deleted=True` で呼び出すよう `api/videos.py` を変更。
- **`core/video_manager.py`** `set_favorite_level_with_rename`: `was_selection_judgment` の
  条件を `video.needs_selection` のみから
  `video.needs_selection or video.is_selection_completed` に修正。
  `+` プレフィックス（選別済み）動画の再判定も正しく記録される。

**インフラ**:
- **`.gitignore`**: `data/migration_history.txt` を追加。`git rm --cached` でインデックスから除外。
  新規 checkout でマイグレーションが「実行済み」とみなされてスキップされる問題を解消。
- **`core/migration.py`** `is_migration_completed`: `migration_id in log.read()` の部分一致判定を
  `splitlines()` + 先頭列の厳密比較に変更。将来の migration_id が既存 ID の部分文字列でも
  誤ってスキップされない。

**フロントエンド**:
- **`frontend/src/lib/store.ts`** `toggleAvpCandidateId`: remove 側で `avpPlayTargetIds` も
  フィルタするよう修正。チェックを外した動画が `avpPlayTargetIds` に残留する不整合を解消。

**テスト**:
- `tests/test_video_manager.py` に 3件追加（計 142件）:
  - `test_toggle_watch_later_toggles_and_raises_for_missing`: アトミック UPDATE の動作検証
  - `test_get_videos_by_ids_excludes_deleted`: 削除済み動画の除外検証
  - `test_was_selection_judgment_for_completed_video`: `is_selection_completed=True` 動画の記録検証

---

## 2026-06-10 — feat: PR7 — 総合ランキング composite 式刷新

**バックエンド**:
- **`core/analysis_service.py`**: 総合スコア係数定数を追加
  （`_COMPOSITE_A=1`, `_COMPOSITE_B=3`, `_COMPOSITE_BONUS_T1=0.5`, `_COMPOSITE_BONUS_T2=0.3`）。
  `get_ranked_videos_for_tab` の composite ブランチを**ハイブリッド式**に刷新:
  - 旧式: `norm(視聴回数)*1.0 + norm(視聴日数)*1.2 + norm(いいね)*1.5` × レベル乗数（未判定=除外）
  - 新式: `base = 視聴日数*1 + いいね*3`、`score = int(base * (1 + 0.5*T1判定 + 0.3*T2選別済み) * 100)`
  - 未判定動画をランキングに含める（T1/T2ボーナス=0のまま base スコアで参加）。
  - T1判定済み（level≥0）で +50%、T2選別済みで追加 +30% ボーナス。
  - 係数はモジュール定数化し 1行で調整可能。

**フロントエンド変更なし**（`ranking/page.tsx` + `/ranking` エンドポイントは composite 対応済み）。
**Streamlit にも反映**（`get_ranked_videos_for_tab` 共有のため自動）。

**検証**: pytest 139件全件緑。

---

## 2026-06-10 — feat: PR6 — Tier2 カード表示改善（displayContext）

**フロントエンド**:
- **`frontend/src/components/VideoCard.tsx`**: `displayContext?: "tier1" | "tier2"` prop 追加。
  Tier2 では AVP候補チェックボックスとあとで見るボタンを非表示。
  `is_selection_completed` / `needs_selection` バッジを Tier2 専用に整理:
  `needs_selection && !is_selection_completed` → 「未選別」バッジ、
  `is_selection_completed` → 「選別済み」バッジ（いずれも Tier2 のみ表示）。
- **`frontend/src/components/VideoGrid.tsx`**: `displayContext?: "tier1" | "tier2"` prop 追加。
  VideoCard に透過渡し。
- **`frontend/src/app/tier2/page.tsx`**: ライブラリ・ランダム・選別運命の全 VideoGrid に
  `displayContext="tier2"` を追加。

**バックエンド変更なし**（`needs_selection` は既存フィールド）。

**検証**: tsc 0 errors / eslint 0 warnings。

---

## 2026-06-10 — feat: PR5 — あとで見る（watch_later）

**バックエンド**:
- **`core/video_manager.py`**: `toggle_watch_later(video_id)` 追加。`watch_later` フラグを
  反転して新値（`bool`）を返す。動画不在は `KeyError`。
- **`core/app_service.py`**: `toggle_watch_later` ファサード追加。
- **`api/schemas.py`**: `VideoOut` に `watch_later: bool` 追加（`from_video` で評価）。
  `WatchLaterResponse(status, message, watch_later)` 追加。
- **`api/actions.py`**: `POST /videos/{id}/watch-later/toggle` エンドポイント追加。
  `_ensure_exists` で存在確認 → `app_service.toggle_watch_later` 呼び出し。
- **`api/videos.py`**: `GET /videos` に `watch_later: Optional[bool]` フィルタ追加。
- **`tests/api/test_watch_later.py`**: 新規テスト 5件。トグル on/off・404・絞り込み・
  判定変更時の自動解除（回帰）。

**フロントエンド**:
- **`frontend/src/lib/types.ts`**: `Video.watch_later: boolean`、`VideoListParams.watch_later?`、
  `WatchLaterResponse` インターフェース追加。
- **`frontend/src/lib/api.ts`**: `toggleWatchLater(id)` 関数追加。`WatchLaterResponse` import追加。
- **`frontend/src/lib/store.ts`**: `LibraryFilters.watchLater?: boolean` 追加。
  `DEFAULTS.watchLater: undefined` 追加。
- **`frontend/src/components/VideoCard.tsx`**: Bookmark トグルボタン追加（`watchLaterM`
  mutation + `onSettled: invalidate`）。`watch_later` が `true` のとき `variant="default"`。
- **`frontend/src/components/LibraryFilterBar.tsx`**: `watchLater` props + `onWatchLaterChange`
  コールバック + Bookmark ボタン追加。
- **`frontend/src/components/FilterPanel.tsx`**: `watchLater` / `onWatchLaterChange` を store に配線。
- **`frontend/src/app/page.tsx`**: `params` の `useMemo` に `watch_later: store.watchLater` 追加。

**検証**: pytest 139件全件緑 / tsc 0 errors / eslint 0 warnings。

---

## 2026-06-10 — feat: PR3 + PR4（AVP ページ再設計 + AVP 再生履歴記録）

承認済み計画の **PR3**（AVP ページ再設計）と **PR4**（AVP 再生後の視聴履歴記録）。

**PR3 — AvpStore 刷新 + AVP ページ再設計**:
- **`frontend/src/lib/store.ts`**: `useAvpStore` を全面刷新。旧 `avpSelectedIds`(≤4) /
  `avpLaunchSelectedIds` / `avpPlayingIds` を廃止し、`avpCandidateIds`（候補・上限なし）/
  `avpPlayTargetIds`（再生対象・≤4）に変更。`zustand/middleware` の persist（key `clipbox-avp`）
  でリロードを越えて永続化。`pruneIds(missingIds)` で欠損ID を両リストから一括除去。
  `MAX_AVP_SELECTION` を廃止し `MAX_AVP_PLAY_TARGET = 4` に統一。
- **`frontend/src/components/VideoCard.tsx`**: `avpSelectedIds` → `avpCandidateIds`、
  `toggleAvpSelectedId` → `toggleAvpCandidateId`、上限ガード（`avpMaxReached`）を撤去。
  ラベル「AVP選択」→「AVP候補」。候補は利用不可のみ disabled。
- **`frontend/src/components/SidebarNav.tsx`**: バッジカウントを `avpCandidateIds.length` に更新。
- **`frontend/src/app/avp/page.tsx`**: 全面改修。`useQueries`（N+1）廃止 → `useQuery + getVideosByIds`
  一括取得（staleTime 30 s）。`useEffect` で `missing_ids` を `pruneIds` に渡して自動掃除。
  2セクション構成（選択済み / 評価待ち）→ 単一候補カード一覧に統一。再生対象チェックボックスが
  4本上限で disabled + ツールチップ表示。再生成功後は `setAvpPlaying`（ハイライト更新）+
  `clearAvpPlayTargetIds`（再生対象リセット）。

**PR4 — AVP 再生後の視聴履歴記録**:
- **`core/app_service.py`**: `record_avp_viewing(video_ids)` 追加。AVP 再生後に
  `viewing_history` へ全 ID 一括 `executemany` で 1 トランザクション記録。
- **`api/avp.py`**: `subprocess.Popen` 成功後に `app_service.record_avp_viewing(video_ids)` を呼び出し。
  設計コメントを「viewing_history を記録する」に更新。
- **`tests/api/test_avp.py`**: `test_avp_play_success_records_view_history` に改名・期待値反転
  （`count == 0` → `count == len(ids)`）。

**検証**: pytest 134件全件緑 / tsc 0 errors / eslint 0 warnings。

---

## 2026-06-10 — fix: PR #31 レビュー対応（by-ids チャンク取得 + テスト追加）

PR #31 のレビュー指摘に対する修正。

**変更点**:
- **チャンク取得** (`core/video_manager.py`): `get_videos_by_ids` を SQLite のバインド変数上限
  （デフォルト 999）に対応するため `_SQLITE_VAR_LIMIT=900` 件ずつ IN 句をチャンク分割して取得する
  方式に変更。重複IDは先頭の出現のみ返す（`dict.fromkeys` で dedup・入力順維持）。
  API 層の `missing_ids` 算出は元の `dict.fromkeys` ロジックを維持。
- **テスト追加** (`tests/api/test_videos.py`):
  - `test_get_videos_by_ids_large_batch`: 1000件超（SQLite 上限を超える）でもエラーなし・
    入力順保持・missing_ids 正確に返る。
  - `test_get_videos_by_ids_duplicate_ids`: 重複IDは items 1件・missing_ids も重複除去されて
    1件であることを明示。

**TODO（次PR以降）**: `watch_later` はこの PR で DB カラム・`core.models.Video` フィールド・
`get_videos(watch_later_filter=...)` まで基盤を整えた。`VideoOut.watch_later` の公開・
`PUT /api/videos/{id}/watch-later` エンドポイント・フロント UI（VideoCard トグル / フィルタ）は
**PR5 で実装予定**（承認済み計画参照）。

**検証**: pytest 全件緑（後述）。

---

## 2026-06-09 — feat: Next.js版改善 PR2（再生中ハイライト）

承認済み計画の **PR2**。単体=1本 / AVP=最大4本の「再生中」をカードでハイライトする。

**変更点**:
- **永続ストア** (`frontend/src/lib/store.ts`): `usePlaybackStore`（`zustand/middleware` の persist、
  key `clipbox-playback`）。`singlePlayingId` / `avpPlayingIds`(≤4) と `setSinglePlaying`（avp クリア）/
  `setAvpPlaying`（single クリア・最大4）。次の再生でID置換。タブ移動・リロードを越えて保持。
- **ハイドレーション安全** (`useIsPlaying` / `useHydrated`): `useSyncExternalStore` で SSR と初回
  クライアントレンダリングは false、以降 localStorage 由来を反映（不整合・setState-in-effect 回避）。
- **R4 共通フック** (`frontend/src/lib/usePlayVideo.ts` 新規): 再生成功で `setSinglePlaying(id)`、
  共通キー（kpi/likes/view-counts）+ 画面別 invalidateKeys を無効化。**VideoCard・運命の1本
  （app/page.tsx / app/tier2/page.tsx の playVideo 直呼び）の全経路**で使用し配線漏れを防ぐ。
- **VideoCard**: 旧 AVP 選択リング（`ring-2 ring-primary`）を撤去し、`isPlaying` で
  `border-2 border-amber-400 bg-amber-50`（薄背景・色付き太枠）。再生は usePlayVideo 経由。
- **AVPページ**: 起動成功で `setAvpPlaying(ids)` も呼び、AVP 再生中（最大4本）をハイライト。

**検証**: フロント `tsc --noEmit` / `eslint` 緑。pytest 132件緑（バックエンド非変更）。
手動確認（再生中ハイライト・タブ/リロード保持・次の再生で置換）は別途。

---

## 2026-06-09 — feat: Next.js版改善 PR1（バッチ取得 + 判定日時ソート）

承認済み計画の **PR1**。独立・低リスクの API/フロント拡張。

**変更点**:
- **R1/R9 バッチ取得** (`POST /api/videos/by-ids`): `{ ids }` → `{ items, missing_ids }`。
  items は入力順保持・削除済み含む。見つからないIDは missing_ids（クライアントの localStorage 候補掃除用）。
  `app_service.get_videos_by_ids` をラップ。`/videos/{video_id}` より前に定義（パス解決順）。
- **判定日時ソート**: `GET /api/videos`・`/videos/selection` の `sort` を `modified`→`judged_at` に置換。
  `core.database.get_latest_judged_at_map(conn, selection)` を新設（Tier1=`was_selection_judgment=0` /
  Tier2=`=1` の最新 judged_at、`is_deleted=0` 尊重）。`_apply_sort` は partition 方式で
  **未判定（判定履歴なし）を asc/desc とも末尾固定**。
- フロント: `types.ts`（`SortField` modified→judged_at、`VideosByIdsResponse` 追加）/
  `api.ts`（`getVideosByIds`、空配列は無通信）/ `LibraryFilterBar`（「更新日」→「判定日時」）。
- `API_SPEC.md` 更新。

**検証**: pytest 132件緑（by-ids 順序保持/missing、judged_at 末尾安定、Tier別マップの追加テスト）。
フロント `tsc --noEmit` / `eslint` 緑。

---

## 2026-06-09 — feat: Next.js版改善 PR0（R5/R6 基盤修正 + スキーマ移行基盤）

Next.js版7改善の承認済み計画（`docs/...` / 計画ファイル）の **PR0**。他PRの前提となる core 正当性の是正と、
Next.js スタックに欠けていたスキーマ移行経路を新設する。**UI 変更なし**。

**背景**: `run_dev.bat` は Streamlit を起動せず、`api_app.py` の lifespan は read-only。よって
`init_database()` / `run_startup_migration()`（従来 Streamlit が担っていた）を流す経路が無く、
新フロントが前提とする列を用意できなかった。加えて `is_selection_completed` 列が陳腐化していた。

**変更点**:
- **R5 選別済み列の書込同期** (`core/video_manager.py`): `set_favorite_level_with_rename` の UPDATE で
  `is_selection_completed` を + プレフィックス有無に同期。あわせて判定済み(level≥0)/選別完了(+付与)時に
  `watch_later` を自動解除（同一トランザクション）。
- **R6 既存分の冪等再同期** (`core/migration.py`): `resync_selection_completed`（id `resync_selection_completed_20260609`）。
  全 videos の + 有無で列を再計算。`app_service.run_startup_migration()` から `migrate_level_0_to_minus_1` と共に実行。
- **R2 watch_later カラム** (`core/database.py`): `init_database()` の PRAGMA ガード付き ALTER に追記
  （CREATE TABLE 定義 + 部分インデックス `idx_videos_watch_later`）。列はログ式で別管理しない。
- **R8 watch_later の波及** (`core/models.py`, `core/video_manager.py`, `core/analysis_service.py`, `core/app_service.py`):
  `Video` に実フィールド `watch_later` を追加し、`video_from_row` / `_df_row_to_video` で投入。
  `get_videos(watch_later_filter=...)` フィルタ引数を追加。
- **R3/R7 移行ランナー** (`scripts/run_migrations.py` 新規): `GET /api/health` で稼働検知。
  未稼働=書込移行を実行 / 稼働中=read-only 確認（**必要列 + 未完了データ補正の両方**が揃えば exit 0、
  どちらか未充足なら exit≠0 で「API停止して再実行」を促す）。列だけ見るとデータ補正
  （`resync_selection_completed`）の未実行を見逃すため、`migration` の ledger（`core.migration.DATA_MIGRATION_IDS`）も
  確認する。`run_dev.bat` / `run_api.bat` を `startup_backup.py` 直後・uvicorn 起動の前に配線
  （純ASCII維持。run_dev は移行失敗で中断）。

**検証**: 既存 + 追加 pytest 全 128 件緑。実DBのコピー（4,083行）に移行を適用 →
watch_later 列追加・行数不変・+動画の is_selection_completed 不整合 2件→0件（R6）・再実行は skip の no-op を確認。

**次PR**: PR1（`POST /videos/by-ids` + 判定日時ソート）以降は別途。

---

## 2026-06-08 — fix: run_dev.bat / run_api.bat の文字コード問題で Next.js が起動しない不具合

**症状**: `run_dev.bat` をダブルクリックしても `http://localhost:3000/` に Web アプリが出ない。
API(8000)は起動するが Next.js(3000)が立ち上がらない。

**原因**: 両 .bat が **BOM なし UTF-8** で日本語コメントを含んでいた。ダブルクリックで開く cmd.exe は
システム OEM コードページ **932 (Shift-JIS)** でバッチを読むため、UTF-8 の日本語バイト列を誤読し、
後続行のパースが崩れる。これにより `start "" /D "%FRONTEND%" npm.cmd run dev` の経路が壊れ、
npm が誤った作業ディレクトリ等で失敗して node プロセスが起動しなかった。
（`chcp 65001` を冒頭に置いても、cmd の**バッチパーサ**はこれだけでは UTF-8 マルチバイトを安定して扱えない。）

**切り分け**: 英語コメントのみのプローブ bat では Next.js が起動、日本語コメント入りプローブでは
`set` 行すら誤認し日本語が「コマンド」として実行された → 日本語コメントが原因と特定。

**対応**: `run_dev.bat` / `run_api.bat` の日本語コメントを英語化し、**ファイル全体を純 ASCII**に。
（`run_clipbox.bat` は元から ASCII のため変更なし。）修正後 `run_dev.bat` 実行で
API/Next.js とも起動・`localhost:3000` が HTTP 200 を返すことを確認。

**今後の注意**: cmd.exe 用 .bat は非 ASCII を入れない（英語コメント）こと。日本語を残すなら
Shift-JIS(CP932) 保存か UTF-8 **BOM 付き**で保存する必要がある。AI/エディタの既定保存(UTF-8 no-BOM)では壊れる。

---

## 2026-06-07 — PR #30 レビュー対応（Runtime 安全化 / analysis 集計化 / performers 廃止 ほか）

**目的**: PR #30 への Request changes レビュー（マージ前チェックリスト）を解消する。

**1. Runtime stop を ClipBox プロセスに限定**（`core/runtime_control.py`, `api_app.py`, `api/runtime.py`, `run_dev.bat`,
`frontend/src/components/SidebarNav.tsx`）
- 停止対象を **cwd がリポジトリ配下 AND cmdline にサービス固有マーカー**を満たすプロセスに限定（無差別停止を排除）。
  `uvicorn --reload` 対策として listener PID から祖先を辿り service root を特定しツリー停止。
- ClipBox と確認できないポート占有は `status="blocked"` → API は **409**。フロントは確認ダイアログで明示。
- Runtime API は **`create_app()` ファクトリ + `CLIPBOX_ENABLE_RUNTIME_CONTROL=1`** のときのみ公開（既定は無効・404）。
  `run_dev.bat` が dev 一括起動時に有効化。フロントは 404 を「無効」として lamp/停止パネルを非表示。
- **UI 統合**: FastAPI は API 実行主体のため、停止ボタンは「Streamlit」「Web/API」の2系統に集約。
  Web/API は `POST /api/runtime/web-stack/stop`（Next.js→FastAPI 順）。応答を待たず `about:blank` へ遷移。

**2. /analysis をサーバー SQL 集計へ**（`core/analysis_service.py`, `api/analysis.py`, `api/schemas.py`,
`frontend/src/lib/{api,types}.ts`, `frontend/src/app/analysis/page.tsx`）
- `GET /api/analysis/{viewing,judgment}-trend?bucket=day|week|month` を追加。viewing/judgment × videos を JOIN した
  SQL 集計で **video_ids を HTTP に乗せない**（旧 chunked GET による URL 長超過・リクエスト爆発を解消）。
  判定トレンドはバケットごとに `COUNT(DISTINCT video_id)`。週ラベルは月曜開始日で既存 selection-trend と統一。

**3. performers フィルタ廃止**（`api/videos.py`, `core/{app_service,video_manager}.py`, `api/schemas.py`,
`frontend/src/lib/types.ts`）
- フォルダ名由来の暫定抽出でフィルタに使えていなかった performers を API/core/`filter-options`/型から削除。
  DB カラム `performer` と `extract_performer` はレガシーとして据え置き（migration なし）。

**4. Tier1 のセレクション非表示を全モードへ + 判定状態フィルタ**（`core/video_manager.py`,
`frontend/src/lib/store.ts`, `frontend/src/components/FilterPanel.tsx`, `frontend/src/app/page.tsx`）
- `get_unrated_random_videos()` に `needs_selection=0 AND is_selection_completed=0` を追加し、ランダム/運命の1本でも
  セレクション関連(`!`/`+`)を出さない（Tier1=判定層を仕様化）。
- Tier1 に「すべて/未判定/判定済み」status を追加（levels へ写像。judged は既存 level 選択と intersection）。

**5. ライブラリスキャン前バックアップを必須化**（`core/app_service.py`, `api/admin.py`,
`frontend/src/app/settings/page.tsx`）
- `POST /api/scan/library` は直近24時間以内のバックアップが無ければ **409**（API 直叩き対策。`has_recent_backup()`）。
- 設定画面は実バックアップ（セッション内作成）のみで実行許可。自己申告チェックは廃止し、ダイアログに「今すぐバックアップ」を配置。

**6. AVP 複数ファイル起動の手動確認**: `docs/context/ACCEPTANCE_CRITERIA.md` に手動マトリクスを追記（実機確認は別途）。

**テスト**: `pytest tests/` **121 passed**（runtime 検証/--reload/web-stack、analysis trend の週 distinct、
unrated の selection 除外、scan 前バックアップ 409 ほかを追加）。frontend `tsc`/`lint`/`build` 通過。

---

## 2026-06-07 — バグ修正: ライブラリスキャンが selection_folder 動画を is_available=0 にする問題

**原因**: 通常のライブラリスキャン（`scan_and_update`）が自分のスキャン対象外の全動画を
`is_available=0` に落とす仕様のため、`selection_folder` 配下の動画が library_roots に含まれていない場合に
Tier2 動画が消えていた。

**対策**（`core/scanner.py`, `core/file_ops.py`, `core/app_service.py`）:

- `FileScanner` に `protected_roots` 引数を追加。`scan_and_update` は保護パス配下のレコードを
  `is_available=0` 更新の対象外とする（`_is_protected_path` でパス比較、`normcase(normpath(resolve()))` 使用）。
- `app_service.scan_library()` を2フェーズ構成に変更:
  - Phase 1: `library_roots` をスキャン（`selection_folder` を `protected_roots` に指定）
  - Phase 2: `selection_service.scan_selection_folder()` で selection フォルダを個別同期
- `scan_single_directory()` を `FileScanner` に追加。`selection_folder` 専用スキャン用で、
  対象ディレクトリ内のレコードのみ `is_available` を変更する。

**テスト追加**（`tests/test_scanner.py`）:
- `test_scan_keeps_protected_root_records_available`
- `test_scan_single_directory_marks_missing_files_in_that_directory_unavailable`

**残留リスク（軽微）**:
- `current_full_path` が stale な場合、Phase 1 直後は一時的に unavailable になりうるが
  Phase 2 完了時点で正しい状態に収束する。
- `selection_folder` が `library_roots` 配下にある場合は二重スキャンになるが冪等で実害なし。
  設定時に「library_roots の外に置くことを推奨」と案内することが望ましい。

---

## 2026-06-07 — ドキュメント: Phase 5 着手前チェックリスト追記

**目的**: Streamlit アーカイブ前に完了すべき事項を `docs/context/MIGRATION_PLAN.md` に整理・記録。

**関連ファイル**: `docs/context/MIGRATION_PLAN.md`

追記した主な項目:
- **A. コミット積み上げ**: `frontend/src/app/analysis/`, `avp/`, `settings/`、新コンポーネント群、
  `api/avp.py`, `api/runtime.py`, `core/runtime_control.py` 等が未コミット
- **B. README.md 整合**: analysis・settings を「未実装」と誤記している行の修正
- **C. 手動受け入れテスト**: 分析・設定・AVP の write 操作確認（Streamlit 停止 + DB バックアップ必須）
- **D. テスト補強**: `scan_library()` 統合テスト、API 異常系パス
- **E. 既知のドリフト**: `top_n` デフォルト差異、`selection_folder` 配置の注意
- **F. SQLite WAL + busy_timeout**: Streamlit アーカイブ後（Phase 5）に実施
- **G. 起動スクリプト**: `next build` 確認、本番起動スクリプト整備

---

## 2026-06-07 — Next.js: サイドバー折り畳み + Runtime パネル下部配置

**目的**: サイドバーをアイコン幅に折り畳めるトグルを追加。Runtime パネルを最下部に固定し、展開時にコンテンツが上方向に開くよう変更。

**関連ファイル**: `frontend/src/components/SidebarNav.tsx`

- **サイドバー折り畳み**: `PanelLeftClose`/`PanelLeftOpen` アイコンのトグルボタンを追加。
  折り畳み時は `w-14`（アイコンのみ）、展開時は `w-72`。ナビ項目はアイコンのみ表示となり `title` 属性でラベルを補完。
- **Runtime 最下部固定**: `mt-auto` で常にサイドバー最下部に配置。
- **上方向展開**: `<details>` を廃止し React ステートで制御。コンテンツはトリガー行の上に描画され、展開時に上側に開く。

---

## 2026-06-07 — Next.js: 5項目 UI 改善

**目的**: ①引いて即再生、②5列グリッド、③1列（運命）確認、④カード余白削減、⑤Select 表示修正。

**関連ファイル**: `frontend/src/app/page.tsx`, `frontend/src/app/tier2/page.tsx`,
`frontend/src/components/VideoGrid.tsx`, `frontend/src/components/VideoCard.tsx`

- **①自動再生**: 運命の1本を引いたとき `useEffect` + `useRef` で `playVideo(id)` を fire-and-forget。
  前回の id と比較して重複呼び出しを防ぐ。Tier1・Tier2 両方に適用。
- **②5列グリッド**: `VideoGrid` のデフォルト gridClassName を
  `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` に変更。
  運命タブは呼び出し元の `gridClassName="grid grid-cols-1 gap-3"` が優先されるため影響なし。
- **③1列（確認）**: Tier1・Tier2 の運命セクションはすでに `gridClassName` を明示渡し済みで変更不要。
- **④余白削減**: `VideoCard` の `CardContent` を `py-3 gap-2` → `py-1 gap-1` に変更。
- **⑤Select 表示**: `SelectValue`（raw value 表示）を `<span>{levelName(displayLevel)}</span>` に置換。

---

## 2026-06-07 — Runtime control 機能（lamp 表示 + サービス停止）

**目的**: Streamlit / FastAPI / Next.js の起動状態を Next.js サイドバーに lamp 表示し、各サービスを明示的に停止できる
開発用コントロールを追加する。ブラウザを閉じてもプロセスは止まらないため、手動停止の導線を用意する。

**関連ファイル**: `core/runtime_control.py`（新規）, `api/runtime.py`（新規）, `api/schemas.py`,
`api_app.py`, `frontend/src/components/SidebarNav.tsx`, `frontend/src/lib/{api,types}.ts`,
`docs/runtime-controls.md`（新規）, `requirements.txt`, `tests/test_runtime_control.py`（新規）, `tests/api/test_runtime.py`（新規）

- **core/runtime_control.py**: `psutil` でポート（8501/8000/3000）→ LISTEN プロセスの PID を判定し、状態
  （`running`/`stopped`/`unknown`）と PID を返す。`stop_service(name)` は対象プロセスを terminate（timeout 後 kill）。
  `SERVICE_SPECS` に streamlit/fastapi/nextjs を定義。
- **api/runtime.py**: `GET /api/runtime`（全サービスの lamp 状態）と `POST /api/runtime/{service}/stop`
  （未知サービスは 404、停止失敗は 500）。`api_app.py` に配線。`requirements.txt` に `psutil>=5.9.0,<7.0.0` を追加。
- **SidebarNav**: `RuntimeControlPanel` / `RuntimeLamp` / `StopConfirmDialog` を実装。`/api/runtime` を 4 秒間隔で
  ポーリングし lamp（緑=起動/灰=停止/黄=取得不可）を表示、停止は確認ダイアログ経由。Next.js 停止時は画面も終了する旨を注記。
- **注記**: 同日の「サイドバー折り畳み + Runtime パネル下部配置」エントリは**レイアウトのみ**。本エントリが Runtime 機能本体
  （状態取得・停止 API・core ロジック）を記録する。
- **検証**: `pytest tests/`（`test_runtime_control.py` / `test_runtime.py` 含む全件パス）。

---

## 2026-06-07 — Phase 4-C: AVP 並列再生を Next.js / FastAPI に移植

**目的**: 旧 Streamlit の AVP 並列再生（`ui/avp_tab.py`）を Next.js / FastAPI に移植する。API は AVP 起動のみを担当し、
横断選択・再生対象・評価待ちの状態は Next.js の Zustand で持つ。

**関連ファイル**: `api/avp.py`（新規）, `api/schemas.py`（`AvpPlayRequest`）, `api_app.py`,
`frontend/src/app/avp/page.tsx`（新規）, `frontend/src/lib/store.ts`, `frontend/src/components/VideoCard.tsx`,
`tests/api/test_avp.py`（新規）, `docs/context/{API_SPEC,MIGRATION_MAP,MIGRATION_PLAN,ACCEPTANCE_CRITERIA}.md`

- **POST /api/avp/play**: 最大4本の `video_ids` を受け取り `subprocess.Popen([avp_exe_path, ...paths])` で起動。
  Streamlit 現行同様、AVP 起動自体では `viewing_history` / `play_history` を記録しない。
- **エラー契約**: 400（0件 / 5件以上 / 非正ID / 重複ID）、404（動画 or ファイル不在）、409（`is_available=false` を含む）、
  500（`avp_exe_path` 未設定・実行ファイル不在・起動失敗）。
- **フロント**: `VideoCard` の AVP チェック（最大4本）、`/avp` で選択済み動画・再生対象・評価待ちカードを表示。
  状態は `useAvpStore`（`avpSelectedIds` / `avpLaunchSelectedIds` / `avpPlayingIds`）。評価・いいねは既存 API を流用。
- **検証**: `pytest tests/`（`test_avp.py` 含む全件パス）。

---

## 2026-06-07 — Phase 4-B 完了: 分析・設定画面 + 画面共通ワークスペース化

**目的**: 残作業だった `/analysis`・`/settings` を実装し Phase 4-B を完了。あわせて Tier1 / Tier2 の重複していた
ライブラリ/ランダム/運命の1本のUIを共通コンポーネントに切り出す。

**関連ファイル**: `frontend/src/app/{analysis,settings}/page.tsx`（新規）,
`frontend/src/components/{LibraryWorkspace,LibraryFilterBar,VideoActionPanel,VideoState}.tsx`（新規）,
`frontend/src/components/FilterPanel.tsx`, `frontend/src/app/{page,tier2/page}.tsx`,
`frontend/src/lib/{api,types}.ts`, `frontend/src/app/layout.tsx`, `frontend/package.json`（`recharts` / `react-is`）,
`docs/context/{IMPLEMENTATION_GUIDE,MIGRATION_PLAN}.md`

- **分析画面 `/analysis`**: `recharts` でチャート化。`getAnalysisData` / `getViewingHistory` / `getJudgmentHistory` /
  `getResponseTime` / `getAnalysisRankings` / `getSelectionTrend` / `getSelectionDistribution` を利用。
- **設定画面 `/settings`**: `getConfig` / `updateConfig`（config 編集）、`scanLibrary` / `scanSelection`（スキャン）、
  `createBackup`（DB バックアップ）を提供。
- **共通ワークスペース化**: `LibraryWorkspace`（KPI + 3サブタブの外枠）、`LibraryFilterBar`（フィルタ）、
  `VideoActionPanel`（`RandomPanel` / `FatePanel`）、`VideoState`（loading/empty/error）に切り出し、Tier1（`page.tsx`）と
  Tier2（`tier2/page.tsx`）が共通利用。`FilterPanel.tsx` は責務を縮小。
- **検証**: `frontend` で `npm run build` + `npx tsc --noEmit`。全ルート（`/`・`/tier2`・`/ranking`・`/analysis`・`/search`・
  `/avp`・`/settings`）が生成されることを確認。

---

## 2026-06-07 — 起動時 DB バックアップ + ランチャー改善

**目的**: 並走運用での事故に備え、起動時に1日1回 DB をバックアップする。あわせて開発ランチャーを疎通確認 + 自動ブラウザ起動に改善。

**関連ファイル**: `scripts/startup_backup.py`（新規）, `run_dev.bat`, `run_clipbox.bat`, `run_api.bat`

- **scripts/startup_backup.py**: `sqlite3` の `.backup`（read-only ソース接続）で `BACKUP_DIR` に
  `videos_startup_YYYYMMDD_HHMMSS.db` を作成。**当日分が既にあればスキップ**、最新10世代を残し古いものを削除。
  一時ファイル `.tmp` 経由で原子的に置換。
- **ランチャー**: `run_clipbox.bat`（Streamlit）・`run_api.bat`（FastAPI）の起動前に `startup_backup.py` を呼ぶ
  （失敗しても起動は継続）。`run_dev.bat` は全面改修し、起動時バックアップ → FastAPI / Next.js の precheck・既起動検出 →
  `/api/health` と `http://localhost:3000` の疎通待ち → 成功時に既定ブラウザを自動起動、失敗時はポート使用状況のヒントを表示。

---

## 2026-06-07 — バックエンド: keyword フィルタを core へ移設 + スキャンの保護ルート/単体反映

**目的**: API 層に重複実装されていた keyword 正規化を core に一本化し、ライブラリスキャンがセレクションフォルダ配下の
動画を誤って利用不可にしないようにする。Tier2 セレクション一覧にもライブラリ同等のフィルタを通す。

**関連ファイル**: `core/video_manager.py`, `core/app_service.py`, `core/scanner.py`, `core/file_ops.py`,
`api/videos.py`, `tests/test_scanner.py`, `tests/api/{test_videos_read,test_admin}.py`

- **keyword を core へ移設**: `VideoManager.get_videos(keyword=...)` を追加し、フィルタ適用後に
  `normalize_text` で本質的ファイル名へ正規化部分一致。`app_service.get_videos` も `keyword` を透過。
  `api/videos.py` 側の二重 normalize 実装を削除し core 委譲に統一（モジュール/関数 docstring も復元）。
- **scanner の保護ルート**: `FileScanner(scan_directories, protected_roots=...)` を追加。`scan_and_update` は
  見つからなかった動画でも **protected_roots 配下はスキップ**（is_available を落とさない）。
  `app_service.scan_library` は selection_folder を protected_root に渡し、ライブラリスキャン後に
  `scan_selection_folder` で同期する。`core/file_ops.create_file_scanner` も `protected_roots` を受け取る。
- **単体スキャンの不在反映**: `scan_single_directory` がスキャン後に当該ディレクトリ内で見つからなかった動画を
  `is_available=0` に更新（`_mark_missing_in_directory_unavailable`）。
- **/videos/selection 拡充**: `levels` / `storage` / `keyword` / `show_unavailable` を受け付けるようにし、Tier2 でも
  ライブラリ同等のフィルタが効くようにした。
- **検証**: `pytest tests/`（scanner / videos_read / admin のテスト追加分含む全件パス）。

---

## 2026-06-06 — Next.js: タブラベル修正・引くボタン大型化・カード全幅対応

**目的**: ユーザー指摘3点を修正。①タブ「選別の1本」→「運命の1本」、②引くボタンを大きくしてクリックしやすく、
③カードが表示エリアの横幅をフルに使うよう変更。

**関連ファイル**: `frontend/src/components/LibraryWorkspace.tsx`,
`frontend/src/components/VideoActionPanel.tsx`,
`frontend/src/components/VideoGrid.tsx`,
`frontend/src/app/page.tsx`, `frontend/src/app/tier2/page.tsx`

- **タブラベル**: Tier1・Tier2 共通の `LibraryWorkspace` 内「選別の1本」→「運命の1本」に変更
- **引くボタン大型化**: `FatePanel` のボタンを `size="sm"` → `size="lg"` + `px-8 py-5 text-base`
- **カード全幅**: `VideoGrid` のグリッドを `grid-cols-1 lg:grid-cols-2`（デフォルト）に変更し、
  カード幅を2列（~620px@1280px）に。運命/選別タブの1枚表示は `gridClassName="grid grid-cols-1 gap-3"` で
  フル幅（1280px）表示に対応するため `gridClassName` propsを追加。
- **検証**: Playwright で ①2列ライブラリ（ファイル名フル表示）、②大きい引くボタン、
  ③運命カードがフル幅で表示されることを確認 ✓

---

## 2026-06-06 — Next.js: カード横幅改善 + 運命カードの幅修正

**目的**: ライブラリグリッドのカードが狭く（1280px 環境で227px/4列）使いにくい問題と、
運命の1本タブのカードが `max-w-sm` ラッパーにより極端に狭くなっていた問題（4列グリッド内84px）を修正。

**関連ファイル**: `frontend/src/components/VideoGrid.tsx`,
`frontend/src/app/page.tsx`, `frontend/src/app/tier2/page.tsx`

- **VideoGrid**: `xl:grid-cols-4` → `2xl:grid-cols-4` に変更。1280px 環境では3列（~317px/枚）、
  1536px+ 環境で4列に。修正前比 +37% 幅改善。
- **運命カード幅**: Tier1・Tier2 の fate セクションから `<div className="max-w-sm">` ラッパーを削除。
  単体カードがグリッドの自然幅（~311px@1600px）を取るようになり可読性が向上。
- **再生ボタン動作確認**: Playwright で `POST /api/videos/{id}/play` が 200 OK を返すことを確認。
  UI 側は正常動作しており、動画が再生されない場合はサーバー側（`subprocess.Popen`）の
  ファイルパスまたはプレイヤー設定を確認すること。

---

## 2026-06-06 — Next.js: Tier1 を1画面3サブタブに統合（Streamlit構成へ整合）+ 細部パリティ

**目的**: Next.js 版の画面構成が Streamlit と乖離していた点を是正。最大の差は Tier1 が `/`（ライブラリ）と
`/random`（ランダム/運命）の2ルートに分裂していたこと。Streamlit は Tier1 を1画面3サブタブで提供しており、
これに整合させる。あわせて Streamlit の古い/異なる仕様を反映していた細部も修正する。

**関連ファイル**: `frontend/src/app/page.tsx`（全面改修）, `frontend/src/app/random/`（削除）,
`frontend/src/components/SidebarNav.tsx`, `frontend/src/app/tier2/page.tsx`, `frontend/src/components/Pagination.tsx`,
`README.md`, `docs/context/MIGRATION_PLAN.md`

- **Tier1 統合**: `/` を `/tier2` と同方式の「共有KPI4枚 + `<Tabs>`（📚ライブラリ/🔀ランダム/🎯運命の1本）」に
  再構成。`/random` ルートを廃止。ランダムは本数選択+シャッフル、運命の1本はボタン押下で1本取得
  （再生/判定/いいねで再抽選しない `invalidateKeys=[]` を維持）。見出しを「Tier 1 — 一次判定」に。
- **サイドバー**: 「Tier 1 ライブラリ」「Tier 1 ランダム/運命」の2項目を単一「Tier 1」へ統合し、Streamlit 順
  （Tier1→Tier2→ランキング→分析→検索→設定）に整列。AVP再生は本フェーズ対象外のため非掲載。未使用 `Shuffle` import 削除。
- **細部パリティ**: ランダム/運命の本数候補 `5/10/20/30`→`5/10/15/20`（Tier1・Tier2）。`Pagination` の
  `page_size` 候補 `20/50/100/200`→`50/100/200`。Tier1 KPI 判定率を `toFixed(1)`（Streamlit `:.1f` 準拠。
  `77.717…%`→`77.7%`）。
- **対象外**: 分析/設定/AVP の新規実装（README 残作業のまま）。`api/stats.py` の `top_n` 既定=10 と
  `API_SPEC.md` の表記は据え置き（フロントは 20 を送るため UI 影響なし・既知の軽微ドリフト）。
- **検証**: `npm run build`（生成ルート `/`・`/ranking`・`/search`・`/tier2`、`/random` 消失）+ `npm run lint` 通過。
  Streamlit(8501) と Next.js(3000)/FastAPI(8000) を起動し Playwright で画面構成を突合: Tier1 が単一サイドバー項目・
  3サブタブ・共有KPI4枚（820/2860/77.7%/0）で Streamlit と一致。タブ切替・シャッフル再抽選・運命の1本取得・
  検索（****117件）・ページング（50件/頁）・ランキング（総合/全期間/20件）を確認。書き込みは Streamlit 停止 +
  `POST /api/backup`（`videos_20260606_083850.db`）後に Next.js からいいね1件 → `POST /videos/4066/like` 200・
  カウント 0→1 を確認。

---

## 2026-06-06 — ドキュメント整備: README 新規作成・MIGRATION_PLAN 進捗更新

**目的**: 残作業の可視化とアプリ起動手順の明文化。

**関連ファイル**: `README.md`（新規）, `docs/context/MIGRATION_PLAN.md`（Phase 4-A を完了・4-B 残作業を明記）

- `README.md` を新規作成。Streamlit / FastAPI / Next.js の個別・一括起動手順、前提環境、移行期間中の注意事項、残作業一覧（分析・設定が未実装）を記載
- `MIGRATION_PLAN.md` の Phase 表を更新: 4-A を ✅完了、4-B に「実装済み: /tier2・/ranking、残: /analysis・/settings」を明記

---

## 2026-06-06 — Phase 4-B-1: ルーティング基盤 + Tier1 ランダム/運命 + 検索

**目的**: Phase 4-A の Next.js 基盤を拡張し、App Router の実ルーティング、Tier1 ランダム/運命の1本、
検索画面を追加する。`VideoCard` と API 通信基盤を再利用し、後続画面追加のパターンを固める。

**関連ファイル**: `frontend/src/components/{SidebarNav,VideoGrid,VideoCard}.tsx`,
`frontend/src/app/{random,search}/page.tsx`, `frontend/src/components/ui/tabs.tsx`,
`frontend/src/lib/api.ts`, `frontend/src/app/page.tsx`, `docs/context/{IMPLEMENTATION_GUIDE,MIGRATION_PLAN}.md`

- **ルーティング基盤**: `SidebarNav` を `next/link` + `usePathname()` に変更し、`/`・`/random`・`/search` を活線化。
  Tier2 / ranking / analysis / settings はプレースホルダとしてクリック不可のまま維持。
- **共通グリッド**: `VideoGrid` を追加し、表示中の動画だけを対象に `GET /likes` と `GET /stats/view-counts` を取得。
  ライブラリ画面も `VideoGrid` 利用へ変更。検索はクライアントページング後の表示ページ分だけを渡し、URL 長を抑制。
- **VideoCard 更新**: 画面別の `invalidateKeys` を受け取る方式へ変更。共通の KPI / likes / view-counts は更新しつつ、
  ランダム/運命画面では操作後に勝手な再抽選が起きないようリスト query の invalidate を抑制。利用不可動画の再生・判定は
  disabled、いいねは現行どおり許可。
- **Tier1 ランダム/運命**: `/random` を追加。Base UI tabs でランダムと運命の1本を切替。ランダムは本数選択 +
  シャッフルで再選出、運命の1本は初期自動取得せずボタン押下で取得。`204 No Content` は `null` として対象なし表示。
- **検索**: `/search` を追加。キーワード + 保存場所フィルタで `GET /api/videos/search` を呼び、正規化一致・利用不可込みの
  検索結果を表示。unpaged API のため、画面側でページングする。
- **検証**: `frontend` で `npm run build`（`/`, `/random`, `/search` 生成）+ `npm run lint` が通過。dev server で
  `/`・`/random`・`/search` は 200。API スモークで `/videos/unrated/random?n=10` は10件、`/videos/unrated/fate` は200、
  全角 `ＳＴＡＲ` + `storage=C_DRIVE` 検索は29件を確認。

---

## 2026-06-05 — Phase 4-A: Next.js 基盤 + Tier1 ライブラリ画面

**目的**: MIGRATION_PLAN Phase 4-A。`frontend/` に Next.js フロントエンド基盤を新設し、Tier1 ライブラリ画面
（一覧・フィルタ・検索・ソート・ページング・KPI・再生/判定/いいね）を最初の縦串として動かす。`VideoCard` と
API 通信の共通基盤（`lib/api.ts` + TanStack Query + Zustand）を確立する。

**関連ファイル**: `frontend/`（新規・Next.js 16 + React 19 + Tailwind v4 + shadcn/ui[base-nova/Base UI]）,
`frontend/src/lib/{api,types,store,levels}.ts`, `frontend/src/app/{layout,page,providers}.tsx`,
`frontend/src/components/{VideoCard,KpiCard,FilterPanel,MultiSelect,Pagination,SidebarNav}.tsx`,
`api/videos.py`（keyword 追加）, `tests/api/test_videos.py`（keyword テスト×3）, `docs/context/API_SPEC.md`,
`run_dev.bat`（新規）, `.gitignore`（frontend 節）

- **バックエンド拡張（作業0）**: `GET /api/videos` に `keyword` を追加（`normalize_text` でフィルタ適用後・ソート前に
  本質的ファイル名へ正規化部分一致）。検索 + フィルタ + ソート + ページングを1エンドポイントで合成可能にした
  （`/videos/search` は単独 `Video[]` のままで合成不可だったため）。`pytest tests/` **87 passed**（84→+3）。
- **フロント基盤**: `create-next-app`（TS / App Router / Tailwind v4 / src / `@/*`）+ `@tanstack/react-query` + `zustand`。
  shadcn/ui は `init -d`（preset base-nova = **Base UI** ベース。Radix ではない）。Base UI の Trigger は `asChild` ではなく
  **`render` プロップ**で合成する点に注意（Popover/Tooltip で適用）。
- **通信基盤**: `lib/api.ts`（fetch 薄ラッパ・`ApiError`・配列はカンマ区切り・`NEXT_PUBLIC_API_BASE` 既定
  `http://localhost:8000/api`）、`lib/types.ts`（snake_case 維持）、`lib/store.ts`（Zustand フィルタ状態、既定は
  exclude_selection=ON）、`app/providers.tsx`（QueryClientProvider + TooltipProvider）。
- **Tier1 画面**: KPI 4枚 + FilterPanel（レベル/登場人物/保存場所の複数選択=popover+command+checkbox、キーワード、
  セレクション除外/利用不可表示の switch、ソート select）+ VideoCard グリッド + Pagination。いいね数は `GET /likes`、
  視聴回数は `GET /stats/view-counts` を併用。**mutation は `onSettled` で invalidate**（成功時だけでなく 409
  ＝ファイル不在で is_available=0 更新済みでも一覧/KPI を再取得して反映）。再生はサーバー機で開く旨を tooltip 注記。
- **書き込み主体は当面 Streamlit**（並走制約）。Next.js からの write 検証は Streamlit 停止 + DB バックアップ前提
  （`run_dev.bat` に注意書き）。
- **レビュー修正（同日・追加）**: (1) `.gitignore` の `lib/`（Python 用）が `frontend/src/lib/` を巻き込み
  clean checkout でビルド不能になる問題を、`/lib/`・`/lib64/`（ルート限定）へ修正。(2) gitignore 済みなのに追跡され続けていた
  `data/user_config.json`・`.claude/settings.local.json` を `git rm --cached` で追跡解除（ローカルは残す）。
  `.claude/scheduled_tasks.lock` を gitignore 追加。(3) 利用不可動画は再生・判定を `disabled`（いいねは現行同様許可）。
  (4) 利用可否フィルタを3択（利用可能のみ/利用不可のみ/すべて表示）に整理し `availability`/`show_unavailable` へ写像。
- **検証**: `frontend` で `npm run build`（型/ビルド通過）+ `npm run lint`（0 error）。実機で利用可否「利用不可のみ」=93件
  （API と一致）・利用不可カードの再生/判定 disabled・キーワード検索（****=99件）・ページング・コンソールエラー0件を確認。

---

## 2026-06-05 — Phase 3 仕上げ: 回帰検証・api レビュー・docs 整合

**目的**: Phase 4-A（Next.js 着手）の前に、committed 済みの FastAPI バックエンドが健全かを再確認し、
`api/` 層レビューで粗を取り、計画書と実装の乖離を docs に反映して Phase 3 を正式に締める。

**関連ファイル**: `api/admin.py`（`PUT /config` をマージ保存に修正）, `tests/api/test_admin.py`（回帰テスト追加）,
`docs/context/IMPLEMENTATION_GUIDE.md`（API層を追記）, `docs/context/MIGRATION_PLAN.md`（確定構成の注記・Phase 完了印）

- **回帰検証**: `pytest tests/` を再実行し **83 passed** を再現。uvicorn 起動で実 DB に read スモーク
  （`/api/health`・`/api/videos`(total=214)・`/stats/kpi`・`/ranking?type=composite`・`/analysis/data`・
  `/analysis/rankings?kind=view_count` が 200、OpenAPI 29 パス）。`/ranking`・`/analysis/rankings` の素の 422 は
  必須パラメータ（`type`/`kind`）未指定による正しい挙動と確認。
- **api/ レビュー指摘と修正**: `PUT /config` が **全上書き + `ConfigModel` 未定義キーの脱落**で、GET→PUT
  ラウンドトリップ時に正本ファイルの `show_unavailable`/`show_deleted` 等を消す不具合を発見。`api/admin.py:put_config`
  を **`load_user_config()` へマージ保存**に変更（モデル化キーは送信値で置換＝全置換セマンティクス維持、未モデル化
  キーは保全）。回帰テスト `test_put_config_preserves_unmodeled_keys` を追加（**84 passed**）。
  - 据え置き（意図的設計と判断）: `admin.py` の `status!=success→500` 個別記述（3 箇所・可読性優先）、`actions.py` の
    存在確認 + 失敗時 re-query（404/409/500 を core 非依存で堅牢に判定するため）、`analysis._AVAIL_TO_BOOL` の
    `利用可`/`利用不可` キーは df 実値（`利用可`/`利用不可`/`不明`）と一致を確認し問題なし。
- **docs 整合**: `IMPLEMENTATION_GUIDE.md` に API層（`api_app.py` + `api/`）の構成・責務・read-only lifespan を追記。
  `MIGRATION_PLAN.md` タスク2 に「実装時の確定構成」（`scan.py`/`config.py`→`admin.py` 統合、`deps.py` 未作成、
  `_params.py`/`_serialization.py` 新設）を注記し、タスク5 の Phase 表で 3-A/3-B に ✅完了 を付与。

---

## 2026-06-05 — Phase 3-B: FastAPI 全エンドポイント実装

**目的**: API_SPEC の残り 28 エンドポイント（計 29 − Phase 3-A の `GET /api/videos`）を実装し、`core/` を
共有したまま read + mutation + 分析の全機能を FastAPI で提供する。Next.js 着手（Phase 4-A）の前提を満たす。
設計判断はユーザー合意で「過去文書整合より品質・安全・全体最適を優先」。

**関連ファイル**: `api/videos.py`(拡張), `api/stats.py`・`api/actions.py`・`api/likes.py`・`api/admin.py`・
`api/analysis.py`・`api/_params.py`・`api/_serialization.py`（新規）, `api/schemas.py`(拡張), `api_app.py`(配線),
`core/app_service.py`（wrapper 13本追加）, `core/analysis_service.py`（`get_kpi_stats` 移設・`get_like_count_ranking`
期間対応）, `ui/components/kpi_display.py`・`ui/cache.py`（KPI 移設に伴う参照更新）, `tests/api/`（conftest + 5本）,
`tests/test_analysis_service.py`（KPI/likes 期間テスト追加）, `docs/context/API_SPEC.md`（FastAPI 表記・契約更新）

- **Stage 1（core 整理）**: `get_kpi_stats(conn)` を `ui/components/kpi_display.py` → `core/analysis_service.py`
  へ移設（純 SQL・streamlit 非依存）。`ui/cache.py:get_kpi_stats_cached()` は `app_service.get_kpi_stats()` に委譲。
  `app_service` に薄い wrapper を追加（`get_videos`/`get_videos_by_ids`/`play_video`/`get_fate_video`/
  `get_unrated_random_videos`/`get_unrated_fate_video`/`search_videos`/`get_view_counts_map`/`get_last_viewed_map`/
  `get_filter_options`/`create_backup`/`get_kpi_stats`/`scan_library`）。`get_like_count_ranking` に任意
  `period_start/end` を追加（`liked_at` 絞り込み・既定 None で後方互換）。
- **Stage 2（read）**: 一覧 `GET /api/videos` に `sort`（`favorite_level`/`creation_date`/`view_count`/
  `last_viewed`/`title`/`modified`）+ `order` を追加。`/videos/{id}`・`/videos/search`・`/videos/unrated/{random,fate}`・
  `/videos/selection{,/fate}`・`/filter-options`・`/stats/{kpi,selection-kpi,view-counts,last-viewed}`・`/ranking`。
  **ルートは固定パス→`{id}` の順で定義**（FastAPI のパス解決順）。
- **Stage 3（mutation）**: `/videos/{id}/play`・`/level`・`/like`・`/likes`・`/scan/{library,selection}`・
  `GET/PUT /config`・`/backup`。HTTP マッピングは **404（事前存在チェック）/ 409（実行後 is_available==0）/ 500**
  を core 非改変・メッセージ非依存で実装。`scan_library` は config roots を **Path 化**して構築。
- **Stage 4（分析）**: `df_records()`（NaN→None / Timestamp→ISO / numpy→Python）で DataFrame を JSON 安全化。
  `/analysis/{data,viewing-history,judgment-history,response-time,rankings,selection-trend,selection-distribution}`。
  **rankings はフラット snake_case・型付き**（`is_available: bool|null` / `file_created_at: ISO|null` / `score: int`）。
- **契約整備**: 配列クエリは**カンマ区切り + repeated 両対応**（`api/_params.py`、不正整数は 422）。列挙パラメータ
  （sort/order/status/kind/type/period/availability）は `Literal` で 422。`config` に `selection_folder` を追加し、
  `/scan/selection` は folder 未設定時 400、`/stats/selection-kpi` は未設定時に全体 KPI。
- **テスト隔離**: `tests/api/conftest.py` で `core.config_utils.{CONFIG_PATH,SCAN_DIRECTORIES,DATABASE_PATH}` と
  `config.BACKUP_DIR` を tmp に monkeypatch（config_utils は import 時に定数束縛するため `config` だけでは不足）。
  play テストは `subprocess.Popen` を monkeypatch。
- **レビュー修正（同日・追加）**: (1) `PUT /level` の `level` を `Field(ge=-1, le=4)` 化し範囲外（-2/5/999）を 422、
  (2) セレクション folder 絞り込みを `core.models.is_path_within`（区切り境界尊重）へ置換し `C:\sel`/`C:\selection2`
  の誤マッチを解消（API `_folder_filter` + core `get_fate_video` 双方＝Streamlit にも波及）、
  (3) `/scan/library`・`/scan/selection` を error→500・folder 不在→404 に統一（backup と整合）、
  (4) `API_SPEC.md` の `/analysis/{data,rankings}` レスポンス形を実装一致（`{items,total}` / フラット型付き+`kind`）へ。
- **検証**: `pytest tests/` **83 passed**（既存 32 + 新規 51）。TestClient スモーク（実データ）で
  `/api/health`・`/stats/kpi`・`/videos`（total=214）・`/ranking`・`/analysis/data`（total=4056）・
  `/analysis/rankings` が 200、OpenAPI に 29 パス。`core/` 変更は KPI 移設＋wrapper＋likes 期間に限定、`ui/` は
  `kpi_display.py`/`cache.py` のみ、`data/` に差分なし。

---

## 2026-06-03 — Phase 3-A: FastAPI 基盤構築（最小・read-only）

**目的**: MIGRATION_PLAN の Phase 3-A を実装。FastAPI が `core/` を共有して `videos.db` から実データを read-only で配信できることを最小構成で実証する。Streamlit(8501) と並走しても DB へ書き込まない。`core/`・`ui/`・`streamlit_app.py`・`data/` は一切変更せず、新規ファイルのみ。

**関連ファイル**: `api_app.py`（新規）, `api/__init__.py`・`api/schemas.py`・`api/videos.py`（新規）, `tests/api/`（新規）, `run_api.bat`（新規）, `requirements.txt`（fastapi/uvicorn/httpx 追加）

- `api_app.py`: FastAPI エントリーポイント（既定 `127.0.0.1:8000`）。CORS で `localhost:3000` を許可。`GET /api/health` を提供。**lifespan は read-only**（起動時 `check_database_exists()` の確認のみ。`init_database`/`run_startup_migration` は実行せず DB 初期化は Streamlit に委ねる＝並走中の SQLite 同時書き込み回避）
- `api/schemas.py`: Pydantic モデル `VideoOut`（snake_case、派生 `is_selection_completed`/`is_judged` を含む。日時は ISO8601 文字列で素通し）, `VideosResponse`, `HealthResponse`。`VideoOut.from_video()` で dataclass → モデル変換
- `api/videos.py`: `GET /api/videos`。フィルタ（levels/performers/storage/availability/show_unavailable/show_deleted/needs_selection_filter/exclude_selection）を `app_service.create_video_manager().get_videos()` にマップ。サーバー側ソート（level/modified/created/title）+ ページング（page/page_size, 上限200）。ファサード経由のみ（core 変更不要）
- **設計**: `api/` は `core.app_service` のみを呼ぶ（ファサード一本化）。`streamlit` 非 import。view_count/last_viewed ソート・filter-options・mutation・wrapper は Phase 3-B 送り
- **検証**: `pytest tests/` 32 passed（既存27 + 新規API5）。uvicorn 起動で `/api/health`→`{status:ok, db_exists:true}`、`/api/videos?page_size=3`→実データ total=214、`/docs`(OpenAPI) 200 を確認。`git status` で `core/`・`ui/`・`streamlit_app.py`・`data/videos.db` に差分なし

---

## 2026-06-03 — Phase 3 準備: FastAPI/Next.js 移行計画の立案（ドキュメントのみ）

**目的**: Phase 2 の移行仕様書を土台に、FastAPI（バックエンド API）+ Next.js（フロントエンド）への移行を「Streamlit を動かしたまま安全に進める」ための実装計画を立案。コードは一切変更しない。

**関連ファイル**: `docs/context/MIGRATION_PLAN.md`（新規）

- バックエンドは **FastAPI** を採用（`analysis_service` の pandas DataFrame を Pydantic/JSON 直列化・自動 OpenAPI で扱える点、Next.js 側の型生成が容易な点が理由）。既存 docs の「Flask」表記は FastAPI 実装への読み替え（REST パス・スキーマは不変）と冒頭で明示
- `MIGRATION_PLAN.md`: 6タスクを報告フォーマット（結論・推奨/詳細/注意点・リスク）で記述 — (1)技術選定（FastAPI+uvicorn / Next.js App Router+TS / shadcn/ui、ポート8000推奨、`next build && next start`）、(2)ディレクトリ構成（`api_app.py`+`api/`、`frontend/`、`ui`と`api`を物理分離）、(3)FastAPI 実装計画（read系→中核mutation→統計→分析→スキャンの順、Pydantic response model + DataFrame→dict/list + datetime ISO8601、`TestClient`+既存`tmp_db`再利用）、(4)Next.js 実装計画（画面実装順、`VideoCard`等の再利用部品、TanStack Query=サーバー状態 / Zustand=クライアント横断状態、AVPはPhase4対象外）、(5)5フェーズ分割（各Phaseに**DB書き込み主体**を明記）、(6)リスク（SQLite同時書き込み・起動時migration競合・subprocess再生・CORS等）
- **検証**: `git status` で `core/`・`ui/`・`streamlit_app.py`・`data/` に差分なし（変更は docs/ と本ファイルのみ）。`pytest tests/` 全件グリーン（コード未変更の回帰なし確認）

---

## 2026-06-03 — Phase 2: Flask/Next.js 移行のための仕様書化（ドキュメントのみ）

**目的**: Flask（バックエンド API）+ Next.js（フロントエンド）への移行を「迷わず実行できる」状態にするための設計文書を新規作成。コードは一切変更しない。

**関連ファイル**: `docs/context/API_SPEC.md`（新規）, `docs/context/ACCEPTANCE_CRITERIA.md`（新規）, `docs/context/MIGRATION_MAP.md`（新規）

- `API_SPEC.md`: `core/app_service.py` を起点に Flask エンドポイントを6グループ（動画一覧・検索 / 再生・判定 / いいね / 統計・分析 / スキャン・設定 / DBバックアップ）で定義。共通事項に API 境界方針（app_service wrapper 一本化）・ローカル専用実行環境前提・Video レスポンススキーマ（snake_case、派生 `is_selection_completed` 含む）・論理削除ポリシー（一覧系のみ既定除外、単体取得は削除済みも返す）・ソート/ページング方針を明記。ファイル不在時の副作用（`is_available=0` 更新）を再生・判定エンドポイントに明記。分析画面は個別エンドポイントに分割。AVP は HTTP API 対象外として独立節に明記
- `ACCEPTANCE_CRITERIA.md`: Tier1/Tier2（各 ライブラリ/ランダム/運命の1本）・ランキング・分析・検索・AVP・設定の合否基準を日本語チェックリストで記述。異常系はファイル不在時の実挙動（履歴・レベル不変、可用性のみ更新）に整合
- `MIGRATION_MAP.md`: 現行 Streamlit UI 関数（`ui/*.py`, `streamlit_app.py`, `ui/cache.py`）と将来の Flask API の対応を画面単位の表で列挙
- **検証**: `git status` で `core/`・`ui/`・`streamlit_app.py` に差分なし（変更は docs/ と本ファイルのみ）。`pytest tests/` 全件グリーン（コード未変更の回帰なし確認）

---

## 2026-06-03 — Phase 1 追加整理: 残存デッドコード削除（調査サマリー実行）

**目的**: 読み取り専用の追加調査で特定した、active tree に残る未使用ヘルパーを削除。直近慣行に合わせ archive/ 退避ではなく直接削除（復旧は git 履歴）。

**関連ファイル**: `core/models.py`, `core/app_service.py`, `docs/reports/CODE_REVIEW_20260224.md`

- `core/models.py` から未使用4つを削除: `Video.display_name`（表示は essential_filename 直接利用に統一）・`Video.get_truncated_title()`・`create_badge()`（UI は `video_card._create_badge` を使用、重複）・`level_to_display()`（表示名は `FAVORITE_LEVEL_NAMES` に一本化）。併せて未使用となった `from config import FAVORITE_LEVEL_NAMES` import を除去
- `core/app_service.py` から未使用ラッパー `scan_and_update(scanner, conn)`（bare版）を削除。UI は `scan_and_update_with_connection()` のみ使用、テストは `scanner.scan_and_update()` を直接呼ぶため影響なし
- `CODE_REVIEW_20260224.md`: A-8 / B-3 / C-3 / C-5 を「✅ 解決済み (2026-06-03)」に更新（解決済み 11→15件）
- **保持**: `Video.is_judged()` は未使用だが今回サマリー対象外のため据え置き（次回検討候補）
- **検証**: `py_compile` OK、`pytest` 27 passed、Streamlit 起動して全7画面（Tier 1/2・ランキング・分析・検索・AVP・設定）を Playwright でスクショ・例外チェック → すべて例外0件、動画カード描画・ソート・KPI 正常を確認

---

## 2026-06-03 — Phase 1 追加整理: 未接続削除UI・KPI共通化・Streamlit warning対応

**目的**: Phase 1 準備の追加判断に基づき、復旧前提ではなく不要と判断した未接続コードを削除し、Tier 1/2 KPI 表示と用語 docs の一貫性を上げる。

**関連ファイル**: `core/video_manager.py`, `ui/analysis_tab.py`, `ui/components/kpi_display.py`, `ui/tier2_tab.py`, `streamlit_app.py`, `ui/{avp,extra,library,search,selection,unrated_random}_tab.py`, `docs/context/{DATA_MODEL,GLOSSARY}.md`

- `VideoManager.mark_as_deleted()` を削除。削除 UI は当面作らない方針のため、未接続の論理削除操作を active code から外した
- `ui/analysis_tab.py` の未使用 Matplotlib helper `_annotate_bars()` を削除。現行の分析描画は Plotly 経路に統一されている
- Streamlit の deprecated `use_container_width=True` を `width="stretch"` に置換
- KPI 表示を `KpiCard` / `render_metric_cards()` に抽象化し、Tier 2 は `render_selection_kpi_cards()` から共通コンポーネントを利用するよう変更
- `DATA_MODEL.md` を GLOSSARY 方針へ追従。概念名は「セレクション完了」、画面表示は「選別済み」、「ライブラリ取り込み済み」は使わない方針を明記
- `viewing_history` は集計用、`play_history` は再生ログ詳細として役割を明確化

---

## 2026-06-02 — Phase 1 追加整理: active 側の旧本体・shim・旧入口を除去
**目的**: Phase 1 アーカイブ済み機能の実体や後方互換 shim が active tree に残り、docs 上の「退避済み」と実ファイルの状態がずれていたため、復旧元を `archive/` に一本化する。
**関連ファイル**: `core/scanner.py`, `core/config_store.py`, `core/history_repository.py`, `ui/unrated_random_tab.py`, `ui/selection_tab.py`, `streamlit_app.py`, `core/app_service.py`, `core/video_manager.py`, `core/file_ops.py`, `ui/library_tab.py`, `ui/components/video_card.py`, `config.py`, `core/models.py`, `docs/context/{GLOSSARY,DATA_MODEL,PROJECT_OVERVIEW,IMPLEMENTATION_GUIDE}.md`, `CLAUDE.md`

- ファイルアクセス検知の active 本体 `detect_recently_accessed_files()` を `core/scanner.py` から除去。復旧元は `archive/detect_file_access.py`
- 後方互換 shim `core/config_store.py` / `core/history_repository.py` を active tree から除去。復旧元は `archive/`
- 旧トップレベル入口 `render_unrated_random_tab()` / `render_selection_tab()` を除去し、Tier 1/2 から呼ばれる下位モード関数だけを active に残した
- active ファイル内の commented archived code を削除。互換のための DB カラム・テーブル定義は残す
- 表示名の正本を `FAVORITE_LEVEL_NAMES` に寄せ、レベル表記を `LvN` に統一
- session key の `filter_actors` を `filter_performers` に移行し、旧キーは起動時に引き継いで削除
- 用語整理: `!` は現行の未選別 prefix、`?` は旧表記扱い。概念名は「セレクション完了」、画面表示は「選別済み」、「ライブラリ取り込み済み」は使わない
- `viewing_history` は集計用、`play_history` は再生ログ詳細として docs に明記

---

## 2026-06-02 — Phase 1 追加整理: archived 本体を archive/ に集約

**目的**: docs 上は archived とされているのに `core/` / `ui/` に tracked な実ファイルが残っていた状態を解消し、復旧元を `archive/` に一本化する。

**関連ファイル**: `core/settings.py`, `core/counter_service.py`, `core/snapshot.py`, `ui/analysis_tab_v2.py`, `archive/{settings,counter_service,snapshot,analysis_tab_v2}.py`, `core/app_service.py`, `core/video_manager.py`, `streamlit_app.py`, `tests/test_video_manager.py`, `docs/context/DATA_MODEL.md`

- `core/settings.py` / `core/counter_service.py` / `core/snapshot.py` / `ui/analysis_tab_v2.py` の active tree 側の重複を除去。実装本体は `archive/` 配下の退避済みコピーを復旧元とする
- archived 済みモジュールへのコメントアウト import / re-export を active code から除去
- `DATA_MODEL.md` に `is_judging` / `counters` / archived viewing_method の扱いを追記
- archived 機能に対する skip テストを削除

---

## 2026-06-02 — Phase 1 追加整理: デッドコード／死にUI／孤立 shim の退避（壁打ち合意 #1-8）

**目的**: Flask/Next.js 移行前に、Phase 1 アーカイブの波及で死んだコードと未使用要素を整理。方式は Phase 1 と同じ（archive/ 退避＋コメントアウトでコード保持）。

**関連ファイル**: `core/video_manager.py`, `core/app_service.py`, `core/file_ops.py`, `ui/library_tab.py`, `streamlit_app.py`, `tests/test_video_manager.py`, `tests/test_history_repository.py`, `archive/{config_store,settings,history_repository,video_manager_methods}.py`

- **死にUI: 「判定中のみ表示」フィルタ無効化**: `is_judging` は Phase 1 で `set_judging_state` が退避され常に0となり、ONにすると0件になる死にUIだった。`library_tab.py` のチェックボックス・`get_videos(show_judging_only=...)` 呼び出し・signature・`video_manager.get_videos` の `show_judging_only` 引数/分岐・`streamlit_app.py` の `filter_judging_only` 初期化をコメントアウト。`test_get_videos_filters_judging_only` を skip 化
- **VideoManager 未使用/重複メソッド退避**: `set_favorite_level`（`set_favorite_level_with_rename` の重複）・`get_random_video`・`get_viewing_stats`・`get_videos_with_stats`・`record_file_access_as_viewing`（ファイルアクセス検知退避により孤立）をコメントアウト。本体は `archive/video_manager_methods.py` に集約
- **core/settings.py アーカイブ**: 当初「スキャン設定と共用のため残す」とされたが、実際はスキャンと無関係で唯一の利用者（ファイルアクセス検知）が退避済の孤立モジュールと判明。`archive/settings.py` に退避し、`app_service` の `get_last_access_check_time`/`update_last_access_check_time` import・re-export をコメントアウト
- **孤立ファサード/re-export 整理** (`app_service.py`): `record_file_access_as_viewing`・`detect_recently_accessed_files`(＋`file_ops` 側 re-export)・`detect_recently_accessed_files_with_connection`・`insert_play_history`（video_manager は `core.database` を直接利用）をコメントアウト。`video_manager.py` の未使用 import `get_last_viewed_map` を除去
- **shim 退避**: `config_store.py`（どこからも未 import）・`history_repository.py`（test専用）を `archive/` に退避。`test_history_repository.py` は `core.database` 直参照に変更しカバレッジ維持
- **対象外**: docs 陳腐化更新（別タスク）、`mark_as_deleted`／コメント残骸／archive 内 .pyc（低優先で見送り）
- **検証**: `pytest` 27 passed / 2 skipped、`py_compile` OK、Streamlit 起動して Tier 1（判定中フィルタ消滅を確認）・分析ダッシュボードが例外なく描画されることを Playwright で確認

---

## 2026-06-02 — Phase 1 バグ修正: Tier 1/2 フラグメントエラー修正 + Tier 1 KPI 追加

**関連ファイル**: `ui/tier1_tab.py`, `ui/tier2_tab.py`

- **根本原因**: `render_tier1_tab` / `render_tier2_tab` に `@st.fragment` がなく、サブ関数内の `st.rerun(scope="fragment")` が fragment スコープ外から呼ばれ `StreamlitAPIException` が発生していた
- **修正**: 両ファイルに `@st.fragment` を追加。Streamlit はネストフラグメントをサポートするため `render_library_tab`（内側 fragment）との共存は問題なし
- **KPI 追加**: `render_tier1_tab` に `render_kpi_cards()` を追加。Tier 2 と同様のパターンで画面最上部に固定表示
- **session_state 初期化**: `render_tier1_tab` に `unrated_fate_video` の初期化を追加（`render_unrated_fate_mode` が前提とするキー）
- **動作確認**: Playwright でランダムタブ再生・運命の1本（Tier 1・Tier 2 両方）が全てエラーなしで動作確認済み

---

## 2026-06-02 — Phase 1: 整理・削減（アーカイブ + サイドバー再構成）

**関連ファイル**: `streamlit_app.py`, `core/video_manager.py`, `core/app_service.py`, `ui/components/video_card.py`, `ui/unrated_random_tab.py`, `ui/selection_tab.py`, `ui/tier1_tab.py`（新規）, `ui/tier2_tab.py`（新規）, `docs/context/GLOSSARY.md`（新規）

### アーカイブした機能（`archive/` に保存、呼び出し箇所はコメントアウト）

- **ファイルアクセス検知** (`detect_and_record_file_access`): サイドバーの「📊 視聴履歴を検知」ボタンと関数本体を無効化。→ `archive/detect_file_access.py`
- **判定中バッジ** (`is_judging`): `video_card.py` のバッジ描画と `_handle_play` / `_handle_judgment` の `set_judging_state` 呼び出しを無効化。DBカラム `is_judging` は保持。→ `archive/video_manager_methods.py`
- **手動視聴記録** (`mark_as_viewed`): 外部呼び出しなし、VideoManager からコメントアウト。→ `archive/video_manager_methods.py`
- **カウンター機能** (`counter_service.py`): `auto_start_counters` の全呼び出し箇所を無効化。`counters` テーブル・データは保持。→ `archive/counter_service.py`
- **スナップショット** (`snapshot.py`): `app_service.py` の re-export を無効化。→ `archive/snapshot.py`
- **分析ダッシュボード v2** (`analysis_tab_v2.py`): サイドバー選択肢から削除、import を無効化。→ `archive/analysis_tab_v2.py`

### サイドバー再構成

- **Tier 1 / Tier 2 構造**: サイドバーを「Tier 1・Tier 2・ランキング・分析ダッシュボード・検索・AVP再生・設定」の7項目に再編
- **`ui/tier1_tab.py`** 新規作成: ライブラリ（`render_library_tab`）・ランダム・運命の1本の3サブタブで Tier 1 画面を構成
- **`ui/tier2_tab.py`** 新規作成: セレクション KPI + ライブラリ・ランダム・運命の1本の3サブタブで Tier 2 画面を構成
- `ui/unrated_random_tab.py`: `_render_random_mode` / `_render_unrated_fate_mode` を public 化（tier1_tab から呼び出し）
- `ui/selection_tab.py`: `_render_library_mode` / `_render_random_mode` / `_render_fate_mode` を public 化（tier2_tab から呼び出し）

### その他

- **`docs/context/GLOSSARY.md`** 新規作成: Coding agent 向け用語集
- `tests/test_video_manager.py`: アーカイブ済みの `test_set_judging_state_start_and_finish` に `@pytest.mark.skip` を追加

---

## 2026-06-01 — 新機能: 未判定ランダムタブに「運命の1本」追加

**関連ファイル**: `ui/unrated_random_tab.py`, `core/video_manager.py`, `streamlit_app.py`

- **サブタブ化**: 未判定ランダムタブを「🔀 ランダム（従来のグリッド表示）」と「🎯 運命の1本」の2サブタブ構成に変更
- **運命の1本**: 未判定動画（`favorite_level = -1`）から純粋ランダムで1本を選出・自動再生・判定できる。ボタン押下で即座にプレイヤー起動
- **判定後**: カードを残したまま、再度ボタンを押すと次の1本を選出（手動）
- **`get_unrated_fate_video()`**: `VideoManager` に新メソッドを追加。`get_unrated_random_videos(1)` を委譲し、ドライブ確認・ファイル存在チェック込みの純粋ランダム選出を実現
- **session_state 同期**: `_handle_play` / `_handle_judgment` に `unrated_fate_video` の状態同期を追加（`is_judging` / `current_favorite_level` の即時反映）

---

## 2026-05-24 — 新機能: AVP並列再生タブ追加

**関連ファイル**: `ui/avp_tab.py`（新規）, `ui/components/video_card.py`, `ui/library_tab.py`, `ui/unrated_random_tab.py`, `ui/selection_tab.py`, `ui/search_tab.py`, `streamlit_app.py`, `ui/extra_tabs.py`, `core/config_utils.py`

- **AVP再生タブを新設**: サイドバーに「AVP再生」タブを追加。ライブラリ・ランダム・セレクション・検索の各タブでチェックした動画を一覧表示し、最大4本を選択してAwesome Video Playerで並列再生する
- **チェックボックス追加**: 全タブの `render_video_card` / `render_search_video_card` に `show_avp_checkbox` 引数を追加。カード左上に小さいチェックボックスを表示し、チェック状態はセッション全体の `avp_selected_ids: set[int]` で横断管理
- **AVP並列再生フロー**: ①各タブでチェック → ②AVP再生タブを開く → ③チェック済み一覧から再生する本数（1〜4本）を選択 → ④「▶ AVPでN本再生」ボタンでAVP起動 → ⑤下段に評価カード即時表示 → ⑥判定
- **設定タブ**: AVP実行ファイルパスの入力欄を追加。`user_config.json` の `avp_exe_path` キーで管理（デフォルト: `C:\Program Files (x86)\Awesome Video Player\AVPlayer.exe`）
- **サイドバーカウント表示**: チェック済み本数が1本以上のとき「AVP再生 (N)」と件数を表示
- **事前テスト済み**: Awesome Video Player に複数ファイルをコマンドライン引数で渡すと画面分割で並列再生されることを確認済み

---

## 2026-05-24 — 新機能: 「🎯 運命の1本」タブ追加

**関連ファイル**: `core/video_manager.py`, `ui/selection_tab.py`

- セレクションタブに「🎯 運命の1本」タブを新設（ライブラリ・ランダムと並列）
- **選出ロジック**: `needs_selection=True` の動画を前回視聴からの経過日数で重み付けして `random.choices()` で1本選出。未視聴は経過9999日扱い
- **UIフロー**: ボタン押下で自動再生 → 既存の評価UI（レベル選択・いいね）で判定 → 評価後も動画表示を維持。次の1本はボタン再押下で選出
- `VideoManager.get_fate_video(folder_path_str)` を `core/video_manager.py` に追加
- `get_last_viewed_map` を `core/database.py` から直接インポートして利用

---

## 2026-03-09 — 機能改善: ランキングタブ（集計期間・デフォルト・総合ランキング追加）

**関連ファイル**: `core/analysis_service.py`, `ui/ranking_tab.py`, `streamlit_app.py`

- **集計期間を整理**: 30日・90日を削除し180日を追加。デフォルトを「全期間」に変更
- **表示件数デフォルト変更**: 10件 → 20件
- **「総合」ランキング追加**: 視聴回数(×1.0)・視聴日数(×1.2)・いいね数(×1.5) を正規化合算し、レベル乗数（Lv4=1.5〜未判定=0.0）を掛けた複合スコア（最大555pt）。未判定動画は除外される
- **セッション状態の防衛的初期化**: 旧セッションに "30日"/"90日" が残っていた場合に "全期間" へリセット

---

## 2026-03-09 — 機能改善: ランキングタブのレベルフィルタをラジオボタンに変更

**関連ファイル**: `core/analysis_service.py`, `ui/ranking_tab.py`

### ランキングタブ: レベルフィルタの改善
- **目的**: 「Lv3のみ」トグルでは Lv4 を選択できなかった問題を解消
- `core/analysis_service.py`: `get_ranked_videos_for_tab()` の `lv3_only: bool` パラメータを `min_level: Optional[int] = None` に変更。`None`=フィルタなし、`3`=Lv3以上、`4`=Lv4のみ
- `ui/ranking_tab.py`: トグルをラジオボタン（「制限なし」「Lv3以上」「Lv4のみ」）に差し替え。列比率を `[4,1]` → `[3,2]` に変更

---

## 2026-03-09 — 機能追加: ライブラリタブにセレクション関連除外フィルタを追加

**関連ファイル**: `core/video_manager.py`, `ui/library_tab.py`, `streamlit_app.py`

### ライブラリタブ: セレクション関連ファイルの除外フィルタ
- **目的**: ライブラリタブに `[!]`（未選別）・`[+]`（セレクション完了）プレフィックスのファイルが混在する問題を解消
- `core/video_manager.py`: `get_videos()` に `exclude_selection: bool = False` パラメータを追加。`True` のとき `needs_selection = 0 AND is_selection_completed = 0` を WHERE 句に付加
- `streamlit_app.py`: `filter_hide_selection = True` をセッション状態の初期値として追加（デフォルトON）
- `ui/library_tab.py`: フィルタエクスパンダー内に「セレクション関連を除外」チェックボックスを追加、`get_videos()` 呼び出しに `exclude_selection` を渡す、`signature` にも含めてページリセットに対応

---

## 2026-03-03 — バグ修正: KPI計算の修正・セレクション関連改善

**関連ファイル**: `core/scanner.py`, `core/database.py`, `ui/components/kpi_display.py`, `ui/selection_tab.py`, `tests/test_scanner.py`

### A-1 差し戻し: scan_and_update() を旧動作に復元
- **経緯**: 2026-02-25のA-1修正（スキャン済みディレクトリ配下のみ is_available=0 更新）によりKPI数値が増加
- **原因**: Dドライブがlibrary_rootsに登録されている状態でDドライブ接続時にスキャンすると、Dドライブ動画が is_available=1 になりKPIに混入していた
- **修正**: `scan_and_update()` をスキャンで見つからなかった**全動画**を is_available=0 に更新する旧動作に戻す。スキャン済みディレクトリ0件のみスキップ（安全ガード維持）
- `tests/test_scanner.py`: `test_scan_only_updates_is_available_for_scanned_dirs` を旧動作確認テスト `test_scan_updates_all_not_found_videos_is_available` に書き換え、A-1固有の回帰テスト `test_scan_does_not_falsely_mark_sibling_dir_unavailable` を削除

### DBカラム追加: is_selection_completed
- **目的**: `+` プレフィックス（セレクション選別完了）動画を正確に管理するための専用フラグ
- `core/database.py`: `videos` テーブルに `is_selection_completed BOOLEAN DEFAULT 0` を追加、インデックス `idx_is_selection_completed` 追加、既存の `+` プレフィックスファイルを Python ループで移行
- `core/scanner.py`: `_process_file()` で `is_sel_completed` を UPDATE/INSERT に反映（以前は `_is_sel_completed` として捨てていた）

### KPI修正: セレクションフォルダの動画をKPI対象外に
- **原因**: セレクションフォルダ（`!`/`+` プレフィックス）の動画が未判定・判定済みKPIに混入していた
- `ui/components/kpi_display.py`: 未判定数・判定済み数のクエリに `AND needs_selection = 0 AND is_selection_completed = 0` を追加

### KPI修正: 本日の判定数からセレクション選別を除外
- **原因**: ライブラリ・未判定ランダムタブの「本日の判定数」がセレクションでの選別もカウントしていた
- `ui/components/kpi_display.py`: `today_judged_count` クエリに `AND was_selection_judgment = 0` を追加

### UI改善: セレクションランダムモードのデフォルトカラム数を5に変更
- `ui/selection_tab.py`: ランダムモードのカラム数ラジオボタンのデフォルトを 4 → 5 に変更（`index=1` → `index=2`）

---

## 2026-02-28 — 新機能: ランキングタブ追加

**関連ファイル**: `core/analysis_service.py`, `core/app_service.py`, `ui/ranking_tab.py`, `streamlit_app.py`

### 概要
視聴回数・視聴日数・いいね数の3種ランキングを動画カードとして表示する「ランキング」タブを追加。ナビゲーション位置はセレクションと分析ダッシュボードの間。

### 変更内容
- `core/analysis_service.py`: `_df_row_to_video()` ヘルパーと `get_ranked_videos_for_tab()` を追加
  - 集計期間（30日/90日/1年/全期間）・Lv3フィルター・利用可否フィルター・表示件数に対応
  - 同スコア時は `last_viewed_at` 降順でタイブレーク
- `core/app_service.py`: `get_ranked_videos_for_tab` を re-export
- `ui/ranking_tab.py`: ランキングタブ全実装（新規作成）
  - 1〜3位に🥇🥈🥉メダルバッジ、4位以降は #N 表示
  - いいね時に `_fetch_ranking.clear()` でキャッシュ無効化
  - `@st.cache_data(ttl=60)` で60秒キャッシュ
- `streamlit_app.py`: import 追加・ナビに「ランキング」挿入・main() に分岐追加

---

## 2026-02-28 — バグ修正: 未判定ランダムタブ・スキャン

**関連ファイル**: `core/video_manager.py`, `core/scanner.py`, `streamlit_app.py`, `tests/test_video_manager.py`, `tests/test_scanner.py`

### 未判定ランダムタブのバッジ更新バグ修正
- **原因**: `unrated_videos` セッションキャッシュ内の `Video` オブジェクトが DB 更新後も古い値のまま残る
- `streamlit_app.py` `_handle_play`: 再生成功後に `unrated_videos` 内の該当 Video の `is_judging=True` を即時反映 → 「判定中」バッジが表示されるよう修正
- `streamlit_app.py` `_handle_judgment`: 判定成功後に `current_favorite_level=new_level`, `is_judging=False` を即時反映 → 「未判定」バッジが判定後も残るバグを修正
- `tests/test_video_manager.py`: `test_set_favorite_level_updates_db_level` を追加（回帰テスト）

### スキャン: 兄弟ディレクトリ誤判定バグ修正
- **原因**: `startswith()` による文字列前方一致でパス比較していたため、`data_selection/` が `data/` のスキャン対象と誤認識される
- `core/scanner.py` `scan_and_update()`: パス比較を `startswith()` → `Path.is_relative_to()` に変更
- `tests/test_scanner.py`: `test_scan_does_not_falsely_mark_sibling_dir_unavailable` を追加

### 未判定ランダム: 不在ファイル除外
- **原因**: 外付けHDD未接続時、`is_available=1` のまま保持される HDD 上の動画が未判定ランダムに表示され、再生時に「ファイルが見つかりません」エラーになる
- `core/video_manager.py` `get_unrated_random_videos()`: DB取得後に `Path.exists()` で実在確認し、不在ファイルを除外
- ドライブ単位で接続確認をキャッシュし高速化（全件取得 + フィルタ方式）
- `tests/test_video_manager.py`: `test_get_unrated_random_videos_excludes_nonexistent_files` を追加

### スキャン: セレクションフォルダの同期
- `streamlit_app.py` `scan_files()` / `scan_files_for_settings()`: スキャン後に `app_service.scan_selection_folder()` を呼び出し、セレクションフォルダの `is_available` を同期するよう修正

---

## 2026-02-28 — Phase 3: 依存関係・層分離

**関連ファイル**: `requirements.txt`, `requirements-lock.txt`, `core/app_service.py`, `streamlit_app.py`

- `requirements.txt`: 全パッケージにバージョン上限を追加（例: `streamlit>=1.30.0,<3.0.0`）
- `requirements-lock.txt`: `pip freeze` で生成（ロックファイル）
- `core/app_service.py`: `run_startup_migration()` を追加。DBマイグレーションをAppServiceに委譲
- `streamlit_app.py`: `Migration` 直接利用 → `app_service.run_startup_migration()` に変更

## 2026-02-28 — Phase 2: ロギング

**関連ファイル**: `core/logger.py`（新規）, `core/scanner.py`, `core/settings.py`, `core/video_manager.py`, `core/database.py`, `.gitignore`

- `core/logger.py` 新規作成: `RotatingFileHandler`（`data/clipbox.log`, 5MB×3世代）
- 上記4ファイルの `print()` を `logger.xxx()` に全置換
- `.gitignore` に `data/clipbox.log*` を追加

## 2026-02-28 — Phase 1: テスト補強

**関連ファイル**: `tests/test_video_manager.py`, `tests/test_scanner.py`, `core/database.py`, `tests/test_backup.py`（新規）

- `test_video_manager.py`: `test_set_judging_state_start_and_finish`, `test_set_favorite_level_file_not_found_leaves_db_unchanged` 追加
- `test_scanner.py`: `test_scan_only_updates_is_available_for_scanned_dirs`, `test_scan_does_not_change_is_available_when_no_files_found` 追加
- `core/database.py`: `create_backup()` を追加（`BACKUP_DIR` に `.db` を生成）
- `tests/test_backup.py`: バックアップ機能のテスト新規作成

## 2026-02-25 — コードレビュー Top5 修正

**関連ファイル**: `core/scanner.py`, `core/counter_service.py`, `core/video_manager.py`, `streamlit_app.py`, `ui/cache.py`, `tests/conftest.py`

- **A-1** `core/scanner.py`: `scan_and_update()` の `is_available=0` 更新を実際にスキャンしたディレクトリ配下のレコードのみに限定。外付けHDD未接続時の誤フラグ落とし防止
- **B-4** `core/counter_service.py` + `core/video_manager.py`: `auto_start_counters(event_time, conn)` に `conn` 引数を追加しネスト接続による `SQLITE_BUSY` を排除
- **A-6** `streamlit_app.py`: `_handle_play`, `_handle_judgment`, `scan_files`, `detect_and_record_file_access` の後に `ui_cache.xxx.clear()` を追加
- **C-1** `ui/cache.py` 新規作成: `@st.cache_data` 関数を `core/app_service.py` から移動。core/ から `import streamlit` を削除
- **C-6** `tests/conftest.py` 新規作成: `tmp_db` フィクスチャで DB パスパッチを一元化

## 2026-02-23 — セレクション機能実装

**関連ファイル**: `core/scanner.py`, `core/database.py`, `core/models.py`, `core/video_manager.py`, `core/selection_service.py`（新規）, `ui/selection_tab.py`（新規）, `core/analysis_service.py`, `streamlit_app.py`

- `!` プレフィックス付き動画（セレクション未選別）の管理機能を追加
- `+` プレフィックス（セレクション選別完了）の対応
- `extract_essential_filename()` を4タプル返却に変更: `(level, essential, needs_selection, is_selection_completed)`
- `videos` テーブルに `needs_selection` カラム追加
- `judgment_history` テーブルに `was_selection_judgment` カラム追加
- セレクションタブ（`ui/selection_tab.py`）を新規追加
- 分析タブにセレクション成果分析セクションを追加
- 検索タブ（`ui/search_tab.py`）を追加

## 2026-02-21 — いいね機能実装

**関連ファイル**: `core/like_service.py`（新規）, `core/database.py`, `ui/components/video_card.py`

- `likes` テーブルを追加
- `core/like_service.py`: `add_like()`, `get_like_counts()` を実装
- 動画カードにいいねボタンを追加
- 利用不可動画でもいいね操作を許可

## 2026-01-25 — Phase 1: Streamlit UI 実装（初期）

**関連ファイル**: 全ファイル

- 3層アーキテクチャ（UI / Core / Data）の確立
- `core/video_manager.py`: ビジネスロジック中核
- `core/scanner.py`: ファイルスキャン・プレフィックス解析
- `core/database.py`: SQLite接続管理（コンテキストマネージャ）
- `core/models.py`: Video, ViewingHistory データクラス
- `core/counter_service.py`: カウンター機能
- `core/analysis_service.py`: 統計分析
- 動画一覧タブ・未判定ランダムタブ・分析タブ・設定タブの実装
