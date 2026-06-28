// 統合 Variant K のセクション見出し。
// 【役割】画面内セクション（タイトル＋任意の補足＋右側スロット）の共通見出し土台。
// 【設計制約】表示のみ。API/DB に触れない。
// 【依存関係】lib/utils（cn）。

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function VariantKSectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-2", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
