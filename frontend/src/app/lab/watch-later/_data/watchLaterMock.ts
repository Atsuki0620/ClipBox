// UIラボ「あとで見る」専用のモックデータ＋分類ヘルパ。
// 【役割】/lab/watch-later の3案（A/B/C）で共有する固定サンプルと、本体 watch-later/page.tsx の
//   セクション分類ロジック（未処理 / 確認・見直し / 処理済み候補）を純関数で再現する。
//   付与理由・状態ラベル（Tier1/Tier2・未判定/判定済み・未選別/選別済み）の表示文言もここで一元化。
// 【設計制約】API/DB/localStorage に一切接続しない（純粋な定数とフォーマッタのみ）。
//   ファイル名は明らかに合成のプレースホルダ（実在名・実パス・個人情報を置かない）。
//   永続境界の説明はモック文言のみ。あとで見る=DB / AVP候補=localStorage の境界は越えない。
// 【依存関係】@/lib/levels（levelName / storageLabel）のみ。lib/types とは独立。

import { levelName, storageLabel } from "@/lib/levels";

// あとで見る画面のカード表示に必要な項目だけ持つラボ用の型（実 Video のサブセット＋ラボ注記）。
export interface WatchLaterVideo {
  id: number;
  essential_filename: string;
  current_favorite_level: number; // -1=未判定, 0..4
  needs_selection: boolean; // Tier2 未選別（! prefix 相当）
  is_selection_completed: boolean; // Tier2 選別済み（+ prefix 相当）
  storage_location: string; // C_DRIVE | EXTERNAL_HDD
  view_count: number;
  like_count: number;
  last_viewed: string | null; // 最終 APP 再生日（処理済み候補の判定に使う）
  is_available: boolean;
  avp_candidate: boolean; // AVP候補（localStorage 相当のモック注記。あとで見る＝DB とは別物）
  avp_played: boolean; // AVP再生済みだが、あとで見るに残っている想定（将来方針の可視化用）
}

// 合成プレースホルダ（12件）。指定の14状態を最低1件ずつ網羅する。
// watch_later は全件 true 前提（あとで見る専用ページのため省略）。
export const WATCH_LATER_VIDEOS: WatchLaterVideo[] = [
  // --- 未処理（Tier1未判定 / Tier2未選別） ---
  { id: 1, essential_filename: "T1_UNRATED_WATCH_LATER_001.mp4", current_favorite_level: -1, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 0, like_count: 0, last_viewed: null, is_available: true, avp_candidate: false, avp_played: false },
  { id: 3, essential_filename: "T2_UNSELECTED_WATCH_LATER_003.mp4", current_favorite_level: -1, needs_selection: true, is_selection_completed: false, storage_location: "EXTERNAL_HDD", view_count: 2, like_count: 0, last_viewed: null, is_available: true, avp_candidate: false, avp_played: false },
  { id: 5, essential_filename: "UNAVAILABLE_EXTERNAL_005.mp4", current_favorite_level: -1, needs_selection: false, is_selection_completed: false, storage_location: "EXTERNAL_HDD", view_count: 1, like_count: 0, last_viewed: null, is_available: false, avp_candidate: false, avp_played: false },
  { id: 8, essential_filename: "T1_AVP_CANDIDATE_008.mp4", current_favorite_level: -1, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 0, like_count: 0, last_viewed: null, is_available: true, avp_candidate: true, avp_played: false },
  { id: 12, essential_filename: "T2_UNSELECTED_LIKED_012.mp4", current_favorite_level: -1, needs_selection: true, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 3, like_count: 3, last_viewed: null, is_available: true, avp_candidate: false, avp_played: false },

  // --- 確認・見直し（処理済み状態だが最終 APP 再生日なし） ---
  { id: 2, essential_filename: "T1_LV4_REVIEW_002.mp4", current_favorite_level: 4, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 5, like_count: 2, last_viewed: null, is_available: true, avp_candidate: false, avp_played: false },
  { id: 9, essential_filename: "T2_COMPLETED_REVIEW_009.mp4", current_favorite_level: 2, needs_selection: false, is_selection_completed: true, storage_location: "EXTERNAL_HDD", view_count: 4, like_count: 1, last_viewed: null, is_available: true, avp_candidate: false, avp_played: false },
  { id: 10, essential_filename: "SHORT_010.mp4", current_favorite_level: 0, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 1, like_count: 0, last_viewed: null, is_available: true, avp_candidate: false, avp_played: false },

  // --- 処理済み候補（処理済み状態かつ最終 APP 再生日あり＝一括解除の対象） ---
  { id: 4, essential_filename: "T2_COMPLETED_AVP_PLAYED_STILL_LATER_004.mp4", current_favorite_level: 3, needs_selection: false, is_selection_completed: true, storage_location: "EXTERNAL_HDD", view_count: 12, like_count: 5, last_viewed: "2026-06-18", is_available: true, avp_candidate: false, avp_played: true },
  { id: 6, essential_filename: "VERY_LONG_SAMPLE_TITLE_FOR_LAYOUT_CHECK_006.mp4", current_favorite_level: 3, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 9, like_count: 4, last_viewed: "2026-06-11", is_available: true, avp_candidate: false, avp_played: false },
  { id: 7, essential_filename: "T1_LV2_LIKED_007.mp4", current_favorite_level: 2, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 16, like_count: 8, last_viewed: "2026-06-20", is_available: true, avp_candidate: false, avp_played: false },
  { id: 11, essential_filename: "T1_LV1_HDD_011.mp4", current_favorite_level: 1, needs_selection: false, is_selection_completed: false, storage_location: "EXTERNAL_HDD", view_count: 6, like_count: 2, last_viewed: "2026-05-29", is_available: true, avp_candidate: false, avp_played: false },
];

