"use client";

// 動画カードのグリッド + いいね数/視聴回数の取得をまとめた共通コンポーネント。
// ライブラリ・ランダム・検索で再利用する。呼び出し側は表示する件数に絞ってから videos を渡すこと
// （getLikes の video_ids が URL 長制限に当たらないよう、検索などは現在ページ分のみ渡す）。

import { useMemo } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import { getLikes, getLastViewed, getViewCounts } from "@/lib/api";
import type { Video } from "@/lib/types";
import { VideoCard } from "@/components/VideoCard";

export function VideoGrid({
  videos,
  emptyMessage = "条件に一致する動画がありません。",
  invalidateKeys = [],
  gridClassName,
  displayContext = "tier1",
}: {
  videos: Video[];
  emptyMessage?: string;
  invalidateKeys?: QueryKey[];
  gridClassName?: string;
  displayContext?: "tier1" | "tier2" | "avp";
}) {
  const ids = useMemo(
    () => videos.map((v) => v.id as number).filter(Boolean),
    [videos],
  );

  const likesQ = useQuery({
    queryKey: ["likes", ids],
    queryFn: () => getLikes(ids),
    enabled: ids.length > 0,
  });
  const viewCountsQ = useQuery({
    queryKey: ["view-counts"],
    queryFn: getViewCounts,
  });
  const lastViewedQ = useQuery({
    queryKey: ["last-viewed"],
    queryFn: getLastViewed,
  });

  if (videos.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={gridClassName ?? "grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}>
      {videos.map((v) => (
        <VideoCard
          key={v.id}
          video={v}
          likeCount={likesQ.data?.[v.id as number] ?? 0}
          viewCount={viewCountsQ.data?.[v.id as number] ?? 0}
          lastViewed={lastViewedQ.data?.[v.id as number] ?? null}
          invalidateKeys={invalidateKeys}
          displayContext={displayContext}
        />
      ))}
    </div>
  );
}
