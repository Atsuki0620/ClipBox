# 統合 Variant K — 段階5「あとで見る・AVP 作り込み」実装メモ

> 段階5は本体実装ではなく **サンプルDB接続前の UI LAB モック**。実 API / DB / migration / 設定ファイル / 実データ / localStorage・sessionStorage 本体仕様には触れていない。状態はすべて **ページ内メモリ** に閉じている。対象は統合 Variant K の `/lab/variant-k/watch-later` と `/lab/variant-k/avp` のみ。

## 1. 実装した内容

`/lab/variant-k/watch-later` を 未処理／確認・見直し／処理済み候補 の3セクション構成のあとで見る消化画面に、`/lab/variant-k/avp` を 上段＝AVP候補テーブル／下段＝2×2再生セットの2段構成に、それぞれプレースホルダーから作り込んだ。最重要方針として **あとで見る（DB相当・恒久）と AVP候補（localStorage相当・一時）を UI 上で混同させない**ことを徹底し、特に **AVP再生であとで見るを自動解除しない**前提で見せている。

## 2. 作成・変更したファイル

**新規（`watch-later/`）**
- `page.tsx`（3セクション＋タイトル横 Tooltip に解除ルール集約）
- `useWatchLaterMockState.ts`（`useWatchLaterMockStates` / video id 単位のページ内メモリ状態）
- `shared.ts`（セクション分類・ステータス文言・付与理由メモの純関数）
- `WatchLaterSectionBlock.tsx`（1セクション分の見出し＋カードグリッド＋空状態）
- `WatchLaterCard.tsx`（カード土台＋状態＋付与理由メモ＋操作行の合成）
- `WatchLaterCardActions.tsx`（再生／いいね／あとで見る解除／AVP候補追加／該当Tierへ戻る導線）

**新規（`avp/`）**
- `page.tsx`（上段テーブル＋下段2×2＋タイトル横 Tooltip）
- `useAvpMockState.ts`（`useAvpMockStates` / 候補・再生対象・いいね・再生中ハイライトのページ内メモリ状態）
- `shared.ts`（`MAX_AVP_PLAY_TARGET=4`・総合スコア文言・母集団切替の純関数）
- `AvpCandidateTable.tsx`（`VariantKActionTable` 流用の候補テーブル）
- `AvpPlaySet.tsx`（`VariantKVideoCard` 流用の2×2再生セット）

**変更**
- `_data/variantKMock.ts` — 3セクション／各状態を確認できるダミー行（ids 13..17）を追加（既存 12 行は不変）。
- `CHANGELOG.md` — 段階5を追記。

**変更なし（流用のみ）**
- `_components/VariantKVideoCard.tsx` / `VariantKActionTable.tsx` / `VariantKBadge.tsx` / `VariantKEmptyState.tsx` / `VariantKSectionHeader.tsx` / `VariantKTooltipLabel.tsx` は既存 props のまま流用（後方互換 prop の追加も不要だった）。

## 3. あとで見る画面の方針

あとで見るは判定／選別を後回しにした動画を消化する独立タスク画面。状態ベースの3セクションをカード優先（PC幅は `auto-fit/minmax(11rem,1fr)` で概ね5列）で並べる。解除ルールの長文はカードに出さず、タイトル横の Tooltip に集約。付与理由は状態から短いメモを導出してカードに1行だけ出す。

## 4. あとで見る3セクションの分類

`watch-later/shared.ts` の純関数で分類する。

- **未処理**: Tier2 対象（`tier2_status !== "none"`）なら Tier2 未選別（`"unselected"`）、それ以外は Tier1 未判定（`tier1_status === -1`）。
- **確認・見直し**: 処理済み（Tier1 判定済み / Tier2 選別済み）かつ最終再生なし（`last_played_at == null`）。
- **処理済み候補**: 処理済みかつ最終再生あり（`last_played_at != null`）。

`last_played_at` は本体の `/stats/last-viewed`（最終 APP 再生日）の **モック相当**として使用している。ステータス文言は `Tier1 未判定` / `Tier1 Lv3` / `Tier2 未選別` / `Tier2 Lv2` のように Tier1/Tier2 を混同しない。

## 5. あとで見る解除ルールの見せ方

