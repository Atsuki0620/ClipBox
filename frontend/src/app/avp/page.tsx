"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueries } from "@tanstack/react-query";
import { getVideo, playAvp } from "@/lib/api";
import { levelName, storageLabel } from "@/lib/levels";
import { MAX_AVP_SELECTION, useAvpStore, usePlaybackStore } from "@/lib/store";
import type { Video } from "@/lib/types";
import { VideoGrid } from "@/components/VideoGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { MonitorPlay, Trash2, X } from "lucide-react";

type ResultMessage = {
  tone: "success" | "error";
  text: string;
};

export default function AvpPage() {
  const {
    avpSelectedIds,
    avpLaunchSelectedIds,
    avpPlayingIds,
    removeAvpSelectedId,
    clearAvpSelectedIds,
    toggleAvpLaunchSelectedId,
    clearAvpLaunchSelectedIds,
    setAvpPlayingIds,
    clearAvpPlayingIds,
  } = useAvpStore();
  const setAvpPlaying = usePlaybackStore((state) => state.setAvpPlaying);
  const [result, setResult] = useState<ResultMessage | null>(null);

  const videoIds = useMemo(
    () => Array.from(new Set([...avpSelectedIds, ...avpPlayingIds])),
    [avpPlayingIds, avpSelectedIds],
  );
  const videoQueries = useQueries({
    queries: videoIds.map((id) => ({
      queryKey: ["video", id] as const,
      queryFn: () => getVideo(id),
    })),
  });

  const videosById = useMemo(() => {
    const map = new Map<number, Video>();
    videoQueries.forEach((query, index) => {
      if (query.data) {
        map.set(videoIds[index], query.data);
      }
    });
    return map;
  }, [videoIds, videoQueries]);

  const selectedVideos = useMemo(
    () =>
      avpSelectedIds
        .map((id) => videosById.get(id))
        .filter((video): video is Video => Boolean(video)),
    [avpSelectedIds, videosById],
  );
  const playingVideos = useMemo(
    () =>
      avpPlayingIds
        .map((id) => videosById.get(id))
        .filter((video): video is Video => Boolean(video)),
    [avpPlayingIds, videosById],
  );
  const failedIds = videoIds.filter((_, index) => videoQueries[index]?.isError);
  const isLoading = videoQueries.some((query) => query.isLoading);
  const canLaunch =
    avpLaunchSelectedIds.length > 0 &&
    avpLaunchSelectedIds.every((id) => videosById.get(id)?.is_available);

  const launchMutation = useMutation({
    mutationFn: (ids: number[]) => playAvp(ids),
    onSuccess: (response, ids) => {
      setAvpPlayingIds(ids);
      setAvpPlaying(ids); // 再生中ハイライト（AVP=最大4本）を更新
      clearAvpLaunchSelectedIds();
      setResult({ tone: "success", text: response.message });
    },
    onError: (error) => {
      setResult({ tone: "error", text: errorMessage(error) });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">AVP再生</h1>
        <div className="text-sm text-muted-foreground">
          選択中 {avpSelectedIds.length}/{MAX_AVP_SELECTION}
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        AVP は FastAPI が動いている PC 上で起動します。起動自体では視聴履歴は記録されません。
      </div>

      {result && <StatusBox tone={result.tone} text={result.text} />}
      {failedIds.length > 0 && (
        <StatusBox
          tone="error"
          text={`動画情報の取得に失敗しました: ${failedIds.join(", ")}`}
        />
      )}

      <section className="rounded-md border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">選択済み動画</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearAvpLaunchSelectedIds}
              disabled={avpLaunchSelectedIds.length === 0}
            >
              <X className="size-4" />
              再生対象解除
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAvpSelectedIds}
              disabled={avpSelectedIds.length === 0}
            >
              <Trash2 className="size-4" />
              選択クリア
            </Button>
          </div>
        </div>

        {isLoading ? (
          <SelectedSkeleton />
        ) : selectedVideos.length === 0 ? (
          <EmptyBox>AVP 選択中の動画がありません。</EmptyBox>
        ) : (
          <div className="grid gap-2">
            {selectedVideos.map((video) => {
              const id = video.id as number;
              const launchSelected = avpLaunchSelectedIds.includes(id);
              const disabled = !video.is_available;

              return (
                <div
                  key={id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2"
                >
                  <Checkbox
                    checked={launchSelected}
                    disabled={disabled}
                    onCheckedChange={() => toggleAvpLaunchSelectedId(id)}
                  />
                  <div className="min-w-0">
                    <div
                      className="truncate text-sm font-medium"
                      title={video.essential_filename}
                    >
                      {video.essential_filename}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge style={{ backgroundColor: levelColorFor(video) }}>
                        {levelName(video.current_favorite_level)}
                      </Badge>
                      <Badge variant="secondary">
                        {storageLabel(video.storage_location)}
                      </Badge>
                      {!video.is_available && (
                        <Badge variant="destructive">利用不可</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="選択から外す"
                    onClick={() => removeAvpSelectedId(id)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            onClick={() => launchMutation.mutate([...avpLaunchSelectedIds])}
            disabled={!canLaunch || launchMutation.isPending}
          >
            <MonitorPlay className="size-4" />
            AVPで再生
          </Button>
          <span className="text-sm text-muted-foreground">
            再生対象 {avpLaunchSelectedIds.length}/{MAX_AVP_SELECTION}
          </span>
        </div>
      </section>

      <section className="rounded-md border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">評価待ち</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAvpPlayingIds}
            disabled={avpPlayingIds.length === 0}
          >
            <Trash2 className="size-4" />
            評価待ちクリア
          </Button>
        </div>

        {avpPlayingIds.length === 0 ? (
          <EmptyBox>AVP 起動後の評価待ち動画はありません。</EmptyBox>
        ) : playingVideos.length === 0 && isLoading ? (
          <SelectedSkeleton />
        ) : (
          <VideoGrid
            videos={playingVideos}
            emptyMessage="評価待ち動画の情報を取得できません。"
            invalidateKeys={[["video"], ["kpi"], ["selection-kpi"]]}
          />
        )}
      </section>
    </div>
  );
}

function levelColorFor(video: Video): string {
  if (video.current_favorite_level >= 4) return "#dc2626";
  if (video.current_favorite_level === 3) return "#ea580c";
  if (video.current_favorite_level === 2) return "#ca8a04";
  if (video.current_favorite_level === 1) return "#16a34a";
  if (video.current_favorite_level === 0) return "#64748b";
  return "#6b7280";
}

function SelectedSkeleton() {
  return (
    <div className="grid gap-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-16" />
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

function StatusBox({ tone, text }: ResultMessage) {
  const classes =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : "border-destructive text-destructive";
  return <div className={`rounded-md border px-3 py-2 text-sm ${classes}`}>{text}</div>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "不明なエラーが発生しました。";
}
