// 統合 Variant K Tier2 ページャ（カード/テーブル領域の直上・直下で共用）。
// 【役割】該当件数ステータスと前後ページ移動を1行で表示する小コンポーネント（Tier1Pager と同じ作り）。
//   1ページ件数切替は上部ツールバー側に一本化し、下側ページャでは重複させない。
// 【設計制約】表示と委譲のみ。API/DB/localStorage に触れない（ページ状態は親のメモリ）。
// 【依存関係】lucide-react, lib/utils（cn）。

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Tier2Pager({
  total,
  pageSize,
  currentPage,
  pages,
  onPrev,
  onNext,
  className,
}: {
  total: number;
  pageSize: number;
  currentPage: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(total, currentPage * pageSize);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] text-muted-foreground",
        className,
      )}
    >
      <span className="tabular-nums">
        {total}件中 {start}–{end}件を表示
      </span>
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