タイトル横 `VariantKTooltipLabel` に集約（カード内に長文を出さない）。文面は次の考え方:

- 未処理のあとで見るは、判定／選別を済ませると自動解除される想定。
- 処理済みのあとで見るは、いいねやレベル変更などで解除候補になる想定。
- 通常再生だけでは自動解除しない。
- AVP候補追加でも自動解除しない。
- **AVP再生でも、あとで見るは自動解除しない。**

これは見せ方のモックで、自動解除の本体仕様（条件ロジック）は段階5では実装していない。カード上の「解除」ボタンは個別解除を表す手動操作。処理済み候補セクションにのみ控えめな「まとめて確認」ボタンを置き、一括解除は主役にしていない。

## 6. あとで見ると AVP候補を混同していないこと

- 状態を別変数で保持: あとで見る＝`watchLater`（DB相当）、AVP候補＝`avpCandidate`（localStorage相当・メモリのみ・初期 false）。相互に影響しない。
- あとで見る画面の操作行では「あとで見る解除」と「AVP候補に追加」を別ボタンに分け、AVP候補追加であとで見るを解除しない。
- AVP画面の候補テーブルでは「あとで見る」を**状態表示のみの列**にし、Tooltip で「AVP候補とは別物・ここからは操作しない」と明記。
- AVP候補バッジ（`avp_candidate` kind）は初期 OFF（既存規約どおり・ボタン/列の見た目で表現）。

## 7. AVP画面の方針

案D改に沿って 上段＝AVP候補テーブル（ランキング/検索と将来共有する `VariantKActionTable` 土台）／下段＝今回 AVP で再生する2×2再生セット（`VariantKVideoCard` 流用）の2段構成。候補は上限なし、再生対象は最大4本。タイトル横 Tooltip に候補=一時/再生対象=最大4本/AVP再生で自動解除しない旨を集約。

## 8. AVP候補テーブルの列と操作

列: タイトル / 総合スコア（`128.4 pt（総合 1位）` 形式）/ 視聴日数 / いいね（表示のみ・クリック不可）/ あとで見る（状態表示のみ）/ Tier1 / Tier2 / 利用可否 / 操作。操作は「再生対象に追加」（利用不可・再生対象4本到達・追加済みで disabled）と「候補から外す」。上部に「再生可能だけ⇔全動画」順位母集団の軽量切替（`Switch`・既定=再生可能だけ）と控えめな「全候補をクリア」。利用不可は行を薄く（`dimRow`）、再生中は行ハイライト（`playingRow`）。テーブルにはバッジを置かない（土台方針）。

## 9. 2×2再生セットの方針

最大4本を `sm:grid-cols-2` の2×2で表示。各カードは外す／個別いいね。セット上部右に 一括いいね（未いいねのみ ON）／再生対象をクリア／AVPで再生。空きスロットは控えめな破線プレースホルダ（「空きスロット」）で、**大きなスロット番号 1/2/3/4 は出さない**。

## 10. AVP再生であとで見るを自動解除しないこと

`useAvpMockState.ts` の `playAvp()` は再生対象を再生中ハイライト（`playingIds`）にするだけで、`watch_later` を一切変更しない。候補追加・再生対象追加・個別/一括いいね・クリアのどの操作でもあとで見るを解除しない。再生後クリアは「想定」として Tooltip/説明文で示すのみ（モックでは再生対象を保持しハイライトを見せる）。SPEC_NEXTJS §14・§4 の採用済み方針（H1）と整合。

## 11. 視聴回数・更新日・登録日を出していないこと

カードは `VariantKVideoCard` 土台（視聴回数/更新日/登録日/サムネを出さない設計）を流用。テーブル列も タイトル/総合スコア/視聴日数/いいね/あとで見る/Tier1/Tier2/利用可否/操作 のみで、視聴回数・更新日・登録日・スロット番号は出していない。主役指標は視聴日数、日付は作成日／判定日／選別日。

## 12. 利用不可状態の見せ方

- カード（あとで見る・2×2）: `VariantKVideoCard` の薄表示＋「利用不可」バッジ。再生・AVP候補追加は disabled。
- テーブル（AVP候補）: 行全体を薄く（`dimRow`）し、利用可否列に「不可」。「再生対象に追加」は disabled（title で理由表示）。

