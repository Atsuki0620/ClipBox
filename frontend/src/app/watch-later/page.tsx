"use client";

// あとで見る専用ページ。
// 【設計制約】watch_later は DB 永続のまま扱い、AVP候補/再生対象の localStorage 境界を変更しない。
// 【依存関係】既存の listVideos / VideoCard / TanStack Query キャッシュを使い、新規 API は追加しない。

import { useMemo } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query";

import { getLastViewed, getLikes, getViewCounts, listVideos } from "@/lib/api";
import { levelName } from "@/lib/levels";
import type { Video } from "@/lib/types";
import { VideoCard } from "@/components/VideoCard";
import { EmptyBox, ErrorBox, VideoSkeleton } from "@/components/VideoState";
import { Badge } from "@/components/ui/badge";

const WATCH_LATER_QUERY_KEY: QueryKey = ["watch-later-videos"];
const WATCH_LATER_PAGE_SIZE = 200;
const LIKES_CHUNK_SIZE = 100;

type SectionKey = "unprocessed" | "review" | "processed";

type WatchLaterSectionData = {
  key: SectionKey;
  title: string;
  videos: Video[];
  emptyMessage: string;
};

export default function WatchLaterPage() {
  const videosQ = useQuery({
    queryKey: WATCH_LATER_QUERY_KEY,
    queryFn: fetchAllWatchLaterVideos,
  });

  const videos = useMemo(() => videosQ.data ?? [], [videosQ.data]);
  const ids = useMemo(
    () => videos.map((video) => video.id).filter((id): id is number => id != null),
    [videos],
  );

  const likesQ = useQuery({
    queryKey: ["likes", ids],
    queryFn: () => getChunkedLikes(ids),
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

  const classified = useMemo(() => classifyWatchLaterVideos(videos), [videos]);
  const sections: WatchLaterSectionData[] = [
    {
      key: "unprocessed",
      title: "未処理",
      videos: classified.unprocessed,
      emptyMessage: "未処理の動画はありません。",
    },
    {
      key: "review",
      title: "確認・見直し",
      videos: classified.review,
      emptyMessage: "確認・見直しの動画はありません。",
    },
    {
      key: "processed",
      title: "処理済み候補",
      videos: [],
      emptyMessage: "処理済み候補はありません。",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">あとで見る</h1>
          <div className="mt-1 text-sm text-muted-foreground">合計 {videos.length} 本</div>
        </div>
      </header>

      {videosQ.isLoading ? (
        <VideoSkeleton count={8} />
      ) : videosQ.isError ? (
        <ErrorBox error={videosQ.error} />
      ) : (
        sections.map((section) => (
          <WatchLaterSection
            key={section.key}
            section={section}
            likes={likesQ.data ?? {}}
            viewCounts={viewCountsQ.data ?? {}}
            lastViewed={lastViewedQ.data ?? {}}
          />
        ))
      )}
    </div>
  );
}

async function fetchAllWatchLaterVideos(): Promise<Video[]> {
  const items: Video[] = [];
  let page = 1;
  let total = 0;

  do {
    const response = await listVideos({
      watch_later: true,
      show_unavailable: true,
      sort: "last_viewed",
      order: "desc",
      page,
      page_size: WATCH_LATER_PAGE_SIZE,
    });
    items.push(...response.items);
    total = response.total;
    page += 1;
  } while (items.length < total);

  return items;
}

async function getChunkedLikes(ids: number[]): Promise<Record<number, number>> {
  if (ids.length === 0) return {};

  const chunks = Array.from(
    { length: Math.ceil(ids.length / LIKES_CHUNK_SIZE) },
    (_, index) => ids.slice(index * LIKES_CHUNK_SIZE, (index + 1) * LIKES_CHUNK_SIZE),
  );
  const maps = await Promise.all(chunks.map((chunk) => getLikes(chunk)));
  return Object.assign({}, ...maps) as Record<number, number>;
}

function classifyWatchLaterVideos(videos: Video[]): {
  unprocessed: Video[];
  review: Video[];
} {
  const unprocessed: Video[] = [];
  const review: Video[] = [];

  for (const video of videos) {
    if (isUnprocessed(video)) {
      unprocessed.push(video);
    } else if (isReviewTarget(video)) {
      review.push(video);
    }
  }

  return { unprocessed, review };
}

function isUnprocessed(video: Video): boolean {
  if (video.is_selection_completed) return false;
  return video.needs_selection || video.current_favorite_level === -1;
}

function isReviewTarget(video: Video): boolean {
  return video.is_selection_completed || video.current_favorite_level >= 0;
}

function WatchLaterSection({
  section,
  likes,
  viewCounts,
  lastViewed,
}: {
  section: WatchLaterSectionData;
  likes: Record<number, number>;
  viewCounts: Record<number, number>;
  lastViewed: Record<number, string>;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 border-b pb-2">
        <h2 className="text-base font-semibold">{section.title}</h2>
        <Badge variant="secondary">{section.videos.length}</Badge>
      </div>

      {section.videos.length === 0 ? (
        <EmptyBox>{section.emptyMessage}</EmptyBox>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {section.videos.map((video) => {
            const id = video.id as number;
            const displayContext =
              video.needs_selection || video.is_selection_completed ? "tier2" : "tier1";
            const viewedAt = lastViewed[id] ?? null;

            return (
              <div key={id} className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{statusLabel(video)}</Badge>
                  <span>最終再生 {formatLastViewed(viewedAt)}</span>
                </div>
                <VideoCard
                  video={video}
                  likeCount={likes[id] ?? 0}
                  viewCount={viewCounts[id] ?? 0}
                  lastViewed={viewedAt}
                  invalidateKeys={[WATCH_LATER_QUERY_KEY]}
                  displayContext={displayContext}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function statusLabel(video: Video): string {
  if (video.is_selection_completed) return "Tier2 選別済み";
  if (video.needs_selection) return "Tier2 未選別";
  if (video.current_favorite_level === -1) return "Tier1 未判定";
  return `Tier1 ${levelName(video.current_favorite_level)}`;
}

function formatLastViewed(value: string | null): string {
  if (!value) return "なし";
  return value.substring(0, 10).replace(/-/g, "/");
}
