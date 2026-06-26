// UIラボ「分析画面」専用のモックデータ＋派生集計。
// 【役割】/lab/analysis の3案（A/B/C）で共有する固定サンプル。匿名ダミー動画と、それから導く KPI・分布・進捗・偏り・
//   洞察リストを純関数で提供する。時系列（APP再生/判定/選別/視聴日数/あとで見る推移）は決定的な擬似データで生成する。
// 【設計制約】API/DB/localStorage に一切接続しない（純粋な定数と純関数のみ）。
//   ★グラフ・KPI 値は UI 表示確認用のダミーであり、本体の分析ロジック・集計SQL・APP_PLAYBACK 計算式は一切変更しない。
//     APP_PLAYBACK の考え方（アプリ内再生を視聴指標とする）を踏まえた「表示例」に過ぎない。
//   ファイル名は合成プレースホルダ（実在名・実パス・個人情報なし）。保存場所は匿名化分類のみ。API 風フィールドは snake_case。
// 【依存関係】../../_data/labMock（formatFileSize / formatDate）, @/lib/levels（levelName）。lib/types とは独立。

import { formatFileSize, formatDate } from "../../_data/labMock";
import { levelName } from "@/lib/levels";

const GB = 1024 ** 3;
// 「今日」基準（決定的）。daysSince / 時系列生成に使う。実時刻には依存しない。
export const TODAY = new Date("2026-06-25T00:00:00");

export interface AnalysisVideo {
  id: number;
  essential_filename: string;
  tier: "Tier1" | "Tier2";
  current_favorite_level: number; // -1=未判定, 0..4
  needs_selection: boolean; // Tier2 未選別
  is_selection_completed: boolean; // Tier2 選別済み
  storage_location: string; // C_DRIVE | EXTERNAL_HDD
  file_size: number | null; // bytes
  total_view_count: number; // APP_PLAYBACK 総再生回数（例）
  period_view_count: number; // 期間内 APP 再生（例）
  view_days: number; // 視聴した日数（例）
  like_count: number;
  watch_later: boolean;
  avp_candidate: boolean;
  is_available: boolean;
  last_viewed: string | null; // ISO（APP 最終再生）。null=履歴なし
}

