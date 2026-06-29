// 統合 Variant K Tier1 運命の1本タブ。
// 【役割】「運命の1本を引く」ボタンと「最近見てない優先」トグルを横一列に並べ、引いた1本を全幅ワイドカードで提示するモック。
//   見出し・補足説明・囲い枠は置かない（フィードバック反映）。履歴セクションは作らない。
// 【設計制約】
//   - 履歴セクションは作らない。実 sessionStorage / API / localStorage には触れない。抽選はモック（代表を切り替える程度）。
//   - 「最近見てない優先」も見た目のモック。カード優先・サムネなし。
//   - 引いた1本は全幅ワイド（メタ一段・操作一段）で表示する（表示項目とボタンはライブラリと共通）。
// 【依存関係】lucide, shadcn(button/switch), _components(なし), ./shared（drawableCandidates / recentlyUnwatchedFirst）, ./Tier1Card。

"use client";

import { useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
      {/* 引く操作＋トグルを横一列に（囲い枠なし） */}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" className="h-12 px-8 text-base" onClick={draw} disabled={pool.length === 0}>
          <Dices className="size-5" />
          運命の1本を引く
        </Button>
        <label className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[12px]">
          <span>最近見てない優先</span>
          <Switch checked={recentFirst} onCheckedChange={(v) => setRecentFirst(Boolean(v))} />
        </label>
      </div>

      {/* 現在引かれている1本（全幅ワイドカード） */}
      {drawn && current ? (
        <Tier1Card video={current} state={state.getCardState(current)} layout="wide" />
      ) : (
        <p className="text-[12px] text-muted-foreground">
          まだ引いていません。「運命の1本を引く」を押してください。
        </p>
      )}
    </div>
  );
}
