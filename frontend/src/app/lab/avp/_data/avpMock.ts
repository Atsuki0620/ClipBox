// UIラボ「AVP画面」専用のモックデータ＋派生ヘルパ。
// 【役割】/lab/avp の3案（A/B/C）で共有する固定サンプルと、AVP の状態区別
//   （候補プール / 再生対象=最大4本 / 再生中ハイライト）を純関数で表現する。
//   状態ラベル（Tier1/Tier2・未判定/判定済み・未選別/選別済み）の表示文言もここで一元化。
// 【設計制約】API/DB/localStorage に一切接続しない（純粋な定数とフォーマッタのみ）。
//   ファイル名は明らかに合成のプレースホルダ（実在名・実パス・個人情報を置かない）。
//   本体仕様の不変点を文言・初期値で踏襲する: 候補=上限なし / 再生対象=最大4本（MAX_AVP_PLAY_TARGET）/
//   再生対象は候補の部分集合 / 永続先は localStorage（あとで見る=DB とは別物）。値の実保存はしない。
// 【依存関係】@/lib/levels（levelName / levelColor / storageLabel）のみ。lib/types とは独立。

import { levelName, levelColor, storageLabel } from "@/lib/levels";

// 本体 store.ts と同じ上限（再生対象は最大4本。候補に上限はない）。
export const MAX_AVP_PLAY_TARGET = 4;

// AVP画面のカード表示に必要な項目だけ持つラボ用の型（実 Video のサブセット＋ラボ注記）。
// AVP画面に並ぶ動画は「すべて AVP候補」である前提（候補プール）。
export interface AvpVideo {
  id: number;
  essential_filename: string;
  current_favorite_level: number; // -1=未判定, 0..4
  needs_selection: boolean; // Tier2 未選別（! prefix 相当）
  is_selection_completed: boolean; // Tier2 選別済み（+ prefix 相当）
  storage_location: string; // C_DRIVE | EXTERNAL_HDD
  view_count: number;
  like_count: number;
  last_viewed: string | null; // 最終 APP 再生日
  is_available: boolean;
  watch_later: boolean; // あとで見る（DB 相当）。AVP候補（localStorage）との併存を見せるための注記
  initial_play_target: boolean; // 初期の再生対象（最大4本の枠を埋めるシード）
  avp_playing: boolean; // 直近 AVP 再生した動画＝再生中ハイライト（amber）の想定
}

// 合成プレースホルダ（9件＝候補プール）。指定の状態を最低1件ずつ網羅する。
// 初期の再生対象は3本（id 2 / 4 / 8）＝4枠のうち1枠を空きにして 0〜4 の見え方を示す。
export const AVP_VIDEOS: AvpVideo[] = [
  { id: 1, essential_filename: "AVP_T1_UNRATED_CANDIDATE_001.mp4", current_favorite_level: -1, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 0, like_count: 0, last_viewed: null, is_available: true, watch_later: false, initial_play_target: false, avp_playing: false },
  { id: 2, essential_filename: "AVP_T1_LV4_SELECTED_002.mp4", current_favorite_level: 4, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 12, like_count: 6, last_viewed: "2026-06-20", is_available: true, watch_later: false, initial_play_target: true, avp_playing: true },
  { id: 3, essential_filename: "AVP_T2_UNSELECTED_CANDIDATE_003.mp4", current_favorite_level: -1, needs_selection: true, is_selection_completed: false, storage_location: "EXTERNAL_HDD", view_count: 2, like_count: 0, last_viewed: null, is_available: true, watch_later: false, initial_play_target: false, avp_playing: false },
  { id: 4, essential_filename: "AVP_T2_COMPLETED_SELECTED_004.mp4", current_favorite_level: 3, needs_selection: false, is_selection_completed: true, storage_location: "EXTERNAL_HDD", view_count: 8, like_count: 3, last_viewed: "2026-06-15", is_available: true, watch_later: false, initial_play_target: true, avp_playing: false },
  { id: 5, essential_filename: "AVP_WATCH_LATER_CANDIDATE_005.mp4", current_favorite_level: -1, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 1, like_count: 1, last_viewed: null, is_available: true, watch_later: true, initial_play_target: false, avp_playing: false },
  { id: 6, essential_filename: "AVP_UNAVAILABLE_EXTERNAL_006.mp4", current_favorite_level: 2, needs_selection: false, is_selection_completed: false, storage_location: "EXTERNAL_HDD", view_count: 4, like_count: 1, last_viewed: "2026-05-30", is_available: false, watch_later: false, initial_play_target: false, avp_playing: false },
  { id: 7, essential_filename: "AVP_VERY_LONG_SAMPLE_TITLE_FOR_LAYOUT_CHECK_007.mp4", current_favorite_level: 1, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 6, like_count: 2, last_viewed: null, is_available: true, watch_later: false, initial_play_target: false, avp_playing: false },
  { id: 8, essential_filename: "AVP_LIKED_SHORT_008.mp4", current_favorite_level: 2, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", view_count: 16, like_count: 9, last_viewed: "2026-06-22", is_available: true, watch_later: false, initial_play_target: true, avp_playing: true },
  { id: 9, essential_filename: "AVP_T1_LV2_HDD_009.mp4", current_favorite_level: 2, needs_selection: false, is_selection_completed: false, storage_location: "EXTERNAL_HDD", view_count: 3, like_count: 0, last_viewed: null, is_available: true, watch_later: false, initial_play_target: false, avp_playing: false },
];

// 初期の再生対象 ID（最大4本のシード。候補の部分集合）。
export const INITIAL_PLAY_TARGET_IDS: number[] = AVP_VIDEOS.filter((v) => v.initial_play_target).map((v) => v.id);

// 直近 AVP 再生した本数（再生中ハイライトの数＝KPI 表示用）。
export const PLAYING_COUNT: number = AVP_VIDEOS.filter((v) => v.avp_playing).length;

// 再生対象が満杯か（4本以上選択済み）。
export function isTargetFull(selectedCount: number): boolean {
  return selectedCount >= MAX_AVP_PLAY_TARGET;
}

// 状態バッジ（本体 statusLabel と同じ文言）。
export function statusLabel(v: AvpVideo): string {
  if (v.is_selection_completed) return "Tier2 選別済み";
  if (v.needs_selection) return "Tier2 未選別";
  if (v.current_favorite_level === -1) return "Tier1 未判定";
  return `Tier1 ${levelName(v.current_favorite_level)}`;
}

// 最終 APP 再生日の表示（本体 formatLastViewed 相当）。
export function formatLastViewed(iso: string | null): string {
  if (!iso) return "なし";
  return iso.substring(0, 10).replace(/-/g, "/");
}

export { levelName, levelColor, storageLabel };
