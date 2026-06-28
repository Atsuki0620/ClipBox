// 統合 Variant K Tier1 カード（カード土台＋ローカル状態＋操作行の合成）。
// 【役割】VariantKVideoCard に Tier1 のページ共有モック状態と操作行（Tier1CardActions）を組み合わせる。
//   判定メタは live なレベル状態を反映する。再生中はカードハイライト（playing）。
// 【設計制約】API/DB/localStorage に触れない。displayContext="tier1" 前提。サムネなし。
// 【依存関係】_components/VariantKVideoCard, _data/variantKMock（format/tier1Label）, ./useTier1MockCardState, ./Tier1CardActions。

"use client";

import { VariantKVideoCard } from "../_components/VariantKVideoCard";
import { formatVariantKDate, tier1Label, type VariantKVideo } from "../_data/variantKMock";
import type { Tier1MockCardState } from "./useTier1MockCardState";
import { Tier1CardActions } from "./Tier1CardActions";

export function Tier1Card({
  video,
  state,
  playing = false,
  onPlay,
  className,
}: {
  video: VariantKVideo;
  state: Tier1MockCardState;
  playing?: boolean;
  onPlay?: () => void;
  className?: string;
}) {
  const unavailable = !video.available;

  return (
    <VariantKVideoCard
      video={video}
      tierBadge="tier1"
      playing={playing}
      watchLater={state.watchLater}
      statusLabel="判定"
      statusValue={tier1Label(state.level)}
      dateLabel="判定日"
      dateValue={formatVariantKDate(state.judgedAt)}
      className={className}
      actions={<Tier1CardActions state={state} unavailable={unavailable} onPlay={onPlay} />}
    />
  );
}
