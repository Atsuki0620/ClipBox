// 統合 Variant K テーブル行の操作セル（ランキング/検索/Tier1テーブルが共有）。
// 【役割】操作付きテーブルの「操作」列に並べる 再生 / いいね / あとで見る / AVP候補 のアイコンボタン群。
//   集約版 VariantKRowActions（4ボタンを1セルに）と、列分割用の個別ボタン（Play/Like/WatchLater/Avp）を両方提供する。
// 【設計制約】
//   - 表示と委譲のみ（実 API/DB/localStorage に触れない）。状態は呼び出し側の controller（ページ内メモリ）。
//   - 利用不可（unavailable）では 再生 と AVP候補追加 を disabled にする（いいね/あとで見るは可）。
//   - あとで見る（DB相当）と AVP候補（localStorage相当）は別操作。混同しない・互いに解除しない。
//   - aria-pressed ＋ 状態依存 title でトグル状態を明示。テーブルにはバッジを置かない（土台方針）。
// 【依存関係】lucide-react, lib/utils（cn）, ./useVariantKRowStates（VariantKRowState 型）。

"use client";

import { Play, Heart, Bookmark, Plus, Check, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VariantKRowState } from "./useVariantKRowStates";

// 操作セルが実際に使うフィールドのみを要求する（Tier1 のカード状態など他フックからも流用できるように）。
type RowActionsState = Pick<
  VariantKRowState,
  "liked" | "likeCount" | "toggleLike" | "watchLater" | "toggleWatchLater" | "avpCandidate" | "toggleAvpCandidate"
>;

const iconBtn =
  "inline-flex h-7 items-center justify-center gap-1 rounded-md border px-2 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40";
const neutral = "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground";

// 再生（列分割用・利用不可で disabled）。
export function VariantKPlayButton({
  unavailable,
  playing,
  onPlay,
  className,
}: {
  unavailable: boolean;
  playing: boolean;
  onPlay: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={unavailable}
      aria-pressed={playing}
      title={unavailable ? "利用不可は再生できません" : playing ? "再生中（モック）" : "再生（再生中ハイライト）"}
      className={cn(iconBtn, playing ? "border-amber-300 bg-amber-50 text-amber-700" : neutral, className)}
    >
      <Play className="size-3.5" />
    </button>
  );
}

// いいね（列分割用・数値併記）。mode="increment" は押すたびに +1（Tier1）。
export function VariantKLikeButton({
  state,
  mode = "toggle",
  className,
}: {
  state: Pick<RowActionsState, "liked" | "likeCount" | "toggleLike">;
  mode?: "toggle" | "increment";
  className?: string;
}) {
  const filled = mode === "increment" ? state.likeCount > 0 : state.liked;
  return (
    <button
      type="button"
      onClick={state.toggleLike}
      aria-pressed={mode === "increment" ? undefined : state.liked}
      aria-label={mode === "increment" ? "いいねを追加" : undefined}
      title={mode === "increment" ? "いいねを追加（+1）" : state.liked ? "いいねを解除" : "いいねに追加"}
      className={cn(iconBtn, filled ? "border-rose-300 bg-rose-50 text-rose-600" : neutral, className)}
    >
      <Heart className={cn("size-3.5", filled && "fill-current")} />
      <span className="tabular-nums">{state.likeCount}</span>
    </button>
  );
}

// あとで見る（列分割用）。
export function VariantKWatchLaterButton({
  state,
  className,
}: {
  state: Pick<RowActionsState, "watchLater" | "toggleWatchLater">;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={state.toggleWatchLater}
      aria-pressed={state.watchLater}
      title={state.watchLater ? "あとで見るから外す" : "あとで見るに追加"}
      className={cn(iconBtn, state.watchLater ? "border-primary/40 bg-primary/10 text-primary" : neutral, className)}
    >
      <Bookmark className={cn("size-3.5", state.watchLater && "fill-current")} />
    </button>
  );
}

// AVP候補（列分割用・利用不可で disabled）。
export function VariantKAvpButton({
  state,
  unavailable,
  iconVariant = "plus",
  className,
}: {
  state: Pick<RowActionsState, "avpCandidate" | "toggleAvpCandidate">;
  unavailable: boolean;
  iconVariant?: "plus" | "monitor";
  className?: string;
}) {
  return (
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
      className={cn(iconBtn, state.avpCandidate ? "border-indigo-300 bg-indigo-50 text-indigo-700" : neutral, className)}
    >
      {iconVariant === "monitor" ? (
        <MonitorPlay className="size-3.5" />
      ) : state.avpCandidate ? (
        <Check className="size-3.5" />
      ) : (
        <Plus className="size-3.5" />
      )}
    </button>
  );
}

// 集約版（1セルに4ボタン）。ランキング/検索の「操作」列はこちらを使う。
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
      <VariantKPlayButton unavailable={unavailable} playing={playing} onPlay={onPlay} />
      <VariantKLikeButton state={state} />
      <VariantKWatchLaterButton state={state} />
      <VariantKAvpButton state={state} unavailable={unavailable} />
    </div>
  );
}
