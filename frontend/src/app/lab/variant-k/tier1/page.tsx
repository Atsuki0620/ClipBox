// 統合 Variant K Tier1 プレースホルダー → /lab/variant-k/tier1
// 【役割】段階3で作り込む Tier1（ライブラリ/ランダム/運命の1本）の設計メモ表示。
// 【設計制約】段階2は土台のみ。詳細 UI は段階3。API/DB に触れない。displayContext="tier1" 前提。
// 【依存関係】VariantKPlaceholder。

import { VariantKPlaceholder } from "../_components/VariantKPlaceholder";

export default function VariantKTier1Page() {
  return (
    <VariantKPlaceholder
      screen="Tier1"
      purpose="未判定動画に初めてレベルを付ける一次判定。ライブラリ/ランダム/運命の1本の3タブ。"
      stage="段階3"
      layout="カード優先"
      hero={["視聴日数", "作成日", "判定日", "該当Tier(Tier1)"]}
      hidden={["視聴回数", "更新日", "登録日", "セレクション操作"]}
      nextSteps={[
        "2行タイトル・作成日/判定日表示のカード（VariantKVideoCard を流用）",
        "ランダムは「未判定かつ再生可能」固定",
        "運命の1本は履歴セクション撤去・大型「引く」ボタン中心",
        "判定済み/利用不可は薄表示",
      ]}
    />
  );
}
