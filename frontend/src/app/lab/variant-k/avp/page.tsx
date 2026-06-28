// 統合 Variant K AVP プレースホルダー → /lab/variant-k/avp
// 【役割】段階5で作り込む AVP（案D改：上段候補テーブル / 下段2×2再生セット）の設計メモ表示。
// 【設計制約】段階2は土台のみ。詳細 UI は段階5。API/DB に触れない。
//   候補上限なし・再生対象最大4本・欠落ID掃除・再生後クリアは不変。AVP候補=localStorage相当。
// 【依存関係】VariantKPlaceholder。

import { VariantKPlaceholder } from "../_components/VariantKPlaceholder";

export default function VariantKAvpPage() {
  return (
    <VariantKPlaceholder
      screen="AVP"
      purpose="候補から最大4本を選び並列再生。上段=候補テーブル、下段=2×2再生セット。"
      stage="段階5"
      layout="カード＋テーブル"
      hero={["総合スコア", "総合順位", "視聴日数", "いいね"]}
      hidden={["視聴回数", "スロット番号"]}
      nextSteps={[
        "上段候補テーブルはランキング/検索とテーブル土台を共有（VariantKActionTable）",
        "下段2×2はTier1ライブラリカードと整合（VariantKVideoCard）",
        "再生可能だけ⇔全動画切替・個別いいね・一括いいね（未いいねのみ）",
        "全候補クリア・再生対象クリア／説明はタイトル横Tooltip",
      ]}
    />
  );
}
