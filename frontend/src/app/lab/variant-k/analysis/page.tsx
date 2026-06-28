// 統合 Variant K analysis 仮ページ → /lab/variant-k/analysis
// 【役割】analysis は採用判断対象外。ナビには置くが仮ページのみ。再設計はしない。
//   統合 Variant K の共通レイアウトの波及だけ確認対象とする。
// 【設計制約】段階2は仮ページのみ。既存 Recharts 構成には触れない。API/DB に触れない。
// 【依存関係】VariantKPlaceholder。

import { VariantKPlaceholder } from "../_components/VariantKPlaceholder";

export default function VariantKAnalysisPage() {
  return (
    <VariantKPlaceholder
      screen="analysis（仮）"
      purpose="採用判断対象外。ナビには置くが仮ページのみ。再設計はしない。"
      stage="対象外"
      layout="カード＋テーブル"
      hero={["（共通レイアウトの波及のみ確認）"]}
      hidden={["（再設計しない）"]}
      nextSteps={[
        "既存 Recharts 構成は維持する前提（本案では作り込まない）",
        "統合 Variant K の共通シェル/余白/テーマの波及だけ確認対象",
      ]}
    />
  );
}
