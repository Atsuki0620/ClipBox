"use client";

// Tier1 一次判定: 共有 KPI + 3 サブタブ（ライブラリ / ランダム / 運命の1本）。
// Streamlit の Tier1（1 画面 3 タブ）に構成を合わせる。ライブラリのフィルタは Zustand、
// サーバー状態は TanStack Query。Random/Fate は like/play/判定で再抽選しない（invalidateKeys=[]）。

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getKpi, getUnratedFate, getUnratedRandom, listVideos } from "@/lib/api";
import { useLibraryStore } from "@/lib/store";
import type { VideoListParams } from "@/lib/types";
import { KpiCard } from "@/components/KpiCard";
import { FilterPanel } from "@/components/FilterPanel";
import { VideoGrid } from "@/components/VideoGrid";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dices, Library, Shuffle } from "lucide-react";

const RANDOM_COUNTS = [5, 10, 15, 20];

export default function Tier1Page() {
  const kpiQ = useQuery({ queryKey: ["kpi"], queryFn: getKpi });

  // ライブラリ（Zustand フィルタ → API パラメータ）
  const store = useLibraryStore();
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
  const videosQ = useQuery({
    queryKey: ["videos", params],
    queryFn: () => listVideos(params),
  });

  // ランダム（純ランダム・本数指定）
  const [n, setN] = useState(10);
  const [randomToken, setRandomToken] = useState(0);
  const randomQ = useQuery({
    queryKey: ["unrated-random", n, randomToken],
    queryFn: () => getUnratedRandom(n),
  });

  // 運命の1本（token=0 は未フェッチ＝初期は「引いてください」）
  const [fateToken, setFateToken] = useState(0);
  const fateQ = useQuery({
    queryKey: ["unrated-fate", fateToken],
    queryFn: getUnratedFate,
    enabled: fateToken > 0,
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Tier 1 — 一次判定</h1>

      {/* 共有 KPI（3 タブ共通） */}
      <div className="flex flex-wrap gap-3">
        {kpiQ.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 flex-1" />
          ))
        ) : kpiQ.data ? (
          <>
            <KpiCard label="未判定" value={kpiQ.data.unrated_count} />
            <KpiCard label="判定済み" value={kpiQ.data.judged_count} />
            <KpiCard label="判定率" value={`${kpiQ.data.judged_rate.toFixed(1)}%`} />
            <KpiCard label="本日の判定" value={kpiQ.data.today_judged_count} />
          </>
        ) : (
          <ErrorText error={kpiQ.error} prefix="KPI の取得に失敗" />
        )}
      </div>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">
            <Library className="size-4" />
            ライブラリ
          </TabsTrigger>
          <TabsTrigger value="random">
            <Shuffle className="size-4" />
            ランダム
          </TabsTrigger>
          <TabsTrigger value="fate">
            <Dices className="size-4" />
            運命の1本
          </TabsTrigger>
        </TabsList>

        {/* ライブラリ */}
        <TabsContent value="library" className="flex flex-col gap-3">
          <FilterPanel />
          {videosQ.isLoading ? (
            <VideoSkeleton count={8} />
          ) : videosQ.isError ? (
            <ErrorBox error={videosQ.error} withApiHint />
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
                onPageChange={(p) => store.setFilter("page", p)}
                onPageSizeChange={(s) => store.setFilter("page_size", s)}
              />
            </>
          )}
        </TabsContent>

        {/* ランダム */}
        <TabsContent value="random" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(n)} onValueChange={(v) => setN(Number(v))}>
              <SelectTrigger className="w-28" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANDOM_COUNTS.map((c) => (
                  <SelectItem key={c} value={String(c)}>
                    {c} 本
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => setRandomToken((t) => t + 1)}
              disabled={randomQ.isFetching}
            >
              <Shuffle className="size-4" />
              シャッフル
            </Button>
          </div>

          {randomQ.isLoading || randomQ.isFetching ? (
            <VideoSkeleton count={Math.min(n, 8)} />
          ) : randomQ.isError ? (
            <ErrorBox error={randomQ.error} />
          ) : (
            <VideoGrid
              videos={randomQ.data ?? []}
              emptyMessage="未判定の動画がありません。"
              invalidateKeys={[]}
            />
          )}
        </TabsContent>

        {/* 運命の1本 */}
        <TabsContent value="fate" className="flex flex-col gap-3">
          <Button
            size="sm"
            className="w-fit"
            onClick={() => setFateToken((t) => t + 1)}
            disabled={fateQ.isFetching}
          >
            <Dices className="size-4" />
            運命の1本を引く
          </Button>

          {fateToken === 0 ? (
            <EmptyBox>ボタンを押して運命の1本を引いてください。</EmptyBox>
          ) : fateQ.isFetching ? (
            <Skeleton className="h-40 w-full max-w-sm" />
          ) : fateQ.isError ? (
            <ErrorBox error={fateQ.error} />
          ) : fateQ.data == null ? (
            <EmptyBox>対象なし（未判定の動画がありません）。</EmptyBox>
          ) : (
            <div className="max-w-sm">
              <VideoGrid videos={[fateQ.data]} invalidateKeys={[]} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function VideoSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-8 text-center text-muted-foreground">
      {children}
    </div>
  );
}

function ErrorBox({
  error,
  withApiHint,
}: {
  error: unknown;
  withApiHint?: boolean;
}) {
  return (
    <div className="rounded-md border border-destructive p-4 text-sm text-destructive">
      読み込みに失敗しました:{" "}
      {error instanceof Error ? error.message : "不明なエラー"}
      {withApiHint && (
        <div className="mt-1 text-muted-foreground">
          API サーバー（
          {process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api"}）が
          起動しているか確認してください。
        </div>
      )}
    </div>
  );
}

function ErrorText({ error, prefix }: { error: unknown; prefix: string }) {
  return (
    <div className="text-sm text-destructive">
      {prefix}: {error instanceof Error ? error.message : "不明なエラー"}
    </div>
  );
}
