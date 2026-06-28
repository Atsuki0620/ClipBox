// 統合 Variant K テーブル行の操作セル（ランキング/検索が共有）。
// 【役割】操作付きテーブルの「操作」列に並べる 再生 / いいね / あとで見る / AVP候補 のアイコンボタン群。
// 【設計制約】
//   - 表示と委譲のみ（実 API/DB/localStorage に触れない）。状態は呼び出し側の controller（ページ内メモリ）。
//   - 利用不可（unavailable）では 再生 と AVP候補追加 を disabled にする（いいね/あとで見るは可）。
//   - あとで見る（DB相当）と AVP候補（localStorage相当）は別操作。混同しない・互いに解除しない。
//   - aria-pressed ＋ 状態依存 title でトグル状態を明示。テーブルにはバッジを置かない（土台方針）。
// 【依存関係】lucide-react, lib/utils（cn）, ./useVariantKRowStates（VariantKRowState 型）。

"use client";

import { Play, Heart, Bookmark, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VariantKRowState } from "./useVariantKRowStates";

// 操作セルが実際に使うフィールドのみを要求する（Tier1 のカード状態など他フックからも流用できるように）。
type RowActionsState = Pick<
  VariantKRowState,
  "liked" | "likeCount" | "toggleLike" | "watchLater" | "toggleWatchLater" | "avpCandidate" | "toggleAvpCandidate"
>;

const iconBtn =
  "inline-flex h-7 items-center justify-center gap-1 rounded-md border px-2 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40";

export function VariantKRowActions({
  state,
  unavailable,
  playing,
  onPlay,
}: {
  state: RowActionsState;
  unavailable: boolean;
  playing: boolean;
  onPlay: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onPlay}
        disabled={unavailable}
        aria-pressed={playing}
        title={unavailable ? "利用不可は再生できません" : playing ? "再生中（モック）" : "再生（再生中ハイライト）"}
        className={cn(
          iconBtn,
          playing
            ? "border-amber-300 bg-amber-50 text-amber-700"
            : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Play className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={state.toggleLike}
        aria-pressed={state.liked}
        title={state.liked ? "いいねを解除" : "いいねに追加"}
        className={cn(
          iconBtn,
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
          iconBtn,
          state.watchLater
            ? "border-primary/40 bg-primary/10 text-primary"
            : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Bookmark className={cn("size-3.5", state.watchLater && "fill-current")} />
      </button>
      <button
        type="button"
        onClick={state.toggleAvpCandidate}
        disabled={unavailable}
        aria-pressed={state.avpCandidate}
        title={
          unavailable
            ? "利用不可は AVP候補に追加できません"
            : state.avpCandidate
              ? "AVP候補から外す（あとで見るとは別）"
              : "AVP候補に追加（あとで見るとは別）"
        }
        className={cn(
          iconBtn,
          state.avpCandidate
            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
            : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        {state.avpCandidate ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      </button>
    </div>
  );
}
