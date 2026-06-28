// 統合 Variant K Tier1 判定レベルボタン（Lv0..4）。
// 【役割】Tier1 の判定操作。表示＝設定を兼ねる数値レベルボタン。現在レベルを強調表示する。
// 【設計制約】
//   - 段階3では Lv0〜Lv4 のみ（未判定へ戻す操作は出さない）。
//   - 共有 LevelButtons は -1（未）を含むため、Tier1 用に別実装（共有部品は改変しない read-only 方針）。
//   - API/DB に触れない。色はトークン継承。
// 【依存関係】lib/levels（levelName）, lib/utils（cn）, ./shared（TIER1_LEVELS）。

"use client";

import { cn } from "@/lib/utils";
import { levelName } from "@/lib/levels";
import { TIER1_LEVELS } from "./shared";

export function Tier1LevelButtons({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number;
  onChange: (level: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label="判定レベル" className={cn("inline-grid grid-cols-5 gap-0.5", className)}>
      {TIER1_LEVELS.map((lv) => {
        const active = value === lv;
        return (
          <button
            key={lv}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={levelName(lv)}
            onClick={() => onChange(lv)}
            className={cn(
              "h-6 rounded text-[11px] font-medium tabular-nums transition-colors disabled:opacity-40",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {levelName(lv)}
          </button>
        );
      })}
    </div>
  );
}
