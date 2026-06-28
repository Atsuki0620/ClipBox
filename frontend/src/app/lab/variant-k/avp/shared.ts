// 統合 Variant K AVP 共有: 定数・スコア文言・母集団切替（純関数）。
// 【役割】AVP候補テーブル/2×2再生セットが共有する定数と副作用なしの純関数。
//   総合スコア＋総合順位の表示文言、再生対象の上限、「再生可能だけ⇔全動画」母集団の見せ方を扱う。
// 【設計制約】
//   - API/DB/localStorage に触れない。純関数・定数のみ。
//   - 総合スコア・順位はランキング/検索と同じ公式から再計算する（_data/variantKScore）。mock の score/rank は使わない。
//   - 順位の母集団は scope（再生可能だけ/全動画）で切替える。score=0 は圏外（順位を出さない）。
//   - 再生対象は最大4本（MAX_AVP_PLAY_TARGET）。候補は上限なし。係数・タイブレークは変えない。
// 【依存関係】_data/variantKMock（VariantKVideo 型）, _data/variantKScore（compositeScore/compareOfficialRank/rankVideos）。

import type { VariantKVideo } from "../_data/variantKMock";
import { compareOfficialRank, compositeScore, rankVideos } from "../_data/variantKScore";

// AVP 再生対象の上限（本体仕様 MAX_AVP_PLAY_TARGET=4 に合わせたモック定数）。
export const MAX_AVP_PLAY_TARGET = 4;

// 順位母集団の切替。再生可能だけ/全動画。
export type AvpRankScope = "available" | "all";

// scope 母集団で公式順位（score>0・§9 タイブレーク）を計算し、id→順位の Map を返す。
export function avpRankMap(videos: VariantKVideo[], scope: AvpRankScope): Map<number, number> {
  const pool = scope === "available" ? videos.filter((v) => v.available) : videos;
  const ranked = rankVideos(pool);
  return new Map(ranked.map((video, index) => [video.id, index + 1]));
}

// 総合スコア＋総合順位の表示文言（例: "9,180 pt（総合 1位）"・圏外は "0 pt（圏外）"）。
export function formatScoreWithRank(video: VariantKVideo, rankMap: Map<number, number>): string {
  const score = compositeScore(video).toLocaleString("en-US");
  const rank = rankMap.get(video.id);
  return rank ? `${score} pt（総合 ${rank}位）` : `${score} pt（圏外）`;
}

// 候補テーブルに並べる行（母集団で「再生可能だけ」に絞れる）。
// 並びは公式タイブレーク（総合スコア降順→最終再生日降順→id 昇順）。
export function avpCandidateRows(
  videos: VariantKVideo[],
  candidateIds: number[],
  scope: AvpRankScope,
): VariantKVideo[] {
  const candidateSet = new Set(candidateIds);
  return videos
    .filter((video) => candidateSet.has(video.id))
    .filter((video) => (scope === "available" ? video.available : true))
    .sort(compareOfficialRank);
}
