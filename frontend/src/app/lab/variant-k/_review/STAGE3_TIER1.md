# 統合 Variant K — 段階3「Tier1 作り込み」実装メモ

> 段階3は本体実装ではなく **サンプルDB接続前の UI LAB モック**。実 API / DB / migration / 設定ファイル / 実データ / localStorage・sessionStorage 本体仕様には触れていない。Tier2・あとで見る・AVP・ランキング・検索・設定の詳細は段階4以降。

## 1. 実装した内容

`/lab/variant-k/tier1` を、ライブラリ／ランダム／運命の一本の3タブを持つ完成度の高いモックに作り込んだ。段階2の統合シェル・サイドバー・Runtime control・寒色モダンテーマはそのまま維持。カード優先・視聴日数主役・サムネなしを徹底。

## 2. 作成・変更したファイル

**新規（`tier1/`）**
- `page.tsx`（プレースホルダーを置換。3タブの軽量セグメント切替）
- `Tier1Library.tsx` / `Tier1Random.tsx` / `Tier1Fate.tsx`（各タブ本体）
- `Tier1Card.tsx`（カード土台＋ローカル状態＋操作行の合成）
- `Tier1CardActions.tsx`（操作行）/ `Tier1LevelButtons.tsx`（Lv0..4）/ `Tier1KpiBar.tsx`（軽量KPI）
- `shared.ts`（フィルタ/ソート/抽選ピックの純関数・型）
- `useTier1MockCardState.ts`（カード1枚分のメモリのみのモック状態）

**変更（後方互換）**
- `_components/VariantKVideoCard.tsx` — `statusLabel`/`statusValue`/`dateLabel`/`dateValue` props を追加し、旧「Tier」メタ行を置換。既定値は `tierBadge` から導出（Tier1=判定/判定日、Tier2=選別/選別日）。既存 props は不変。
- `_data/variantKMock.ts` — `VARIANT_K_TIER1_KPI` ＋ `TIER1_TODAY_TREND` を追加、`VARIANT_K_VIDEOS` を4件追加（id 9–12）。既存行は不変。

**追加**
- `_review/STAGE3_TIER1.md`（本書）＋ `_review/stage3/*.png`

## 3. Tier1 ライブラリタブの方針

軽量KPI（未判定/判定済み/判定率バー/今日の処理目安スパークライン）＋ツールバー（状態セグメント すべて/未判定/判定済み・「再生可能だけ」スイッチ・並び替え 視聴日数/作成日/判定日）＋5列カードグリッド＋空状態。フィルタ/ソートは **メモリ相当で永続しない**。再生クリックで該当カードを **再生中ハイライト（amber）** にする（バッジより優先）。

## 4. Tier1 ランダムタブの方針

条件パネルを撤去し「対象: 未判定かつ再生可能（固定）」を短く表示。大型1本カード＋「引き直す」。**抽選はモック**で、合成データの未判定×再生可能の候補から代表を切り替える程度（実ランダム仕様・実 API・localStorage には触れない）。判定済み/利用不可は候補に含めない。

## 5. Tier1 運命の一本タブの方針

履歴セクションは作らない。大型「運命の一本を引く」ボタンを中心に据え、引いた1本のカードを表示。「最近見てない優先」トグルは **見た目のモックのみ**。**保持**は「このタブのセッション中だけ保持・タブを閉じると消える・履歴は残さない」という短い説明＋見た目で表現し、**実 sessionStorage には触れない**（保持仕様を撤去したようには見せない）。

## 6. 視聴日数・作成日・判定日の扱い

- **視聴日数**を主役メタにする（カード／KPI）。
- **作成日**（`file_created_at`）を表示。
- **判定日**（`judged_at`）をカードメタに表示（ラベル「判定日」）。
- カードの状態メタは「判定」ラベル＋現在レベル（未判定/Lv0..4）。レベルは Tier1LevelButtons でも表現（表示＝設定）。

## 7. 視聴回数・更新日・登録日を出していないこと

カード・KPI・テーブルいずれにも **視聴回数 / 更新日 / 登録日** を表示していない。`VariantKVideoCard` のメタは ストレージ / 視聴日数 / 作成日 / 判定日 / 判定状態 のみ。

