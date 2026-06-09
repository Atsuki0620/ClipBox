// ClipBox FastAPI への薄い fetch ラッパ。全リクエストをここに一元化する。
// ベース URL は NEXT_PUBLIC_API_BASE（既定 http://localhost:8000/api）。
// 非 2xx は detail を含む ApiError を throw し、TanStack Query 側でエラー集約する。

import type {
  AnalysisDataResponse,
  AnalysisQuery,
  AnalysisRankingParams,
  AnalysisRankingResponse,
  AnalysisTrendQuery,
  BackupResponse,
  Config,
  FilterOptions,
  Kpi,
  LikeResponse,
  RankingParams,
  RankingResponse,
  ResponseTimeItem,
  RuntimeServiceName,
  RuntimeStatusResponse,
  ScanLibraryResponse,
  ScanSelectionResponse,
  SelectionDistributionItem,
  SelectionKpi,
  SelectionTrendItem,
  SelectionVideoListParams,
  StatusMessage,
  TrendItem,
  Video,
  VideoListParams,
  VideosByIdsResponse,
  VideosResponse,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null) {
    headers.set("Content-Type", "application/json");
  } else {
    headers.delete("Content-Type");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...init,
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      // ボディが JSON でない場合は既定メッセージを使う
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// クエリ文字列を組み立てる。配列はカンマ区切り（_params.py がカンマ/repeated 両対応）。
function toQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      sp.set(key, value.join(","));
    } else {
      sp.set(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

// --- read ---
export function listVideos(params: VideoListParams): Promise<VideosResponse> {
  return request<VideosResponse>(`/videos${toQuery({ ...params })}`);
}

export function getFilterOptions(): Promise<FilterOptions> {
  return request<FilterOptions>(`/filter-options`);
}

export function getKpi(): Promise<Kpi> {
  return request<Kpi>(`/stats/kpi`);
}

export function getConfig(): Promise<Config> {
  return request<Config>(`/config`);
}

export function getVideo(id: number): Promise<Video> {
  return request<Video>(`/videos/${id}`);
}

// 指定IDの動画を一括取得（入力順保持・削除済み含む）。missing_ids で欠損IDを返す。
// 空配列はリクエストせず空レスポンスを返す。
export function getVideosByIds(ids: number[]): Promise<VideosByIdsResponse> {
  if (ids.length === 0) {
    return Promise.resolve({ items: [], missing_ids: [] });
  }
  return request<VideosByIdsResponse>(`/videos/by-ids`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export function getSelectionKpi(folder?: string): Promise<SelectionKpi> {
  return request<SelectionKpi>(`/stats/selection-kpi${toQuery({ folder })}`);
}

export function getRanking(params: RankingParams): Promise<RankingResponse> {
  return request<RankingResponse>(`/ranking${toQuery({ ...params })}`);
}

export function getLikes(videoIds: number[]): Promise<Record<number, number>> {
  if (videoIds.length === 0) return Promise.resolve({});
  return request<Record<number, number>>(
    `/likes${toQuery({ video_ids: videoIds })}`,
  );
}

export function getViewCounts(): Promise<Record<number, number>> {
  return request<Record<number, number>>(`/stats/view-counts`);
}

export function getLastViewed(): Promise<Record<number, string>> {
  return request<Record<number, string>>(`/stats/last-viewed`);
}

export function getAnalysisData(
  params: AnalysisQuery,
): Promise<AnalysisDataResponse> {
  return request<AnalysisDataResponse>(`/analysis/data${toQuery({ ...params })}`);
}

// 視聴/判定トレンドはサーバー側で bucket 集計済み。video_ids は送らない
// （旧 chunked history 方式の URL 長超過・リクエスト爆発を回避）。
export function getViewingTrend(
  params: AnalysisTrendQuery,
): Promise<TrendItem[]> {
  return request<TrendItem[]>(`/analysis/viewing-trend${toQuery({ ...params })}`);
}

export function getJudgmentTrend(
  params: AnalysisTrendQuery,
): Promise<TrendItem[]> {
  return request<TrendItem[]>(`/analysis/judgment-trend${toQuery({ ...params })}`);
}

export function getResponseTime(): Promise<ResponseTimeItem[]> {
  return request<ResponseTimeItem[]>(`/analysis/response-time`);
}

export function getAnalysisRankings(
  params: AnalysisRankingParams,
): Promise<AnalysisRankingResponse> {
  return request<AnalysisRankingResponse>(
    `/analysis/rankings${toQuery({ ...params })}`,
  );
}

export function getSelectionTrend(
  params: Pick<AnalysisQuery, "start" | "end">,
): Promise<SelectionTrendItem[]> {
  return request<SelectionTrendItem[]>(
    `/analysis/selection-trend${toQuery({ ...params })}`,
  );
}

export function getSelectionDistribution(): Promise<
  SelectionDistributionItem[]
> {
  return request<SelectionDistributionItem[]>(`/analysis/selection-distribution`);
}

// Tier1 ランダム: 未判定動画を n 本（ファイル存在チェック済み）。
export function getUnratedRandom(n: number): Promise<Video[]> {
  return request<Video[]>(`/videos/unrated/random${toQuery({ n })}`);
}

// Tier1 運命の1本: 純ランダム1本。該当なしは 204 → null。
export async function getUnratedFate(): Promise<Video | null> {
  return (await request<Video | undefined>(`/videos/unrated/fate`)) ?? null;
}

export function listSelectionVideos(
  params: SelectionVideoListParams,
): Promise<VideosResponse> {
  return request<VideosResponse>(`/videos/selection${toQuery({ ...params })}`);
}

export async function getSelectionFate(folder: string): Promise<Video | null> {
  return (
    (await request<Video | undefined>(
      `/videos/selection/fate${toQuery({ folder })}`,
    )) ?? null
  );
}

// 検索: ファイル名の正規化部分一致（利用不可も含む）。結果は unpaged。
export function searchVideos(keyword: string, storage?: string[]): Promise<Video[]> {
  return request<Video[]>(`/videos/search${toQuery({ keyword, storage })}`);
}

// --- mutation ---
export function playVideo(id: number): Promise<StatusMessage> {
  return request<StatusMessage>(`/videos/${id}/play`, { method: "POST" });
}

export function playAvp(videoIds: number[]): Promise<StatusMessage> {
  return request<StatusMessage>(`/avp/play`, {
    method: "POST",
    body: JSON.stringify({ video_ids: videoIds }),
  });
}

export function setLevel(id: number, level: number | null): Promise<StatusMessage> {
  return request<StatusMessage>(`/videos/${id}/level`, {
    method: "PUT",
    body: JSON.stringify({ level }),
  });
}

export function likeVideo(id: number): Promise<LikeResponse> {
  return request<LikeResponse>(`/videos/${id}/like`, { method: "POST" });
}

export function updateConfig(config: Config): Promise<StatusMessage> {
  return request<StatusMessage>(`/config`, {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

export function scanLibrary(): Promise<ScanLibraryResponse> {
  return request<ScanLibraryResponse>(`/scan/library`, { method: "POST" });
}

export function scanSelection(folder?: string): Promise<ScanSelectionResponse> {
  return request<ScanSelectionResponse>(`/scan/selection`, {
    method: "POST",
    body: JSON.stringify({ folder: folder || undefined }),
  });
}

export function createBackup(): Promise<BackupResponse> {
  return request<BackupResponse>(`/backup`, { method: "POST" });
}

export function getRuntimeStatus(): Promise<RuntimeStatusResponse> {
  return request<RuntimeStatusResponse>(`/runtime`);
}

export function stopRuntimeService(
  service: RuntimeServiceName,
): Promise<StatusMessage> {
  return request<StatusMessage>(`/runtime/${service}/stop`, {
    method: "POST",
  });
}

// Web スタック（Next.js → FastAPI）一括停止。FastAPI 自身が落ちるため応答は届かない前提。
export function stopWebStack(): Promise<StatusMessage> {
  return request<StatusMessage>(`/runtime/web-stack/stop`, {
    method: "POST",
  });
}
