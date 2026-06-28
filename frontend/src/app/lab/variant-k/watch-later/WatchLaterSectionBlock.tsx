// 統合 Variant K あとで見る の1セクション表示ブロック。
// 【役割】見出し（件数つき）＋カードグリッド（PC幅5列）＋空状態 を描画する。
//   処理済み候補ブロックのみ控えめな「まとめて確認」ボタンを置く（個別解除が基本・主役にしない）。
// 【設計制約】表示と委譲のみ。状態は親（page）から controller / playingId を受け取る。
// 【依存関係】lucide-react, shadcn button, _components（SectionHeader/EmptyState）, ./WatchLaterCard, ./shared。

"use client";

import { Inbox, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VariantKSectionHeader } from "../_components/VariantKSectionHeader";
import { VariantKEmptyState } from "../_components/VariantKEmptyState";
import { WatchLaterCard } from "./WatchLaterCard";
import type { WatchLaterMockStateController } from "./useWatchLaterMockState";
import type { WatchLaterSection } from "./shared";
import type { VariantKVideo } from "../_data/variantKMock";

export function WatchLaterSectionBlock({
  section,
  title,
  description,
  videos,
  controller,
  playingId,
  onPlay,
}: {
  section: WatchLaterSection;
  title: string;
  description: string;
  videos: VariantKVideo[];
  controller: WatchLaterMockStateController;
  playingId: number | null;
  onPlay: (id: number) => void;
}) {
  const showBulk = section === "doneCandidate" && videos.length > 0;

  return (
    <section className="flex flex-col gap-3">
      <VariantKSectionHeader
        title={
          <span className="inline-flex items-center gap-2">
            {title}
            <span className="rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground tabular-nums">
              {videos.length}
            </span>
          </span>
        }
        description={description}
        actions={
          showBulk ? (
            <Button variant="outline" size="sm" className="h-7 text-[11px]" title="処理済み候補をまとめて確認（モック）">
              <ListChecks className="size-3.5" />
              まとめて確認
            </Button>
          ) : undefined
        }
      />

      {videos.length === 0 ? (
        <VariantKEmptyState
          icon={<Inbox className="size-5" />}
          title="このセクションは空です"
          description="該当するあとで見るはありません。"
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {videos.map((video) => (
            <WatchLaterCard
              key={video.id}
              video={video}
              state={controller.getCardState(video)}
              playing={playingId === video.id}
              onPlay={() => onPlay(video.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
