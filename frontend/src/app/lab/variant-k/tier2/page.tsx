// 統合 Variant K Tier2 → /lab/variant-k/tier2
// 【役割】Tier2 二次選別の3タブ（ライブラリ/ランダム/運命の1本）を軽量セグメントで切替えるモック画面。
//   Tier1 と同じ作り（語彙だけ Tier2）。案1/案2 の文言比較トグルや画面上の説明文は持たない（Tier1流用案を正式採用）。
// 【設計制約】
//   - UI LAB モック。API/DB/localStorage/sessionStorage 本体仕様に触れない。
//   - 見出しは「Tier2」のみ。直下に KPI を1回だけ描画し、3タブで共通整合する。
//   - 旧 /lab/tier2-*/variant-k は作らない（本タブ内に3タブを実装）。
// 【依存関係】lucide, lib/utils（cn）, _data/variantKMock, ./Tier2Library, ./Tier2Random, ./Tier2Fate, ./Tier2KpiBar。

"use client";

import { useState } from "react";
import { Dices, Library, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { VARIANT_K_VIDEOS } from "../_data/variantKMock";
import { Tier2Fate } from "./Tier2Fate";
import { Tier2KpiBar } from "./Tier2KpiBar";
import { Tier2Library } from "./Tier2Library";
import { Tier2Random } from "./Tier2Random";
import { useTier2MockCardStates } from "./useTier2MockCardState";

type TabKey = "library" | "random" | "fate";

const TABS: { key: TabKey; label: string; icon: typeof Library }[] = [
  { key: "library", label: "ライブラリ", icon: Library },
  { key: "random", label: "ランダム", icon: Shuffle },
  { key: "fate", label: "運命の1本", icon: Dices },
];

export default function VariantKTier2Page() {
  const [tab, setTab] = useState<TabKey>("library");
  const tier2State = useTier2MockCardStates(VARIANT_K_VIDEOS);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {/* 見出し「Tier2」直下に KPI パネル（3タブ共通でタブ上に1回だけ描画） */}
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Tier2</h1>
          <Tier2KpiBar videos={tier2State.videos} />
        </div>

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

      {tab === "library" ? (
        <Tier2Library state={tier2State} />
      ) : tab === "random" ? (
        <Tier2Random state={tier2State} />
      ) : (
        <Tier2Fate state={tier2State} />
      )}
    </div>
  );
}
