// 統合 Variant K Tier1 運命の1本タブ。
// 【役割】履歴セクションを撤去し、大型の「引く」ボタンを中心に1本を提示するモック。
//   「最近見てない優先」トグル（見た目のみ）と「保持」の短い説明を持つ。
// 【設計制約】
//   - 履歴セクションは作らない。ただし「保持」仕様を撤去したようには見せない（説明＋見た目で表現）。
//   - 実 sessionStorage / API / localStorage には触れない。抽選はモック（代表を切り替える程度）。
//   - 「最近見てない優先」も見た目のモック。カード優先・サムネなし。
// 【依存関係】lucide, shadcn(button/switch), _data/variantKMock, _components(SectionHeader/TooltipLabel),
//   ./shared（drawableCandidates / recentlyUnwatchedFirst）, ./Tier1Card。

"use client";

import { useState } from "react";
import { Dices, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { VariantKSectionHeader } from "../_components/VariantKSectionHeader";
import { drawableCandidates, recentlyUnwatchedFirst } from "./shared";
import { Tier1Card } from "./Tier1Card";
import type { Tier1MockCardStateController } from "./useTier1MockCardState";

export function Tier1Fate({ state }: { state: Tier1MockCardStateController }) {
  const [recentFirst, setRecentFirst] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [index, setIndex] = useState(0);

  const base = drawableCandidates(state.videos);
  const pool = recentFirst ? recentlyUnwatchedFirst(base) : base;
  const current = pool[index % Math.max(pool.length, 1)];

  const draw = () => {
    if (pool.length === 0) return;
    setDrawn(true);
    setIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      <VariantKSectionHeader
        title="運命の1本"
        description="ボタンを押すと運命の1本を1本だけ引きます。"
        actions={
          <label className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[12px]">
            <span>最近見てない優先</span>
            <Switch checked={recentFirst} onCheckedChange={(v) => setRecentFirst(Boolean(v))} />
          </label>
        }
      />

      {/* 大型の「引く」ボタンを中心に */}
      <div className="flex flex-col items-center gap-2 rounded-lg border bg-card/60 px-4 py-6">
        <Button size="lg" className="h-12 px-8 text-base" onClick={draw} disabled={pool.length === 0}>
          <Dices className="size-5" />
          運命の1本を引く
        </Button>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="size-3.5" />
          引いた1本はこのタブのセッション中だけ保持されます（タブを閉じると消えます）。履歴は残しません。
        </p>
      </div>

      {/* 現在引かれている1本（カード優先） */}
      {drawn && current ? (
        <div className="mx-auto max-w-xs">
          <Tier1Card video={current} state={state.getCardState(current)} />
        </div>
      ) : (
        <p className="text-center text-[12px] text-muted-foreground">
          まだ引いていません。「運命の1本を引く」を押してください。
        </p>
      )}
    </div>
  );
}
