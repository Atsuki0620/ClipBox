// 統合 Variant K カードの共通操作行（1段アイコン）。
// 【役割】カード優先画面（Tier1/Tier2/あとで見る/AVP）で共有する横1段の操作行。
//   再生（アイコンのみ）／いいね（♡＋数）／あとで見る（栞アイコン）／AVP候補（MonitorPlay＝AVP メニューと同一アイコン）を並べる。
// 【設計制約】
//   - 表示と委譲のみ（実 API/DB/localStorage に触れない）。状態・ハンドラは呼び出し側が渡す。
//   - ハンドラ未指定のボタンは描画しない（画面差分＝出すボタンの違いだけ）。
//   - あとで見る（DB相当）と AVP候補（localStorage相当）は別操作。互いに解除しない。
//   - 利用不可（unavailable）では 再生・AVP候補 を disabled。主要操作の title は disabled 理由／非自明トグルのみ残す。
//   - 再生・あとで見る・AVP はアイコンのみ（テキストを出さない）。いいねは数値を併記。
// 【依存関係】lucide-react（Play/Heart/Bookmark/BookmarkX/MonitorPlay）, lib/utils（cn）。
"use client";

import type { ReactNode } from "react";
import { Play, Heart, Bookmark, BookmarkX, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";

// 通常＝各ボタンが等幅で1段を埋める（flex-1）。compact＝自然幅で詰める（ワイドカードの横一列用）。
const cellFill =
  "inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-1 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40";
const cellCompact =
  "inline-flex h-7 items-center justify-center gap-1 rounded-md border px-2.5 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40";
const neutral = "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground";

export function VariantKCardActions({
  unavailable = false,
  playing = false,
  onPlay,
  liked,
  likeCount,
  onToggleLike,
  watchLater,
  onToggleWatchLater,
  watchLaterVariant = "toggle",
  avpCandidate,
  onToggleAvpCandidate,
  // compact=自然幅・左詰め（横一列のワイドカード用）。既定は等幅で1段を埋める。
  compact = false,
  extra,
  className,
}: {
  unavailable?: boolean;
  playing?: boolean;
  onPlay?: () => void;
  liked?: boolean;
  likeCount?: number;
  onToggleLike?: () => void;
  watchLater?: boolean;
  onToggleWatchLater?: () => void;
  // "toggle"=追加/解除（Tier1/Tier2）, "remove"=解除専用（あとで見る画面）
  watchLaterVariant?: "toggle" | "remove";
  avpCandidate?: boolean;
  onToggleAvpCandidate?: () => void;
  compact?: boolean;
  extra?: ReactNode;
  className?: string;
}) {
  const cell = compact ? cellCompact : cellFill;
  return (
    <div className={cn("flex items-center gap-1", compact ? "w-auto" : "w-full items-stretch", className)}>
      {onPlay ? (
        <button
          type="button"
          onClick={onPlay}
          disabled={unavailable}
          aria-pressed={playing}
          aria-label="再生"
          title={unavailable ? "利用不可は再生できません" : playing ? "再生中（モック）" : undefined}
          className={cn(
            cell,
            playing
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          <Play className="size-3.5" />
        </button>
      ) : null}

      {onToggleLike ? (
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={liked}
          title={liked ? "いいねを解除" : "いいねに追加"}
          className={cn(cell, liked ? "border-rose-300 bg-rose-50 text-rose-600" : neutral)}
        >
          <Heart className={cn("size-3.5", liked && "fill-current")} />
          <span className="tabular-nums">{likeCount}</span>
        </button>
      ) : null}

      {onToggleWatchLater ? (
        watchLaterVariant === "remove" ? (
          <button
            type="button"
            onClick={onToggleWatchLater}
            aria-label="あとで見るから外す"
            title="あとで見るから外す"
            className={cn(cell, "border-primary/40 bg-card text-primary hover:bg-primary hover:text-primary-foreground")}
          >
            <BookmarkX className="size-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleWatchLater}
            aria-pressed={watchLater}
            aria-label={watchLater ? "あとで見るから外す" : "あとで見るに追加"}
            title={watchLater ? "あとで見るから外す" : "あとで見るに追加"}
            className={cn(cell, watchLater ? "border-primary bg-primary text-primary-foreground" : neutral)}
          >
            <Bookmark className={cn("size-3.5", watchLater && "fill-current")} />
          </button>
        )
      ) : null}

      {onToggleAvpCandidate ? (
        <button
          type="button"
          onClick={onToggleAvpCandidate}
          disabled={unavailable}
          aria-pressed={avpCandidate}
          aria-label={avpCandidate ? "AVP候補から外す" : "AVP候補に追加"}
          title={
            unavailable
              ? "利用不可は AVP候補に追加できません"
              : avpCandidate
                ? "AVP候補から外す（あとで見るとは別）"
                : "AVP候補に追加（あとで見るとは別）"
          }
          className={cn(cell, avpCandidate ? "border-indigo-300 bg-indigo-50 text-indigo-700" : neutral)}
        >
          <MonitorPlay className="size-3.5" />
        </button>
      ) : null}

      {extra}
    </div>
  );
}
