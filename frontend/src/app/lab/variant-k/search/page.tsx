// 統合 Variant K 検索 プレースホルダー → /lab/variant-k/search
// 【役割】段階6で作り込む 検索（案D：高機能フィルタ＋操作付きテーブル）の設計メモ表示。
// 【設計制約】段階2は土台のみ。詳細 UI は段階6。API/DB に触れない。
//   ランキングと統合しない（テーブル土台のみ共有）。検索結果は永続化しない。順位列は出さない。
// 【依存関係】VariantKPlaceholder。

import { VariantKPlaceholder } from "../_components/VariantKPlaceholder";

export default function VariantKSearchPage() {
  return (
    <VariantKPlaceholder
      screen="検索"
      purpose="キーワード/条件で見つけてその場で処理する。高機能フィルタ＋操作付きテーブル。"
      stage="段階6"
      layout="テーブル優先"
      hero={["総合スコア", "視聴日数", "いいね"]}
      hidden={["視聴回数", "順位"]}
      nextSteps={[
        "キーワード未入力では空状態（VariantKEmptyState）",
        "テーブル土台はランキング/AVP上段と共有（統合はしない）",
        "ソート可能列は 総合スコア/視聴日数/いいね・既定=全動画",
        "検索結果は永続化しない・順位列は出さない",
      ]}
    />
  );
}
