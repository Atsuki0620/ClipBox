// 統合 Variant K ランキング プレースホルダー → /lab/variant-k/ranking
// 【役割】段階6で作り込む ランキング（案D：操作付きスコアテーブル）の設計メモ表示。
// 【設計制約】段階2は土台のみ。詳細 UI は段階6。API/DB に触れない。
//   総合スコア式・タイブレーク・APP_PLAYBACK 基準は不変。
// 【依存関係】VariantKPlaceholder。

import { VariantKPlaceholder } from "../_components/VariantKPlaceholder";

export default function VariantKRankingPage() {
  return (
    <VariantKPlaceholder
      screen="ランキング"
      purpose="数値指標で並べ替えて俯瞰・処理する操作付きスコアテーブル。"
      stage="段階6"
      layout="テーブル優先"
      hero={["順位", "総合スコア", "視聴日数", "いいね"]}
      hidden={["視聴回数", "種別セレクト"]}
      nextSteps={[
        "列ヘッダークリックでソート（1回目降順/2回目昇順）",
        "ソート可能列は 総合スコア/視聴日数/いいね",
        "通常列＋詳細列ON（基礎点/Tier1補正/Tier2補正/補正倍率/保存先）",
        "操作=再生/いいね/あとで見る/AVP候補・既定=再生可能だけ",
      ]}
    />
  );
}
