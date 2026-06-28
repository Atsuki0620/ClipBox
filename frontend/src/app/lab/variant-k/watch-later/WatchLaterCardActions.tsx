// 統合 Variant K あとで見る カードの操作行。
// 【役割】カード下部に 再生 / いいね / あとで見る解除 / AVP候補に追加 / 該当Tierへ戻る導線 を並べる。
//   VariantKVideoCard の actions スロットに差し込む。
// 【設計制約】
//   - すべて見た目だけのモック（実 API/DB/localStorage に触れない）。
//   - あとで見る解除はこの画面の主操作。AVP候補追加は別状態で、あとで見るを解除しない。
//   - 利用不可では 再生 と AVP候補追加 を disabled にする。
//   - 戻り導線は見た目のみ（該当 Tier 画面へのリンク）。
// 【依存関係】next/link, lucide-react, lib/utils（cn）, shadcn button, ./useWatchLaterMockState, ./shared。

"use client";

import Link from "next/link";
import { Play, Heart, BookmarkX, Plus, Check, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { WatchLaterMockCardState } from "./useWatchLaterMockState";
import { isTier2Target } from "./shared";
import type { VariantKVideo } from "../_data/variantKMock";

const toggleBtn =
  "inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-md border px-1 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40";

export function WatchLaterCardActions({
  video,
  state,
  unavailable,
  onPlay,
}: {
  video: VariantKVideo;
  state: WatchLaterMockCardState;
  unavailable: boolean;
  onPlay?: () => void;
}) {
  const backHref = isTier2Target(video) ? "/lab/variant-k/tier2" : "/lab/variant-k/tier1";
  const backLabel = isTier2Target(video) ? "Tier2 へ" : "Tier1 へ";

  return (
    <div className="flex w-full flex-col gap-1.5">
      {/* 操作（再生 / いいね / あとで見る解除） */}
      <div className="flex items-stretch gap-1">
        <Button size="sm" className="h-7 flex-[1.6] px-1" disabled={unavailable} onClick={onPlay}>
          <Play className="size-3.5" />
          再生
        </Button>
        <button
          type="button"
          onClick={state.toggleLike}
          aria-pressed={state.liked}
          title={state.liked ? "いいねを解除" : "いいねに追加"}
          className={cn(
            toggleBtn,
            state.liked
              ? "border-rose-300 bg-rose-50 text-rose-600"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Heart className={cn("size-3.5", state.liked && "fill-current")} />
          <span className="tabular-nums">{state.likeCount}</span>
        </button>
        <button
          type="button"
          onClick={state.removeWatchLater}
          title="あとで見るから外す"
          className={cn(
            toggleBtn,
            "border-primary/40 bg-card text-primary hover:bg-primary hover:text-primary-foreground",
          )}
        >
          <BookmarkX className="size-3.5" />
          解除
        </button>
      </div>

      {/* AVP候補に追加（別状態・あとで見るを解除しない）＋ 該当Tierへ戻る導線（見た目のみ） */}
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={state.toggleAvpCandidate}
          disabled={unavailable}
          aria-pressed={state.avpCandidate}
          title={
            state.avpCandidate
              ? "AVP候補から外す（あとで見るとは別）"
              : "AVPで並列再生する候補に追加（あとで見るとは別）"
          }
          className={cn(
            toggleBtn,
            "flex-[1.6]",
            state.avpCandidate
              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {state.avpCandidate ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
          {state.avpCandidate ? "AVP候補済み" : "AVP候補に追加"}
        </button>
        <Link
          href={backHref}
          title={`${backLabel}（判定/選別をやり直す）`}
          className={cn(
            toggleBtn,
            "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <ArrowUpRight className="size-3.5" />
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
