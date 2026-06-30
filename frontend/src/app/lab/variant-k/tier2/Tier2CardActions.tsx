// 統合 Variant K Tier2 カードの操作行。
// 【役割】カード下部に選別状態（未選別/0..4）と共通の1段アイコン操作（再生/いいね/あとで見る/AVP候補）を並べる。
//   VariantKVideoCard の actions スロットに差し込む。Tier1CardActions と同じ作り（語彙だけ Tier2）。
// 【設計制約】
//   - すべて見た目だけのモック（実 API/DB/localStorage に触れない）。
//   - 選別は 未選別/0/1/2/3/4 の6択（未選別＝未選別へ戻す）。「選別」ラベルは出さない。
//   - 操作は共通部品 VariantKCardActions（1段アイコン）に委譲。利用不可では 再生 と AVP候補 を disabled。
//   - いいねはインクリメント式（likeMode="increment"）。
//   - orientation="horizontal" では 選別と操作を横一列に並べる（運命の1本の全幅ワイドカード用）。
// 【依存関係】lib/levels（levelName）, lib/utils（cn）, _components（VariantKCardActions/VariantKLevelButtons）, ./shared, ./useTier2MockCardState。
"use client";

import { cn } from "@/lib/utils";
import { levelName } from "@/lib/levels";
import {
  VariantKCardActions,
  VariantKCardPlayButton,
} from "../_components/VariantKCardActions";
import {
  VariantKLevelButtons,
  type VariantKLevelOption,
} from "../_components/VariantKLevelButtons";
import { TIER2_LEVELS, type Tier2SelectionValue } from "./shared";
import type { Tier2MockCardState } from "./useTier2MockCardState";

// 未選別/0..4 の選別肢。カード/テーブル双方で共用。
export const TIER2_LEVEL_OPTIONS: VariantKLevelOption<Tier2SelectionValue>[] = TIER2_LEVELS.map((v) => ({
  value: v,
  label: v === "unselected" ? "未" : String(v),
  title: v === "unselected" ? "未選別" : levelName(v),
}));

export function Tier2CardActions({
  state,
  unavailable,
  playing = false,
  onPlay,
  orientation = "vertical",
}: {
  state: Tier2MockCardState;
  unavailable: boolean;
  playing?: boolean;
  onPlay?: () => void;
  orientation?: "vertical" | "horizontal";
}) {
  const horizontal = orientation === "horizontal";
  return (
    <div
      className={cn(
        "flex w-full gap-1.5",
        horizontal ? "flex-wrap items-center" : "flex-col",
      )}
    >
      {horizontal && onPlay ? (
        <VariantKCardPlayButton
          compact
          unavailable={unavailable}
          playing={playing}
          onPlay={onPlay}
        />
      ) : null}

      {/* 選別（未選別/0..4・現在値を強調・「選別」ラベルなし） */}
      <VariantKLevelButtons
        ariaLabel="選別状態"
        value={state.selection}
        onChange={state.setSelection}
        options={TIER2_LEVEL_OPTIONS}
        disabled={unavailable}
        className={horizontal ? "w-full sm:w-[17rem] sm:shrink-0" : "w-full"}
      />

      {/* 操作（再生／いいね／あとで見る／AVP候補）を横1段に */}
      <VariantKCardActions
        compact={horizontal}
        unavailable={unavailable}
        playing={playing}
        onPlay={horizontal ? undefined : onPlay}
        liked={state.liked}
        likeCount={state.likeCount}
        onToggleLike={state.toggleLike}
        likeMode="increment"
        watchLater={state.watchLater}
        onToggleWatchLater={state.toggleWatchLater}
        avpCandidate={state.avpCandidate}
        onToggleAvpCandidate={state.toggleAvpCandidate}
        className={horizontal ? "w-full sm:w-auto sm:shrink-0" : undefined}
      />
    </div>
  );
}
