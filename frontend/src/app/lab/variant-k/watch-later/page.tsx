// 統合 Variant K あとで見る プレースホルダー → /lab/variant-k/watch-later
// 【役割】段階5で作り込む あとで見る（未処理/確認・見直し/処理済み候補 の3セクション）の設計メモ表示。
// 【設計制約】段階2は土台のみ。詳細 UI は段階5。API/DB に触れない。あとで見る=DB相当・AVP候補と混同しない。
// 【依存関係】VariantKPlaceholder。

import { VariantKPlaceholder } from "../_components/VariantKPlaceholder";

export default function VariantKWatchLaterPage() {
  return (
    <VariantKPlaceholder
      screen="あとで見る"
      purpose="判定/選別を後回しにした動画を消化する独立タスク画面。未処理/確認・見直し/処理済み候補 の3セクション。"
      stage="段階5"
      layout="カード優先"
      hero={["視聴日数", "ステータス", "付与理由"]}
      hidden={["視聴回数", "更新日", "登録日"]}
      nextSteps={[
        "状態ベースの3セクション構成（PC幅5列）",
        "解除ルールはタイトル横Tooltipに集約",
        "処理済み候補は個別解除を基本（一括解除を残すかは未決）",
        "AVP候補と混同しない／AVP再生で自動解除しない前提で見せる",
      ]}
    />
  );
}
