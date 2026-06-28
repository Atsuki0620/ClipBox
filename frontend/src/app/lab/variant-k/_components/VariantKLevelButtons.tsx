// 統合 Variant K 汎用レベルボタン群（Tier1 判定 / Tier2 選別で共有）。
// 【役割】表示＝設定を兼ねる数値/状態レベルボタン。現在値を強調する。列数は options 数から自動算出。
// 【設計制約】
//   - API/DB に触れない。見た目のみ（onChange で値を返すだけ）。
//   - 値型は number（Tier1: -1=未, 0..4）／union（Tier2: "unselected" | 0..4）の双方を扱えるよう options 駆動。
//   - 「判定」「選別」などのラベルはカード側で出さない（呼び出し側で省く）。
// 【依存関係】lib/utils（cn）。
"use client";

import { cn } from "@/lib/utils";

export type VariantKLevelOption<T extends string | number> = {
  value: T;
  label: string;
  title?: string;
};

export function VariantKLevelButtons<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: VariantKLevelOption<T>[];
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("inline-grid gap-0.5", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={opt.title ?? opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-6 rounded text-[10.5px] font-medium tabular-nums transition-colors disabled:opacity-40",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