// 合成プレースホルダ（24件）。必要状態を最低1件ずつ網羅する。
export const ANALYSIS_VIDEOS: AnalysisVideo[] = [
  { id: 1, essential_filename: "T1_UNRATED_LONG_TITLE_001.mp4", tier: "Tier1", current_favorite_level: -1, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(1.2 * GB), total_view_count: 0, period_view_count: 0, view_days: 0, like_count: 0, watch_later: false, avp_candidate: false, is_available: true, last_viewed: null },
  { id: 2, essential_filename: "T1_LEVEL3_RECENTLY_PLAYED_002.mp4", tier: "Tier1", current_favorite_level: 3, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(2.1 * GB), total_view_count: 22, period_view_count: 14, view_days: 9, like_count: 5, watch_later: false, avp_candidate: false, is_available: true, last_viewed: "2026-06-23" },
  { id: 3, essential_filename: "T2_SELECTED_LIKED_003.mp4", tier: "Tier2", current_favorite_level: 4, needs_selection: false, is_selection_completed: true, storage_location: "EXTERNAL_HDD", file_size: Math.round(3.4 * GB), total_view_count: 18, period_view_count: 7, view_days: 6, like_count: 8, watch_later: false, avp_candidate: true, is_available: true, last_viewed: "2026-06-20" },
  { id: 4, essential_filename: "T2_UNSELECTED_WATCH_LATER_004.mp4", tier: "Tier2", current_favorite_level: -1, needs_selection: true, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(0.9 * GB), total_view_count: 2, period_view_count: 1, view_days: 1, like_count: 0, watch_later: true, avp_candidate: false, is_available: true, last_viewed: "2026-06-10" },
  { id: 5, essential_filename: "SAMPLE_JA_TITLE_学習用動画_005.mp4", tier: "Tier1", current_favorite_level: 2, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(1.7 * GB), total_view_count: 11, period_view_count: 5, view_days: 4, like_count: 3, watch_later: true, avp_candidate: false, is_available: true, last_viewed: "2026-06-18" },
  { id: 6, essential_filename: "SAMPLE_SYMBOL_TITLE_!_PLUS_HASH_006.mp4", tier: "Tier2", current_favorite_level: -1, needs_selection: true, is_selection_completed: false, storage_location: "EXTERNAL_HDD", file_size: Math.round(5.1 * GB), total_view_count: 4, period_view_count: 0, view_days: 2, like_count: 1, watch_later: false, avp_candidate: true, is_available: false, last_viewed: "2026-05-30" },
  { id: 7, essential_filename: "T1_LV0_HEAVY_007.mp4", tier: "Tier1", current_favorite_level: 0, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(0.4 * GB), total_view_count: 1, period_view_count: 0, view_days: 1, like_count: 0, watch_later: false, avp_candidate: false, is_available: true, last_viewed: "2026-03-15" },
  { id: 8, essential_filename: "T1_LV0_HEAVY_008.mp4", tier: "Tier1", current_favorite_level: 0, needs_selection: false, is_selection_completed: false, storage_location: "EXTERNAL_HDD", file_size: Math.round(0.6 * GB), total_view_count: 0, period_view_count: 0, view_days: 0, like_count: 0, watch_later: false, avp_candidate: false, is_available: true, last_viewed: null },
  { id: 9, essential_filename: "T1_LV0_HEAVY_009.mp4", tier: "Tier1", current_favorite_level: 0, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(0.5 * GB), total_view_count: 2, period_view_count: 0, view_days: 1, like_count: 0, watch_later: false, avp_candidate: false, is_available: true, last_viewed: "2026-02-20" },
  { id: 10, essential_filename: "T1_LEVEL4_SURGING_010.mp4", tier: "Tier1", current_favorite_level: 4, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(1.9 * GB), total_view_count: 27, period_view_count: 19, view_days: 11, like_count: 12, watch_later: false, avp_candidate: false, is_available: true, last_viewed: "2026-06-24" },
  { id: 11, essential_filename: "T1_LEVEL4_STALE_011.mp4", tier: "Tier1", current_favorite_level: 4, needs_selection: false, is_selection_completed: false, storage_location: "EXTERNAL_HDD", file_size: Math.round(4.0 * GB), total_view_count: 14, period_view_count: 0, view_days: 8, like_count: 6, watch_later: false, avp_candidate: false, is_available: true, last_viewed: "2026-01-10" },
  { id: 12, essential_filename: "T2_SELECTED_012.mp4", tier: "Tier2", current_favorite_level: 3, needs_selection: false, is_selection_completed: true, storage_location: "C_DRIVE", file_size: Math.round(2.9 * GB), total_view_count: 9, period_view_count: 3, view_days: 6, like_count: 4, watch_later: false, avp_candidate: false, is_available: true, last_viewed: "2026-05-21" },
  { id: 13, essential_filename: "T2_UNSELECTED_013.mp4", tier: "Tier2", current_favorite_level: -1, needs_selection: true, is_selection_completed: false, storage_location: "EXTERNAL_HDD", file_size: Math.round(6.3 * GB), total_view_count: 0, period_view_count: 0, view_days: 0, like_count: 0, watch_later: false, avp_candidate: false, is_available: false, last_viewed: null },
  { id: 14, essential_filename: "T1_UNRATED_014.mp4", tier: "Tier1", current_favorite_level: -1, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(0.7 * GB), total_view_count: 0, period_view_count: 0, view_days: 0, like_count: 0, watch_later: false, avp_candidate: false, is_available: true, last_viewed: null },
  { id: 15, essential_filename: "T1_UNRATED_WATCH_LATER_015.mp4", tier: "Tier1", current_favorite_level: -1, needs_selection: false, is_selection_completed: false, storage_location: "EXTERNAL_HDD", file_size: Math.round(1.1 * GB), total_view_count: 1, period_view_count: 0, view_days: 1, like_count: 0, watch_later: true, avp_candidate: false, is_available: true, last_viewed: "2026-04-01" },
  { id: 16, essential_filename: "T1_LEVEL2_016.mp4", tier: "Tier1", current_favorite_level: 2, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(1.3 * GB), total_view_count: 8, period_view_count: 4, view_days: 5, like_count: 2, watch_later: false, avp_candidate: false, is_available: true, last_viewed: "2026-06-15" },
  { id: 17, essential_filename: "T1_LEVEL1_017.mp4", tier: "Tier1", current_favorite_level: 1, needs_selection: false, is_selection_completed: false, storage_location: "EXTERNAL_HDD", file_size: Math.round(0.8 * GB), total_view_count: 3, period_view_count: 1, view_days: 2, like_count: 1, watch_later: false, avp_candidate: false, is_available: true, last_viewed: "2026-05-12" },
  { id: 18, essential_filename: "T2_UNSELECTED_WATCH_LATER_018.mp4", tier: "Tier2", current_favorite_level: -1, needs_selection: true, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(1.0 * GB), total_view_count: 1, period_view_count: 0, view_days: 1, like_count: 0, watch_later: true, avp_candidate: false, is_available: true, last_viewed: "2026-04-22" },
  { id: 19, essential_filename: "T1_LEVEL3_STALE_019.mp4", tier: "Tier1", current_favorite_level: 3, needs_selection: false, is_selection_completed: false, storage_location: "EXTERNAL_HDD", file_size: Math.round(2.2 * GB), total_view_count: 12, period_view_count: 0, view_days: 7, like_count: 5, watch_later: false, avp_candidate: false, is_available: true, last_viewed: "2026-01-25" },
  { id: 20, essential_filename: "T1_UNAVAILABLE_BIG_020.mp4", tier: "Tier1", current_favorite_level: 2, needs_selection: false, is_selection_completed: false, storage_location: "EXTERNAL_HDD", file_size: Math.round(8.8 * GB), total_view_count: 6, period_view_count: 0, view_days: 3, like_count: 1, watch_later: false, avp_candidate: false, is_available: false, last_viewed: "2026-05-08" },
  { id: 21, essential_filename: "T2_SELECTED_LIKED_021.mp4", tier: "Tier2", current_favorite_level: 4, needs_selection: false, is_selection_completed: true, storage_location: "C_DRIVE", file_size: Math.round(1.6 * GB), total_view_count: 16, period_view_count: 8, view_days: 6, like_count: 9, watch_later: false, avp_candidate: true, is_available: true, last_viewed: "2026-06-22" },
  { id: 22, essential_filename: "T1_LEVEL0_022.mp4", tier: "Tier1", current_favorite_level: 0, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(0.3 * GB), total_view_count: 0, period_view_count: 0, view_days: 0, like_count: 0, watch_later: false, avp_candidate: false, is_available: true, last_viewed: null },
  { id: 23, essential_filename: "T1_LEVEL4_RECENT_023.mp4", tier: "Tier1", current_favorite_level: 4, needs_selection: false, is_selection_completed: false, storage_location: "C_DRIVE", file_size: Math.round(1.8 * GB), total_view_count: 21, period_view_count: 12, view_days: 8, like_count: 9, watch_later: false, avp_candidate: false, is_available: true, last_viewed: "2026-06-21" },
  { id: 24, essential_filename: "T2_UNSELECTED_024.mp4", tier: "Tier2", current_favorite_level: -1, needs_selection: true, is_selection_completed: false, storage_location: "EXTERNAL_HDD", file_size: Math.round(3.0 * GB), total_view_count: 2, period_view_count: 0, view_days: 2, like_count: 0, watch_later: false, avp_candidate: false, is_available: true, last_viewed: "2026-03-30" },
];

