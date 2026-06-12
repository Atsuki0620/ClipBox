// ClipBox API のレスポンス型（snake_case のまま。変換しない）。
// 正本は docs/context/API_SPEC.md / api/schemas.py。

export interface Video {
  id: number | null;
  essential_filename: string;
  current_full_path: string;
  current_favorite_level: number; // -1=未判定, 0..4=Lv0..Lv4
  file_size: number | null;
  performer: string | null;
  storage_location: string; // C_DRIVE | EXTERNAL_HDD
  last_file_modified: string | null;
  created_at: string | null;
  last_scanned_at: string | null;
  notes: string | null;
  file_created_at: string | null;
  is_available: boolean;
  is_deleted: boolean;
  is_judging: boolean;
  needs_selection: boolean;
  is_selection_completed: boolean;
  is_judged: boolean;
  watch_later: boolean;
}

export interface VideosResponse {
  items: Video[];
  total: number;
  page: number;
  page_size: number;
}

// POST /api/videos/by-ids のレスポンス。items は入力順保持・削除済み含む。
// missing_ids は見つからなかったID（localStorage 永続候補の掃除に使う）。
export interface VideosByIdsResponse {
  items: Video[];
  missing_ids: number[];
}

export interface FilterOptions {
  favorite_levels: number[];
  storage_locations: string[];
}

export interface Kpi {
  unrated_count: number;
  judged_count: number;
  judged_rate: number;
  today_judged_count: number;
}

export interface SelectionKpi {
  unselected_count: number;
  judged_count: number;
  judged_rate: number;
  today_judged_count: number;
}

export interface Config {
  library_roots: string[];
  default_player: string;
  avp_exe_path: string | null;
  db_path: string | null;
  selection_folder: string | null;
  fate_tier1_recently_unwatched_priority?: boolean | null;
  fate_tier2_recently_unwatched_priority?: boolean | null;
}

export interface StatusMessage {
  status: string;
  message: string;
}

export type RuntimeServiceName = "streamlit" | "fastapi" | "nextjs";
export type RuntimeServiceStatus = "running" | "stopped" | "unknown";

export interface RuntimeService {
  name: RuntimeServiceName;
  label: string;
  port: number;
  status: RuntimeServiceStatus;
  pid: number | null;
}

export interface RuntimeStatusResponse {
  services: RuntimeService[];
}

export interface LikeResponse {
  video_id: number;
  like_count: number;
}

export type RankingType = "view_count" | "view_days" | "likes" | "composite";
export type RankingPeriod = "180日" | "1年" | "全期間";
export type RankingAvailability = "利用可能のみ" | "利用不可のみ" | "すべて";

export interface RankingParams {
  type: RankingType;
  period: RankingPeriod;
  availability: RankingAvailability;
  min_level?: number;
  top_n: number;
}

export interface RankingItem {
  rank: number;
  video: Video;
  score: number;
}

export interface RankingResponse {
  items: RankingItem[];
}

export type SortField =
  | "favorite_level"
  | "creation_date"
  | "view_count"
  | "last_viewed"
  | "title"
  | "judged_at";

export type SortOrder = "asc" | "desc";
export type Availability = "available" | "unavailable";
export type SelectionStatus = "all" | "unselected" | "completed";

// Tier1 の判定状態フィルタ（UI 用。levels への写像は page.tsx）。
export type JudgmentStatus = "all" | "unrated" | "judged";

// 一覧クエリ（GET /api/videos）のパラメータ。
export interface VideoListParams {
  levels?: number[];
  storage?: string[];
  availability?: Availability;
  show_unavailable?: boolean;
  show_deleted?: boolean;
  watch_later?: boolean;
  exclude_selection?: boolean;
  keyword?: string;
  sort?: SortField;
  order?: SortOrder;
  page?: number;
  page_size?: number;
}

export interface WatchLaterResponse {
  status: string;
  message: string;
  watch_later: boolean;
}

export interface SelectionVideoListParams {
  folder: string;
  status?: SelectionStatus;
  levels?: number[];
  storage?: string[];
  keyword?: string;
  show_unavailable?: boolean;
  watch_later?: boolean;
  sort?: SortField;
  order?: SortOrder;
  page?: number;
  page_size?: number;
}

export type AnalysisPeriodPreset =
  | "全期間"
  | "直近7日"
  | "直近30日"
  | "直近90日"
  | "直近180日"
  | "カスタム";

export type AnalysisAvailability = "利用可能のみ" | "利用不可のみ" | "すべて";

export interface AnalysisQuery {
  period: AnalysisPeriodPreset;
  start?: string;
  end?: string;
  availability: AnalysisAvailability;
  include_deleted: boolean;
}

export interface AnalysisVideoRecord {
  id: number | null;
  essential_filename?: string | null;
  current_full_path?: string | null;
  current_favorite_level?: number | null;
  file_size?: number | null;
  performer?: string | null;
  storage_location?: string | null;
  file_created_at?: string | null;
  is_available?: boolean | number | null;
  is_deleted?: boolean | number | null;
  total_view_count?: number | null;
  last_viewed_at?: string | null;
  period_view_count?: number | null;
  [key: string]: unknown;
}

export interface AnalysisDataResponse {
  items: AnalysisVideoRecord[];
  total: number;
}

export type AnalysisBucket = "day" | "week" | "month";

// 視聴/判定トレンド（サーバー集計）のクエリ。video_ids は送らない。
export interface AnalysisTrendQuery extends AnalysisQuery {
  bucket: AnalysisBucket;
}

// バケット別件数（label=日/週(月曜開始日)/月）。
export interface TrendItem {
  label: string;
  count: number;
}

export interface ResponseTimeItem {
  duration_ms: number;
  storage: string | null;
}

export type AnalysisRankingKind = "view_count" | "view_days" | "likes";

export interface AnalysisRankingParams extends AnalysisQuery {
  kind: AnalysisRankingKind;
  top_n: number;
}

export interface AnalysisRankingItem {
  rank: number;
  filename: string;
  is_available: boolean | null;
  storage_location: string | null;
  file_created_at: string | null;
  favorite_level: number;
  score: number;
}

export interface AnalysisRankingResponse {
  kind: AnalysisRankingKind;
  items: AnalysisRankingItem[];
}

export interface SelectionTrendItem {
  date: string;
  count: number;
}

export interface SelectionDistributionItem {
  level: number | null;
  count: number;
}

export interface ScanLibraryResponse {
  status: string;
  message: string;
}

export interface ScanSelectionResponse {
  status: string;
  message: string;
  found_count: number;
}

export interface BackupResponse {
  status: string;
  message: string;
  filename: string;
  size_bytes: number;
}
