// 統合 Variant K Tier2 → /lab/variant-k/tier2
// 【役割】Tier2 二次選別の3タブ（ライブラリ/ランダム/運命の1本）と、案1/案2の文言比較トグルを表示する。
// 【設計制約】
//   - UI LAB モック。API/DB/localStorage/sessionStorage 本体仕様に触れない。
//   - 旧 /lab/tier2-*/variant-k は作らない（本タブ内に3タブを実装）。
//   - 案1/案2の差分は文言レイヤーに限定し、カード構造・操作・状態管理は共有する。
// 【依存関係】lucide, lib/utils（cn）, _data/variantKMock, ./Tier2Library, ./Tier2Random, ./Tier2Fate。

"use client";

import { useState } from "react";
import { Dices, Library, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { VARIANT_K_VIDEOS } from "../_data/variantKMock";
import { Tier2Fate } from "./Tier2Fate";
import { Tier2Library } from "./Tier2Library";
import { Tier2Random } from "./Tier2Random";
import { TIER2_COPY, type Tier2CopyVariant } from "./shared";
import { useTier2MockCardStates } from "./useTier2MockCardState";

type TabKey = "library" | "random" | "fate";

const TABS: { key: TabKey; label: string; icon: typeof Library }[] = [
  { key: "library", label: "ライブラリ", icon: Library },
  { key: "random", label: "ランダム", icon: Shuffle },
  { key: "fate", label: "運命の1本", icon: Dices },
];

const COPY_VARIANTS: { key: Tier2CopyVariant; label: string }[] = [
  { key: "reuse", label: "案1: Tier1流用案" },
  { key: "selection", label: "案2: Tier2専用文言強め案" },
];

export default function VariantKTier2Page() {
  const [tab, setTab] = useState<TabKey>("library");
  const [copyVariant, setCopyVariant] = useState<Tier2CopyVariant>("reuse");
  const tier2State = useTier2MockCardStates(VARIANT_K_VIDEOS);
  const copy = TIER2_COPY[copyVariant];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-lg font-semibold tracking-tight">Tier2</h1>
            <p className="max-w-2xl text-xs text-muted-foreground">{copy.pageDescription}</p>
          </div>

          <div className="inline-flex rounded-lg border bg-muted/40 p-1">
            {COPY_VARIANTS.map((variant) => (
              <button
                key={variant.key}
                type="button"
                onClick={() => setCopyVariant(variant.key)}
                aria-pressed={copyVariant === variant.key}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                  copyVariant === variant.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {variant.label}
              </button>
            ))}
          </div>
        </div>

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
        <Tier2Library state={tier2State} copy={copy} />
      ) : tab === "random" ? (
        <Tier2Random state={tier2State} copy={copy} />
      ) : (
        <Tier2Fate state={tier2State} copy={copy} />
      )}
    </div>
  );
}
