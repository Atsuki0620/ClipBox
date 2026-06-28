// 統合 Variant K Tier2 カード（カード土台＋ローカル状態＋操作行の合成）。
// 【役割】VariantKVideoCard に Tier2 のページ共有モック状態と操作行（Tier2CardActions）を組み合わせる。
// 【設計制約】API/DB/localStorage に触れない。displayContext="tier2" 相当。サムネなし。
// 【依存関係】_components/VariantKVideoCard, _data/variantKMock（format/tier2Label）, ./useTier2MockCardState, ./Tier2CardActions。

"use client";

import { VariantKVideoCard } from "../_components/VariantKVideoCard";
import { formatVariantKDate, tier2Label, type VariantKVideo } from "../_data/variantKMock";
import { Tier2CardActions } from "./Tier2CardActions";
import type { Tier2MockCardState } from "./useTier2MockCardState";

export function Tier2Card({
  video,
  state,
  playing = false,
  onPlay,
  className,
}: {
  video: VariantKVideo;
  state: Tier2MockCardState;
  playing?: boolean;
  onPlay?: () => void;
  className?: string;
}) {
  const unavailable = !video.available;

  return (
    <VariantKVideoCard
      video={video}
      tierBadge="tier2"
      playing={playing}
      watchLater={state.watchLater}
      statusLabel="選別"
      statusValue={tier2Label(state.selection)}
      dateLabel="選別日"
      dateValue={formatVariantKDate(state.selectedAt)}
      className={className}
      actions={<Tier2CardActions state={state} unavailable={unavailable} onPlay={onPlay} />}
    />
  );
}
