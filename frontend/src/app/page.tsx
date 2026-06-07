"use client";

import { useMemo, useState, useEffect, useRef } from "react";

import { useQuery } from "@tanstack/react-query";

import { getKpi, getUnratedFate, getUnratedRandom, listVideos, playVideo } from "@/lib/api";
import { useLibraryStore } from "@/lib/store";
import type { VideoListParams } from "@/lib/types";
import { FilterPanel } from "@/components/FilterPanel";
import { KpiCard } from "@/components/KpiCard";
import { FatePanel, RandomPanel } from "@/components/VideoActionPanel";
import { ErrorBox, VideoSkeleton } from "@/components/VideoState";
import { LibraryWorkspace } from "@/components/LibraryWorkspace";
import { Pagination } from "@/components/Pagination";
import { VideoGrid } from "@/components/VideoGrid";
import { Skeleton } from "@/components/ui/skeleton";

const RANDOM_COUNTS = [5, 10, 15, 20];

export default function Tier1Page() {
  const kpiQ = useQuery({ queryKey: ["kpi"], queryFn: getKpi });
  const store = useLibraryStore();

  const params: VideoListParams = useMemo(
    () => ({
      levels: store.levels,
      storage: store.storage,
      keyword: store.keyword || undefined,
      availability:
        store.availabilityMode === "all" ? undefined : store.availabilityMode,
      show_unavailable: store.availabilityMode === "all",
      exclude_selection: true,
      sort: store.sort,
      order: store.order,
      page: store.page,
      page_size: store.page_size,
    }),
    [store],
  );

  const videosQ = useQuery({
    queryKey: ["videos", params],
    queryFn: () => listVideos(params),
  });

  const [randomCount, setRandomCount] = useState(10);
  const [randomToken, setRandomToken] = useState(0);
  const randomQ = useQuery({
    queryKey: ["unrated-random", randomCount, randomToken],
    queryFn: () => getUnratedRandom(randomCount),
  });

  const [fateToken, setFateToken] = useState(0);
  const fateQ = useQuery({
    queryKey: ["unrated-fate", fateToken],
    queryFn: getUnratedFate,
    enabled: fateToken > 0,
  });

  const prevFateIdRef = useRef<number | null>(null);
  useEffect(() => {
    const id = fateQ.data?.id as number | undefined;
    if (id != null && id !== prevFateIdRef.current) {
      prevFateIdRef.current = id;
      playVideo(id).catch(() => {});
    }
  }, [fateQ.data]);

  return (
    <LibraryWorkspace
      title="Tier 1 ライブラリ"
      kpi={<Tier1Kpi kpiQ={kpiQ} />}
      library={
        <>
          <FilterPanel />
          {videosQ.isLoading ? (
            <VideoSkeleton count={8} />
          ) : videosQ.isError ? (
            <ErrorBox
              error={videosQ.error}
              hint={`API サーバーが ${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api"} で起動しているか確認してください。`}
            />
          ) : (
            <>
              <VideoGrid
                videos={videosQ.data?.items ?? []}
                invalidateKeys={[["videos"]]}
              />
              <Pagination
                page={store.page}
                pageSize={store.page_size}
                total={videosQ.data?.total ?? 0}
                onPageChange={(page) => store.setFilter("page", page)}
                onPageSizeChange={(size) => store.setFilter("page_size", size)}
              />
            </>
          )}
        </>
      }
      random={
        <RandomPanel
          count={randomCount}
          countOptions={RANDOM_COUNTS}
          countLabel="本"
          shuffleLabel="シャッフル"
          onCountChange={setRandomCount}
          onShuffle={() => setRandomToken((token) => token + 1)}
          isLoading={randomQ.isLoading || randomQ.isFetching}
          isError={randomQ.isError}
          error={randomQ.error}
          loadingCount={Math.min(randomCount, 8)}
        >
          <VideoGrid
            videos={randomQ.data ?? []}
            emptyMessage="未判定の動画はありません。"
            invalidateKeys={[]}
          />
        </RandomPanel>
      }
      fate={
        <FatePanel
          drawLabel="運命の1本を引く"
          hasDrawn={fateToken > 0}
          onDraw={() => setFateToken((token) => token + 1)}
          isLoading={fateQ.isFetching}
          isError={fateQ.isError}
          error={fateQ.error}
          loadingCount={1}
          emptyMessageBeforeDraw="ボタンを押すと運命の1本を引きます。"
          emptyMessageWhenNoTarget="対象の動画がありません。"
        >
          {fateQ.data ? (
            <VideoGrid videos={[fateQ.data]} invalidateKeys={[]} gridClassName="grid grid-cols-1 gap-3" />
          ) : null}
        </FatePanel>
      }
    />
  );
}

function Tier1Kpi({
  kpiQ,
}: {
  kpiQ: {
    isLoading: boolean;
    data?: {
      unrated_count: number;
      judged_count: number;
      judged_rate: number;
      today_judged_count: number;
    };
    error: unknown;
  };
}) {
  if (kpiQ.isLoading) {
    return (
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 flex-1" />
        ))}
      </div>
    );
  }

  if (kpiQ.data) {
    return (
      <div className="flex flex-wrap gap-3">
        <KpiCard label="未判定" value={kpiQ.data.unrated_count} />
        <KpiCard label="判定済み" value={kpiQ.data.judged_count} />
        <KpiCard label="判定率" value={`${kpiQ.data.judged_rate.toFixed(1)}%`} />
        <KpiCard label="本日の判定" value={kpiQ.data.today_judged_count} />
      </div>
    );
  }

  return <ErrorText error={kpiQ.error} prefix="KPI の読み込みに失敗しました" />;
}

function ErrorText({ error, prefix }: { error: unknown; prefix: string }) {
  return (
    <div className="text-sm text-destructive">
      {prefix}: {error instanceof Error ? error.message : "不明なエラー"}
    </div>
  );
}
