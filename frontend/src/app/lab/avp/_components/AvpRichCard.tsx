// UIラボ「AVP画面」案D 専用: 本体 VideoCard（displayContext="avp"）の見た目・操作を複製したモックカード。
// 【役割】案D 下部の「再生セット（最大4本）」で使う、カード内でレベル判定・いいね・あとで見る・再生が
//   できる動画カード。本体 VideoCard と同じ shadcn プリミティブ（Card/Badge/Button/Select/Checkbox/Tooltip）
//   を read-only 再利用し、見た目を一致させる。
// 【設計制約】mutation を一切呼ばない（@/lib/api / @tanstack/react-query / useAvpStore / usePlayVideo を import しない）。
//   操作はすべて props のコールバックで親（variant-d ページ）の useState を更新するだけ＝実 DB/API/localStorage
//   非接続・保存しない。サムネ不使用（<img> 不使用）。色は包む側の THEME を継承。
//   「再生対象」はこのカードが再生セットに入っている＝常に checked、外すと再生対象から外れる（候補には残る）。
// 【依存関係】react, lucide, @/components/ui/*, @/lib/levels, _data/avpMock。
"use client";

import { Bookmark, Heart, Play, X } from "lucide-react";
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
import { levelColor, levelName, LEVEL_OPTIONS, storageLabel } from "@/lib/levels";
import { type AvpVideo, formatLastViewed } from "../_data/avpMock";

export function AvpRichCard({
  video,
  index,
  onSetLevel,
  onToggleLike,
  onToggleWatchLater,
  onPlay,
  onRemoveTarget,
}: {
  video: AvpVideo;
  index: number; // 再生セット内のスロット番号（1始まりで表示）
  onSetLevel: (level: number) => void;
  onToggleLike: () => void;
  onToggleWatchLater: () => void;
  onPlay: () => void;
  onRemoveTarget: () => void;
}) {
  const level = video.current_favorite_level;
  const isJudged = level !== -1;
  const unavailable = !video.is_available;
  // 利用不可は再生・判定を抑止（本体 VideoCard 準拠）。いいねは利用不可でも許可。
  const mutateDisabled = unavailable;

  return (
    <Card
      className={`${unavailable ? "opacity-60" : ""} ${
        video.avp_playing ? "border-2 border-amber-400 bg-amber-50" : ""
      }`}
    >
      <CardContent className="flex flex-col gap-1 py-1">
        {/* スロット番号＋タイトル（2行まで） */}
        <div className="flex items-start gap-1.5">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums">
            {index + 1}
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="line-clamp-2 break-all text-sm font-medium cursor-default" />
              }
            >
              {video.essential_filename}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm break-all">
              {video.essential_filename}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* バッジ行（レベル色・ストレージ・視聴・最終再生・あとで見る・利用不可・再生中） */}
        <div className="flex flex-wrap items-center gap-1">
          {isJudged && (
            <Badge style={{ backgroundColor: levelColor(level) }}>{levelName(level)}</Badge>
          )}
          <Badge variant="secondary">{storageLabel(video.storage_location)}</Badge>
          <Badge variant="outline">視聴 {video.view_count}</Badge>
          {video.last_viewed && (
            <Badge variant="outline">{formatLastViewed(video.last_viewed)}</Badge>
          )}
          {video.watch_later && (
            <Badge variant="outline" className="gap-0.5">
              <Bookmark className="size-3" />
              あとで見る
            </Badge>
          )}
          {video.avp_playing && (
            <Badge className="bg-amber-400/20 text-amber-700">再生中</Badge>
          )}
          {unavailable && <Badge variant="destructive">利用不可</Badge>}
        </div>

        {/* 操作行（再生 / レベル / いいね / あとで見る / 再生対象=外す） */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="default" disabled={mutateDisabled} onClick={onPlay}>
            <Play className="size-4" />
            再生
          </Button>

          <Select
            value={String(level)}
            onValueChange={(v) => onSetLevel(Number(v))}
            disabled={mutateDisabled}
          >
            <SelectTrigger className="w-28" size="sm">
              <span>{levelName(level)}</span>
            </SelectTrigger>
            <SelectContent>
              {LEVEL_OPTIONS.map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {levelName(l)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" onClick={onToggleLike}>
            <Heart className="size-4" />
            {video.like_count}
          </Button>

          <Button
            size="sm"
            variant={video.watch_later ? "default" : "outline"}
            onClick={onToggleWatchLater}
            title={video.watch_later ? "あとで見るを解除" : "あとで見るに追加"}
          >
            <Bookmark className="size-4" />
          </Button>

          <label className="flex w-fit items-center gap-2 text-sm">
            <Checkbox checked onCheckedChange={onRemoveTarget} />
            <span>再生対象</span>
          </label>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemoveTarget}
            title="再生対象から外す"
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
