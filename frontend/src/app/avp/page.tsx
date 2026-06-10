"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getVideosByIds, playAvp } from "@/lib/api";
import { levelColor, levelName, storageLabel } from "@/lib/levels";
import { MAX_AVP_PLAY_TARGET, useAvpStore, usePlaybackStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MonitorPlay, Trash2, X } from "lucide-react";

type ResultMessage = {
  tone: "success" | "error";
  text: string;
};

export default function AvpPage() {
  const {
    avpCandidateIds,
    avpPlayTargetIds,
    removeAvpCandidateId,
    clearAvpCandidateIds,
    toggleAvpPlayTargetId,
    clearAvpPlayTargetIds,
    pruneIds,
  } = useAvpStore();
  const setAvpPlaying = usePlaybackStore((state) => state.setAvpPlaying);
  const [result, setResult] = useState<ResultMessage | null>(null);

  const { data: candidateData, isLoading } = useQuery({
    queryKey: ["avp-candidates", avpCandidateIds],
    queryFn: () => getVideosByIds(avpCandidateIds),
    enabled: avpCandidateIds.length > 0,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (candidateData?.missing_ids && candidateData.missing_ids.length > 0) {
      pruneIds(candidateData.missing_ids);
    }
  }, [candidateData?.missing_ids, pruneIds]);

  const candidateVideos = candidateData?.items ?? [];

  const launchMutation = useMutation({
    mutationFn: (ids: number[]) => playAvp(ids),
    onSuccess: (response, ids) => {
      setAvpPlaying(ids);
      clearAvpPlayTargetIds();
      setResult({ tone: "success", text: response.message });
    },
    onError: (error) => {
      setResult({ tone: "error", text: errorMessage(error) });
    },
  });

  const canLaunch = avpPlayTargetIds.length > 0 && !launchMutation.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">AVP再生</h1>
        <div className="text-sm text-muted-foreground">
          候補 {avpCandidateIds.length} / 再生対象 {avpPlayTargetIds.length}/{MAX_AVP_PLAY_TARGET}
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        AVP は FastAPI が動いている PC 上で起動します。再生すると視聴履歴が記録されます。
      </div>

      {result && <StatusBox tone={result.tone} text={result.text} />}

      <section className="rounded-md border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">候補一覧</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAvpCandidateIds}
            disabled={avpCandidateIds.length === 0}
          >
            <Trash2 className="size-4" />
            全候補クリア
          </Button>
        </div>

        {avpCandidateIds.length === 0 ? (
          <EmptyBox>
            AVP 候補がありません。動画一覧の「AVP候補」チェックボックスで追加してください。
          </EmptyBox>
        ) : isLoading ? (
          <CandidateSkeleton />
        ) : candidateVideos.length === 0 ? (
          <EmptyBox>候補動画の情報を取得できません。</EmptyBox>
        ) : (
          <div className="grid gap-2">
            {candidateVideos.map((video) => {
              const id = video.id as number;
              const isTarget = avpPlayTargetIds.includes(id);
              const targetFull =
                avpPlayTargetIds.length >= MAX_AVP_PLAY_TARGET && !isTarget;
              const checkDisabled = !video.is_available || targetFull;

              return (
                <div
                  key={id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2"
                >
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span>
                          <Checkbox
                            checked={isTarget}
                            disabled={checkDisabled}
                            onCheckedChange={() => toggleAvpPlayTargetId(id)}
                          />
                        </span>
                      }
                    />
                    {targetFull && (
                      <TooltipContent>再生対象は最大{MAX_AVP_PLAY_TARGET}本です</TooltipContent>
                    )}
                  </Tooltip>

                  <div className="min-w-0">
                    <div
                      className="truncate text-sm font-medium"
                      title={video.essential_filename}
                    >
                      {video.essential_filename}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge
                        style={{
                          backgroundColor: levelColor(video.current_favorite_level),
                        }}
                      >
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
                    title="候補から外す"
                    onClick={() => removeAvpCandidateId(id)}
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
            onClick={() => launchMutation.mutate([...avpPlayTargetIds])}
            disabled={!canLaunch}
          >
            <MonitorPlay className="size-4" />
            AVPで再生
          </Button>
          <span className="text-sm text-muted-foreground">
            再生対象 {avpPlayTargetIds.length}/{MAX_AVP_PLAY_TARGET}
          </span>
        </div>
      </section>
    </div>
  );
}

function CandidateSkeleton() {
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
