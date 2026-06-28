// 統合 Variant K Tier1 カードの操作行。
// 【役割】カード下部に判定レベル（Lv0..4）と操作（再生/いいね/あとで見る/AVP候補に追加）を並べる。
//   VariantKVideoCard の actions スロットに差し込む。
// 【設計制約】
//   - すべて見た目だけのモック（実 API/DB/localStorage に触れない）。
//   - セレクション操作は出さない（Tier1）。未判定へ戻す操作も段階3では出さない。
//   - AVP候補は状態バッジを出さず、ボタンの見た目（未追加/追加済み）で表す。あとで見るとは別状態。
//   - 利用不可では 再生 と AVP候補追加 を disabled にする。
// 【依存関係】lucide-react, lib/utils（cn）, shadcn button, ./Tier1LevelButtons, ./useTier1MockCardState。

"use client";

import { Play, Heart, Bookmark, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tier1LevelButtons } from "./Tier1LevelButtons";
import type { Tier1MockCardState } from "./useTier1MockCardState";

const toggleBtn =
  "inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-md border px-1 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40";

export function Tier1CardActions({
  state,
  unavailable,
  onPlay,
}: {
  state: Tier1MockCardState;
  unavailable: boolean;
  onPlay?: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {/* 判定（Lv0..4・現在レベルを強調） */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">判定</span>
        <Tier1LevelButtons
          value={state.level}
          onChange={state.setLevel}
          disabled={unavailable}
          className="flex-1"
        />
      </div>

      {/* 操作（再生 / いいね / あとで見る） */}
      <div className="flex items-stretch gap-1">
        <Button size="sm" className="h-7 flex-[1.6] px-1" disabled={unavailable} onClick={onPlay}>
          <Play className="size-3.5" />
          再生
        </Button>
        <button
          type="button"
          onClick={state.toggleLike}
          title="いいね"
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
          title="あとで見る"
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

      {/* AVP候補に追加（バッジは出さずボタンの見た目で表す。あとで見るとは別状態） */}
      <button
        type="button"
        onClick={state.toggleAvpCandidate}
        disabled={unavailable}
        title="AVPで並列再生する候補に追加（あとで見るとは別）"
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
