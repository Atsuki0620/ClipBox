// UIラボ 共通: 「簡略表示」KPI ストリップ（Variant J テイスト・セル可変）。
// 【役割】未判定/本日の判定 など少数の指標を 1段でコンパクトに。bar=率の横バー / spark=直近の折れ線（軸なし）。
//   ライブラリ J（JKpiBar）の見た目・高さ感を踏襲しつつ、ランダム/運命の各ページが必要なセルだけ渡す。
// 【設計制約】API/DB に触れない（呼び出し側が固定モック値を渡す）。色はトークン継承。<img> 不使用。
// 【依存関係】lib/utils（cn）のみ。

"use client";

import { cn } from "@/lib/utils";

export type KpiCell = {
  label: string;
  value: string | number;
  accent?: boolean;
  bar?: number; // 0..100 の率を横バー表示
  spark?: number[]; // 直近トレンドの折れ線
};

// 直近トレンドの折れ線（軸なし・スパークラインのみ）。JKpiBar と同一実装。
function Sparkline({ data }: { data: number[] }) {
  const w = 72;
  const h = 22;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const points = data
    .map((d, i) => `${(i * step).toFixed(1)},${(h - ((d - min) / span) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={w.toFixed(1)}
        cy={(h - ((data[data.length - 1] - min) / span) * h).toFixed(1)}
        r="1.8"
        fill="var(--primary)"
      />
    </svg>
  );
}

function Cell({ label, value, accent, bar, spark }: KpiCell) {
  return (
    <div className="flex flex-col gap-1 px-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn("text-xl leading-none font-semibold tabular-nums", accent && "text-primary")}>
          {value}
        </span>
        {bar !== undefined && (
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${bar}%` }} />
          </div>
        )}
        {spark && <Sparkline data={spark} />}
      </div>
    </div>
  );
}

export function ConsoleKpi({ cells, className }: { cells: KpiCell[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-y-2 divide-border rounded-lg border bg-card py-2 sm:grid-cols-2 sm:divide-x md:grid-cols-3",
        className,
      )}
    >
      {cells.map((cell) => (
        <Cell key={cell.label} {...cell} />
      ))}
    </div>
  );
}
