// 統合 Variant K Tier1 ランダムタブ。
// 【役割】N 本（10/20/30）をシャッフルして提示するモック。既定は「未判定のみ」。
//   主ボタン＝シャッフル（引き直し）。引き数セグメントで本数を変える。見出し/説明/候補件数テキストは置かない。
// 【設計制約】
//   - 候補は再生可能な動画。未判定のみトグルで判定済みを含めるか切り替える。
//   - 抽選はモック（合成データのシャッフル）。実 API/localStorage に触れない。
//   - カード優先・視聴日数主役・サムネなし。カード操作・列数はライブラリと共有（Tier1Card / DisplayPrefs）。既定5列。
// 【依存関係】lucide, lib/utils(cn), _data/variantKMock, _components(EmptyState/DisplayPrefs),
//   ./shared（drawableCandidates / drawN）, ./Tier1Card。
"use client";

import { useState } from "react";
import { Shuffle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { VariantKEmptyState } from "../_components/VariantKEmptyState";
import { useVariantKDisplayPrefs } from "../_components/VariantKDisplayPrefs";
import { drawableCandidates, drawN } from "./shared";
import { Tier1Card } from "./Tier1Card";
import type { VariantKVideo } from "../_data/variantKMock";
import type { Tier1MockCardStateController } from "./useTier1MockCardState";

const DRAW_COUNTS = [10, 20, 30];
const DEFAULT_DRAW = 10;

export function Tier1Random({ state }: { state: Tier1MockCardStateController }) {
  const { cardColumns } = useVariantKDisplayPrefs();
  const [unratedOnly, setUnratedOnly] = useState(true);
  const candidates = drawableCandidates(state.videos, { unratedOnly });
  const [count, setCount] = useState(DEFAULT_DRAW);
  const [playingId, setPlayingId] = useState<number | null>(null);
  // 抽選結果はメモではなく state に保持（カードの live 状態は getCardState で都度読むため凍結で問題ない）。
  const [drawn, setDrawn] = useState<VariantKVideo[]>(() =>
    drawN(state.videos, DEFAULT_DRAW, { unratedOnly: true }),
  );

  const reshuffle = (n: number, nextUnratedOnly = unratedOnly) =>
    setDrawn(drawN(state.videos, n, { unratedOnly: nextUnratedOnly }));
  const handleCount = (n: number) => {
    setCount(n);
    reshuffle(n);
  };
  const handleUnratedOnly = (next: boolean) => {
    setUnratedOnly(next);
    reshuffle(count, next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-8 items-center gap-2 rounded-md bg-muted/50 px-2.5 text-[12px] text-foreground">
          <span>未判定のみ</span>
          <Switch checked={unratedOnly} onCheckedChange={(v) => handleUnratedOnly(Boolean(v))} />
        </label>

        {/* 引く本数（10/20/30） */}
        <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
          {DRAW_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleCount(n)}
              className={cn(
                "rounded-[5px] px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors",
                count === n ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>

        {/* シャッフル（主操作＝引き直し） */}
        <Button size="sm" className="h-8 px-3" onClick={() => reshuffle(count)} disabled={candidates.length === 0}>
          <Shuffle className="size-3.5" />
          シャッフル
        </Button>
      </div>

      {drawn.length > 0 ? (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cardColumns}, minmax(0, 1fr))` }}>
          {drawn.map((video) => (
            <Tier1Card
              key={video.id}
              video={video}
              state={state.getCardState(video)}
              playing={playingId === video.id}
              onPlay={() => setPlayingId(video.id)}
            />
          ))}
        </div>
      ) : (
        <VariantKEmptyState
          icon={<Inbox className="size-6" />}
          title="対象の動画がありません"
          description={unratedOnly ? "未判定かつ再生可能な動画がない状態です。" : "再生可能な動画がない状態です。"}
        />
      )}
    </div>
  );
}
