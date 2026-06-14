// UIラボ Modern 共通: 数値レベルボタン（未/0/1/2/3/4）。
// 【役割】レベルの「唯一の表現」。表示と設定を兼ねる（D流）。バッジ/プルダウンの重複や同系色の濃淡ドットは使わない。
// 【設計制約】API/DB に触れない。色はトークン継承。アクティブのみ寒色アクセントで強調し、番号で識別。
// 【依存関係】lib/levels（levelName/LEVEL_OPTIONS）, lib/utils（cn）。

"use client";

import { cn } from "@/lib/utils";
import { levelName, LEVEL_OPTIONS } from "@/lib/levels";

export function LevelButtons({
  value,
  onChange,
  disabled,
  size = "sm",
  className,
}: {
  value: number;
  onChange: (level: number) => void;
  disabled?: boolean;
  size?: "sm" | "xs";
  className?: string;
}) {
  const xs = size === "xs";
  return (
    <div
      role="group"
      aria-label="レベル"
      className={cn("inline-grid grid-cols-6 gap-0.5", className)}
    >
      {LEVEL_OPTIONS.map((lv) => {
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
              "rounded font-medium tabular-nums transition-colors disabled:opacity-40",
              xs ? "h-5 text-[10px]" : "h-6 text-[11px]",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {lv === -1 ? "未" : lv}
          </button>
        );
      })}
    </div>
  );
}
