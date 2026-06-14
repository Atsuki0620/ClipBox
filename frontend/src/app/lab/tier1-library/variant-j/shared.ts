// UIラボ Variant J 共有: 型・フィルタ/ソート・モックトレンド。
// 【役割】最終統合コンソール（J）でページ⇔ツールバー⇔コンテンツが共有する型と純関数。
//   フィルタ/ソートはモックの静的データ（LAB_VIDEOS の元値）に対して行う（カードのライブ状態は対象外＝モック割り切り）。
// 【設計制約】API/DB/localStorage に触れない。副作用なしの純関数・定数のみ。
// 【依存関係】_data/labMock（LabVideo 型）のみ。

import type { LabVideo } from "../../_data/labMock";

export type ViewMode = "card" | "table";
export type SortOrder = "asc" | "desc";
export type SortField =
  | "favorite_level"
  | "creation_date"
  | "view_count"
  | "last_viewed"
  | "title"
  | "judged_at";
export type StatusFilter = "all" | "unrated" | "judged";

export interface JFilters {
  levels: number[]; // 空 = すべて
  storages: string[]; // 空 = すべて
  status: StatusFilter;
  availableOnly: boolean;
}

export const DEFAULT_FILTERS: JFilters = {
  levels: [],
  storages: [],
  status: "all",
  availableOnly: false,
};

// 漏斗バッジ用：有効なフィルタ「グループ」数。
export function activeFilterCount(f: JFilters, keyword: string): number {
  let n = 0;
  if (f.levels.length) n += 1;
  if (f.storages.length) n += 1;
  if (f.status !== "all") n += 1;
  if (f.availableOnly) n += 1;
  if (keyword.trim()) n += 1;
  return n;
}

export function applyJFilters(
  videos: LabVideo[],
  filters: JFilters,
  keyword: string,
): LabVideo[] {
  const kw = keyword.trim().toLowerCase();
  return videos.filter((v) => {
    if (kw && !v.essential_filename.toLowerCase().includes(kw)) return false;
    if (filters.levels.length && !filters.levels.includes(v.current_favorite_level)) return false;
    if (filters.storages.length && !filters.storages.includes(v.storage_location)) return false;
    if (filters.status === "unrated" && v.current_favorite_level !== -1) return false;
    if (filters.status === "judged" && v.current_favorite_level === -1) return false;
    if (filters.availableOnly && !v.is_available) return false;
    return true;
  });
}

function sortValue(v: LabVideo, field: SortField): number | string {
  switch (field) {
    case "favorite_level":
      return v.current_favorite_level;
    case "view_count":
      return v.view_count;
    case "last_viewed":
      return v.last_viewed ?? "";
    case "title":
      return v.essential_filename.toLowerCase();
    case "creation_date":
    case "judged_at":
    default:
      return v.last_file_modified ?? ""; // モックの代理値
  }
}

export function sortJVideos(videos: LabVideo[], field: SortField, order: SortOrder): LabVideo[] {
  const dir = order === "asc" ? 1 : -1;
  return [...videos].sort((a, b) => {
    const av = sortValue(a, field);
    const bv = sortValue(b, field);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return (a.id - b.id) * dir;
  });
}

// 本日の判定：直近30日（モック・折れ線スパークライン用）。末尾が「本日 24」。
export const TODAY_TREND: number[] = [
  8, 11, 6, 9, 13, 7, 10, 5, 12, 9, 14, 11, 8, 16, 12, 10, 18, 13, 9, 15, 19, 14, 11, 17, 20, 16, 13, 21, 18, 24,
];