## 8. セレクション操作を出していないこと

Tier1 では **セレクション操作（選別へ送る等）を一切出していない**。判定操作は **Lv0〜Lv4 のみ**で、`未判定へ戻す` 操作も段階3では出していない（§14 参照）。

## 9. 利用不可状態の見せ方

利用不可（`available=false`）のカードは `VariantKVideoCard` 側で **薄表示（opacity-50）＋「利用不可」バッジ**。操作行では **再生 と AVP候補に追加を `disabled`**（再生・候補追加ができない見た目）。サンプルでは id 4 / 8 / 11 が利用不可。

## 10. あとで見るとAVP候補を混同していないこと

- **あとで見る**（DB相当・モック）= カード上部のバッジ＋操作行の「あとで見る」トグル。
- **AVP候補**（localStorage相当・本段階はメモリのみ）= 操作行の「AVP候補に追加 / 追加済み」ボタン。**状態バッジは初期OFF**（カードに AVP候補バッジを出さない）。追加済みはボタンの見た目（控えめな indigo 強調＋チェック）で表す。
- 両者は別の状態変数（`watchLater` / `avpCandidate`）として保持し、相互に影響しない。

## 11. 旧 `/lab/tier1-*/variant-k` を作らなかったこと

旧 `/lab/tier1-library/variant-k`・`/lab/tier1-random/variant-k`・`/lab/tier1-fate/variant-k` は **作っていない**。3タブはすべて `/lab/variant-k/tier1` 内に実装した。

## 12. 既存Variantへの影響を避けるためにしたこと

- 既存 Variant A〜K のファイルは無改変。
- 共有 `LevelButtons`（`lab/_components/`）は **read-only 再利用すらせず**、未判定（-1）を含むため Tier1 用に `Tier1LevelButtons`（Lv0..4）を別実装（共有部品は一切触らない）。
- 変更した共通部品は variant-k 配下の `VariantKVideoCard` のみで、**後方互換**（既存 props・既定挙動を維持、追加 props は任意）。
- `globals.css` 非変更。テーマは段階2の root div CSS 変数のまま。

## 13. スクショ保存先

`frontend/src/app/lab/variant-k/_review/stage3/`（既存 `_review` 命名に倣う）。

### スクショ取得状況（2026-06-28 取得）
`cd frontend && npm run dev`（frontend-only。`run_dev.bat` は DB バックアップ/マイグレーションを走らせるため使わない）で起動し、ビューポート 1440×1000、Playwright MCP で取得。保存先 `_review/stage3/`:

- `full-library.png` — ライブラリタブ全体（KPI/フィルタ/5列グリッド、利用不可カード薄表示が見える）
- `library-playing-highlight.png` — 再生クリックで先頭カードが amber 再生中ハイライト
- `full-random.png` — ランダムタブ全体（条件固定チップ・代表1本・条件パネルなし）
- `full-fate.png` — 運命の一本タブ全体（大型「引く」・履歴なし・保持の説明・引いた1本）

Runtime control（FastAPI/Next.js 個別・「アプリを停止」disabled）は全画面のサイドバー下部に常時表示。

> 備考: コンソールの fetch エラーは frontend-only 起動で本体ルートの実 `SidebarNav` が FastAPI(:8000) を叩いて失敗するもの。variant-k（モック）とは無関係で、`npm run build` はクリーン通過。

## 14. 段階4に進む前の確認事項

- 暫定バッジ色（Tier1=青）と再生中ハイライト（amber）でよいか。
- ライブラリのフィルタ/ソート項目（すべて/未判定/判定済み・再生可能だけ・視聴日数/作成日/判定日）で十分か。カード⇄テーブル切替を段階で足すか。
- ランダム/運命の抽選の見せ方（代表切替モック）でよいか。
- **`未判定へ戻す` 操作**の要否（段階3では非表示。本体反映前に判定が必要）。
- KPI の数値・項目（未判定/判定済み/判定率/今日の処理目安）でよいか。
- Tier2（段階4）で `VariantKVideoCard` の `statusLabel="選別"`/`statusValue` をどう使うか、状態フックを `_components`/`_hooks` へ共通化するか。
