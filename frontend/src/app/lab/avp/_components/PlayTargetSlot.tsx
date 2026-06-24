// UIラボ「AVP画面」共通: 再生対象の「4枠」スロット（埋まり/空き）。
// 【役割】「今回 AVP で再生する最大4本」を枠として見せる。埋まった枠は動画の要約＋外すボタン、
//   空き枠は点線プレースホルダ。案A（右カラム）・案B（上部コックピット）・案C（再生対象タブ）で共有する。
// 【設計制約】API/DB/localStorage に触れない（親の選択状態を表示するだけ）。サムネ不使用（<img> 不使用）。
//   再生対象は候補の部分集合・最大4本という前提を崩さない。色は包む側の THEME を継承。
// 【依存関係】lucide, lib/levels(levelColor), lib/utils(cn), _data/avpMock。

"use client";

import { X, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { levelColor } from "@/lib/levels";
import { type AvpVideo, statusLabel, storageLabel } from "../_data/avpMock";

// 埋まった枠（再生対象の1本）。
export function FilledSlot({
  index,
  video,
  onRemove,
}: {
  index: number;
  video: AvpVideo;
  onRemove: () => void;
}) {
  const judged = video.current_favorite_level !== -1;
  return (
    <div
      className={cn(
        "relative flex min-h-[5.5rem] flex-col gap-1 rounded-lg border border-primary/50 bg-primary/5 p-2.5",
        video.avp_playing && "border-amber-400 bg-amber-50",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums">
          {index + 1}
        </span>
        <span className="rounded border bg-card px-1.5 py-0.5 font-medium">{statusLabel(video)}</span>
        <button
          type="button"
          onClick={onRemove}
          title="再生対象から外す"
          className="ml-auto inline-flex size-5 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div
        className="line-clamp-2 break-all text-[12px] leading-snug font-semibold"
        title={video.essential_filename}
      >
        {video.essential_filename}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-1 text-[10px]">
        {judged && (
          <span
            className="rounded px-1.5 py-0.5 font-medium text-white"
            style={{ backgroundColor: levelColor(video.current_favorite_level) }}
          >
            Lv{video.current_favorite_level}
          </span>
        )}
        <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">
          {storageLabel(video.storage_location)}
        </span>
        {video.avp_playing && (
          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-medium text-amber-700">再生中</span>
        )}
      </div>
    </div>
  );
}

// 空き枠（再生対象に未選択）。
export function EmptySlot({ index }: { index: number }) {
  return (
    <div className="flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/30 p-2.5 text-center text-muted-foreground">
      <MonitorPlay className="size-4 opacity-50" />
      <span className="text-[11px]">
        枠 {index + 1} ・ 空き
      </span>
      <span className="text-[10px] leading-tight opacity-80">候補から選択</span>
    </div>
  );
}
