"use client";

import { useState } from "react";
import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { likeVideo, playVideo, setLevel } from "@/lib/api";
import { levelColor, levelName, LEVEL_OPTIONS, storageLabel } from "@/lib/levels";
import { MAX_AVP_SELECTION, useAvpStore } from "@/lib/store";
import type { Video } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Heart, Play } from "lucide-react";

export function VideoCard({
  video,
  likeCount,
  viewCount,
  invalidateKeys = [],
}: {
  video: Video;
  likeCount: number;
  viewCount: number;
  // 画面別のリスト query key（例 [["videos"]]）。ランダム/運命は [] を渡し再抽選を防ぐ。
  invalidateKeys?: QueryKey[];
}) {
  const qc = useQueryClient();
  const id = video.id as number;
  const avpSelectedIds = useAvpStore((state) => state.avpSelectedIds);
  const toggleAvpSelectedId = useAvpStore((state) => state.toggleAvpSelectedId);

  // 判定後の表示用レベル（再抽選しない画面でもバッジ/select を即時反映するためのローカル state）。
  const [displayLevel, setDisplayLevel] = useState(video.current_favorite_level);

  // mutation 後は onSettled で invalidate する（成功・409 とも）。
  // 共通キー（kpi/likes/view-counts）は件数更新のみでリストの顔ぶれを変えない。
  // リストキーは画面別に invalidateKeys で受け取り、ランダム/運命では空にして再抽選を防ぐ。
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["kpi"] });
    qc.invalidateQueries({ queryKey: ["likes"] });
    qc.invalidateQueries({ queryKey: ["view-counts"] });
    for (const key of invalidateKeys) {
      qc.invalidateQueries({ queryKey: key });
    }
  };

  const playM = useMutation({
    mutationFn: () => playVideo(id),
    onSettled: invalidate,
  });
  const levelM = useMutation({
    mutationFn: (level: number) => setLevel(id, level === -1 ? null : level),
    onSuccess: (_data, level) => setDisplayLevel(level),
    onSettled: invalidate,
  });
  const likeM = useMutation({
    mutationFn: () => likeVideo(id),
    onSettled: invalidate,
  });

  const busy = playM.isPending || levelM.isPending || likeM.isPending;
  // 利用不可動画は再生・判定を抑止（現行 Streamlit に準拠）。いいねは利用不可でも許可。
  const mutateDisabled = busy || !video.is_available;
  const error = playM.error || levelM.error || likeM.error;
  const isJudged = displayLevel !== -1;
  const isAvpSelected = avpSelectedIds.includes(id);
  const avpMaxReached =
    avpSelectedIds.length >= MAX_AVP_SELECTION && !isAvpSelected;
  const avpDisabled = !video.is_available || avpMaxReached;

  return (
    <Card
      className={`${video.is_available ? "" : "opacity-60"} ${
        isAvpSelected ? "ring-2 ring-primary" : ""
      }`}
    >
      <CardContent className="flex flex-col gap-1 py-1">
        <div
          className="line-clamp-2 break-all text-sm font-medium"
          title={video.essential_filename}
        >
          {video.essential_filename}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {isJudged && (
            <Badge style={{ backgroundColor: levelColor(displayLevel) }}>
              {levelName(displayLevel)}
            </Badge>
          )}
          <Badge variant="secondary">{storageLabel(video.storage_location)}</Badge>
          <Badge variant="outline">視聴 {viewCount}</Badge>
          {video.is_selection_completed && <Badge variant="outline">選別済み</Badge>}
          {!video.is_available && <Badge variant="destructive">利用不可</Badge>}
        </div>

        <label
          className={`flex w-fit items-center gap-2 text-sm ${
            avpDisabled ? "text-muted-foreground" : ""
          }`}
          title={
            avpMaxReached
              ? `AVP 選択は最大${MAX_AVP_SELECTION}本です`
              : undefined
          }
        >
          <Checkbox
            checked={isAvpSelected}
            disabled={avpDisabled}
            onCheckedChange={() => toggleAvpSelectedId(id)}
          />
          <span>AVP選択</span>
          <span className="text-xs text-muted-foreground">
            {avpSelectedIds.length}/{MAX_AVP_SELECTION}
          </span>
        </label>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  variant="default"
                  disabled={mutateDisabled}
                  onClick={() => playM.mutate()}
                />
              }
            >
              <Play className="size-4" />
              再生
            </TooltipTrigger>
            <TooltipContent>サーバー機でプレイヤーが起動します</TooltipContent>
          </Tooltip>

          <Select
            value={String(displayLevel)}
            onValueChange={(v) => levelM.mutate(Number(v))}
            disabled={mutateDisabled}
          >
            <SelectTrigger className="w-28" size="sm">
              <span>{levelName(displayLevel)}</span>
            </SelectTrigger>
            <SelectContent>
              {LEVEL_OPTIONS.map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {levelName(l)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => likeM.mutate()}
          >
            <Heart className="size-4" />
            {likeCount}
          </Button>
        </div>

        {error && (
          <div className="text-xs text-destructive">
            {error instanceof Error ? error.message : "操作に失敗しました"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
