// UIラボ「分析画面」KPIカード（box）＋グリッド。
// 【役割】総動画数・未判定など少数指標を、ダッシュボードらしい個別カードで見せる。accent/補助文言/トーン対応。
// 【設計制約】API/DB に触れない（呼び出し側が固定モック値を渡す）。色はトークン継承。<img> 不使用。
//   ローカル部品（analysis 配下）。既存共通部品は改造しない。
// 【依存関係】lib/utils（cn）のみ。

"use client";

import { cn } from "@/lib/utils";

export type KpiTone = "default" | "primary" | "amber" | "teal";

export interface KpiItem {
  label: string;
  value: string | number;
  sub?: string;
  tone?: KpiTone;
}

const toneValue: Record<KpiTone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  amber: "text-amber-600",
  teal: "text-teal-600",
};

export function AnalysisKpiCard({ item }: { item: KpiItem }) {
  const tone = item.tone ?? "default";
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-card p-3">
      <span className="truncate text-[11px] text-muted-foreground">{item.label}</span>
      <span className={cn("text-2xl leading-none font-semibold tabular-nums", toneValue[tone])}>
        {item.value}
      </span>
      {item.sub && <span className="truncate text-[10px] text-muted-foreground">{item.sub}</span>}
    </div>
  );
}

export function AnalysisKpiGrid({ items, className }: { items: KpiItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6", className)}>
      {items.map((item) => (
        <AnalysisKpiCard key={item.label} item={item} />
      ))}
    </div>
  );
}
