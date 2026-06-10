"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  getConfig,
  getSelectionFate,
  getSelectionKpi,
  listSelectionVideos,
} from "@/lib/api";
import { usePlayVideo } from "@/lib/usePlayVideo";
import type {
  SelectionStatus,
  SelectionVideoListParams,
  SortField,
  SortOrder,
  Video,
} from "@/lib/types";
import { KpiCard } from "@/components/KpiCard";
import { LibraryFilterBar } from "@/components/LibraryFilterBar";
import { LibraryWorkspace } from "@/components/LibraryWorkspace";
import { FatePanel, RandomPanel } from "@/components/VideoActionPanel";
import { ErrorBox, EmptyBox, VideoSkeleton } from "@/components/VideoState";
import { Pagination } from "@/components/Pagination";
import { VideoGrid } from "@/components/VideoGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RANDOM_COUNTS = [5, 10, 15, 20];
const MAX_FETCH_PAGE_SIZE = 200;

const STATUS_LABELS: Record<SelectionStatus, string> = {
  all: "すべて",
  unselected: "未選別",
  completed: "選別済み",
};

export default function Tier2Page() {
  const configQ = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const selectionFolder = configQ.data?.selection_folder?.trim() ?? "";

  if (configQ.isLoading) {
    return <EmptyBox>設定を読み込み中です。</EmptyBox>;
  }

  if (configQ.isError) {
    return <ErrorBox error={configQ.error} />;
  }

  if (!selectionFolder) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Tier 2 セレクション</h1>
        <EmptyBox>
          selection_folder が未設定です。
          <div className="mt-3">
            <Link className="text-primary underline-offset-4 hover:underline" href="/settings">
              設定画面で保存先を設定してください。
            </Link>
          </div>
        </EmptyBox>
      </div>
    );
  }

  return <Tier2Workspace selectionFolder={selectionFolder} />;
}

function Tier2Workspace({ selectionFolder }: { selectionFolder: string }) {
  const [status, setStatus] = useState<SelectionStatus>("all");
  const [keyword, setKeyword] = useState("");
  const [levels, setLevels] = useState<number[]>([]);
  const [storage, setStorage] = useState<string[]>([]);
  const [sort, setSort] = useState<SortField | undefined>(undefined);
  const [order, setOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [randomCount, setRandomCount] = useState(10);
  const [randomToken, setRandomToken] = useState(0);
  const [fateToken, setFateToken] = useState(0);

  const selectionParams: SelectionVideoListParams = useMemo(
    () => ({
      folder: selectionFolder,
      status,
      levels,
      storage,
      keyword: keyword || undefined,
      show_unavailable: true,
      sort,
      order,
      page,
      page_size: pageSize,
    }),
    [keyword, levels, order, page, pageSize, selectionFolder, sort, status, storage],
  );

  const kpiQ = useQuery({
    queryKey: ["selection-kpi", selectionFolder],
    queryFn: () => getSelectionKpi(selectionFolder),
  });

  const videosQ = useQuery({
    queryKey: ["selection-videos", selectionParams],
    queryFn: () => listSelectionVideos(selectionParams),
  });

  const randomSourceParams = useMemo(
    () => ({
      folder: selectionFolder,
      status: "unselected" as const,
      levels,
      storage,
      keyword: keyword || undefined,
      show_unavailable: false,
      sort,
      order,
    }),
    [keyword, levels, order, selectionFolder, sort, storage],
  );

  const randomSourceQ = useQuery({
    queryKey: ["selection-random-source", randomSourceParams],
    queryFn: () => fetchAllSelectionVideos(randomSourceParams),
  });

  const randomVideos = useMemo(
    () => sampleVideos(randomSourceQ.data ?? [], randomCount, randomToken),
    [randomCount, randomSourceQ.data, randomToken],
  );

  const fateQ = useQuery({
    queryKey: ["selection-fate", selectionFolder, fateToken],
    queryFn: () => getSelectionFate(selectionFolder),
    enabled: fateToken > 0,
  });

  // 選別運命の1本も再抽選しない（invalidateKeys 空）。再生中ハイライトは usePlayVideo が配線。
  const { mutate: playFate } = usePlayVideo([]);
  const prevFateIdRef = useRef<number | null>(null);
  useEffect(() => {
    const id = fateQ.data?.id as number | undefined;
    if (id != null && id !== prevFateIdRef.current) {
      prevFateIdRef.current = id;
      playFate(id);
    }
  }, [fateQ.data, playFate]);

  const resetPage = () => setPage(1);

  return (
    <LibraryWorkspace
      title="Tier 2 セレクション"
      status={`選別中: ${selectionFolder}`}
      kpi={<Tier2Kpi kpiQ={kpiQ} hasFolder={true} />}
      library={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as SelectionStatus);
                resetPage();
              }}
            >
              <SelectTrigger className="w-36" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as SelectionStatus[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {STATUS_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <LibraryFilterBar
            keyword={keyword}
            levels={levels}
            storage={storage}
            sort={sort}
            order={order}
            onKeywordChange={(value) => {
              setKeyword(value);
              resetPage();
            }}
            onLevelsChange={(value) => {
              setLevels(value);
              resetPage();
            }}
            onStorageChange={(value) => {
              setStorage(value);
              resetPage();
            }}
            onSortChange={(value) => {
              setSort(value);
              resetPage();
            }}
            onOrderChange={(value) => {
              setOrder(value);
              resetPage();
            }}
          />

          {videosQ.isLoading || videosQ.isFetching ? (
            <VideoSkeleton count={Math.min(pageSize, 8)} />
          ) : videosQ.isError ? (
            <ErrorBox error={videosQ.error} />
          ) : (
            <>
              <VideoGrid
                videos={videosQ.data?.items ?? []}
                emptyMessage="条件に合う動画はありません。"
                invalidateKeys={[["selection-videos"], ["selection-kpi"]]}
                displayContext="tier2"
              />
              {(videosQ.data?.total ?? 0) > 0 ? (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={videosQ.data?.total ?? 0}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    resetPage();
                  }}
                />
              ) : null}
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
          isLoading={randomSourceQ.isLoading || randomSourceQ.isFetching}
          isError={randomSourceQ.isError}
          error={randomSourceQ.error}
          loadingCount={Math.min(randomCount, 8)}
        >
          <VideoGrid
            videos={randomVideos}
            emptyMessage="条件に合う未選別動画はありません。"
            invalidateKeys={[["selection-kpi"]]}
            displayContext="tier2"
          />
        </RandomPanel>
      }
      fate={
        <FatePanel
          drawLabel="選別の1本を引く"
          hasDrawn={fateToken > 0}
          onDraw={() => setFateToken((token) => token + 1)}
          isLoading={fateQ.isFetching}
          isError={fateQ.isError}
          error={fateQ.error}
          loadingCount={1}
          emptyMessageBeforeDraw="ボタンを押すと選別の1本を引きます。"
          emptyMessageWhenNoTarget="対象の動画がありません。"
        >
          {fateQ.data ? (
            <VideoGrid videos={[fateQ.data]} invalidateKeys={[["selection-kpi"]]} gridClassName="grid grid-cols-1 gap-3" displayContext="tier2" />
          ) : null}
        </FatePanel>
      }
    />
  );
}

