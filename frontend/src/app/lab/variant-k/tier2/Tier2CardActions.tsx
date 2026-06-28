// 統合 Variant K Tier2 カードの操作行。
// 【役割】カード下部に選別状態（未選別/Lv0..4）と操作（再生/いいね/あとで見る/AVP候補に追加）を並べる。
// 【設計制約】
//   - すべて見た目だけのモック（実 API/DB/localStorage に触れない）。
//   - AVP候補は状態バッジを出さず、ボタンの見た目（未追加/追加済み）で表す。あとで見るとは別状態。
//   - 利用不可では 再生 と AVP候補追加 を disabled にする。
// 【依存関係】lucide-react, lib/utils（cn）, shadcn button, ./Tier2LevelButtons, ./useTier2MockCardState。

"use client";

import { Bookmark, Check, Heart, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tier2LevelButtons } from "./Tier2LevelButtons";
import type { Tier2MockCardState } from "./useTier2MockCardState";

const toggleBtn =
  "inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-md border px-1 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40";

export function Tier2CardActions({
  state,
  unavailable,
  onPlay,
}: {
  state: Tier2MockCardState;
  unavailable: boolean;
  onPlay?: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">選別</span>
        <Tier2LevelButtons
          value={state.selection}
          onChange={state.setSelection}
          disabled={unavailable}
          className="flex-1"
        />
      </div>

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
          onClick={state.toggleWatchLater}
          aria-pressed={state.watchLater}
          title={state.watchLater ? "あとで見るから外す" : "あとで見るに追加"}
          className={cn(
            toggleBtn,
            state.watchLater
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Bookmark className="size-3.5" />
          あとで見る
        </button>
      </div>

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
          "inline-flex h-7 items-center justify-center gap-1 rounded-md border px-2 text-[11px] transition-colors disabled:opacity-40",
          state.avpCandidate
            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
            : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        {state.avpCandidate ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
        {state.avpCandidate ? "AVP候補に追加済み" : "AVP候補に追加"}
      </button>
    </div>
  );
}