// 匿名化した保存場所ラベル（実パス・実フォルダ名を出さない）。
export function storageCategory(storage: string): string {
  if (storage === "C_DRIVE") return "内蔵ドライブ相当";
  if (storage === "EXTERNAL_HDD") return "外付けHDD相当";
  return storage;
}

// 状態キャプション（本体 statusLabel と同じ文言。判定済み/未判定・選別済み/未選別を混同しない）。
export function statusCaption(v: AnalysisVideo): string {
  if (v.tier === "Tier2") {
    return v.is_selection_completed ? "Tier2 選別済み" : "Tier2 未選別";
  }
  return v.current_favorite_level === -1 ? "Tier1 未判定" : `Tier1 ${levelName(v.current_favorite_level)}`;
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((TODAY.getTime() - d.getTime()) / 86_400_000);
}

const tier1 = ANALYSIS_VIDEOS.filter((v) => v.tier === "Tier1");
const tier2 = ANALYSIS_VIDEOS.filter((v) => v.tier === "Tier2");

// 概況 KPI（案A 用）。値はダミー（本体集計ではない）。
export const KPIS = {
  total_videos: ANALYSIS_VIDEOS.length,
  available_videos: ANALYSIS_VIDEOS.filter((v) => v.is_available).length,
  unavailable_videos: ANALYSIS_VIDEOS.filter((v) => !v.is_available).length,
  period_app_plays: ANALYSIS_VIDEOS.reduce((s, v) => s + v.period_view_count, 0), // 「今月のAPP再生数」相当
  total_app_plays: ANALYSIS_VIDEOS.reduce((s, v) => s + v.total_view_count, 0),
  judged: tier1.filter((v) => v.current_favorite_level !== -1).length,
  unrated: tier1.filter((v) => v.current_favorite_level === -1).length,
  selection_completed: tier2.filter((v) => v.is_selection_completed).length,
  needs_selection: tier2.filter((v) => v.needs_selection).length,
  watch_later: ANALYSIS_VIDEOS.filter((v) => v.watch_later).length,
  avp_candidate: ANALYSIS_VIDEOS.filter((v) => v.avp_candidate).length,
  liked: ANALYSIS_VIDEOS.filter((v) => v.like_count > 0).length,
  tier1_total: tier1.length,
  tier2_total: tier2.length,
};