export type WatchLaterSectionKey = "unprocessed" | "review" | "processed";

export const SECTION_META: Record<WatchLaterSectionKey, { title: string; hint: string }> = {
  unprocessed: { title: "未処理", hint: "Tier1 未判定 / Tier2 未選別。まず判定・選別する対象。" },
  review: { title: "確認・見直し", hint: "判定/選別は済んだが、まだ APP で見直していない動画。" },
  processed: { title: "処理済み候補", hint: "処理済みかつ APP 再生済み。あとで見る解除の有力候補（一括解除の対象）。" },
};

// --- 本体 watch-later/page.tsx の分類ロジックを純関数で再現 ---

function isUnprocessed(v: WatchLaterVideo): boolean {
  if (v.is_selection_completed) return false;
  return v.needs_selection || v.current_favorite_level === -1;
}

function isReviewTarget(v: WatchLaterVideo): boolean {
  return v.is_selection_completed || v.current_favorite_level >= 0;
}

function isProcessedCandidate(v: WatchLaterVideo): boolean {
  if (!isReviewTarget(v)) return false;
  return Boolean(v.last_viewed);
}

export function sectionOf(v: WatchLaterVideo): WatchLaterSectionKey {
  if (isUnprocessed(v)) return "unprocessed";
  if (isProcessedCandidate(v)) return "processed";
  return "review";
}

export function groupBySection(
  videos: WatchLaterVideo[],
): Record<WatchLaterSectionKey, WatchLaterVideo[]> {
  const out: Record<WatchLaterSectionKey, WatchLaterVideo[]> = {
    unprocessed: [],
    review: [],
    processed: [],
  };
  for (const v of videos) out[sectionOf(v)].push(v);
  return out;
}

// カードの displayContext（Tier1 / Tier2）。本体と同じ判定。
export function displayContextOf(v: WatchLaterVideo): "tier1" | "tier2" {
  return v.needs_selection || v.is_selection_completed ? "tier2" : "tier1";
}

// 状態バッジ（本体 statusLabel と同じ文言）。
export function statusLabel(v: WatchLaterVideo): string {
  if (v.is_selection_completed) return "Tier2 選別済み";
  if (v.needs_selection) return "Tier2 未選別";
  if (v.current_favorite_level === -1) return "Tier1 未判定";
  return `Tier1 ${levelName(v.current_favorite_level)}`;
}

// 付与理由（案B/C 用。なぜ「あとで見る」に残っているかの説明）。
export function reasonLabel(v: WatchLaterVideo): string {
  if (v.is_selection_completed) return "Tier2 で追加・選別済み";
  if (v.needs_selection) return "Tier2 で追加・未選別";
  if (v.current_favorite_level === -1) return "Tier1 で追加・未判定";
  return `Tier1 で追加・判定済み（${levelName(v.current_favorite_level)}）`;
}

// 最終 APP 再生日の表示（本体 formatLastViewed 相当）。
export function formatLastViewed(iso: string | null): string {
  if (!iso) return "なし";
  return iso.substring(0, 10).replace(/-/g, "/");
}

export { levelName, storageLabel };
