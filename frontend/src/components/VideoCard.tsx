"use client";

import { useState, type ComponentProps } from "react";
import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { getVideo, likeVideo, setLevel, toggleWatchLater, unselectVideo } from "@/lib/api";
import { levelColor, levelName, LEVEL_OPTIONS, storageLabel } from "@/lib/levels";
import { useAvpStore, useIsPlaying } from "@/lib/store";
import { usePlayVideo } from "@/lib/usePlayVideo";
import { useCardSettings } from "@/lib/useCardSettings";
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
import { Bookmark, Heart, Play, X } from "lucide-react";

function pathBasename(fullPath: string): string {
  return fullPath.split(/[/\\]/).pop() ?? fullPath;
}

function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  return isoStr.substring(0, 10).replace(/-/g, "/");
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

// tooltip 付きバッジ。tip に説明文を渡す。
function TBadge({ tip, children, ...props }: ComponentProps<typeof Badge> & { tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>
        <Badge {...props}>{children}</Badge>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

// 共通の動画カード。`displayContext` で Tier1/Tier2/AVP の表示差を切り替える多態コンポーネント。
//   - "tier1": AVP候補チェックボックスをバッジ行先頭に表示（SPEC_NEXTJS.md §2）
//   - "tier2": Tier2未選別はプルダウンで「未選別」表示。バッジ重複なし（SPEC §3）
//   - "avp":   「再生対象」チェックと削除ボタンを表示（SPEC §6）
// 表示差は localStorage 由来（AVP候補/再生対象/再生中ハイライト）と DB 由来（レベル/あとで見る）が
// 混在する。どちらの状態かは SPEC_NEXTJS.md §0 の永続境界を必ず参照すること。
// 値は3値で固定。第4値を足す前に AI_WORKFLOW.md §C で停止する（SPEC §6）。
export function VideoCard({
  video,
  likeCount,
  viewCount,
  lastViewed,
  invalidateKeys = [],
  displayContext = "tier1",
  avpPlayTarget,
  onAvpRemove,
}: {
  video: Video;
  likeCount: number;
  viewCount: number;
  lastViewed?: string | null;
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
  const settings = useCardSettings();

  const [cardVideoOverride, setCardVideoOverride] = useState<{
    source: Video;
    video: Video;
  } | null>(null);
  const cardVideo =
    cardVideoOverride?.source === video ? cardVideoOverride.video : video;

  const setLocalCardVideo = (next: Video | ((current: Video) => Video)) => {
    setCardVideoOverride((currentOverride) => {
      const current =
        currentOverride?.source === video ? currentOverride.video : video;
      const nextVideo = typeof next === "function" ? next(current) : next;
      return { source: video, video: nextVideo };
    });
  };

  const refreshCardVideo = async () => {
    const latest = await getVideo(id);
    setLocalCardVideo(latest);
  };

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
  const invalidateWatchLater = () => {
    qc.invalidateQueries({ queryKey: ["watch-later-videos"] });
  };
  const invalidateAfterCardWrite = () => {
    invalidate();
    invalidateWatchLater();
  };

  // 再生は共通フック（成功で再生中=単体をセット。invalidate も内包）。
  const playM = usePlayVideo(invalidateKeys);
  const isPlaying = useIsPlaying(id);
  const levelM = useMutation({
    mutationFn: (level: number) => setLevel(id, level === -1 ? null : level),
    onSuccess: async (_data, level) => {
      setLocalCardVideo((current) => {
        // セレクション動画にレベル(>=0)を付けたら選別完了（needs_selection=0, completed=1）。
        const isSel = current.needs_selection || current.is_selection_completed;
        return {
          ...current,
          current_favorite_level: level,
          needs_selection: isSel ? false : current.needs_selection,
          is_selection_completed: isSel ? true : current.is_selection_completed,
        };
      });
      await refreshCardVideo();
    },
    onSettled: invalidateAfterCardWrite,
  });
  const unselectM = useMutation({
    mutationFn: () => unselectVideo(id),
    onSuccess: async () => {
      setLocalCardVideo((current) => ({
        ...current,
        needs_selection: true,
        is_selection_completed: false,
      }));
      await refreshCardVideo();
    },
    onSettled: invalidateAfterCardWrite,
  });
  const likeM = useMutation({
    mutationFn: () => likeVideo(id),
    onSuccess: refreshCardVideo,
    onSettled: invalidateAfterCardWrite,
  });
  // あとで見るは /watch-later 以外のどの画面の表示集合も変えない（フィルタしない）ため、
  // 表示中リストの refetch は不要。共通 invalidate（list キー）を呼ばないことで、
  // Tier2/ランキングのスケルトン点滅や、ランダム/運命の再抽選を誘発しない。
  // 応答の新値でボタンを即時更新し、/watch-later のキャッシュだけは常に無効化する。
  const watchLaterM = useMutation({
    mutationFn: () => toggleWatchLater(id),
    onSuccess: (res) => {
      setLocalCardVideo((current) => ({
        ...current,
        watch_later: res.watch_later,
      }));
    },
    onSettled: invalidateWatchLater,
  });

  // セレクション動画（! 未選別 / + 完了）は displayContext に関わらず「未選別」を表示・選択肢に出す。
  // /avp 等 tier2 以外の画面でも選別状態を正しく扱う（Tier1 の通常動画は従来どおり 未判定/Lv0-4）。
  const displayLevel = cardVideo.current_favorite_level;
  const localNeedsSelection = cardVideo.needs_selection;
  const localWatchLater = cardVideo.watch_later;
  const isSelectionVideo = localNeedsSelection || cardVideo.is_selection_completed;
  const isUnselected = isSelectionVideo && (localNeedsSelection || displayLevel === -1);
  const levelDisplay = isUnselected ? "未選別" : levelName(displayLevel);

  const displayTitle =
    settings.card_title_max_length > 0
      ? cardVideo.essential_filename.slice(0, settings.card_title_max_length)
      : cardVideo.essential_filename;

  const busy = playM.isPending || levelM.isPending || unselectM.isPending || likeM.isPending || watchLaterM.isPending;
  // 利用不可動画は再生・判定を抑止（現行 Streamlit に準拠）。いいねは利用不可でも許可。
  const mutateDisabled = busy || !cardVideo.is_available;
  const error = playM.error || levelM.error || unselectM.error || likeM.error || watchLaterM.error;
  const isJudged = displayLevel !== -1;
  const isAvpSelected = avpCandidateIds.includes(id);
  const avpDisabled = !cardVideo.is_available;

  return (
    <Card
      className={`${cardVideo.is_available ? "" : "opacity-60"} ${
        isPlaying ? "border-2 border-amber-400 bg-amber-50" : ""
      }`}
    >
      <CardContent className="flex flex-col gap-1 py-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="line-clamp-2 break-all text-sm font-medium cursor-default" />
            }
          >
            {displayTitle}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm break-all">
            {pathBasename(cardVideo.current_full_path)}
          </TooltipContent>
        </Tooltip>

        {/* バッジ行: 先頭にAVP候補チェックボックス、続いて各バッジ */}
        <div className="flex flex-wrap items-center gap-1">
          {displayContext !== "avp" && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <label
                    className={`flex w-fit items-center gap-2 text-sm ${
                      avpDisabled ? "text-muted-foreground" : ""
                    }`}
                  />
                }
              >
                <Checkbox
                  checked={isAvpSelected}
                  disabled={avpDisabled}
                  onCheckedChange={() => toggleAvpCandidateId(id)}
                />
              </TooltipTrigger>
              <TooltipContent>AVPで再生する候補に追加</TooltipContent>
            </Tooltip>
          )}
          {isJudged && !isUnselected && (
            <TBadge
              tip={`お気に入りレベル: ${levelName(displayLevel)}`}
              style={{ backgroundColor: levelColor(displayLevel) }}
            >
              {levelName(displayLevel)}
            </TBadge>
          )}
          {settings.card_show_storage && (
            <TBadge
              tip={`ストレージ: ${storageLabel(cardVideo.storage_location)}`}
              variant="secondary"
            >
              {storageLabel(cardVideo.storage_location)}
            </TBadge>
          )}
          <TBadge tip={`視聴回数: ${viewCount}回`} variant="outline">
            視聴 {viewCount}
          </TBadge>
          {settings.card_show_file_size && cardVideo.file_size != null && (
            <TBadge
              tip={`ファイルサイズ: ${formatFileSize(cardVideo.file_size)}`}
              variant="outline"
            >
              {formatFileSize(cardVideo.file_size)}
            </TBadge>
          )}
          {settings.card_show_last_viewed && lastViewed && (
            <TBadge tip={`最終再生日: ${formatDate(lastViewed)}`} variant="outline">
              {formatDate(lastViewed)}
            </TBadge>
          )}
          {settings.card_show_file_modified && cardVideo.last_file_modified && (
            <TBadge
              tip={`ファイル更新日: ${formatDate(cardVideo.last_file_modified)}`}
              variant="outline"
            >
              {formatDate(cardVideo.last_file_modified)}
            </TBadge>
          )}
          {!cardVideo.is_available && (
            <TBadge
              tip="ファイルが見つからない、または利用できない動画"
              variant="destructive"
            >
              利用不可
            </TBadge>
          )}
        </div>

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
            value={isUnselected ? "unselect" : String(displayLevel)}
            onValueChange={(v) => {
              if (v === "unselect") unselectM.mutate();
              else levelM.mutate(Number(v));
            }}
            disabled={mutateDisabled}
          >
            <SelectTrigger className="w-28" size="sm">
              <span>{levelDisplay}</span>
            </SelectTrigger>
            <SelectContent>
              {isSelectionVideo ? (
                <>
                  <SelectItem value="unselect">未選別</SelectItem>
                  {[0, 1, 2, 3, 4].map((l) => (
                    <SelectItem key={l} value={String(l)}>
                      {levelName(l)}
                    </SelectItem>
                  ))}
                </>
              ) : (
                LEVEL_OPTIONS.map((l) => (
                  <SelectItem key={l} value={String(l)}>
                    {levelName(l)}
                  </SelectItem>
                ))
              )}
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
            variant={localWatchLater ? "default" : "outline"}
            disabled={busy}
            onClick={() => watchLaterM.mutate()}
            title={localWatchLater ? "あとで見るを解除" : "あとで見るに追加"}
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
