// UIラボ Tier1 運命の1本 Variant J: 操作ツールバー（タブ＋最近見てない優先＋引く＋クリア）。
// 【役割】左にエリアタブ（運命の1本 強調）、右に「最近見てない優先」トグル・主ボタン「運命の1本を引く」・「クリア」。
//   ライブラリ J のツールバー流儀（タブ左・操作右）を踏襲。引く操作を主役にしつつ派手にしない。
// 【設計制約】API/DB に触れない。状態は親が保持（controlled）。色はトークン継承。
// 【依存関係】shadcn(Switch/Button), lucide(Dices), lib/utils(cn), ../../_components/Tier1AreaTabs。

"use client";

import { Dices } from "lucide-react";
import { Tier1AreaTabs } from "../../_components/Tier1AreaTabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function FateControls({
  recentlyUnwatchedFirst,
  onRecentlyUnwatchedFirst,
  onDraw,
  onClear,
  canClear,
}: {
  recentlyUnwatchedFirst: boolean;
  onRecentlyUnwatchedFirst: (v: boolean) => void;
  onDraw: () => void;
  onClear: () => void;
  canClear: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* タブ（左・運命の1本 強調） */}
      <Tier1AreaTabs active="fate" />

      {/* 右クラスタ（優先トグル・引く・クリア） */}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[12px]">
          <span>最近見てない優先</span>
          <Switch
            checked={recentlyUnwatchedFirst}
            onCheckedChange={(v) => onRecentlyUnwatchedFirst(Boolean(v))}
          />
        </label>

        <Button size="sm" className="h-7 px-3" onClick={onDraw}>
          <Dices className="size-3.5" />
          運命の1本を引く
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5"
          onClick={onClear}
          disabled={!canClear}
        >
          クリア
        </Button>
      </div>
    </div>
  );
}
