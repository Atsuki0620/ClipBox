// 統合 Variant K Tier1 → /lab/variant-k/tier1
// 【役割】Tier1 一次判定の3タブ（ライブラリ/ランダム/運命の一本）を軽量セグメントで切替えるモック画面。
// 【設計制約】
//   - UI LAB モック。API/DB/localStorage/sessionStorage 本体仕様に触れない。
//   - 見出しは「Tier1」のみ。displayContext="tier1" 前提。Tier1 はセレクション操作を出さない。
//   - 旧 /lab/tier1-*/variant-k は作らない（本タブ内に3タブを実装）。
// 【依存関係】lucide, lib/utils（cn）, ./Tier1Library, ./Tier1Random, ./Tier1Fate。

"use client";

import { useState } from "react";
import { Library, Shuffle, Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tier1Library } from "./Tier1Library";
import { Tier1Random } from "./Tier1Random";
import { Tier1Fate } from "./Tier1Fate";

type TabKey = "library" | "random" | "fate";

const TABS: { key: TabKey; label: string; icon: typeof Library }[] = [
  { key: "library", label: "ライブラリ", icon: Library },
  { key: "random", label: "ランダム", icon: Shuffle },
  { key: "fate", label: "運命の一本", icon: Dices },
];

export default function VariantKTier1Page() {
  const [tab, setTab] = useState<TabKey>("library");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Tier1</h1>

        {/* タブ（左寄せセグメント） */}
        <div className="inline-flex w-fit rounded-lg border bg-muted/40 p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                tab === key
                  ? "bg-card font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "library" ? <Tier1Library /> : tab === "random" ? <Tier1Random /> : <Tier1Fate />}
    </div>
  );
}
