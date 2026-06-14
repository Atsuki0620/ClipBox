// UIラボ Modern 共通: KPI を1段に集約したバー。
// 【役割】未判定/判定済み/判定率/本日 を1段で。判定率は数値＋コンパクトな横バーで可視化（全幅にしない）。
// 【設計制約】API/DB に触れない。固定モック（LAB_KPI）。色はトークン継承。
// 【依存関係】lib/utils（cn）, _data/labMock（LAB_KPI）。

"use client";

import { cn } from "@/lib/utils";
import { LAB_KPI } from "../_data/labMock";

function Cell({
  label,
  value,
  accent,
  compact,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "leading-none font-semibold tabular-nums",
          compact ? "text-base" : "text-2xl",
          accent && "text-primary",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function RateCell({ rate, compact }: { rate: number; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-1 px-3">
      <span className="text-[11px] text-muted-foreground">判定率</span>
      <div className="flex items-center gap-2">
        <span className={cn("leading-none font-semibold tabular-nums", compact ? "text-base" : "text-2xl")}>
          {rate.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

export function KpiBar({
  variant = "prominent",
  className,
}: {
  variant?: "prominent" | "compact";
  className?: string;
}) {
  const compact = variant === "compact";
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-y-2 divide-border rounded-lg border bg-card sm:grid-cols-4 sm:divide-x",
        compact ? "py-2" : "py-3",
        className,
      )}
    >
      <Cell label="未判定" value={LAB_KPI.unrated_count} accent compact={compact} />
      <Cell label="判定済み" value={LAB_KPI.judged_count.toLocaleString()} compact={compact} />
      <RateCell rate={LAB_KPI.judged_rate} compact={compact} />
      <Cell label="本日の判定" value={LAB_KPI.today_judged_count} compact={compact} />
    </div>
  );
}
