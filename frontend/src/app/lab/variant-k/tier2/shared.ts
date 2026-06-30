// 統合 Variant K Tier2 共有: 型・フィルタ/ソート/ページャ・抽選ピック（純関数）。
// 【役割】Tier2 の3タブ（ライブラリ/ランダム/運命の1本）が共有する型と副作用なしの純関数。
//   Tier1（tier1/shared.ts）と同じ作りで、語彙だけ Tier2（選別/未選別/選別日）にしたもの。
//   フィルタ（選別レベル/保存先/状態/再生可）・並び替え（5項目×昇降）・ページャ・抽選を合成データに対して行う。永続化しない（メモリ相当）。
// 【設計制約】API/DB/localStorage/sessionStorage に触れない。純関数・定数のみ。
//   抽選はモック（実ランダム仕様は作らない）。並び替え項目は 選別レベル/作成日/視聴日数/タイトル/選別日 の5つ。
//   選別値は 未選別(unselected)/0..4 の6値（none=Tier2対象外はライブラリに出さない）。
// 【依存関係】_data/variantKMock（VariantKVideo / Tier2Status 型）のみ。

import type { Tier2Status, VariantKVideo } from "../_data/variantKMock";

// 選別値（未選別=unselected, Lv0..Lv4）。選別ボタン・選別レベルフィルタ chip で共有。
export type Tier2SelectionValue = "unselected" | 0 | 1 | 2 | 3 | 4;
export const TIER2_LEVELS: readonly Tier2SelectionValue[] = ["unselected", 0, 1, 2, 3, 4];

export type Tier2StatusFilter = "all" | "unselected" | "completed";
export type Tier2ViewMode = "card" | "table";

export const TIER2_STATUS_OPTIONS: { value: Tier2StatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "unselected", label: "未選別" },
  { value: "completed", label: "選別済み" },
];

export interface Tier2Filters {
  levels: Tier2SelectionValue[]; // 未選別/0..4（空＝指定なし）
  storages: string[]; // "C_DRIVE" | "EXTERNAL_HDD"（空＝指定なし）
  status: Tier2StatusFilter;
  availableOnly: boolean;
}

export const DEFAULT_TIER2_FILTERS: Tier2Filters = {
  levels: [],
  storages: [],
  status: "all",
  availableOnly: false,
};

// 有効なフィルタ数（漏斗バッジ用）。状態は all 以外、再生可は ON のとき各1。
export function activeTier2FilterCount(f: Tier2Filters): number {
  return (
    (f.levels.length > 0 ? 1 : 0) +
    (f.storages.length > 0 ? 1 : 0) +
    (f.status !== "all" ? 1 : 0) +
    (f.availableOnly ? 1 : 0)
  );
}

// Tier2対象 = tier2_status が "none" 以外。未選別 = "unselected"。選別済み = 数値(0..4)。
export function isTier2Target(v: VariantKVideo): boolean {
  return v.tier2_status !== "none";
}
export function isTier2Unselected(v: VariantKVideo): boolean {
  return v.tier2_status === "unselected";
}
export function isTier2Completed(v: VariantKVideo): boolean {
  return typeof v.tier2_status === "number";
}

export function applyTier2Filters(videos: VariantKVideo[], f: Tier2Filters): VariantKVideo[] {
  return videos.filter((v) => {
    if (!isTier2Target(v)) return false; // 対象外はライブラリに出さない
    if (f.status === "unselected" && !isTier2Unselected(v)) return false;
    if (f.status === "completed" && !isTier2Completed(v)) return false;
    if (f.availableOnly && !v.available) return false;
    if (f.levels.length > 0 && !f.levels.includes(v.tier2_status as Tier2SelectionValue)) return false;
    if (f.storages.length > 0 && !f.storages.includes(v.storage)) return false;
    return true;
  });
}

// 並び替え（2段：項目＋方向）。項目は 選別レベル/作成日/視聴日数/タイトル/選別日 の5つ。
export type Tier2SortKey = "level" | "creation_date" | "view_days" | "title" | "selected_at";
export type Tier2SortDir = "desc" | "asc";
export type Tier2Sort = { key: Tier2SortKey; dir: Tier2SortDir };

export const DEFAULT_TIER2_SORT: Tier2Sort = { key: "view_days", dir: "desc" };

export const TIER2_SORT_OPTIONS: { value: Tier2SortKey; label: string }[] = [
  { value: "level", label: "選別レベル" },
  { value: "creation_date", label: "作成日" },
  { value: "view_days", label: "視聴日数" },
  { value: "title", label: "タイトル" },
  { value: "selected_at", label: "選別日" },
];

// 未選別/対象外は -1 として扱う（数値レベルより前に並ぶ）。
function selectionRank(status: Tier2Status): number {
  return typeof status === "number" ? status : -1;
}

function sortValue(v: VariantKVideo, key: Tier2SortKey): number | string {
  switch (key) {
    case "level":
      return selectionRank(v.tier2_status);
    case "creation_date":
      return v.file_created_at ?? "";
    case "view_days":
      return v.view_days;
    case "title":
      return v.title;
    case "selected_at":
      return v.selected_at ?? "";
  }
}

export function sortTier2(videos: VariantKVideo[], sort: Tier2Sort): VariantKVideo[] {
  return [...videos].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    let cmp = 0;
    if (typeof av === "string" || typeof bv === "string") {
      cmp = String(av).localeCompare(String(bv), "ja");
    } else {
      cmp = av - bv;
    }
    if (cmp !== 0) return sort.dir === "desc" ? -cmp : cmp;
    return a.id - b.id; // タイブレークは id 昇順で安定
  });
}

// ページャ（カード/テーブル両モード共用）。
export const TIER2_PAGE_SIZES = [50, 100, 200] as const;

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

export function paginate<T>(items: T[], page: number, size: number): T[] {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}

// ランダム/運命の抽選候補。既定は未選別かつ再生可能、トグルOFF時は選別済みも含める（いずれも Tier2 対象のみ）。
export function drawableCandidates(
  videos: VariantKVideo[],
  options: { unselectedOnly?: boolean } = {},
): VariantKVideo[] {
  const { unselectedOnly = true } = options;
  return videos.filter((v) => {
    if (!isTier2Target(v)) return false;
    if (!v.available) return false;
    if (unselectedOnly && !isTier2Unselected(v)) return false;
    return true;
  });
}

// N 本を抽選（モックのシャッフル）。候補が N 未満ならある分だけ返す。
export function drawN(
  videos: VariantKVideo[],
  n: number,
  options: { unselectedOnly?: boolean } = {},
): VariantKVideo[] {
  const pool = [...drawableCandidates(videos, options)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// 「最近見てない優先」見た目用：last_played_at が古い/無いものを前に並べた候補（モック）。
export function recentlyUnwatchedFirst(videos: VariantKVideo[]): VariantKVideo[] {
  return [...videos].sort((a, b) => ((a.last_played_at ?? "") < (b.last_played_at ?? "") ? -1 : 1));
}
