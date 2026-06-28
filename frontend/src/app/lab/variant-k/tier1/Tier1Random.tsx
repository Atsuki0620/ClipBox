// 統合 Variant K Tier1 ランダムタブ。
// 【役割】「未判定かつ再生可能」から N 本（5/10/15/20）をシャッフルして提示するモック。
//   主ボタン＝シャッフル（引き直し）。引き数セグメントで本数を変える。
// 【設計制約】
//   - 候補は固定条件（未判定×再生可能・判定済み/利用不可は含めない）。複雑なフィルタは作らない。
//   - 抽選はモック（合成データのシャッフル）。実 API/localStorage に触れない。
//   - カード優先・視聴日数主役・サムネなし。カード操作は共通（Tier1Card）。
// 【依存関係】lucide, lib/utils(cn), _data/variantKMock, _components(EmptyState/SectionHeader),
//   ./shared（drawableCandidates / drawN）, ./Tier1Card。
"use client";

import { useState } from "react";
import { Shuffle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VariantKEmptyState } from "../_components/VariantKEmptyState";
import { VariantKSectionHeader } from "../_components/VariantKSectionHeader";
import { drawableCandidates, drawN } from "./shared";
import { Tier1Card } from "./Tier1Card";
import type { VariantKVideo } from "../_data/variantKMock";
import type { Tier1MockCardStateController } from "./useTier1MockCardState";

const DRAW_COUNTS = [5, 10, 15, 20];

export function Tier1Random({ state }: { state: Tier1MockCardStateController }) {
  const candidates = drawableCandidates(state.videos);
  const [count, setCount] = useState(5);
  const [playingId, setPlayingId] = useState<number | null>(null);
  // 抽選結果はメモではなく state に保持（カードの live 状態は getCardState で都度読むため凍結で問題ない）。
  const [drawn, setDrawn] = useState<VariantKVideo[]>(() => drawN(state.videos, 5));

  const reshuffle = (n: number) => setDrawn(drawN(state.videos, n));
  const handleCount = (n: number) => {
    setCount(n);
    reshuffle(n);
  };

  return (
    <div className="flex flex-col gap-3">
      <VariantKSectionHeader
        title="ランダム"
        description="未判定かつ再生可能な動画から、指定本数をシャッフルして提示します。"
        actions={
          <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
            対象: 未判定かつ再生可能（固定）
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {/* 引く本数（5/10/15/20） */}
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

        <span className="text-[11px] text-muted-foreground">
          候補 {candidates.length} 件（モック・判定済み/利用不可は含めません）
        </span>
      </div>

      {drawn.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-2">
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
          description="未判定かつ再生可能な動画がない状態です。"
        />
      )}
    </div>
  );
}
