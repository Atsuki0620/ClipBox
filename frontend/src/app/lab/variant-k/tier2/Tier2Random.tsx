// 統合 Variant K Tier2 ランダムタブ。
// 【役割】条件パネルを作らず「Tier2対象・再生可能・未選別優先」固定で1本を提示するモック。
// 【設計制約】
//   - 複雑な条件パネルや実ランダム処理は作らない。候補配列の代表を切り替えるだけ。
//   - 実 API/localStorage に触れない。カード優先・視聴日数主役・サムネなし。
// 【依存関係】lucide, shadcn(button), _components(EmptyState/SectionHeader), ./shared, ./Tier2Card。

"use client";

import { useState } from "react";
import { Inbox, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VariantKEmptyState } from "../_components/VariantKEmptyState";
import { VariantKSectionHeader } from "../_components/VariantKSectionHeader";
import { drawableTier2Candidates, type Tier2Copy } from "./shared";
import { Tier2Card } from "./Tier2Card";
import type { Tier2MockCardStateController } from "./useTier2MockCardState";

export function Tier2Random({ state, copy }: { state: Tier2MockCardStateController; copy: Tier2Copy }) {
  const candidates = drawableTier2Candidates(state.videos);
  const [index, setIndex] = useState(0);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const draw = () => {
    if (candidates.length === 0) return;
    setIndex((i) => (i + 1) % candidates.length);
  };

  const current = candidates[index % Math.max(candidates.length, 1)];

  return (
    <div className="flex flex-col gap-3">
      <VariantKSectionHeader
        title="ランダム"
        description={copy.randomDescription}
        actions={
          <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
            {copy.fixedConditionLabel}
          </span>
        }
      />

      <div className="flex items-center gap-2">
        <Button size="sm" className="h-8 px-3" onClick={draw} disabled={candidates.length === 0}>
          <Shuffle className="size-3.5" />
          引き直す
        </Button>
        <span className="text-[11px] text-muted-foreground">
          候補 {candidates.length} 件（モック・未選別を先に表示）
        </span>
      </div>

      {current ? (
        <div className="max-w-xs">
          <Tier2Card
            video={current}
            state={state.getCardState(current)}
            playing={playingId === current.id}
            onPlay={() => setPlayingId(current.id)}
          />
        </div>
      ) : (
        <VariantKEmptyState
          icon={<Inbox className="size-6" />}
          title={copy.noCandidateTitle}
          description={copy.noCandidateDescription}
        />
      )}
    </div>
  );
}
