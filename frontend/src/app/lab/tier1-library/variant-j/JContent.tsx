// UIラボ Variant J: ライブラリ本体（カード / テーブルの2表示モード）。
// 【役割】viewMode に応じて 高密度カードグリッド（5列・縦に詰めた短いカード）または I 相当のテーブルを表示。
//   判定済み/利用不可は薄く（判定済みは dimJudged トグル連動・利用不可は常時）。あとで/AVP は同サイズ・あとで=「あとで」ラベル。
// 【設計制約】API/DB/localStorage に触れない（useMockCard のローカル状態のみ）。サムネ無し。色はトークン継承。
// 【依存関係】shadcn(Button/Checkbox/Popover), lucide, lib/levels(storageLabel), lib/utils(cn),
//   _data/labMock(型/フォーマッタ), ../../_components(useMockCard/LevelButtons), ./shared（ViewMode）。

"use client";

import { useState } from "react";
import { Play, Heart, Bookmark, Check, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { storageLabel } from "@/lib/levels";
import { formatFileSize, formatDate, type LabVideo } from "../../_data/labMock";
import { useMockCard } from "../../_components/useMockCard";
import { LevelButtons } from "../../_components/LevelButtons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ViewMode } from "./shared";

function dimClass(unavailable: boolean, judged: boolean, dimJudged: boolean): string | false {
  return (unavailable || (judged && dimJudged)) && "opacity-45";
}

// あとで / AVP の共通スタイル（同サイズ＝flex-1 で等幅）。
const toggleBtn =
  "inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-md border px-1 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40";

function JCard({ video, dimJudged }: { video: LabVideo; dimJudged: boolean }) {
  const card = useMockCard(video);
  const unavailable = !video.is_available;
  const judged = card.level !== -1;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border bg-card p-2 transition-all hover:-translate-y-0.5 hover:shadow-sm",
        dimClass(unavailable, judged, dimJudged),
      )}
    >
      {/* タイトル（2行まで・短い） */}
      <div
        className="line-clamp-2 text-xs leading-snug font-semibold break-all"
        title={video.essential_filename}
      >
        {video.essential_filename}
      </div>

      {/* メタ（1行に詰める） */}
      <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground tabular-nums">
        <span>{storageLabel(video.storage_location)}</span>
        <span className="opacity-40">·</span>
        <span>視聴 {video.view_count}</span>
        <span className="opacity-40">·</span>
        <span>{formatFileSize(video.file_size)}</span>
        <span className="opacity-40">·</span>
        <span>{formatDate(video.last_viewed)}</span>
        {unavailable && <span className="text-destructive">利用不可</span>}
      </div>

      {/* レベル（数値ボタンの単一表現） */}
      <LevelButtons value={card.level} onChange={card.setLevel} disabled={unavailable} className="w-full" />

      {/* 操作（1行：再生 / ♡ / あとで / AVP。あとでとAVPは等幅） */}
      <div className="flex items-stretch gap-1">
        <Button size="sm" className="h-7 flex-[1.6] px-1" disabled={unavailable}>
          <Play className="size-3.5" />
          再生
        </Button>
        <button type="button" onClick={card.like} className={toggleBtn} title="いいね">
          <Heart className="size-3.5" />
          <span className="tabular-nums">{card.likeCount}</span>
        </button>
        <button
          type="button"
          onClick={card.toggleWatchLater}
          title="あとで見る"
          className={cn(
            toggleBtn,
            card.watchLater
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Bookmark className="size-3.5" />
          あとで
        </button>
        <button
          type="button"
          onClick={card.toggleAvp}
          disabled={unavailable}
          title="AVPで再生する候補に追加"
          className={cn(
            toggleBtn,
            card.avp
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {card.avp ? <Check className="size-3.5" /> : <span className="size-3.5 rounded-[3px] border" />}
          AVP
        </button>
      </div>
    </div>
  );
}

function JTableRow({ video, dimJudged }: { video: LabVideo; dimJudged: boolean }) {
  const card = useMockCard(video);
  const [selected, setSelected] = useState(false);
  const unavailable = !video.is_available;
  const judged = card.level !== -1;

  return (
    <tr
      className={cn(
        "[&>td]:px-2 [&>td]:py-1.5 hover:bg-muted/40",
        selected && "bg-primary/5",
        dimClass(unavailable, judged, dimJudged),
      )}
    >
      <td>
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => setSelected(Boolean(v))}
          aria-label="行を選択"
        />
      </td>
      <td>
        <div className="line-clamp-2 max-w-[18rem] break-all font-medium" title={video.essential_filename}>
          {video.essential_filename}
        </div>
        {unavailable && <span className="text-[10px] text-destructive">利用不可</span>}
      </td>
      <td>{storageLabel(video.storage_location)}</td>
      <td className="text-right tabular-nums">{video.view_count}</td>
      <td className="text-right tabular-nums">{formatFileSize(video.file_size)}</td>
      <td className="tabular-nums">{formatDate(video.last_viewed)}</td>
      <td className="tabular-nums">{formatDate(video.last_file_modified)}</td>
      <td>
        <LevelButtons value={card.level} onChange={card.setLevel} disabled={unavailable} size="xs" className="w-[9rem]" />
      </td>
      <td>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" disabled={unavailable} title="再生">
            <Play className="size-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-1.5" onClick={card.like} title="いいね">
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
          <label className="flex items-center" title="AVPで再生する候補に追加">
            <Checkbox checked={card.avp} onCheckedChange={card.toggleAvp} disabled={unavailable} aria-label="AVP候補" />
          </label>
          <Popover>
            <PopoverTrigger
              className="inline-flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted"
              title="その他"
            >
              <MoreHorizontal className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-36 gap-0.5 p-1">
              <MenuItem>詳細を開く</MenuItem>
              <MenuItem>パスをコピー</MenuItem>
              <MenuItem>選別へ送る</MenuItem>
            </PopoverContent>
          </Popover>
        </div>
      </td>
    </tr>
  );
}

function MenuItem({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" className="w-full rounded px-2 py-1.5 text-left text-[12px] hover:bg-muted">
      {children}
    </button>
  );
}

export function JContent({
  videos,
  viewMode,
  dimJudged,
}: {
  videos: LabVideo[];
  viewMode: ViewMode;
  dimJudged: boolean;
}) {
  if (videos.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        条件に一致する動画がありません。フィルタを見直してください。
      </div>
    );
  }

  if (viewMode === "table") {
    return (
      <div className="flex flex-col gap-2">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-10 bg-muted/70 text-muted-foreground backdrop-blur">
              <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-medium">
                <th className="w-8">
                  <Checkbox aria-label="全選択" />
                </th>
                <th>タイトル</th>
                <th className="w-12">保存先</th>
                <th className="w-12 text-right">視聴</th>
                <th className="w-16 text-right">サイズ</th>
                <th className="w-20">最終再生</th>
                <th className="w-20">更新</th>
                <th className="w-[9.5rem]">レベル</th>
                <th className="w-[9rem]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {videos.map((video) => (
                <JTableRow key={video.id} video={video} dimJudged={dimJudged} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
          <span>全 {videos.length} 件</span>
          <div className="flex items-center gap-3">
            <span>1ページあたり 50 件</span>
            <div className="flex items-center gap-1">
              <Button size="icon-sm" variant="outline" disabled>
                ‹
              </Button>
              <span className="tabular-nums">1 / 1</span>
              <Button size="icon-sm" variant="outline" disabled>
                ›
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {videos.map((video) => (
        <JCard key={video.id} video={video} dimJudged={dimJudged} />
      ))}
    </div>
  );
}
