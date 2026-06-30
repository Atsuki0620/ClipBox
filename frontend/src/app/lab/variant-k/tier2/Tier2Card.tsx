// 統合 Variant K Tier2 カード（カード土台＋ローカル状態＋操作行の合成）。
// 【役割】VariantKVideoCard に Tier2 のページ共有モック状態と操作行（Tier2CardActions）を組み合わせる。
//   Tier1Card と同じ作り（語彙だけ Tier2）。未選別はアクセントバー、利用不可はグレーアウト、選別済みは無印。
// 【設計制約】API/DB/localStorage に触れない。displayContext="tier2" 相当。サムネなし。
// 【依存関係】_components/VariantKVideoCard, _data/variantKMock（formatVariantKDate）, ./useTier2MockCardState, ./Tier2CardActions, ./shared。

"use client";

import { VariantKVideoCard } from "../_components/VariantKVideoCard";
import { formatVariantKDate, type VariantKVideo } from "../_data/variantKMock";
import { Tier2CardActions } from "./Tier2CardActions";
import type { Tier2MockCardState } from "./useTier2MockCardState";

export function Tier2Card({
  video,
  state,
  playing = false,
  layout = "vertical",
  onPlay,
  className,
}: {
  video: VariantKVideo;
  state: Tier2MockCardState;
  playing?: boolean;
  layout?: "vertical" | "wide";
  onPlay?: () => void;
  className?: string;
}) {
  const unavailable = !video.available;
  // 未選別（unselected）= 左端アクセントバーで識別。選別済み(0..4)は付けない。
  const accent = state.selection === "unselected";

  return (
    <VariantKVideoCard
      video={video}
      tierBadge="tier2"
      playing={playing}
      accent={accent}
      layout={layout}
      watchLater={state.watchLater}
      metaItems={[
        { value: `視聴${video.view_days}日` },
        { label: "作成日", value: formatVariantKDate(video.file_created_at) },
        { label: "選別日", value: formatVariantKDate(state.selectedAt) },
      ]}
      className={className}
      actions={
        <Tier2CardActions
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
