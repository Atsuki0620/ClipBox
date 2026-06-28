// 統合 Variant K あとで見る カードの操作行。
// 【役割】共通の1段アイコン操作（再生/いいね/あとで見る解除/AVP候補）＋ 該当Tierへ戻る導線 を並べる。
//   VariantKVideoCard の actions スロットに差し込む。
// 【設計制約】
//   - すべて見た目だけのモック（実 API/DB/localStorage に触れない）。
//   - あとで見る解除はこの画面の主操作（栞×アイコン）。AVP候補追加は別状態で、あとで見るを解除しない。
//   - 利用不可では 再生 と AVP候補追加 を disabled にする。戻り導線は見た目のみ（該当 Tier 画面へのリンク）。
// 【依存関係】next/link, lucide-react, lib/utils（cn）, _components(VariantKCardActions), ./useWatchLaterMockState, ./shared。
"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { VariantKCardActions } from "../_components/VariantKCardActions";
import type { WatchLaterMockCardState } from "./useWatchLaterMockState";
import { isTier2Target } from "./shared";
import type { VariantKVideo } from "../_data/variantKMock";

export function WatchLaterCardActions({
  video,
  state,
  unavailable,
  onPlay,
}: {
  video: VariantKVideo;
  state: WatchLaterMockCardState;
  unavailable: boolean;
  onPlay?: () => void;
}) {
  const backHref = isTier2Target(video) ? "/lab/variant-k/tier2" : "/lab/variant-k/tier1";
  const backLabel = isTier2Target(video) ? "Tier2 へ" : "Tier1 へ";

  return (
    <VariantKCardActions
      unavailable={unavailable}
      onPlay={onPlay}
      liked={state.liked}
      likeCount={state.likeCount}
      onToggleLike={state.toggleLike}
      watchLater={state.watchLater}
      onToggleWatchLater={state.removeWatchLater}
      watchLaterVariant="remove"
      avpCandidate={state.avpCandidate}
      onToggleAvpCandidate={state.toggleAvpCandidate}
      extra={
        <Link
          href={backHref}
          title={`${backLabel}（判定/選別をやり直す）`}
          aria-label={backLabel}
          className={cn(
            "inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border bg-card px-1 text-[11px] whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <ArrowUpRight className="size-3.5" />
          {backLabel}
        </Link>
      }
    />
  );
}
