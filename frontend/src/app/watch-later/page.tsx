"use client";

// あとで見る専用ページ。
// 【設計制約】watch_later は DB 永続のまま扱い、AVP候補/再生対象の localStorage 境界を変更しない。
// 【依存関係】既存の listVideos / VideoCard / TanStack Query キャッシュを使い、新規 API は追加しない。

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { bulkClearWatchLater, getLastViewed, getLikes, getViewCounts, listVideos } from "@/lib/api";
import { levelName } from "@/lib/levels";
import type { Video } from "@/lib/types";
import { VideoCard } from "@/components/VideoCard";
import { EmptyBox, ErrorBox, VideoSkeleton } from "@/components/VideoState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookmarkX } from "lucide-react";

const WATCH_LATER_QUERY_KEY: QueryKey = ["watch-later-videos"];
const WATCH_LATER_PAGE_SIZE = 200;
const LIKES_CHUNK_SIZE = 100;

type SectionKey = "unprocessed" | "review" | "processed";

type WatchLaterSectionData = {
  key: SectionKey;
  title: string;
  videos: Video[];
  emptyMessage: string;
  action?: ReactNode;
};

type WatchLaterClassification = {
  unprocessed: Video[];
  review: Video[];
  processed: Video[];
};

export default function WatchLaterPage() {
  const queryClient = useQueryClient();
  const [bulkClearIds, setBulkClearIds] = useState<number[] | null>(null);
  const videosQ = useQuery({
    queryKey: WATCH_LATER_QUERY_KEY,
    queryFn: fetchAllWatchLaterVideos,
  });

  const videos = useMemo(() => videosQ.data ?? [], [videosQ.data]);
  const videosLoaded = videosQ.data !== undefined && !videosQ.isError;
  const needsLastViewed = videos.length > 0;
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
    enabled: videosLoaded && needsLastViewed,
  });

  const lastViewed = useMemo(() => lastViewedQ.data ?? {}, [lastViewedQ.data]);
  const canClassify = !needsLastViewed || lastViewedQ.data !== undefined;
  const classified = useMemo(
    () => (canClassify ? classifyWatchLaterVideos(videos, lastViewed) : emptyClassification()),
    [canClassify, lastViewed, videos],
  );
  const processedIds = useMemo(
    () => classified.processed.map((video) => video.id).filter((id): id is number => id != null),
    [classified.processed],
  );
  const lastViewedLoading = videosLoaded && needsLastViewed && lastViewedQ.isLoading;
  const lastViewedError = videosLoaded && needsLastViewed && lastViewedQ.isError;

  const bulkClearM = useMutation({
    mutationFn: (videoIds: number[]) => bulkClearWatchLater(videoIds),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: WATCH_LATER_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["videos"] }),
        queryClient.invalidateQueries({ queryKey: ["selection-videos"] }),
      ]);
      setBulkClearIds(null);
    },
  });

  const handleBulkClearOpenChange = (open: boolean) => {
    if (bulkClearM.isPending) return;
    bulkClearM.reset();
    if (!open) setBulkClearIds(null);
  };

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
      videos: classified.processed,
      emptyMessage: "処理済み候補はありません。",
      action:
        processedIds.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={bulkClearM.isPending}
            onClick={() => {
              bulkClearM.reset();
              setBulkClearIds(processedIds);
            }}
          >
            <BookmarkX className="size-4" />
            一括解除
          </Button>
        ) : undefined,
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

      {videosQ.isLoading || lastViewedLoading ? (
        <VideoSkeleton count={8} />
      ) : videosQ.isError ? (
        <ErrorBox error={videosQ.error} />
      ) : lastViewedError ? (
        <ErrorBox
          error={lastViewedQ.error}
          hint="処理済み候補の分類に必要な最終再生日を取得できませんでした。"
        />
      ) : (
        sections.map((section) => (
          <WatchLaterSection
            key={section.key}
            section={section}
            likes={likesQ.data ?? {}}
            viewCounts={viewCountsQ.data ?? {}}
            lastViewed={lastViewed}
          />
        ))
      )}
      <BulkClearDialog
        count={bulkClearIds?.length ?? 0}
        open={bulkClearIds !== null}
        pending={bulkClearM.isPending}
        error={bulkClearM.error}
        onOpenChange={handleBulkClearOpenChange}
        onConfirm={() => {
          if (bulkClearIds) bulkClearM.mutate(bulkClearIds);
        }}
      />
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
    if (response.items.length === 0) break;
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

function emptyClassification(): WatchLaterClassification {
  return { unprocessed: [], review: [], processed: [] };
}

function classifyWatchLaterVideos(
  videos: Video[],
  lastViewed: Record<number, string>,
): WatchLaterClassification {
  const unprocessed: Video[] = [];
  const review: Video[] = [];
  const processed: Video[] = [];

  for (const video of videos) {
    if (isUnprocessed(video)) {
      unprocessed.push(video);
    } else if (isProcessedCandidate(video, lastViewed)) {
      processed.push(video);
    } else if (isReviewTarget(video)) {
      review.push(video);
    }
  }

  return { unprocessed, review, processed };
}

function isUnprocessed(video: Video): boolean {
  if (video.is_selection_completed) return false;
  return video.needs_selection || video.current_favorite_level === -1;
}

function isReviewTarget(video: Video): boolean {
  return video.is_selection_completed || video.current_favorite_level >= 0;
}

function isProcessedCandidate(video: Video, lastViewed: Record<number, string>): boolean {
  if (!isReviewTarget(video) || video.id == null) return false;
  return Boolean(lastViewed[video.id]);
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
        {section.action ? <div className="ml-auto">{section.action}</div> : null}
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

function BulkClearDialog({
  count,
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  count: number;
  open: boolean;
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>一括解除</DialogTitle>
          <DialogDescription>
            処理済み候補 {count} 本のあとで見るを解除しますか。
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error instanceof Error ? error.message : "一括解除に失敗しました"}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button type="button" variant="destructive" disabled={pending || count === 0} onClick={onConfirm}>
            <BookmarkX className="size-4" />
            {pending ? "解除中" : "解除する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
