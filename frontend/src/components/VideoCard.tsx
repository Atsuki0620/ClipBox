"use client";

import { useState } from "react";
import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { likeVideo, setLevel, toggleWatchLater } from "@/lib/api";
import { levelColor, levelName, LEVEL_OPTIONS, storageLabel } from "@/lib/levels";
import { useAvpStore, useIsPlaying } from "@/lib/store";
import { usePlayVideo } from "@/lib/usePlayVideo";
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
import { Bookmark, Heart, Play, X } from "lucide-react";

// 共通の動画カード。`displayContext` で Tier1/Tier2/AVP の表示差を切り替える多態コンポーネント。
//   - "tier1": AVP候補チェックボックスを表示（SPEC_NEXTJS.md §2 / 下記 :130-142）
//   - "tier2": 「未選別」「選別済み」バッジを表示（SPEC §3 / :87-89, :121-126）
//   - "avp":   「再生対象」チェックと削除ボタンを表示（SPEC §6 / :200-223）
// 表示差は localStorage 由来（AVP候補/再生対象/再生中ハイライト）と DB 由来（レベル/あとで見る）が
// 混在する。どちらの状態かは SPEC_NEXTJS.md §0 の永続境界を必ず参照すること。
// 値は3値で固定。第4値を足す前に AI_WORKFLOW.md §C で停止する（SPEC §6）。
export function VideoCard({
  video,
  likeCount,
  viewCount,
  invalidateKeys = [],
  displayContext = "tier1",
  avpPlayTarget,
  onAvpRemove,
}: {
  video: Video;
  likeCount: number;
  viewCount: number;
  // 画面別のリスト query key（例 [["videos"]]）。ランダム/運命は [] を渡し再抽選を防ぐ。
  invalidateKeys?: QueryKey[];
  displayContext?: "tier1" | "tier2" | "avp";
  avpPlayTarget?: { checked: boolean; disabled: boolean; onToggle: () => void };
  onAvpRemove?: () => void;
}) {
  const qc = useQueryClient();
  const id = video.id as number;
  const avpCandidateIds = useAvpStore((state) => state.avpCandidateIds);
  const toggleAvpCandidateId = useAvpStore((state) => state.toggleAvpCandidateId);

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

  // 再生は共通フック（成功で再生中=単体をセット。invalidate も内包）。
  const playM = usePlayVideo(invalidateKeys);
  const isPlaying = useIsPlaying(id);
  const levelM = useMutation({
    mutationFn: (level: number) => setLevel(id, level === -1 ? null : level),
    onSuccess: (_data, level) => setDisplayLevel(level),
    onSettled: invalidate,
  });
  const likeM = useMutation({
    mutationFn: () => likeVideo(id),
    onSettled: invalidate,
  });
  const watchLaterM = useMutation({
    mutationFn: () => toggleWatchLater(id),
    onSettled: invalidate,
  });

  const levelDisplay =
    displayContext === "tier2" && video.needs_selection && displayLevel === -1
      ? "未選別"
      : levelName(displayLevel);

  const busy = playM.isPending || levelM.isPending || likeM.isPending || watchLaterM.isPending;
  // 利用不可動画は再生・判定を抑止（現行 Streamlit に準拠）。いいねは利用不可でも許可。
  const mutateDisabled = busy || !video.is_available;
  const error = playM.error || levelM.error || likeM.error;
  const isJudged = displayLevel !== -1;
  const isAvpSelected = avpCandidateIds.includes(id);
  const avpDisabled = !video.is_available;

  return (
    <Card
      className={`${video.is_available ? "" : "opacity-60"} ${
        isPlaying ? "border-2 border-amber-400 bg-amber-50" : ""
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
          {displayContext === "tier2" && video.needs_selection && !video.is_selection_completed && (
            <Badge variant="secondary">未選別</Badge>
          )}
          {displayContext === "tier2" && video.is_selection_completed && (
            <Badge variant="outline">選別済み</Badge>
          )}
          {!video.is_available && <Badge variant="destructive">利用不可</Badge>}
        </div>

        {displayContext !== "tier2" && displayContext !== "avp" && (
          <label
            className={`flex w-fit items-center gap-2 text-sm ${
              avpDisabled ? "text-muted-foreground" : ""
            }`}
          >
            <Checkbox
              checked={isAvpSelected}
              disabled={avpDisabled}
              onCheckedChange={() => toggleAvpCandidateId(id)}
            />
            <span>AVP候補</span>
          </label>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            disabled={mutateDisabled}
            onClick={() => playM.mutate(id)}
          >
            <Play className="size-4" />
            再生
          </Button>

          <Select
            value={String(displayLevel)}
            onValueChange={(v) => levelM.mutate(Number(v))}
            disabled={mutateDisabled}
          >
            <SelectTrigger className="w-28" size="sm">
              <span>{levelDisplay}</span>
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

          <Button
            size="sm"
            variant={video.watch_later ? "default" : "outline"}
            disabled={busy}
            onClick={() => watchLaterM.mutate()}
            title={video.watch_later ? "あとで見るを解除" : "あとで見るに追加"}
          >
            <Bookmark className="size-4" />
          </Button>

          {avpPlayTarget && (
            <label
              className={`flex w-fit items-center gap-2 text-sm ${
                avpPlayTarget.disabled ? "text-muted-foreground" : ""
              }`}
            >
              <Checkbox
                checked={avpPlayTarget.checked}
                disabled={avpPlayTarget.disabled}
                onCheckedChange={() => avpPlayTarget.onToggle()}
              />
              <span>再生対象</span>
            </label>
          )}
          {onAvpRemove && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onAvpRemove}
              title="候補から外す"
            >
              <X className="size-4" />
            </Button>
          )}
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
