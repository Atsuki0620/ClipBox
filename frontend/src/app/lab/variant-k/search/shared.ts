// 統合 Variant K 検索 共有: フィルタ・ソート（純関数）。
// 【役割】検索画面の高機能フィルタ（キーワード/保存先/利用可否/Tier1レベル/Tier2レベル/あとで見る/いいね/最低視聴日数）と
//   ソート（総合スコア/視聴日数/いいね・既定は Tier1行→Tier2行→総合スコア降順）を副作用なしで扱う。
// 【設計制約】
//   - API/DB/localStorage に触れない。純関数・定数のみ。検索条件・結果は永続しない（メモリのみ）。
//   - キーワードはダミータイトルへの部分一致（大文字小文字無視）。順位列は出さない（ランキングと統合しない）。
//   - 総合スコアは公式から再計算（_data/variantKScore）。係数・タイブレークは変えない。
// 【依存関係】_data/variantKMock（VariantKVideo 型）, _data/variantKScore（compositeScore）。

import type { VariantKVideo } from "../_data/variantKMock";
import { compareOfficialRank, compositeScore } from "../_data/variantKScore";
import { isTier2Target } from "../watch-later/shared";

export type SearchStorage = "all" | "C_DRIVE" | "EXTERNAL_HDD";
export type SearchAvailability = "all" | "available" | "unavailable";
export type SearchTier1 = "all" | -1 | 0 | 1 | 2 | 3 | 4;
export type SearchTier2 = "all" | "none" | "unselected" | 0 | 1 | 2 | 3 | 4;
export type SearchFlag = "all" | "only";

export type SearchFilters = {
  keyword: string;
  storage: SearchStorage;
  availability: SearchAvailability;
  tier1: SearchTier1;
  tier2: SearchTier2;
  watchLater: SearchFlag;
  liked: SearchFlag;
  minViewDays: number; // 0 = 指定なし
};

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  keyword: "",
  storage: "all",
  availability: "all",
  tier1: "all",
  tier2: "all",
  watchLater: "all",
  liked: "all",
  minViewDays: 0,
};

export const SEARCH_STORAGE_OPTIONS: { value: SearchStorage; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "C_DRIVE", label: "Cドライブ" },
  { value: "EXTERNAL_HDD", label: "外付けHDD" },
];

export const SEARCH_AVAILABILITY_OPTIONS: { value: SearchAvailability; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "available", label: "再生可能" },
  { value: "unavailable", label: "利用不可" },
];

export const SEARCH_TIER1_OPTIONS: { value: SearchTier1; label: string }[] = [
  { value: "all", label: "指定なし" },
  { value: -1, label: "未判定" },
  { value: 0, label: "Lv0" },
  { value: 1, label: "Lv1" },
  { value: 2, label: "Lv2" },
  { value: 3, label: "Lv3" },
  { value: 4, label: "Lv4" },
];

export const SEARCH_TIER2_OPTIONS: { value: SearchTier2; label: string }[] = [
  { value: "all", label: "指定なし" },
  { value: "none", label: "対象外" },
  { value: "unselected", label: "未選別" },
  { value: 0, label: "Lv0" },
  { value: 1, label: "Lv1" },
  { value: 2, label: "Lv2" },
  { value: 3, label: "Lv3" },
  { value: 4, label: "Lv4" },
];

// フィルタ適用（キーワードはダミータイトルの部分一致・大文字小文字無視）。
export function applySearchFilters(videos: VariantKVideo[], filters: SearchFilters): VariantKVideo[] {
  const keyword = filters.keyword.trim().toLowerCase();
  return videos.filter((video) => {
    if (keyword && !video.title.toLowerCase().includes(keyword)) return false;
    if (filters.storage !== "all" && video.storage !== filters.storage) return false;
    if (filters.availability === "available" && !video.available) return false;
    if (filters.availability === "unavailable" && video.available) return false;
    if (filters.tier1 !== "all" && video.tier1_status !== filters.tier1) return false;
    if (filters.tier2 !== "all" && video.tier2_status !== filters.tier2) return false;
    if (filters.watchLater === "only" && !video.watch_later) return false;
    if (filters.liked === "only" && !video.liked) return false;
    if (filters.minViewDays > 0 && video.view_days < filters.minViewDays) return false;
    return true;
  });
}

export type SearchSortKey = "default" | "composite" | "view_days" | "likes";
export type SortDir = "desc" | "asc";
export type SearchSort = { key: SearchSortKey; dir: SortDir };

// 既定は Tier1行→Tier2行→総合スコア降順（ヘッダクリックで各指標の降順/昇順に切り替わる）。
export const DEFAULT_SEARCH_SORT: SearchSort = { key: "default", dir: "desc" };

export function sortSearch(videos: VariantKVideo[], sort: SearchSort): VariantKVideo[] {
  if (sort.key === "default") {
    // Tier1行（対象外）を先、Tier2行を後。各グループ内は総合スコア降順→id 昇順。
    return [...videos].sort((a, b) => {
      const groupDiff = Number(isTier2Target(a)) - Number(isTier2Target(b));
      if (groupDiff !== 0) return groupDiff;
      return compareOfficialRank(a, b);
    });
  }
  const sign = sort.dir === "desc" ? 1 : -1;
  const valueOf = (video: VariantKVideo): number => {
    if (sort.key === "view_days") return video.view_days;
    if (sort.key === "likes") return video.like_count;
    return compositeScore(video);
  };
  return [...videos].sort((a, b) => {
    const diff = (valueOf(b) - valueOf(a)) * sign;
    if (diff !== 0) return diff;
    return compareOfficialRank(a, b);
  });
}

// ヘッダクリックでソート状態を更新（同キー再クリックで降順→昇順トグル、別キーは降順から）。
export function nextSearchSort(current: SearchSort, key: Exclude<SearchSortKey, "default">): SearchSort {
  if (current.key !== key) return { key, dir: "desc" };
  return { key, dir: current.dir === "desc" ? "asc" : "desc" };
}
