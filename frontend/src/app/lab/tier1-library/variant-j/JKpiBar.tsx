// UIラボ Variant J: KPI バー（高さ控えめ・判定率は右に横バー・本日は右に折れ線スパークライン）。
// 【役割】未判定/判定済み/判定率/本日 を1段。配置は G を踏襲しつつ、率＝数値＋右バー、本日＝数値＋右スパークライン。
// 【設計制約】API/DB に触れない。固定モック（LAB_KPI ＋ shared.TODAY_TREND）。色はトークン継承。
// 【依存関係】lib/utils（cn）, _data/labMock（LAB_KPI）, ./shared（TODAY_TREND）。

"use client";

import { cn } from "@/lib/utils";
import { LAB_KPI } from "../../_data/labMock";
import { TODAY_TREND } from "./shared";

function Cell({
  label,
  value,
  accent,
  children,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn("text-xl leading-none font-semibold tabular-nums", accent && "text-primary")}>
          {value}
        </span>
        {children}
      </div>
    </div>
  );
}

// 直近30日の折れ線（軸なし・スパークラインのみ）。
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
        cx={(w).toFixed(1)}
        cy={(h - ((data[data.length - 1] - min) / span) * h).toFixed(1)}
        r="1.8"
        fill="var(--primary)"
      />
    </svg>
  );
}

export function JKpiBar({ className }: { className?: string }) {
  const rate = LAB_KPI.judged_rate;
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-y-2 divide-border rounded-lg border bg-card py-2 sm:grid-cols-4 sm:divide-x",
        className,
      )}
    >
      <Cell label="未判定" value={LAB_KPI.unrated_count} accent />
      <Cell label="判定済み" value={LAB_KPI.judged_count.toLocaleString()} />
      <Cell label="判定率" value={`${rate.toFixed(1)}%`}>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
        </div>
      </Cell>
      <Cell label="本日の判定" value={LAB_KPI.today_judged_count}>
        <Sparkline data={TODAY_TREND} />
      </Cell>
    </div>
  );
}
