// 統合 Variant K あとで見る カード（カード土台＋状態＋操作行＋付与理由の合成）。
// 【役割】VariantKVideoCard に Tier1/Tier2 を混同しないステータス・付与理由メモ・操作行を組み合わせる。
// 【設計制約】API/DB/localStorage に触れない。サムネなし。視聴回数/更新日/登録日は出さない。
// 【依存関係】_components/VariantKVideoCard, _data/variantKMock（formatVariantKDate）, ./shared, ./WatchLaterCardActions。

"use client";

import { VariantKVideoCard } from "../_components/VariantKVideoCard";
import { formatVariantKDate, type VariantKVideo } from "../_data/variantKMock";
import type { WatchLaterMockCardState } from "./useWatchLaterMockState";
import { WatchLaterCardActions } from "./WatchLaterCardActions";
import { isTier2Target, watchLaterReason, watchLaterStatusLabel } from "./shared";

export function WatchLaterCard({
  video,
  state,
  playing = false,
  onPlay,
  className,
}: {
  video: VariantKVideo;
  state: WatchLaterMockCardState;
  playing?: boolean;
  onPlay?: () => void;
  className?: string;
}) {
  const tier2 = isTier2Target(video);
  const unavailable = !video.available;

  return (
    <VariantKVideoCard
      video={video}
      tierBadge={tier2 ? "tier2" : "tier1"}
      watchLater={state.watchLater}
      playing={playing}
      statusLabel="ステータス"
      statusValue={watchLaterStatusLabel(video)}
      dateLabel={tier2 ? "選別日" : "判定日"}
      dateValue={formatVariantKDate(tier2 ? video.selected_at : video.judged_at)}
      className={className}
      actions={
        <div className="flex w-full flex-col gap-1.5">
          <p className="text-[10.5px] text-muted-foreground">メモ：{watchLaterReason(video)}</p>
          <WatchLaterCardActions
            video={video}
            state={state}
            unavailable={unavailable}
            onPlay={onPlay}
          />
        </div>
      }
    />
  );
}
