// UIラボ専用のモックデータ。
// 【役割】UI比較サンプル（/lab）で表示する固定データ。実DB/APIには一切接続しない。
// 【設計制約】
//   - API・DB・localStorage に触れない（純粋な定数とフォーマッタのみ）。
//   - ファイル名は明らかに合成のプレースホルダにする（実在しそうなタイトルは置かない）。
// 【依存関係】どのモジュールにも依存しない（lib/types とは独立。カード表示に必要な項目だけ持つ）。

// カード表示に必要な項目だけを持つラボ用の動画型（実 Video 型のサブセット + 集計値を同梱）。
export interface LabVideo {
  id: number;
  essential_filename: string;
  current_full_path: string;
  current_favorite_level: number; // -1=未判定, 0..4
  storage_location: string; // C_DRIVE | EXTERNAL_HDD
  file_size: number | null; // bytes
  last_viewed: string | null; // ISO 文字列
  last_file_modified: string | null; // ISO 文字列
  view_count: number;
  like_count: number;
  watch_later: boolean;
  is_available: boolean;
}

const GB = 1024 ** 3;

// 合成のプレースホルダ動画（15件）。レベル・サイズ・利用可否・あとで見るに変化を持たせる。
export const LAB_VIDEOS: LabVideo[] = [
  { id: 1, essential_filename: "sample_clip_001.mp4", current_full_path: "C:/ClipBox/sample/sample_clip_001.mp4", current_favorite_level: 4, storage_location: "C_DRIVE", file_size: Math.round(1.6 * GB), last_viewed: "2026-05-30", last_file_modified: "2026-04-12", view_count: 18, like_count: 7, watch_later: false, is_available: true },
  { id: 2, essential_filename: "demo_video_alpha.mkv", current_full_path: "E:/Media/demo_video_alpha.mkv", current_favorite_level: 3, storage_location: "EXTERNAL_HDD", file_size: Math.round(3.4 * GB), last_viewed: "2026-05-18", last_file_modified: "2026-03-02", view_count: 11, like_count: 4, watch_later: true, is_available: true },
  { id: 3, essential_filename: "placeholder_reel_07.mp4", current_full_path: "C:/ClipBox/sample/placeholder_reel_07.mp4", current_favorite_level: -1, storage_location: "C_DRIVE", file_size: Math.round(0.7 * GB), last_viewed: null, last_file_modified: "2026-06-01", view_count: 0, like_count: 0, watch_later: false, is_available: true },
  { id: 4, essential_filename: "test_footage_b2.wmv", current_full_path: "E:/Media/test_footage_b2.wmv", current_favorite_level: 2, storage_location: "EXTERNAL_HDD", file_size: Math.round(5.1 * GB), last_viewed: "2026-04-22", last_file_modified: "2026-01-19", view_count: 6, like_count: 2, watch_later: false, is_available: false },
  { id: 5, essential_filename: "mock_sample_012.mp4", current_full_path: "C:/ClipBox/sample/mock_sample_012.mp4", current_favorite_level: 1, storage_location: "C_DRIVE", file_size: Math.round(0.4 * GB), last_viewed: "2026-05-29", last_file_modified: "2026-05-20", view_count: 3, like_count: 1, watch_later: false, is_available: true },
  { id: 6, essential_filename: "dummy_clip_aa9.mp4", current_full_path: "E:/Media/dummy_clip_aa9.mp4", current_favorite_level: 4, storage_location: "EXTERNAL_HDD", file_size: Math.round(8.8 * GB), last_viewed: "2026-06-10", last_file_modified: "2026-02-08", view_count: 27, like_count: 12, watch_later: true, is_available: true },
  { id: 7, essential_filename: "sample_clip_002.mp4", current_full_path: "C:/ClipBox/sample/sample_clip_002.mp4", current_favorite_level: 0, storage_location: "C_DRIVE", file_size: Math.round(1.1 * GB), last_viewed: "2026-03-15", last_file_modified: "2026-03-14", view_count: 1, like_count: 0, watch_later: false, is_available: true },
  { id: 8, essential_filename: "demo_video_beta.mkv", current_full_path: "E:/Media/demo_video_beta.mkv", current_favorite_level: 3, storage_location: "EXTERNAL_HDD", file_size: Math.round(2.2 * GB), last_viewed: "2026-05-02", last_file_modified: "2026-04-28", view_count: 9, like_count: 5, watch_later: false, is_available: true },
  { id: 9, essential_filename: "placeholder_reel_08.mp4", current_full_path: "C:/ClipBox/sample/placeholder_reel_08.mp4", current_favorite_level: -1, storage_location: "C_DRIVE", file_size: Math.round(0.9 * GB), last_viewed: null, last_file_modified: "2026-06-09", view_count: 0, like_count: 0, watch_later: true, is_available: true },
  { id: 10, essential_filename: "test_footage_c5.wmv", current_full_path: "E:/Media/test_footage_c5.wmv", current_favorite_level: 2, storage_location: "EXTERNAL_HDD", file_size: Math.round(4.0 * GB), last_viewed: "2026-04-01", last_file_modified: "2025-12-30", view_count: 5, like_count: 3, watch_later: false, is_available: true },
  { id: 11, essential_filename: "mock_sample_013.mp4", current_full_path: "C:/ClipBox/sample/mock_sample_013.mp4", current_favorite_level: 4, storage_location: "C_DRIVE", file_size: Math.round(1.8 * GB), last_viewed: "2026-06-11", last_file_modified: "2026-05-05", view_count: 21, like_count: 9, watch_later: false, is_available: true },
  { id: 12, essential_filename: "dummy_clip_bb3.mp4", current_full_path: "E:/Media/dummy_clip_bb3.mp4", current_favorite_level: 1, storage_location: "EXTERNAL_HDD", file_size: Math.round(6.3 * GB), last_viewed: "2026-02-27", last_file_modified: "2026-02-25", view_count: 2, like_count: 0, watch_later: false, is_available: false },
  { id: 13, essential_filename: "sample_clip_003.mp4", current_full_path: "C:/ClipBox/sample/sample_clip_003.mp4", current_favorite_level: 3, storage_location: "C_DRIVE", file_size: Math.round(2.9 * GB), last_viewed: "2026-05-21", last_file_modified: "2026-04-30", view_count: 14, like_count: 6, watch_later: true, is_available: true },
  { id: 14, essential_filename: "demo_video_gamma.mkv", current_full_path: "E:/Media/demo_video_gamma.mkv", current_favorite_level: 0, storage_location: "EXTERNAL_HDD", file_size: Math.round(1.3 * GB), last_viewed: "2026-01-10", last_file_modified: "2026-01-08", view_count: 1, like_count: 1, watch_later: false, is_available: true },
  { id: 15, essential_filename: "placeholder_reel_09.mp4", current_full_path: "C:/ClipBox/sample/placeholder_reel_09.mp4", current_favorite_level: 2, storage_location: "C_DRIVE", file_size: Math.round(0.6 * GB), last_viewed: "2026-05-12", last_file_modified: "2026-05-11", view_count: 4, like_count: 2, watch_later: false, is_available: true },
];

// Tier1 統計（モック固定値）。
export const LAB_KPI = {
  unrated_count: 312,
  judged_count: 1488,
  judged_rate: 82.7,
  today_judged_count: 24,
};

// フィルタ選択肢（モック固定値）。
export const LAB_LEVELS = [-1, 0, 1, 2, 3, 4];
export const LAB_STORAGES = ["C_DRIVE", "EXTERNAL_HDD"];

// 並び替えの選択肢（実 LibraryFilterBar の SORT_LABELS に対応）。
export const LAB_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "favorite_level", label: "レベル" },
  { value: "creation_date", label: "作成日" },
  { value: "view_count", label: "視聴回数" },
  { value: "last_viewed", label: "最終視聴" },
  { value: "title", label: "タイトル" },
  { value: "judged_at", label: "判定日時" },
];

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  const gb = bytes / GB;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return iso.substring(0, 10).replace(/-/g, "/");
}
