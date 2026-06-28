// 統合 Variant K あとで見る → /lab/variant-k/watch-later
// 【役割】あとで見る消化専用画面。未処理／確認・見直し／処理済み候補 の3セクションをカードで提示するモック。
// 【設計制約】
//   - UI LAB モック。API/DB/localStorage/sessionStorage 本体仕様に触れない（状態はページ内メモリ）。
//   - あとで見る（DB相当）と AVP候補（localStorage相当）を混同しない。
//   - 解除ルールの長文はカードに出さず、タイトル横 Tooltip に集約する。
//   - 自動解除条件（判定/選別完了・処理済みいいね）は本体仕様を実装しない（見せ方のみ）。
// 【依存関係】react, _data/variantKMock, _components/VariantKTooltipLabel, ./useWatchLaterMockState, ./shared, ./WatchLaterSectionBlock。

"use client";

import { useMemo, useState } from "react";
import { VARIANT_K_VIDEOS } from "../_data/variantKMock";
import { VariantKTooltipLabel } from "../_components/VariantKTooltipLabel";
import { useWatchLaterMockStates } from "./useWatchLaterMockState";
import { groupWatchLater, WATCH_LATER_SECTIONS } from "./shared";
import { WatchLaterSectionBlock } from "./WatchLaterSectionBlock";

export default function VariantKWatchLaterPage() {
  const controller = useWatchLaterMockStates(VARIANT_K_VIDEOS);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const groups = useMemo(() => groupWatchLater(controller.videos), [controller.videos]);
  const total = groups.unprocessed.length + groups.review.length + groups.doneCandidate.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          <VariantKTooltipLabel
            label="あとで見る"
            tooltip={
              <div className="flex max-w-xs flex-col gap-1 text-[11px] leading-relaxed">
                <p>未処理のあとで見るは、判定／選別を済ませると自動解除される想定です。</p>
                <p>処理済みのあとで見るは、いいねやレベル変更などで解除候補になる想定です。</p>
                <p>通常再生だけでは自動解除しません。AVP候補追加でも自動解除しません。</p>
                <p className="font-medium text-foreground">AVP再生でも、あとで見るは自動解除しません。</p>
                <p>あとで見る（DB相当）と AVP候補（localStorage相当）は別物です。</p>
              </div>
            }
          />
        </h1>
        <p className="text-[12px] text-muted-foreground">
          全 {total} 件（モック）。判定／選別を後回しにした動画を、状態別の3セクションで消化します。
        </p>
      </div>

      {WATCH_LATER_SECTIONS.map((section) => (
        <WatchLaterSectionBlock
          key={section.key}
          section={section.key}
          title={section.title}
          description={section.description}
          videos={groups[section.key]}
          controller={controller}
          playingId={playingId}
          onPlay={setPlayingId}
        />
      ))}
    </div>
  );
}
