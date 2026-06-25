// UIラボ「検索画面」専用のモックデータ＋派生ヘルパ。
// 【役割】/lab/search の3案（A/B/C）で共有する固定サンプル。キーワードの簡易部分一致と、案B 用の Tier/状態タグを提供する。
// 【設計制約】API/DB/localStorage に一切接続しない（純粋な定数と純関数のみ・検索結果を別状態として永続化しない）。
//   ★保存場所は匿名化した分類のみ（実パス・実フォルダ名・実動画名を出さない）。ファイル名は合成プレースホルダ。
//   API 風フィールドは snake_case。
// 【依存関係】../../_data/labMock（LAB_VIDEOS 等）, @/lib/levels（levelName / levelColor）。lib/types とは独立。

import { LAB_VIDEOS, type LabVideo, formatDate, formatFileSize } from "../../_data/labMock";
import { levelName, levelColor } from "@/lib/levels";

// 既定のサンプル検索語（スクショで結果が出るように）。合成プレースホルダ。
// "clip" は Tier1/Tier2 と利用不可を混在させ、Tier 整合の見え方を確認しやすい。
export const DEFAULT_QUERY = "clip";

// 匿名化した保存場所ラベル（実パス・実フォルダ名は出さない）。
export function storageCategory(storage: string): string {
  if (storage === "C_DRIVE") return "内蔵ドライブ相当";
  if (storage === "EXTERNAL_HDD") return "外付けHDD相当";
  return storage;
}
export const STORAGE_FILTER_OPTIONS = ["内蔵ドライブ相当", "外付けHDD相当"] as const;

// Tier/選別タグ付きの検索結果型（案B のカード整合用）。
export interface SearchVideo extends LabVideo {
  tier: "Tier1" | "Tier2";
  needs_selection: boolean; // Tier2 未選別
  is_selection_completed: boolean; // Tier2 選別済み
}

// LAB_VIDEOS に Tier/選別タグを付与（合成）。一部を Tier2 扱いにして両 Tier を混在させる。
export const SEARCH_VIDEOS: SearchVideo[] = LAB_VIDEOS.map((v) => {
  const tier2 = v.id % 3 === 0;
  return {
    ...v,
    tier: tier2 ? "Tier2" : "Tier1",
    needs_selection: tier2 && v.current_favorite_level === -1,
    is_selection_completed: tier2 && v.current_favorite_level !== -1,
  };
});

// 状態キャプション（本体 statusLabel と同じ文言。判定済み/未判定・選別済み/未選別を混同しない）。
export function searchStatusLabel(v: SearchVideo): string {
  if (v.tier === "Tier2") {
    return v.is_selection_completed ? "Tier2 選別済み" : "Tier2 未選別";
  }
  return v.current_favorite_level === -1 ? "Tier1 未判定" : `Tier1 ${levelName(v.current_favorite_level)}`;
}

// キーワードの簡易部分一致（モック・ファイル名のみ。API は呼ばない・結果は永続化しない）。
export function searchByKeyword(query: string): SearchVideo[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SEARCH_VIDEOS.filter((v) => v.essential_filename.toLowerCase().includes(q));
}

// 各 Variant 切替（LabFrame に渡す）。
export const SEARCH_AREA_VARIANTS = [
  { key: "a", href: "/lab/search/variant-a", label: "A 現状改善" },
  { key: "b", href: "/lab/search/variant-b", label: "B Tier整合" },
  { key: "c", href: "/lab/search/variant-c", label: "C 高機能フィルタ" },
];

export { formatDate, formatFileSize, levelName, levelColor, type LabVideo };
