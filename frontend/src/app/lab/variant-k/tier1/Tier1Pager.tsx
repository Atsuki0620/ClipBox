// 統合 Variant K Tier1 ページャ（カード/テーブル領域の直上・直下で共用）。
// 【役割】該当件数・1ページ件数（50/100/200）・前後ページ移動を1行で表示する小コンポーネント。
//   カード/テーブルの上下に同じものを置けるよう状態は持たず、親（Tier1Library）から受け取って委譲する。
// 【設計制約】表示と委譲のみ。API/DB/localStorage に触れない（ページ状態は親のメモリ）。
// 【依存関係】lucide-react, lib/utils（cn）, ./shared（TIER1_PAGE_SIZES）。

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIER1_PAGE_SIZES } from "./shared";

export function Tier1Pager({
  total,
  pageSize,
  onPageSize,
  currentPage,
  pages,
  onPrev,
  onNext,
  className,
}: {
  total: number;
  pageSize: number;
  onPageSize: (size: number) => void;
  currentPage: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span>全 {total} 件（モック）</span>
        <span className="inline-flex items-center gap-1">
          1ページ
          <span className="inline-flex rounded-md border bg-muted/50 p-0.5">
            {TIER1_PAGE_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPageSize(n)}
                className={cn(
                  "rounded-[5px] px-2 py-0.5 font-medium tabular-nums transition-colors",
                  pageSize === n ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n}
              </button>
            ))}
          </span>
          件
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentPage <= 1}
          className="inline-flex size-7 items-center justify-center rounded-md border bg-card transition-colors hover:bg-accent disabled:opacity-40"
          aria-label="前のページ"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <span className="tabular-nums">
          {currentPage} / {pages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= pages}
          className="inline-flex size-7 items-center justify-center rounded-md border bg-card transition-colors hover:bg-accent disabled:opacity-40"
          aria-label="次のページ"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
