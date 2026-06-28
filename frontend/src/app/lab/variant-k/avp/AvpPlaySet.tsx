// 統合 Variant K AVP 下段：2×2 再生セット。
// 【役割】今回 AVP で再生する再生対象（最大4本）を2×2カードで表示し、外す/個別いいね/一括いいね/クリア/AVPで再生 を扱う。
// 【設計制約】
//   - 表示と委譲のみ。状態は controller（ページ内メモリ）。実再生・実 localStorage には触れない。
//   - スロット番号（大きな 1/2/3/4）は出さない。空きスロットは控えめなプレースホルダ。
//   - AVPで再生は再生対象を再生中ハイライトにするだけ（再生後クリアは想定文言で示す）。あとで見るは解除しない。
// 【依存関係】lucide, shadcn(button), _components(SectionHeader/VariantKVideoCard), _data/variantKMock（ラベル）,
//   ./useAvpMockState, ./shared。

"use client";

import { Play, X, Trash2, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VariantKSectionHeader } from "../_components/VariantKSectionHeader";
import { VariantKVideoCard } from "../_components/VariantKVideoCard";
import { VariantKCardActions } from "../_components/VariantKCardActions";
import { tier1Label, tier2Label, type VariantKVideo } from "../_data/variantKMock";
import type { AvpMockController } from "./useAvpMockState";
import { MAX_AVP_PLAY_TARGET } from "./shared";

function isTier2Target(video: VariantKVideo): boolean {
  return video.tier2_status !== "none";
}

export function AvpPlaySet({ controller }: { controller: AvpMockController }) {
  const targets = controller.playTargetIds
    .map((id) => controller.videos.find((v) => v.id === id))
    .filter((v): v is VariantKVideo => Boolean(v));
  const emptyCount = Math.max(0, MAX_AVP_PLAY_TARGET - targets.length);

  return (
    <section className="flex flex-col gap-3">
      <VariantKSectionHeader
        title="再生セット（2×2）"
        description={`今回 AVP で再生する対象（最大${MAX_AVP_PLAY_TARGET}本）。AVPで再生すると再生中ハイライトが付き、再生後はクリアされる想定です。`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={controller.likeAllInPlaySet}
              disabled={targets.length === 0}
            >
              <ThumbsUp className="size-3.5" />
              再生対象をまとめていいね
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={controller.clearPlayTarget}
              disabled={targets.length === 0}
            >
              <Trash2 className="size-3.5" />
              再生対象をクリア
            </Button>
            {/* 主操作として強調（大きめ・primary） */}
            <Button
              size="default"
              className="h-9 gap-1.5 px-4 text-[13px] font-semibold shadow-sm"
              onClick={controller.playAvp}
              disabled={targets.length === 0}
            >
              <Play className="size-4" />
              AVPで再生
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {targets.map((video) => {
          const tier2 = isTier2Target(video);
          return (
            <VariantKVideoCard
              key={video.id}
              video={video}
              tierBadge={tier2 ? "tier2" : "tier1"}
              playing={controller.isPlaying(video.id)}
              statusLabel="ステータス"
              statusValue={tier2 ? `Tier2 ${tier2Label(video.tier2_status)}` : `Tier1 ${tier1Label(video.tier1_status)}`}
              actions={
                <VariantKCardActions
                  liked={video.liked}
                  likeCount={video.like_count}
                  onToggleLike={() => controller.toggleLike(video.id)}
                  extra={
                    <button
                      type="button"
                      onClick={() => controller.removeFromPlayTarget(video.id)}
                      aria-label="再生対象から外す"
                      title="再生対象から外す"
                      className="inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border bg-card px-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <X className="size-3.5" />
                      外す
                    </button>
                  }
                />
              }
            />
          );
        })}

        {Array.from({ length: emptyCount }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex min-h-[10rem] items-center justify-center rounded-lg border border-dashed bg-muted/20 text-[11px] text-muted-foreground"
          >
            空きスロット
          </div>
        ))}
      </div>
    </section>
  );
}
