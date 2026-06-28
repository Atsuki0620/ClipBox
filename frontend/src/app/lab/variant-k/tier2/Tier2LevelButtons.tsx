// 統合 Variant K Tier2 選別レベルボタン（未選別/Lv0..4）。
// 【役割】Tier2 の選別操作。表示＝設定を兼ねる状態ボタン。現在状態を強調表示する。
// 【設計制約】API/DB に触れない。Tier1 の LevelButtons と共通化しない。
// 【依存関係】lib/levels（levelName）, lib/utils（cn）, ./shared（TIER2_LEVELS）。

"use client";

import { levelName } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { TIER2_LEVELS, type Tier2SelectionValue } from "./shared";

function selectionLabel(value: Tier2SelectionValue): string {
  return value === "unselected" ? "未選別" : levelName(value);
}

export function Tier2LevelButtons({
  value,
  onChange,
  disabled,
  className,
}: {
  value: Tier2SelectionValue;
  onChange: (value: Tier2SelectionValue) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label="選別状態" className={cn("inline-grid grid-cols-6 gap-0.5", className)}>
      {TIER2_LEVELS.map((option) => {
        const active = value === option;
        const label = selectionLabel(option);
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={label}
            onClick={() => onChange(option)}
            className={cn(
              "h-6 rounded text-[10.5px] font-medium tabular-nums transition-colors disabled:opacity-40",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
