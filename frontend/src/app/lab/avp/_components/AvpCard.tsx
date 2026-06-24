// UIラボ「AVP画面」共通カード（サムネなし情報カード）。
// 【役割】3案（A/B/C）で共有する候補1枚のカード。状態キャプション → タイトル → メタ/バッジ →
//   操作（再生対象トグル / 候補から外す）。再生対象の選択は親（variant ページ）が4本上限で一元管理する。
// 【設計制約】API/DB/localStorage に触れない（選択状態は親の useState のみ）。サムネ/画像枠を作らない（<img> 不使用）。
//   AVP候補=localStorage / あとで見る=DB の境界は文言・操作で混同しない。色は包む側の THEME を継承。
//   候補と再生対象を別概念として見せる（再生対象は候補の部分集合・最大4本）。
// 【依存関係】lucide, lib/levels(levelColor), lib/utils(cn), _data/avpMock。

"use client";

import { X, Bookmark, MonitorPlay, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { levelColor } from "@/lib/levels";
import { type AvpVideo, statusLabel, formatLastViewed, storageLabel } from "../_data/avpMock";

export function AvpCard({
  video,
  playTarget,
  targetDisabled = false,
  onToggleTarget,
  onRemove,
  playing = false,
  compact = false,
}: {
  video: AvpVideo;
  playTarget: boolean;
  targetDisabled?: boolean;
  onToggleTarget: () => void;
  onRemove?: () => void;
  playing?: boolean;
  compact?: boolean;
}) {
  const unavailable = !video.is_available;
  const judged = video.current_favorite_level !== -1;
  // 追加できない理由（利用不可 / 4本満杯）をツールチップで示す。
  const disabledReason = unavailable
    ? "利用不可の動画は再生対象に選べません"
    : "再生対象は最大4本です（先に他を外してください）";

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1.5 rounded-lg border bg-card p-2.5 transition-all",
        compact ? "p-2" : "hover:-translate-y-0.5 hover:shadow-sm",
        unavailable && "opacity-60",
        playTarget && "border-primary/50 ring-1 ring-primary/30",
        playing && "border-amber-400 bg-amber-50",
      )}
    >
      {/* 状態キャプション（Tier1/Tier2 + 状態 ＋ 最終再生 ＋ 再生中/利用不可） */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded border px-1.5 py-0.5 font-medium text-foreground">
          {statusLabel(video)}
        </span>
        {!compact && (
          <span className="text-muted-foreground tabular-nums">
            最終再生 {formatLastViewed(video.last_viewed)}
          </span>
        )}
        {playing && (
          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-medium text-amber-700">
            再生中
          </span>
        )}
        {unavailable && (
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
            利用不可
          </span>
        )}
      </div>

      {/* タイトル（2行まで） */}
      <div
        className="line-clamp-2 break-all text-[13px] leading-snug font-semibold"
        title={video.essential_filename}
      >
        {video.essential_filename}
      </div>

      {/* メタ/バッジ（レベル色・ストレージ・視聴・あとで見る） */}
      <div className="flex flex-wrap items-center gap-1 text-[11px]">
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
        <span className="rounded border px-1.5 py-0.5 text-muted-foreground tabular-nums">
          視聴 {video.view_count}
        </span>
        {video.watch_later && (
          <span
            className="inline-flex items-center gap-0.5 rounded border border-foreground/15 bg-muted px-1.5 py-0.5 text-muted-foreground"
            title="あとで見る（DB）。AVP候補（localStorage）とは別概念"
          >
            <Bookmark className="size-3" />
            あとで見る
          </span>
        )}
      </div>

      {/* 操作（再生対象トグル / 候補から外す）。候補と再生対象を別操作として置く */}
      <div className="mt-0.5 flex items-stretch gap-1">
        <button
          type="button"
          onClick={onToggleTarget}
          disabled={!playTarget && targetDisabled}
          title={!playTarget && targetDisabled ? disabledReason : "今回の AVP 再生対象に入れる/外す"}
          aria-pressed={playTarget}
          className={cn(
            "inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            playTarget
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {playTarget ? <Check className="size-3.5" /> : <MonitorPlay className="size-3.5" />}
          {playTarget ? "再生対象" : "再生対象に追加"}
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="候補から外す"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
