// 統合 Variant K Tier1 カード（カード土台＋ローカル状態＋操作行の合成）。
// 【役割】VariantKVideoCard に Tier1 のページ共有モック状態と操作行（Tier1CardActions）を組み合わせる。
//   判定メタは live なレベル状態を反映する。再生中はカードハイライト（playing）。
// 【設計制約】API/DB/localStorage に触れない。displayContext="tier1" 前提。サムネなし。
// 【依存関係】_components/VariantKVideoCard, _data/variantKMock（format/tier1Label）, ./useTier1MockCardState, ./Tier1CardActions。

"use client";

import { VariantKVideoCard } from "../_components/VariantKVideoCard";
import { formatVariantKDate, type VariantKVideo } from "../_data/variantKMock";
import type { Tier1MockCardState } from "./useTier1MockCardState";
import { Tier1CardActions } from "./Tier1CardActions";

export function Tier1Card({
  video,
  state,
  playing = false,
  layout = "vertical",
  onPlay,
  className,
}: {
  video: VariantKVideo;
  state: Tier1MockCardState;
  playing?: boolean;
  layout?: "vertical" | "wide";
  onPlay?: () => void;
  className?: string;
}) {
  const unavailable = !video.available;
  // 未判定（レベル -1）= 左端アクセントバーで識別。判定済みは付けない。
  const accent = state.level === -1;

  return (
    <VariantKVideoCard
      video={video}
      tierBadge="tier1"
      playing={playing}
      accent={accent}
      layout={layout}
      watchLater={state.watchLater}
      metaItems={[
        { value: `視聴${video.view_days}日` },
        { label: "作成日", value: formatVariantKDate(video.file_created_at) },
        { label: "判定日", value: formatVariantKDate(state.judgedAt) },
      ]}
      className={className}
      actions={
        <Tier1CardActions
          state={state}
          unavailable={unavailable}
          playing={playing}
          onPlay={onPlay}
          orientation={layout === "wide" ? "horizontal" : "vertical"}
        />
      }
    />
  );
}
