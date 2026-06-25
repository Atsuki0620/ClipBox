// UIラボ「分析画面」チャート部品。
// 【役割】Recharts（導入済み・新規依存なし）の Line/Bar ラッパに加え、依存なしの div ベース割合バー・進捗バーを提供する。
//   グラフは見た目検証用で、データはダミー（本体集計ではない）。
// 【設計制約】API/DB に触れない。globals.css は変更しない。色は theme の CHART_COLORS（寒色系 hex）を使う。
//   ローカル部品（analysis 配下）。既存共通部品は改造しない。
// 【依存関係】recharts（本体 /analysis と同じ）, lib/utils(cn), ./theme（CHART_COLORS）。

"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { CHART_COLORS } from "./theme";

type Datum = Record<string, number | string>;

export function ChartPanel({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-lg border bg-card p-3", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function EmptyMini({ children, height = "h-44" }: { children: ReactNode; height?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border border-dashed bg-muted/30 p-4 text-center text-[12px] text-muted-foreground",
        height,
      )}
    >
      {children}
    </div>
  );
}

export function LineTrendChart({
  data,
  dataKey,
  color = CHART_COLORS.primary,
  height = "h-52",
}: {
  data: Datum[];
  dataKey: string;
  color?: string;
  height?: string;
}) {
  if (data.length === 0) return <EmptyMini height={height}>データがありません。</EmptyMini>;
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MultiLineTrendChart({
  data,
  series,
  height = "h-64",
}: {
  data: Datum[];
  series: { dataKey: string; color: string; name: string }[];
  height?: string;
}) {
  if (data.length === 0) return <EmptyMini height={height}>データがありません。</EmptyMini>;
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} />
          <Tooltip />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarValueChart({
  data,
  dataKey,
  color = CHART_COLORS.violet,
  height = "h-52",
}: {
  data: Datum[];
  dataKey: string;
  color?: string;
  height?: string;
}) {
  if (data.length === 0) return <EmptyMini height={height}>データがありません。</EmptyMini>;
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" minTickGap={8} tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 依存なしの割合バー（Tier 内訳・比率）。合計に対する各セグメントの幅を div で表現する。
const segmentTone: Record<string, string> = {
  primary: "bg-primary",
  muted: "bg-muted-foreground/40",
  teal: "bg-teal-500",
  amber: "bg-amber-500",
};

export function ProportionBar({
  segments,
}: {
  segments: { label: string; count: number; tone: keyof typeof segmentTone }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.count, 0) || 1;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full border">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={cn("h-full", segmentTone[seg.tone])}
            style={{ width: `${(seg.count / total) * 100}%` }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-1.5">
            <span className={cn("size-2 shrink-0 rounded-sm", segmentTone[seg.tone])} />
            <span className="flex-1 truncate text-muted-foreground">{seg.label}</span>
            <span className="tabular-nums">{seg.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 依存なしの横棒リスト（レベル別分布など）。Recharts の ResponsiveContainer 計測ゆらぎを避けたい小さな分布に使う。
export function MiniBarList({
  data,
  color = "bg-primary",
}: {
  data: { label: string; count: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex flex-col gap-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-[11px]">
          <span className="w-12 shrink-0 text-muted-foreground">{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", color)} style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
          <span className="w-5 shrink-0 text-right tabular-nums">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

// 進捗バー（Tier1 判定進捗・Tier2 選別進捗）。
export function ProgressRow({
  label,
  value,
  sub,
  color = "bg-primary",
}: {
  label: string;
  value: number; // 0..100
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}%{sub ? ` ・ ${sub}` : ""}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}
