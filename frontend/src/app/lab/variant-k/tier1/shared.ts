// 統合 Variant K Tier1 共有: 型・フィルタ/ソート・抽選ピック（純関数）。
// 【役割】Tier1 の3タブ（ライブラリ/ランダム/運命の1本）が共有する型と副作用なしの純関数。
//   フィルタ/ソートは合成データ（VARIANT_K_VIDEOS）に対して行う。永続化しない（メモリ相当）。
// 【設計制約】API/DB/localStorage/sessionStorage に触れない。純関数・定数のみ。
//   抽選はモック（実ランダム仕様は作らない）＝代表を切り替える程度。
// 【依存関係】_data/variantKMock（VariantKVideo 型）のみ。

import type { VariantKVideo } from "../_data/variantKMock";

// Tier1 で付与できるレベル（未判定へ戻す操作は段階3では出さないため 0..4 のみ）。
export const TIER1_LEVELS = [0, 1, 2, 3, 4] as const;

export type Tier1StatusFilter = "all" | "unrated" | "judged";
export type Tier1Sort = "view_days" | "creation_date" | "judged_at";

export const TIER1_STATUS_OPTIONS: { value: Tier1StatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "unrated", label: "未判定" },
  { value: "judged", label: "判定済み" },
];

export const TIER1_SORT_OPTIONS: { value: Tier1Sort; label: string }[] = [
  { value: "view_days", label: "視聴日数順" },
  { value: "creation_date", label: "作成日順" },
  { value: "judged_at", label: "判定日順" },
];

export interface Tier1Filters {
  status: Tier1StatusFilter;
  availableOnly: boolean;
  sort: Tier1Sort;
}

export const DEFAULT_TIER1_FILTERS: Tier1Filters = {
  status: "all",
  availableOnly: false,
  sort: "view_days",
};

// 未判定 = tier1_status が -1。判定済み = 0 以上。
export function isUnrated(v: VariantKVideo): boolean {
  return v.tier1_status === -1;
}

export function applyTier1Filters(videos: VariantKVideo[], f: Tier1Filters): VariantKVideo[] {
  return videos.filter((v) => {
    if (f.status === "unrated" && !isUnrated(v)) return false;
    if (f.status === "judged" && isUnrated(v)) return false;
    if (f.availableOnly && !v.available) return false;
    return true;
  });
}

function sortKey(v: VariantKVideo, sort: Tier1Sort): number | string {
  switch (sort) {
    case "view_days":
      return v.view_days;
    case "creation_date":
      return v.file_created_at ?? "";
    case "judged_at":
      return v.judged_at ?? "";
  }
}

export function sortTier1(videos: VariantKVideo[], sort: Tier1Sort): VariantKVideo[] {
  // 視聴日数は降順、日付は新しい順（降順）。タイブレークは id 昇順。
  return [...videos].sort((a, b) => {
    const av = sortKey(a, sort);
    const bv = sortKey(b, sort);
    if (av < bv) return 1;
    if (av > bv) return -1;
    return a.id - b.id;
  });
}

// ランダム/運命の抽選候補 = 未判定かつ再生可能（判定済み・利用不可は含めない）。
export function drawableCandidates(videos: VariantKVideo[]): VariantKVideo[] {
  return videos.filter((v) => isUnrated(v) && v.available);
}

// 「最近見てない優先」見た目用：last_played_at が古い/無いものを前に並べた候補（モック）。
export function recentlyUnwatchedFirst(videos: VariantKVideo[]): VariantKVideo[] {
  return [...videos].sort((a, b) => (a.last_played_at ?? "") < (b.last_played_at ?? "") ? -1 : 1);
}
