// 統合 Variant K Tier1 ランダムタブ。
// 【役割】条件パネルを撤去し「未判定かつ再生可能」固定で1本を提示するモック。引き直しで代表を切り替える。
// 【設計制約】
//   - 条件は固定（パネルを大きく出さない・複雑なフィルタを作らない）。判定済み/利用不可は候補に含めない。
//   - 抽選はモック（合成データの未判定×再生可能から代表を切り替える程度）。実 API/localStorage に触れない。
//   - カード優先・視聴日数主役・サムネなし。
// 【依存関係】lucide, shadcn(button), _data/variantKMock, _components(EmptyState/TooltipLabel/SectionHeader),
//   ./shared（drawableCandidates）, ./Tier1Card。

"use client";

import { useState } from "react";
import { Shuffle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VariantKEmptyState } from "../_components/VariantKEmptyState";
import { VariantKSectionHeader } from "../_components/VariantKSectionHeader";
import { drawableCandidates } from "./shared";
import { Tier1Card } from "./Tier1Card";
import type { Tier1MockCardStateController } from "./useTier1MockCardState";

export function Tier1Random({ state }: { state: Tier1MockCardStateController }) {
  const candidates = drawableCandidates(state.videos);
  const [index, setIndex] = useState(0);

  const draw = () => {
    if (candidates.length === 0) return;
    setIndex((i) => (i + 1) % candidates.length);
  };

  const current = candidates[index % Math.max(candidates.length, 1)];

  return (
    <div className="flex flex-col gap-3">
      <VariantKSectionHeader
        title="ランダム"
        description="未判定の動画から1本をランダムに表示します。"
        actions={
          <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
            対象: 未判定かつ再生可能（固定）
          </span>
        }
      />

      <div className="flex items-center gap-2">
        <Button size="sm" className="h-8 px-3" onClick={draw} disabled={candidates.length === 0}>
          <Shuffle className="size-3.5" />
          引き直す
        </Button>
        <span className="text-[11px] text-muted-foreground">
          候補 {candidates.length} 件（モック・判定済み/利用不可は含めません）
        </span>
      </div>

      {current ? (
        <div className="max-w-xs">
          <Tier1Card video={current} state={state.getCardState(current)} />
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