async function fetchAllSelectionVideos(
  params: Omit<SelectionVideoListParams, "page" | "page_size">,
): Promise<Video[]> {
  const firstPage = await listSelectionVideos({
    ...params,
    page: 1,
    page_size: MAX_FETCH_PAGE_SIZE,
  });
  const totalPages = Math.ceil(firstPage.total / MAX_FETCH_PAGE_SIZE);
  if (totalPages <= 1) return firstPage.items;

  const restPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      listSelectionVideos({
        ...params,
        page: index + 2,
        page_size: MAX_FETCH_PAGE_SIZE,
      }),
    ),
  );

  return [firstPage, ...restPages].flatMap((response) => response.items);
}

function sampleVideos(videos: Video[], count: number, seed: number): Video[] {
  if (videos.length <= count) return videos;
  const shuffled = [...videos];
  let state = Math.abs(seed) + shuffled.length + count + 1;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

function Tier2Kpi({
  kpiQ,
  hasFolder,
}: {
  kpiQ: {
    isLoading: boolean;
    data?: {
      unselected_count: number;
      judged_count: number;
      judged_rate: number;
      today_judged_count: number;
    };
    error: unknown;
  };
  hasFolder: boolean;
}) {
  if (!hasFolder) {
    return (
      <div className="flex flex-wrap gap-3">
        <KpiCard label="未選別" value="-" />
        <KpiCard label="選別済み" value="-" />
        <KpiCard label="選別率" value="-" />
        <KpiCard label="本日の選別" value="-" />
      </div>
    );
  }

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
        <KpiCard label="未選別" value={kpiQ.data.unselected_count} />
        <KpiCard label="選別済み" value={kpiQ.data.judged_count} />
        <KpiCard label="選別率" value={`${kpiQ.data.judged_rate.toFixed(1)}%`} />
        <KpiCard label="本日の選別" value={kpiQ.data.today_judged_count} />
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
