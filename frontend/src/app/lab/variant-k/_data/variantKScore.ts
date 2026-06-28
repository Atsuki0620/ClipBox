// 統合 Variant K 総合スコア（公式どおりの再計算・純関数）。
// 【役割】ランキング/検索が共有する総合スコアの計算と順位付け。SPEC_NEXTJS §9 の式を
//   そのまま実装し、詳細列（基礎点／Tier1補正／Tier2補正／補正倍率）がスコアと整合する形で導出する。
//   base = view_days×1 + like_count×3 / bonus = 1 + 0.5×T1 + 0.3×T2 / score = round(base×bonus×100)。
//   T1=判定済み(level≥0)・T2=選別済み(tier2_status が数値)。順位は score 降順→last_played_at 降順→id 昇順、score=0 は除外。
// 【設計制約】
//   - 係数（A=1, B=3, T1=+0.5, T2=+0.3）は本体仕様。ここでは変えない（§9・§6）。
//   - API/DB/実ランキングに接続しない。純関数のみ（モックデータを式どおりに再計算するだけ）。
//   - AVP 画面（段階5）の mock score 表示はこのモジュールを使わず据え置く。
// 【依存関係】_data/variantKMock（VariantKVideo 型）。

import type { VariantKVideo } from "./variantKMock";

// 係数（SPEC §9・調整用定数。理由なく変更しない）。
export const COMPOSITE_A = 1; // view_days 係数
export const COMPOSITE_B = 3; // like_count 係数
export const TIER1_BONUS = 0.5; // 判定済みボーナス
export const TIER2_BONUS = 0.3; // 選別済みボーナス

// T1=判定済み（level≥0）。未判定(-1)はボーナスなしだが対象には含む。
export function isTier1Judged(video: VariantKVideo): boolean {
  return video.tier1_status >= 0;
}

// T2=選別済み（tier2_status が数値）。"none"（対象外）・"unselected"（未選別）はボーナスなし。
export function isTier2Selected(video: VariantKVideo): boolean {
  return typeof video.tier2_status === "number";
}

// 基礎点 base = view_days×1 + like_count×3。
export function baseScore(video: VariantKVideo): number {
  return video.view_days * COMPOSITE_A + video.like_count * COMPOSITE_B;
}

// Tier1 補正（+0.5 or 0）。
export function tier1Bonus(video: VariantKVideo): number {
  return isTier1Judged(video) ? TIER1_BONUS : 0;
}

// Tier2 補正（+0.3 or 0）。
export function tier2Bonus(video: VariantKVideo): number {
  return isTier2Selected(video) ? TIER2_BONUS : 0;
}

// 補正倍率 bonus = 1 + Tier1補正 + Tier2補正。
export function bonusMultiplier(video: VariantKVideo): number {
  return 1 + tier1Bonus(video) + tier2Bonus(video);
}

// 総合スコア score = round(base × bonus × 100)（整数化）。
export function compositeScore(video: VariantKVideo): number {
  return Math.round(baseScore(video) * bonusMultiplier(video) * 100);
}

// 表示用フォーマッタ（整数 pt・3桁区切り）。
export function formatScore(video: VariantKVideo): string {
  return `${compositeScore(video).toLocaleString("en-US")} pt`;
}

// 補正倍率の表示（例: "×1.8"）。
export function formatMultiplier(video: VariantKVideo): string {
  return `×${bonusMultiplier(video).toFixed(1)}`;
}

// 補正の符号付き表示（例: "+0.5" / "—"）。
export function formatBonus(bonus: number): string {
  return bonus > 0 ? `+${bonus.toFixed(1)}` : "—";
}

// ランキング対象に並べる（score>0 のみ・score 降順→last_played_at 降順→id 昇順）。
// タイブレークは SPEC §9 の `score DESC → last_viewed_at DESC → id ASC` に合わせる
// （last_played_at は APP 再生の last_viewed_at 相当のモック。null は最後尾）。
export function rankVideos(videos: VariantKVideo[]): VariantKVideo[] {
  return videos
    .filter((video) => compositeScore(video) > 0)
    .sort((a, b) => {
      const byScore = compositeScore(b) - compositeScore(a);
      if (byScore !== 0) return byScore;
      const byPlayed = (b.last_played_at ?? "").localeCompare(a.last_played_at ?? "");
      if (byPlayed !== 0) return byPlayed;
      return a.id - b.id;
    });
}
