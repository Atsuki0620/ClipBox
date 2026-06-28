// 統合 Variant K Tier1 カードの操作行。
// 【役割】カード下部にレベル（未/0..4）と共通の1段アイコン操作（再生/いいね/あとで見る/AVP候補）を並べる。
//   VariantKVideoCard の actions スロットに差し込む。
// 【設計制約】
//   - すべて見た目だけのモック（実 API/DB/localStorage に触れない）。
//   - レベルは 未/0/1/2/3/4 の6択（未＝未判定へ戻す）。「判定」ラベルは出さない（フィードバック §7-D）。
//   - 操作は共通部品 VariantKCardActions（1段アイコン）に委譲。利用不可では 再生 と AVP候補 を disabled。
// 【依存関係】lib/levels（levelName）, _components（VariantKCardActions/VariantKLevelButtons）, ./shared, ./useTier1MockCardState。
"use client";

import { levelName } from "@/lib/levels";
import { VariantKCardActions } from "../_components/VariantKCardActions";
import {
  VariantKLevelButtons,
  type VariantKLevelOption,
} from "../_components/VariantKLevelButtons";
import { TIER1_LEVEL_VALUES } from "./shared";
import type { Tier1MockCardState } from "./useTier1MockCardState";

// 未/0..4 のレベル選択肢（未＝未判定へ戻す）。カード/テーブル双方で共用。
export const TIER1_LEVEL_OPTIONS: VariantKLevelOption<number>[] = TIER1_LEVEL_VALUES.map((lv) => ({
  value: lv,
  label: lv === -1 ? "未" : String(lv),
  title: levelName(lv),
}));

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
      {/* レベル（未/0..4・現在値を強調・「判定」ラベルなし） */}
      <VariantKLevelButtons
        ariaLabel="判定レベル"
        value={state.level}
        onChange={state.setLevel}
        options={TIER1_LEVEL_OPTIONS}
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
