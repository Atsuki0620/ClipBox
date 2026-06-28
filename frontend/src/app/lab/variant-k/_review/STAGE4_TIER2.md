# 統合 Variant K — 段階4「Tier2 作り込み」実装メモ

> 段階4は本体実装ではなく **サンプルDB接続前の UI LAB モック**。実 API / DB / migration / 設定ファイル / 実データ / localStorage・sessionStorage 本体仕様には触れていない。旧 `/lab/tier2-*/variant-k` ルートは作らず、統合 Variant K の `/lab/variant-k/tier2` だけを対象にした。

## 1. 実装した内容

`/lab/variant-k/tier2` を、ライブラリ／ランダム／運命の1本の3タブを持つ Tier2 モックに作り込んだ。画面上部に `案1: Tier1流用案` / `案2: Tier2専用文言強め案` の比較トグルを置き、差分は見出し補助文・固定条件チップ・空状態・保持説明などの文言だけに限定した。

## 2. 作成・変更したファイル

**新規（`tier2/`）**
- `page.tsx`（プレースホルダーを置換。3タブ＋案1/案2トグル）
- `Tier2Library.tsx` / `Tier2Random.tsx` / `Tier2Fate.tsx`（各タブ本体）
- `Tier2Card.tsx`（カード土台＋ローカル状態＋操作行の合成）
- `Tier2CardActions.tsx`（操作行）/ `Tier2LevelButtons.tsx`（未選別/Lv0..Lv4）/ `Tier2KpiBar.tsx`（軽量KPI）
- `shared.ts`（文言、フィルタ/ソート/抽選ピックの純関数・型）
- `useTier2MockCardState.ts`（メモリのみのカード状態）

**変更なし**
- `_components/VariantKVideoCard.tsx` は段階3の任意 prop で足りたため無変更。`tierBadge="tier2"`、`statusLabel="選別"`、`dateLabel="選別日"` を渡して流用した。
- `VARIANT_K_VIDEOS` は既存合成データで Tier2 対象・未選別・選別済み・利用不可を確認できたため追加していない。

## 3. Tier2 状態管理

状態は video id 単位のページ内メモリで共有する。ライブラリ／ランダム／運命の1本で同じ動画を操作しても、未選別/Lv0..Lv4、いいね、あとで見る、AVP候補、選別日が同期する。

- `未選別 -> Lv0..Lv4`: 選別日を当日に更新し、あとで見るを自動解除する。
- `Lv0..Lv4 -> 未選別`: 選別日を空扱いに戻す。あとで見るは勝手に解除しない。
- いいねとあとで見るは DB 相当のモック、AVP候補は localStorage 相当のモックとして別状態にした。

## 4. ライブラリタブ

軽量KPI（未選別/選別済み/選別率/本日の選別数）＋ツールバー（状態セグメント すべて/未選別/選別済み・再生可能だけ・並び替え 視聴日数/作成日/選別日）＋カードグリッド＋空状態。フィルタ/ソートは保存しない。

## 5. ランダムタブ

条件パネルは作らず、`Tier2対象・再生可能・未選別優先` の固定条件を短く表示する。抽選はモックで、候補配列の代表を切り替えるだけ。未選別があれば先に表示し、未選別がない場合も選別済みの再生可能カードを代表表示できる。

## 6. 運命の1本タブ

履歴セクションは作っていない。大型の「運命の1本を引く」ボタン、現在カード、最近見てない優先トグル、保持仕様の短い説明だけを置いた。実 sessionStorage には触れていない。

## 7. 案1/案2の差分

- 案1: Tier1 に近い短い文言。操作感の継続性を優先。
- 案2: Tier2 が二次選別であることを補助文・空状態・保持説明で強める。

カード構造、操作、グリッド、KPI、状態管理、候補条件、利用不可表現は共通。

## 8. 表示/非表示項目

表示:
- タイトル2行
- ストレージ
- 視聴日数
- 作成日
- 選別日
- 選別状態（未選別/Lv0..Lv4）
- いいね
- あとで見る
- 利用不可
- 該当Tierバッジ（Tier2）

非表示:
- 視聴回数
- 更新日
- 登録日
- サムネイル
- Tier1 の判定操作

## 9. 利用不可状態

利用不可カードは `VariantKVideoCard` 側の薄表示＋「利用不可」バッジを使う。操作行では再生と AVP候補追加を disabled にした。いいね・あとで見るは操作可能な見た目を維持した。

## 10. 影響範囲

- UI LAB モックのみ。
- 本体画面、FastAPI、core、DB、migration、設定ファイル、実データ、localStorage/sessionStorage 本体仕様は変更なし。
- 既存 Variant A〜K、lab 共通部品、Tier1 の見た目・動作は変更なし。
- `displayContext` 3値固定、AVP候補上限なし/再生対象最大4本、あとで見る自動解除条件、総合スコア式は変更していない。

## 11. スクショ保存先

`frontend/src/app/lab/variant-k/_review/stage4/`

取得対象:
- ライブラリ案1
- ライブラリ案2
- ランダム
- 運命の1本
- 利用不可カード
- 再生中ハイライト
- Runtime control
- lg 未満横スクロール nav

### スクショ取得状況（2026-06-28）

`/lab/variant-k/tier2` はローカル `http://127.0.0.1:3000/lab/variant-k/tier2` で HTTP 200 を確認した。

スクショ保存は未完了。理由:
- in-app Browser の Node 実行ツールが `codex/sandbox-state-meta: missing field sandboxPolicy` で起動できず、Browser Plugin 経由の Playwright を使えなかった。
- 代替として Chrome/Edge headless の CDP remote debugging と `--screenshot` を試したが、CDP ポートは開かず、`--screenshot` も終了コード 0 のままファイルを生成しなかった。

スクショ用ディレクトリ `frontend/src/app/lab/variant-k/_review/stage4/` は作成済みだが、画像は保存できていない。取得不可はツール/ブラウザ実行環境の問題で、`npm run build` は通過している。

## 12. 未対応リスク・段階5前の確認事項

- 外側の既存 `SidebarNav` や Variant K シェル幅の根本調整は段階4では扱っていない。
- 実 API 連携時は判定/選別日・視聴日数・総合スコアなど、サンプルDB前に必要な取得経路を別途確認する。
- 案1/案2の採否、文言密度、未選別/Lvボタンの横幅、利用不可時に選別ボタンも disabled にするかは段階5前に確認する。