// 進捗（案C 用）。Tier1 判定進捗 / Tier2 選別進捗。
export const PROGRESS = {
  tier1_judged_rate: tier1.length ? Math.round((KPIS.judged / tier1.length) * 100) : 0,
  tier2_selected_rate: tier2.length ? Math.round((KPIS.selection_completed / tier2.length) * 100) : 0,
};

// レベル分布（Tier1 の現お気に入りレベル）。バーチャート用。
export const LEVEL_DISTRIBUTION = [-1, 0, 1, 2, 3, 4].map((lv) => ({
  label: levelName(lv),
  count: tier1.filter((v) => v.current_favorite_level === lv).length,
}));

// Tier1 / Tier2 の状態内訳（割合バー用）。
export const TIER_BREAKDOWN = [
  { label: "Tier1 判定済み", count: KPIS.judged, tone: "primary" as const },
  { label: "Tier1 未判定", count: KPIS.unrated, tone: "muted" as const },
  { label: "Tier2 選別済み", count: KPIS.selection_completed, tone: "teal" as const },
  { label: "Tier2 未選別", count: KPIS.needs_selection, tone: "amber" as const },
];

// 「最近見ていない高レベル」= Lv3 以上で最終再生から 60 日以上経過（または履歴なし）。
const STALE_DAYS = 60;
export const STALE_HIGH_LEVEL = ANALYSIS_VIDEOS.filter((v) => {
  if (v.current_favorite_level < 3) return false;
  const d = daysSince(v.last_viewed);
  return d === null || d >= STALE_DAYS;
});

// 偏り（案C 用）。Lv0 偏り・再生偏り（最多再生の占有率）・HDD 利用不可。
const judgedList = tier1.filter((v) => v.current_favorite_level !== -1);
const lv0Count = tier1.filter((v) => v.current_favorite_level === 0).length;
const maxPlay = Math.max(...ANALYSIS_VIDEOS.map((v) => v.period_view_count), 0);
export const BIAS = {
  lv0_rate: judgedList.length ? Math.round((lv0Count / judgedList.length) * 100) : 0,
  top_play_share: KPIS.period_app_plays ? Math.round((maxPlay / KPIS.period_app_plays) * 100) : 0,
  hdd_unavailable: ANALYSIS_VIDEOS.filter((v) => v.storage_location === "EXTERNAL_HDD" && !v.is_available).length,
};

