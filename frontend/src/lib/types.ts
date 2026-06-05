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
}

export interface VideosResponse {
  items: Video[];
  total: number;
  page: number;
  page_size: number;
}

export interface FilterOptions {
  favorite_levels: number[];
  performers: string[];
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
}

export interface StatusMessage {
  status: string;
  message: string;
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
  | "modified";

export type SortOrder = "asc" | "desc";
export type Availability = "available" | "unavailable";
export type SelectionStatus = "all" | "unselected" | "completed";

// 一覧クエリ（GET /api/videos）のパラメータ。
export interface VideoListParams {
  levels?: number[];
  performers?: string[];
  storage?: string[];
  availability?: Availability;
  show_unavailable?: boolean;
  show_deleted?: boolean;
  exclude_selection?: boolean;
  keyword?: string;
  sort?: SortField;
  order?: SortOrder;
  page?: number;
  page_size?: number;
}

export interface SelectionVideoListParams {
  folder: string;
  status?: SelectionStatus;
  sort?: SortField;
  order?: SortOrder;
  page?: number;
  page_size?: number;
}
