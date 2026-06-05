"use client";

// Tier1 ライブラリ画面: KPI + フィルタ + 一覧グリッド + ページング。
// サーバー状態は TanStack Query、フィルタ状態は Zustand。

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getKpi, listVideos } from "@/lib/api";
import { useLibraryStore } from "@/lib/store";
import type { VideoListParams } from "@/lib/types";
import { KpiCard } from "@/components/KpiCard";
import { FilterPanel } from "@/components/FilterPanel";
import { VideoGrid } from "@/components/VideoGrid";
import { Pagination } from "@/components/Pagination";
import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryPage() {
  const store = useLibraryStore();

  // Zustand のフィルタを API パラメータへ写す。
  // availabilityMode → availability / show_unavailable へ写像:
  //   available   = 利用可能のみ（availability=available）
  //   unavailable = 利用不可のみ（availability=unavailable）
  //   all         = すべて（show_unavailable=true）
  const params: VideoListParams = useMemo(
    () => ({
      levels: store.levels,
      performers: store.performers,
      storage: store.storage,
      keyword: store.keyword || undefined,
      availability:
        store.availabilityMode === "all" ? undefined : store.availabilityMode,
      show_unavailable: store.availabilityMode === "all",
      exclude_selection: store.exclude_selection,
      sort: store.sort,
      order: store.order,
      page: store.page,
      page_size: store.page_size,
    }),
    [store],
  );

  const kpiQ = useQuery({ queryKey: ["kpi"], queryFn: getKpi });
  const videosQ = useQuery({
    queryKey: ["videos", params],
    queryFn: () => listVideos(params),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Tier 1 — ライブラリ</h1>

      {/* KPI */}
      <div className="flex flex-wrap gap-3">
        {kpiQ.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 flex-1" />
          ))
        ) : kpiQ.data ? (
          <>
            <KpiCard label="未判定" value={kpiQ.data.unrated_count} />
            <KpiCard label="判定済み" value={kpiQ.data.judged_count} />
            <KpiCard label="判定率" value={`${kpiQ.data.judged_rate}%`} />
            <KpiCard label="本日の判定" value={kpiQ.data.today_judged_count} />
          </>
        ) : null}
      </div>

      <FilterPanel />

      {/* 一覧 */}
      {videosQ.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : videosQ.isError ? (
        <div className="rounded-md border border-destructive p-4 text-sm text-destructive">
          読み込みに失敗しました:{" "}
          {videosQ.error instanceof Error ? videosQ.error.message : "不明なエラー"}
          <div className="mt-1 text-muted-foreground">
            API サーバー（{process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api"}）が
            起動しているか確認してください。
          </div>
        </div>
      ) : (
        <>
          <VideoGrid videos={videosQ.data?.items ?? []} invalidateKeys={[["videos"]]} />
          <Pagination
            page={store.page}
            pageSize={store.page_size}
            total={videosQ.data?.total ?? 0}
            onPageChange={(p) => store.setFilter("page", p)}
            onPageSizeChange={(s) => store.setFilter("page_size", s)}
          />
        </>
      )}
    </div>
  );
}