// 洞察リスト（案A/C 用）。
export const RECENTLY_PLAYED = [...ANALYSIS_VIDEOS]
  .filter((v) => v.period_view_count > 0)
  .sort((a, b) => b.period_view_count - a.period_view_count || a.id - b.id)
  .slice(0, 5);

export const LONG_NOT_VIEWED = [...ANALYSIS_VIDEOS]
  .filter((v) => v.current_favorite_level >= 2)
  .sort((a, b) => (daysSince(b.last_viewed) ?? 1e9) - (daysSince(a.last_viewed) ?? 1e9))
  .slice(0, 5);

export const LIKED_NOT_RECENT = [...ANALYSIS_VIDEOS]
  .filter((v) => v.like_count > 0 && (daysSince(v.last_viewed) ?? 1e9) >= STALE_DAYS)
  .sort((a, b) => b.like_count - a.like_count || a.id - b.id)
  .slice(0, 5);

// 次に確認したい候補（未判定 / 未選別 / あとで見る / 利用不可 を少しずつ）。
export const NEXT_TO_REVIEW = [
  tier1.find((v) => v.current_favorite_level === -1),
  tier2.find((v) => v.needs_selection),
  ANALYSIS_VIDEOS.find((v) => v.watch_later),
  ANALYSIS_VIDEOS.find((v) => !v.is_available),
].filter((v): v is AnalysisVideo => Boolean(v));

// よく見ているレベル帯（period_view_count をレベル別に合計）。
export const LEVEL_BAND_VIEWS = [0, 1, 2, 3, 4].map((lv) => ({
  label: levelName(lv),
  count: ANALYSIS_VIDEOS.filter((v) => v.current_favorite_level === lv).reduce((s, v) => s + v.period_view_count, 0),
}));

// ---- 時系列（決定的な擬似データ・ダミー）。乱数を使わずビルドごとに同じ値。 ----
// type alias（object literal）にして暗黙の index signature を得る → チャートの Record<string,…> に渡せる。
export type TrendPoint = {
  label: string;
  app_plays: number;
  view_days: number;
  judgments: number;
  selections: number;
  watch_later: number;
};

function dayLabel(offsetFromToday: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - offsetFromToday);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// N 日分の時系列（古い→新しい）。決定的な波形（sin 合成）で生成する。
export function trendSeries(days: number): TrendPoint[] {
  const pts: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const x = days - i;
    const wave = (base: number, amp: number, seed: number) =>
      Math.max(0, Math.round(base + amp * Math.sin((x + seed) / 2.5) + (amp / 2) * Math.sin((x + seed) / 6)));
    pts.push({
      label: dayLabel(i),
      app_plays: wave(6, 4, 0),
      view_days: wave(3, 2, 2),
      judgments: wave(2, 2, 4),
      selections: wave(1, 1.4, 1),
      watch_later: wave(2, 1.6, 3),
    });
  }
  return pts;
}

// 期間切替の選択肢（案A の 7/30/90/全期間、案B の期間プリセット）。
export const PERIOD_TABS = [
  { key: "7", label: "7日", days: 7 },
  { key: "30", label: "30日", days: 30 },
  { key: "90", label: "90日", days: 90 },
  { key: "all", label: "全期間", days: 120 },
] as const;

// 各 Variant 切替（LabFrame に渡す）。
export const ANALYSIS_AREA_VARIANTS = [
  { key: "a", href: "/lab/analysis/variant-a", label: "A 概況" },
  { key: "b", href: "/lab/analysis/variant-b", label: "B 期間推移" },
  { key: "c", href: "/lab/analysis/variant-c", label: "C 進捗・次アクション" },
];

export { formatFileSize, formatDate, levelName, storageCategory as storageLabel };
