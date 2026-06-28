// 統合 Variant K Tier2 カードの操作行。
// 【役割】カード下部に選別状態（未選別/0..4）と共通の1段アイコン操作（再生/いいね/あとで見る/AVP候補）を並べる。
//   VariantKVideoCard の actions スロットに差し込む。
// 【設計制約】
//   - すべて見た目だけのモック（実 API/DB/localStorage に触れない）。
//   - 選別状態は 未選別/0..4。「選別」ラベルは出さない（カード共通方針）。
//   - 操作は共通部品 VariantKCardActions に委譲。利用不可では 再生 と AVP候補 を disabled。
// 【依存関係】lib/levels（levelName）, _components（VariantKCardActions/VariantKLevelButtons）, ./shared, ./useTier2MockCardState。
"use client";

import { levelName } from "@/lib/levels";
import { VariantKCardActions } from "../_components/VariantKCardActions";
import {
  VariantKLevelButtons,
  type VariantKLevelOption,
} from "../_components/VariantKLevelButtons";
import { TIER2_LEVELS, type Tier2SelectionValue } from "./shared";
import type { Tier2MockCardState } from "./useTier2MockCardState";

// 未選別/0..4 の選別肢。
const TIER2_LEVEL_OPTIONS: VariantKLevelOption<Tier2SelectionValue>[] = TIER2_LEVELS.map((v) => ({
  value: v,
  label: v === "unselected" ? "未選別" : String(v),
  title: v === "unselected" ? "未選別" : levelName(v),
}));

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
      {/* 選別（未選別/0..4・現在値を強調・「選別」ラベルなし） */}
      <VariantKLevelButtons
        ariaLabel="選別状態"
        value={state.selection}
        onChange={state.setSelection}
        options={TIER2_LEVEL_OPTIONS}
        disabled={unavailable}
        className="w-full"
      />

      {/* 操作（再生／いいね／あとで見る／AVP候補）を横1段に */}
      <VariantKCardActions
        unavailable={unavailable}
        onPlay={onPlay}
        liked={state.liked}
        likeCount={state.likeCount}
        onToggleLike={state.toggleLike}
        watchLater={state.watchLater}
        onToggleWatchLater={state.toggleWatchLater}
        avpCandidate={state.avpCandidate}
        onToggleAvpCandidate={state.toggleAvpCandidate}
      />
    </div>
  );
}
