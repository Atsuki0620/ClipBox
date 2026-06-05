"use client";

// Tier1 ランダム/運命の1本。未判定動画の純ランダム選出。
// like/play/判定では再抽選しない（invalidateKeys=[]）。顔ぶれはシャッフル/引き直し操作時のみ変わる。

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getKpi, getUnratedFate, getUnratedRandom } from "@/lib/api";
import { KpiCard } from "@/components/KpiCard";
import { VideoGrid } from "@/components/VideoGrid";
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

const COUNTS = [5, 10, 20, 30];

export default function RandomPage() {
  const kpiQ = useQuery({ queryKey: ["kpi"], queryFn: getKpi });

  // ランダム
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
      <h1 className="text-xl font-semibold">Tier 1 — ランダム / 運命の1本</h1>

      <div className="flex flex-wrap gap-3">
        {kpiQ.data ? (
          <>
            <KpiCard label="未判定" value={kpiQ.data.unrated_count} />
            <KpiCard label="判定率" value={`${kpiQ.data.judged_rate}%`} />
          </>
        ) : (
          <Skeleton className="h-20 flex-1" />
        )}
      </div>

      <Tabs defaultValue="random">
        <TabsList>
          <TabsTrigger value="random">🔀 ランダム</TabsTrigger>
          <TabsTrigger value="fate">🎯 運命の1本</TabsTrigger>
        </TabsList>

        {/* ランダム */}
        <TabsContent value="random" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Select value={String(n)} onValueChange={(v) => setN(Number(v))}>
              <SelectTrigger className="w-28" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTS.map((c) => (
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
              シャッフル
            </Button>
          </div>

          {randomQ.isLoading || randomQ.isFetching ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: n }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
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
            運命の1本を引く
          </Button>

          {fateToken === 0 ? (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
              ボタンを押して運命の1本を引いてください。
            </div>
          ) : fateQ.isFetching ? (
            <Skeleton className="h-40 w-full max-w-sm" />
          ) : fateQ.isError ? (
            <ErrorBox error={fateQ.error} />
          ) : fateQ.data == null ? (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
              対象なし（未判定の動画がありません）。
            </div>
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

function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-md border border-destructive p-4 text-sm text-destructive">
      読み込みに失敗しました:{" "}
      {error instanceof Error ? error.message : "不明なエラー"}
    </div>
  );
}
