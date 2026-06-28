// 統合 Variant K Tier2 プレースホルダー → /lab/variant-k/tier2
// 【役割】段階4で作り込む Tier2（案1 Tier1流用 / 案2 専用文言強め のトグル）の設計メモ表示。
// 【設計制約】段階2は土台のみ。詳細 UI は段階4。API/DB に触れない。displayContext="tier2" 前提。
// 【依存関係】VariantKPlaceholder。

import { VariantKPlaceholder } from "../_components/VariantKPlaceholder";

export default function VariantKTier2Page() {
  return (
    <VariantKPlaceholder
      screen="Tier2"
      purpose="選別フォルダの二次判定（未選別/選別済み）。カード/操作部品は Tier1 流用、文言は段階4で比較。"
      stage="段階4"
      layout="カード優先"
      hero={["視聴日数", "作成日", "選別日", "該当Tier(Tier2)"]}
      hidden={["視聴回数", "更新日", "登録日"]}
      nextSteps={[
        "同一画面内トグル：案1（Tier1流用）/ 案2（専用文言強め）",
        "該当Tierバッジは Tier2 のみ（Lv・未選別/選別済みは書かない）",
        "初期フィルタ=未選別＋選別済み、候補=すべて/未選別/選別済み",
        "レベル操作は既存仕様（未選別/Lv0..Lv4）",
      ]}
    />
  );
}
