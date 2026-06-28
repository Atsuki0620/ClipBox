// 統合 Variant K Tier2 運命の1本タブ。
// 【役割】履歴セクションを作らず、大型の「引く」ボタン、現在カード、最近見てない優先トグルの見た目を表示する。
// 【設計制約】
//   - 実 sessionStorage / API / localStorage には触れない。抽選はモック（代表を切り替える程度）。
//   - 履歴セクションは作らない。ただし保持仕様は短い説明で残す。
// 【依存関係】lucide, shadcn(button/switch), _components(SectionHeader), ./shared, ./Tier2Card。

"use client";

import { useState } from "react";
import { Dices, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { VariantKSectionHeader } from "../_components/VariantKSectionHeader";
import { drawableTier2Candidates, recentlyUnwatchedFirst, type Tier2Copy } from "./shared";
import { Tier2Card } from "./Tier2Card";
import type { Tier2MockCardStateController } from "./useTier2MockCardState";

export function Tier2Fate({ state, copy }: { state: Tier2MockCardStateController; copy: Tier2Copy }) {
  const [recentFirst, setRecentFirst] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [index, setIndex] = useState(0);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const base = drawableTier2Candidates(state.videos);
  const pool = recentFirst ? recentlyUnwatchedFirst(base) : base;
  const current = pool[index % Math.max(pool.length, 1)];

  const draw = () => {
    if (pool.length === 0) return;
    // 初回は先頭候補（pool[0]）を表示し、2回目以降で次候補へ進める。
    if (!drawn) {
      setDrawn(true);
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      <VariantKSectionHeader
        title="運命の1本"
        description={copy.fateDescription}
        actions={
          <label className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[12px]">
            <span>最近見てない優先</span>
            <Switch checked={recentFirst} onCheckedChange={(v) => setRecentFirst(Boolean(v))} />
          </label>
        }
      />

      <div className="flex flex-col items-center gap-2 rounded-lg border bg-card/60 px-4 py-6">
        <Button size="lg" className="h-12 px-8 text-base" onClick={draw} disabled={pool.length === 0}>
          <Dices className="size-5" />
          運命の1本を引く
        </Button>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="size-3.5" />
          {copy.holdDescription}
        </p>
      </div>

      {drawn && current ? (
        <div className="mx-auto max-w-xs">
          <Tier2Card
            video={current}
            state={state.getCardState(current)}
            playing={playingId === current.id}
            onPlay={() => setPlayingId(current.id)}
          />
        </div>
      ) : (
        <p className="text-center text-[12px] text-muted-foreground">{copy.fateIdleText}</p>
      )}
    </div>
  );
}