## 13. 既存 Variant への影響を避けるためにしたこと

- 既存 Variant A〜K・lab 共通部品・Tier1/Tier2 のファイルは無改変（流用のみ）。新規ロジックは `watch-later/` と `avp/` 配下に閉じた。
- 共通部品は後方互換 prop の追加すら不要だった（既存 props で足りた）。過剰共通化を避け、画面固有の状態フック・操作行は各ディレクトリに置いた。
- `_data/variantKMock.ts` は既存 12 行を変更せず末尾に追加のみ（id/score/rank の衝突なし）。

## 14. スクショ保存先

`frontend/src/app/lab/variant-k/_review/stage5/`

取得対象: あとで見る全体／未処理／確認・見直し／処理済み候補／あとで見る解除後／AVP全体／候補テーブル／2×2再生セット／再生中ハイライト／利用不可が追加不可／Runtime control／lg未満横スクロール nav。

（取得状況はこのメモ末尾「スクショ取得状況」に追記する。取得不可の場合は理由と手動目視確認結果を記載する。）

## 15. 段階6に進む前の確認事項

- AVP候補テーブルの列順・総合スコア表示形式・「再生可能だけ⇔全動画」既定値の採否。
- 処理済み候補の「まとめて確認」を一括解除に育てるか、個別解除のままにするか。
- あとで見るカードの付与理由メモの粒度（現状は状態からの自動導出）。
- AVP候補バッジの初期 ON/OFF（現状 OFF）。
- ランキング/検索（段階6）でテーブル土台 `VariantKActionTable` をどこまで共有・拡張するか。

## 16. 未対応リスク（段階5では直さない）

- **外側 SidebarNav の 390px 幅制約**: 既存ルートレイアウト由来で、統合 Variant K 内のあとで見る/AVP作り込みとは別スコープのため段階5では未対応。Variant K 内の lg 未満横スクロール nav が機能することのみ確認する。
- **既存 Recharts 警告 `width(-1) and height(-1)`**: 今回の変更箇所と無関係。段階5では直さない（ビルドは成功）。段階5の2画面は Recharts 不使用。

---

## スクショ取得状況（2026-06-28 取得完了）

Claude Code 環境の Playwright（MCP）で `frontend/src/app/lab/variant-k/_review/stage5/` に取得:

- `watch-later-full.png` — あとで見る全体（3セクション 未処理4／確認・見直し3／処理済み候補3・サイドバー下部の Runtime control・利用不可×あとで見るの薄表示が見える）
- `watch-later-after-remove.png` — あとで見る解除後（未処理の1件を解除し 4→3・全 10→9 件に減ることを確認）
- `avp-initial.png` — AVP全体（上段候補テーブル・空の2×2再生セット）
- `avp-playset-playing.png` — 再生対象に4本追加して「AVPで再生」した状態（2×2が再生中ハイライト・候補行は「追加済み」・5件目の追加は最大4本到達で disabled）
- `avp-unavailable-not-addable.png` — 「再生可能だけ」OFF で利用不可候補（test_footage_b2）が薄表示＋「再生対象に追加」disabled になることを確認
- `watch-later-mobile-nav.png` — lg 未満（ビューポート幅 520px・ブラウザ最小幅クランプ）で内側サイドバーが隠れ、横スクロール nav が表示される状態

手動目視で確認した挙動:
- あとで見る3セクションが状態別に表示され、解除でカードが当該セクションから消える。
- ステータスが `Tier1 未判定` / `Tier1 Lv3` / `Tier2 未選別` / `Tier2 Lv2` のように Tier1/Tier2 を混同しない。
- AVP候補→再生対象追加は最大4本で打ち止め、利用不可は追加不可、AVPで再生で再生中ハイライトが付く。
- あとで見る列はAVP画面では状態表示のみで、いずれの操作でも あとで見る が消えない（非自動解除）。
- 横スクロール nav は8画面リンクを持ち遷移できる（外側 SidebarNav 由来の狭幅制約は段階5の範囲外）。
- 撮影時のコンソールエラーは FastAPI（:8000）未起動による `/api/runtime` の `ERR_CONNECTION_REFUSED` のみで、ルートレイアウトの実 SidebarNav のポーラー由来。Variant K モックとは無関係。
