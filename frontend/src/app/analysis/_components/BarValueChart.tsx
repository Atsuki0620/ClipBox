"use client";
// 棒グラフ（Recharts BarChart ラッパ）。
// 【設計制約】Recharts はブラウザ API 依存のため "use client" 必須。新チャートライブラリ追加禁止（recharts ^3.8.1 のみ）。
// 【依存関係】recharts、./EmptyMini。

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyMini } from "./EmptyMini";

type ChartDatum = Record<string, number | string>;

export function BarValueChart({
  data,
  dataKey,
  color,
  empty,
}: {
  data: ChartDatum[];
  dataKey: string;
  color: string;
  empty: string;
}) {
  if (data.length === 0) return <EmptyMini>{empty}</EmptyMini>;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" minTickGap={18} />
          <YAxis allowDecimals={false} width={40} />
          <Tooltip />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
