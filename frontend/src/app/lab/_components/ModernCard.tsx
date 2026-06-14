// UIラボ Modern 共通: 高密度・横長寄り（縦に詰めた短い）情報カード。G/H で使用。
// 【役割】タイトル主役（2行＋…省略）→ メタを詰める → D流の3グループ操作（レベル数値ボタン / 再生 / その他）。
//   判定済みは薄く、利用不可はグレーアウト。レベルは数値ボタンのみ（バッジ/濃淡ドットなし）。
// 【設計制約】API/DB/localStorage に触れない（useMockCard のローカル状態のみ）。サムネ無し。色はトークン継承。
// 【依存関係】shadcn UI（Card/Button/Checkbox）, lucide, lib/levels(storageLabel), lib/utils(cn),
//   _data/labMock（型/フォーマッタ）, useMockCard, LevelButtons。

"use client";

import { Play, Heart, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { storageLabel } from "@/lib/levels";
import { formatFileSize, formatDate, type LabVideo } from "../_data/labMock";
import { useMockCard } from "./useMockCard";
import { LevelButtons } from "./LevelButtons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function ModernCard({ video }: { video: LabVideo }) {
  const card = useMockCard(video);
  const unavailable = !video.is_available;
  const judged = card.level !== -1; // 判定済みは薄く（未判定の色付けはしない）

  return (
    <Card
      className={cn(
        "gap-0 py-0 transition-all hover:-translate-y-0.5 hover:shadow-sm",
        unavailable ? "opacity-50" : judged && "opacity-70",
      )}
    >
      <CardContent className="flex flex-col gap-1.5 p-2.5">
        {/* タイトル主役（2行＋…省略・小さめ） */}
        <div
          className="line-clamp-2 min-h-[2.4em] text-xs leading-snug font-semibold break-all"
          title={video.essential_filename}
        >
          {video.essential_filename}
        </div>

        {/* メタ（詰める・小） */}
        <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground tabular-nums">
          <span>{storageLabel(video.storage_location)}</span>
          <span className="opacity-40">·</span>
          <span>視聴 {video.view_count}</span>
          <span className="opacity-40">·</span>
          <span>{formatFileSize(video.file_size)}</span>
          {unavailable && <span className="text-destructive">利用不可</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground tabular-nums">
          <span>再生 {formatDate(video.last_viewed)}</span>
          <span className="opacity-40">·</span>
          <span>更新 {formatDate(video.last_file_modified)}</span>
        </div>

        {/* 操作1: レベル（数値ボタンのみ＝単一表現） */}
        <LevelButtons
          value={card.level}
          onChange={card.setLevel}
          disabled={unavailable}
          className="mt-0.5 w-full"
        />

        {/* 操作2: 再生（主操作） */}
        <Button size="sm" className="h-7 w-full" disabled={unavailable}>
          <Play className="size-3.5" />
          再生
        </Button>

        {/* 操作3: その他（いいね / あとで見る / AVP候補） */}
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 flex-1 px-1.5 text-[11px]" onClick={card.like}>
            <Heart className="size-3.5" />
            <span className="tabular-nums">{card.likeCount}</span>
          </Button>
          <Button
            size="icon-sm"
            variant={card.watchLater ? "default" : "outline"}
            onClick={card.toggleWatchLater}
            title="あとで見る"
          >
            <Bookmark className="size-3.5" />
          </Button>
          <label
            className="flex h-7 items-center gap-1 rounded-md border px-1.5 text-[11px]"
            title="AVPで再生する候補に追加"
          >
            <Checkbox checked={card.avp} onCheckedChange={card.toggleAvp} disabled={unavailable} />
            AVP
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
