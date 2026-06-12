"use client";

import { useMemo, useState, useEffect, useRef } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getConfig, getKpi, getUnratedFate, getUnratedRandom, getVideosByIds, listVideos, updateConfig } from "@/lib/api";
import { useFatePickStore, useLibraryStore } from "@/lib/store";
import { usePlayVideo } from "@/lib/usePlayVideo";
import type { VideoListParams } from "@/lib/types";
import { FilterPanel } from "@/components/FilterPanel";
import { KpiCard } from "@/components/KpiCard";
import { FatePanel, RandomPanel } from "@/components/VideoActionPanel";
import { ErrorBox, VideoSkeleton } from "@/components/VideoState";
import { LibraryWorkspace } from "@/components/LibraryWorkspace";
import { Pagination } from "@/components/Pagination";
import { VideoGrid } from "@/components/VideoGrid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const RANDOM_COUNTS = [5, 10, 15, 20];

export default function Tier1Page() {
  const queryClient = useQueryClient();
  const kpiQ = useQuery({ queryKey: ["kpi"], queryFn: getKpi });
  const configQ = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const store = useLibraryStore();
  const tier1Pick = useFatePickStore((state) => state.tier1);
  const setTier1Pick = useFatePickStore((state) => state.setTier1Pick);
  const clearTier1Pick = useFatePickStore((state) => state.clearTier1Pick);
  const recentlyUnwatchedPriority =
    configQ.data?.fate_tier1_recently_unwatched_priority ?? false;

  const params: VideoListParams = useMemo(() => {
    // judgmentStatus を levels に写像。
    //  all=既存 levels / unrated=[-1] / judged=既存 levels∩[0..4]（空なら [0..4]）。
    const judgedLevels = store.levels.filter((level) => level >= 0);
    const levels =
      store.judgmentStatus === "unrated"
        ? [-1]
        : store.judgmentStatus === "judged"
          ? judgedLevels.length > 0
            ? judgedLevels
            : [0, 1, 2, 3, 4]
          : store.levels;

    return {
      levels,
      storage: store.storage,
      keyword: store.keyword || undefined,
      availability:
        store.availabilityMode === "all" ? undefined : store.availabilityMode,
      show_unavailable: store.availabilityMode === "all",
      // Tier1 はセレクション関連(!/+)を表示しない（Tier2 が選別層）。仕様として固定。
      exclude_selection: true,
      watch_later: store.watchLater,
      sort: store.sort,
      order: store.order,
      page: store.page,
      page_size: store.page_size,
    };
  }, [store]);

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
    queryKey: ["unrated-fate", recentlyUnwatchedPriority, fateToken],
    queryFn: () => getUnratedFate(recentlyUnwatchedPriority),
    enabled: fateToken > 0,
  });
  const restoredFateQ = useQuery({
    queryKey: ["unrated-fate-restored", tier1Pick?.video_id],
    queryFn: async () => {
      const pick = tier1Pick;
      const id = pick?.video_id;
      if (pick == null || id == null || pick.version !== 1) return null;
      const response = await getVideosByIds([id]);
      const video = response.items[0] ?? null;
      if (
        !video ||
        video.id !== id ||
        video.current_favorite_level !== -1 ||
        video.needs_selection ||
        video.is_selection_completed ||
        !video.is_available ||
        video.is_deleted
      ) {
        return null;
      }
      return video;
    },
    enabled: tier1Pick != null && fateToken === 0,
  });

  // 運命の1本は再抽選しないので invalidateKeys は空。再生中ハイライトは usePlayVideo が配線する。
  const { mutate: playFate } = usePlayVideo([]);
  const prevFateIdRef = useRef<number | null>(null);
  useEffect(() => {
    const id = fateQ.data?.id as number | undefined;
    if (id != null && id !== prevFateIdRef.current) {
      prevFateIdRef.current = id;
      setTier1Pick(id);
      playFate(id);
    } else if (fateToken > 0 && fateQ.data === null) {
      clearTier1Pick();
    }
  }, [clearTier1Pick, fateQ.data, fateToken, playFate, setTier1Pick]);

  useEffect(() => {
    if (restoredFateQ.isSuccess && tier1Pick != null && restoredFateQ.data == null) {
      clearTier1Pick();
    }
  }, [clearTier1Pick, restoredFateQ.data, restoredFateQ.isSuccess, tier1Pick]);

  const priorityMutation = useMutation({
    mutationFn: (checked: boolean) =>
      updateConfig({
        library_roots: configQ.data?.library_roots ?? [],
        default_player: configQ.data?.default_player ?? "vlc",
        avp_exe_path: configQ.data?.avp_exe_path ?? null,
        db_path: configQ.data?.db_path ?? null,
        selection_folder: configQ.data?.selection_folder ?? null,
        fate_tier1_recently_unwatched_priority: checked,
        fate_tier2_recently_unwatched_priority:
          configQ.data?.fate_tier2_recently_unwatched_priority ?? false,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["config"] }),
  });

  const fateVideo = fateQ.data ?? restoredFateQ.data ?? null;
  const hasFateDrawn = fateToken > 0 || tier1Pick != null;
  const clearFatePick = () => {
    clearTier1Pick();
    prevFateIdRef.current = null;
    setFateToken(0);
  };

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
          hasDrawn={hasFateDrawn}
          onDraw={() => setFateToken((token) => token + 1)}
          isLoading={fateQ.isFetching || restoredFateQ.isFetching}
          isError={fateQ.isError}
          error={fateQ.error}
          loadingCount={1}
          emptyMessageBeforeDraw="ボタンを押すと運命の1本を引きます。"
          emptyMessageWhenNoTarget="対象の動画がありません。"
          actions={
            <>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={recentlyUnwatchedPriority}
                  disabled={configQ.isLoading || configQ.isError || priorityMutation.isPending}
                  onCheckedChange={(checked) => priorityMutation.mutate(Boolean(checked))}
                />
                <span>最近見てない優先</span>
              </label>
              {tier1Pick && (
                <Button size="sm" variant="outline" onClick={clearFatePick}>
                  クリア
                </Button>
              )}
            </>
          }
        >
          {fateVideo ? (
            <VideoGrid videos={[fateVideo]} invalidateKeys={[]} gridClassName="grid grid-cols-1 gap-3" />
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
