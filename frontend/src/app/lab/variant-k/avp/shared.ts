// 統合 Variant K AVP 共有: 定数・スコア文言・母集団切替（純関数）。
// 【役割】AVP候補テーブル/2×2再生セットが共有する定数と副作用なしの純関数。
//   総合スコア＋総合順位の表示文言、再生対象の上限、「再生可能だけ⇔全動画」母集団の見せ方を扱う。
// 【設計制約】
//   - API/DB/localStorage に触れない。純関数・定数のみ。スコア/順位はモック値をそのまま見せる。
//   - 再生対象は最大4本（MAX_AVP_PLAY_TARGET）。候補は上限なし。総合スコア式・係数は変えない。
// 【依存関係】_data/variantKMock（VariantKVideo 型）。

import type { VariantKVideo } from "../_data/variantKMock";

// AVP 再生対象の上限（本体仕様 MAX_AVP_PLAY_TARGET=4 に合わせたモック定数）。
export const MAX_AVP_PLAY_TARGET = 4;

// 順位母集団の切替（軽量版）。スコア/順位はモック rank をそのまま見せる。
export type AvpRankScope = "available" | "all";

// 総合スコア＋総合順位の表示文言（例: "128.4 pt（総合 1位）"）。
export function formatScoreWithRank(video: VariantKVideo): string {
  return `${video.score.toFixed(1)} pt（総合 ${video.rank}位）`;
}

// 候補テーブルに並べる行（母集団で「再生可能だけ」に絞れる軽量版）。
// 並びは総合スコア降順・同値は id 昇順（本体ランキングのタイブレークに寄せたモック）。
export function avpCandidateRows(
  videos: VariantKVideo[],
  candidateIds: number[],
  scope: AvpRankScope,
): VariantKVideo[] {
  const candidateSet = new Set(candidateIds);
  return videos
    .filter((video) => candidateSet.has(video.id))
    .filter((video) => (scope === "available" ? video.available : true))
    .sort((a, b) => (b.score - a.score) || (a.id - b.id));
}
