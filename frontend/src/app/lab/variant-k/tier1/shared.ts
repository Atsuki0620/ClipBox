// 統合 Variant K Tier1 共有: 型・フィルタ/ソート/ページャ・抽選ピック（純関数）。
// 【役割】Tier1 の3タブ（ライブラリ/ランダム/運命の1本）が共有する型と副作用なしの純関数。
//   フィルタ（レベル/保存先/状態/再生可）・並び替え（5項目×昇降）・ページャ・抽選を合成データに対して行う。永続化しない（メモリ相当）。
// 【設計制約】API/DB/localStorage/sessionStorage に触れない。純関数・定数のみ。
//   抽選はモック（実ランダム仕様は作らない）。並び替え項目は レベル/作成日/視聴日数/タイトル/判定日 の5つ
//   （最終再生日・視聴回数は入れない＝統合方針）。レベルは 未(-1)/0..4 の6値。
// 【依存関係】_data/variantKMock（VariantKVideo 型）のみ。

import type { VariantKVideo } from "../_data/variantKMock";

// Tier1 のレベル値（未=-1, Lv0..Lv4）。判定ボタン・レベルフィルタ chip で共有。
export const TIER1_LEVEL_VALUES = [-1, 0, 1, 2, 3, 4] as const;

export type Tier1StatusFilter = "all" | "unrated" | "judged";
export type Tier1ViewMode = "card" | "table";

export const TIER1_STATUS_OPTIONS: { value: Tier1StatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "unrated", label: "未判定" },
  { value: "judged", label: "判定済み" },
];

export interface Tier1Filters {
  levels: number[]; // -1..4（空＝指定なし）
  storages: string[]; // "C_DRIVE" | "EXTERNAL_HDD"（空＝指定なし）
  status: Tier1StatusFilter;
  availableOnly: boolean;
}

export const DEFAULT_TIER1_FILTERS: Tier1Filters = {
  levels: [],
  storages: [],
  status: "all",
  availableOnly: false,
};

// 有効なフィルタ数（漏斗バッジ用）。状態は all 以外、再生可は ON のとき各1。
export function activeTier1FilterCount(f: Tier1Filters): number {
  return (
    (f.levels.length > 0 ? 1 : 0) +
    (f.storages.length > 0 ? 1 : 0) +
    (f.status !== "all" ? 1 : 0) +
    (f.availableOnly ? 1 : 0)
  );
}

// 未判定 = tier1_status が -1。判定済み = 0 以上。
export function isUnrated(v: VariantKVideo): boolean {
  return v.tier1_status === -1;
}

export function applyTier1Filters(videos: VariantKVideo[], f: Tier1Filters): VariantKVideo[] {
  return videos.filter((v) => {
    if (f.status === "unrated" && !isUnrated(v)) return false;
    if (f.status === "judged" && isUnrated(v)) return false;
    if (f.availableOnly && !v.available) return false;
    if (f.levels.length > 0 && !f.levels.includes(v.tier1_status)) return false;
    if (f.storages.length > 0 && !f.storages.includes(v.storage)) return false;
    return true;
  });
}

// 並び替え（2段：項目＋方向）。項目は レベル/作成日/視聴日数/タイトル/判定日 の5つ。
export type Tier1SortKey = "level" | "creation_date" | "view_days" | "title" | "judged_at";
export type Tier1SortDir = "desc" | "asc";
export type Tier1Sort = { key: Tier1SortKey; dir: Tier1SortDir };

export const DEFAULT_TIER1_SORT: Tier1Sort = { key: "view_days", dir: "desc" };

export const TIER1_SORT_OPTIONS: { value: Tier1SortKey; label: string }[] = [
  { value: "level", label: "レベル" },
  { value: "creation_date", label: "作成日" },
  { value: "view_days", label: "視聴日数" },
  { value: "title", label: "タイトル" },
  { value: "judged_at", label: "判定日" },
];

function sortValue(v: VariantKVideo, key: Tier1SortKey): number | string {
  switch (key) {
    case "level":
      return v.tier1_status;
    case "creation_date":
      return v.file_created_at ?? "";
    case "view_days":
      return v.view_days;
    case "title":
      return v.title;
    case "judged_at":
      return v.judged_at ?? "";
  }
}

export function sortTier1(videos: VariantKVideo[], sort: Tier1Sort): VariantKVideo[] {
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
export const TIER1_PAGE_SIZES = [50, 100, 200] as const;

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

export function paginate<T>(items: T[], page: number, size: number): T[] {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}

// ランダム/運命の抽選候補 = 未判定かつ再生可能（判定済み・利用不可は含めない）。
export function drawableCandidates(videos: VariantKVideo[]): VariantKVideo[] {
  return videos.filter((v) => isUnrated(v) && v.available);
}

// N 本を抽選（モックのシャッフル）。候補が N 未満ならある分だけ返す。
export function drawN(videos: VariantKVideo[], n: number): VariantKVideo[] {
  const pool = [...drawableCandidates(videos)];
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
