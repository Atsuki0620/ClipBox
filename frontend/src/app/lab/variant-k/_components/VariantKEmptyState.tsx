// 統合 Variant K の空状態。
// 【役割】一覧・検索結果などが空のときの共通プレースホルダ表示土台。
// 【設計制約】表示のみ。API/DB に触れない。
// 【依存関係】lib/utils（cn）。

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function VariantKEmptyState({
  title,
  description,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <div className="text-sm font-medium">{title}</div>
      {description ? (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
