// 統合 Variant K のタイトル横 Tooltip ラベル。
// 【役割】長い説明をタイトル横の Tooltip へ逃がす共通土台。ラベル＋情報アイコンにホバーで説明を出す。
// 【設計制約】TooltipProvider は root の app/providers で全体に入っている前提（再ラップしない）。表示のみ。
// 【依存関係】lucide-react, lib/utils（cn）, shadcn tooltip。

"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function VariantKTooltipLabel({
  label,
  tooltip,
  className,
}: {
  label: ReactNode;
  tooltip: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {label}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="説明"
              className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <Info className="size-3.5" />
            </button>
          }
        />
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </span>
  );
}
