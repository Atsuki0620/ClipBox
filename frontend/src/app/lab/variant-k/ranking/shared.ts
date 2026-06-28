// 統合 Variant K ランキング 共有: フィルタ・ソート状態・列補助（純関数）。
// 【役割】ランキング画面のフィルタ（期間/最低Tier1レベル/保存先/再生可能だけ）とソート状態
//   （総合スコア/視聴日数/いいね・1回目降順→2回目昇順）を副作用なしで扱う。順位は現在のソート順での 1..N。
// 【設計制約】
//   - API/DB/実ランキングに触れない。純関数・定数のみ。フィルタ/ソートはメモリ（永続しない）。
//   - 母集団は rankVideos（score>0 のみ・§9 タイブレーク）。フィルタ後に表示用ソートを適用する。
//   - 総合スコア式・係数・タイブレークは変えない（_data/variantKScore に集約）。
// 【依存関係】_data/variantKMock（VariantKVideo 型）, _data/variantKScore（compositeScore/rankVideos）。

import type { VariantKVideo } from "../_data/variantKMock";
import { compositeScore, rankVideos } from "../_data/variantKScore";

// モック基準日（currentDate=2026-06-28）。期間フィルタの相対計算に使う固定値。
const TODAY_ISO = "2026-06-28";

export type RankingPeriod = "all" | "30d" | "90d";
export type RankingStorage = "all" | "C_DRIVE" | "EXTERNAL_HDD";
export type RankingMinLevel = "all" | 0 | 1 | 2 | 3 | 4;

export type RankingFilters = {
  period: RankingPeriod;
  minLevel: RankingMinLevel;
  storage: RankingStorage;
  availableOnly: boolean;
};

export const DEFAULT_RANKING_FILTERS: RankingFilters = {
  period: "all",
  minLevel: "all",
  storage: "all",
  availableOnly: true,
};

export type RankingSortKey = "composite" | "view_days" | "likes";
export type SortDir = "desc" | "asc";

export type RankingSort = { key: RankingSortKey; dir: SortDir };

export const DEFAULT_RANKING_SORT: RankingSort = { key: "composite", dir: "desc" };

export const RANKING_PERIOD_OPTIONS: { value: RankingPeriod; label: string }[] = [
  { value: "all", label: "全期間" },
  { value: "30d", label: "直近30日" },
  { value: "90d", label: "直近90日" },
];

export const RANKING_STORAGE_OPTIONS: { value: RankingStorage; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "C_DRIVE", label: "Cドライブ" },
  { value: "EXTERNAL_HDD", label: "外付けHDD" },
];

export const RANKING_MIN_LEVEL_OPTIONS: { value: RankingMinLevel; label: string }[] = [
  { value: "all", label: "指定なし" },
  { value: 0, label: "Lv0+" },
  { value: 1, label: "Lv1+" },
  { value: 2, label: "Lv2+" },
  { value: 3, label: "Lv3+" },
  { value: 4, label: "Lv4" },
];

// 期間の下限 ISO 日付（"all" は null）。文字列比較で判定するため ISO 日付を返す。
function periodCutoff(period: RankingPeriod): string | null {
  if (period === "all") return null;
  const days = period === "30d" ? 30 : 90;
  const base = new Date(`${TODAY_ISO}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - days);
  return base.toISOString().substring(0, 10);
}

// フィルタ適用。母集団は rankVideos（score>0）。期間は最終再生（APP再生相当）で絞る。
export function applyRankingFilters(videos: VariantKVideo[], filters: RankingFilters): VariantKVideo[] {
  const cutoff = periodCutoff(filters.period);
  return rankVideos(videos).filter((video) => {
    if (filters.availableOnly && !video.available) return false;
    if (filters.storage !== "all" && video.storage !== filters.storage) return false;
    if (filters.minLevel !== "all" && video.tier1_status < filters.minLevel) return false;
    if (cutoff) {
      if (!video.last_played_at) return false;
      if (video.last_played_at < cutoff) return false;
    }
    return true;
  });
}

// 表示用ソート（総合スコア/視聴日数/いいね・降順/昇順）。同値は id 昇順で安定させる。
export function sortRanking(videos: VariantKVideo[], sort: RankingSort): VariantKVideo[] {
  const sign = sort.dir === "desc" ? 1 : -1;
  const valueOf = (video: VariantKVideo): number => {
    if (sort.key === "view_days") return video.view_days;
    if (sort.key === "likes") return video.like_count;
    return compositeScore(video);
  };
  return [...videos].sort((a, b) => {
    const diff = (valueOf(b) - valueOf(a)) * sign;
    if (diff !== 0) return diff;
    return a.id - b.id;
  });
}

// ヘッダクリックでソート状態を更新する（同キー再クリックで降順→昇順トグル、別キーは降順から）。
export function nextRankingSort(current: RankingSort, key: RankingSortKey): RankingSort {
  if (current.key !== key) return { key, dir: "desc" };
  return { key, dir: current.dir === "desc" ? "asc" : "desc" };
}
