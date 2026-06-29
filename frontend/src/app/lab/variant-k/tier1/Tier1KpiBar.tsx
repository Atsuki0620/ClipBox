// 統合 Variant K Tier1 KPI バー（軽量・見た目確認用）。
// 【役割】未判定 / 判定済み / 判定率 / 今日の処理目安 を「KPI名→数値→（バー/折れ線）」の横一列で表示。
//   見出し「Tier1」の右側に置き、ライブラリ/ランダム/運命の1本の3タブで共通整合する（タブ上に1回だけ描画）。
// 【設計制約】
//   - Recharts 等は使わず、合成データ（VARIANT_K_TIER1_KPI / TIER1_TODAY_TREND）だけで軽く表示する。
//   - 各 KPI は名前の右に数値、バー/折れ線を含む KPI は数値の右にバー/折れ線を置く（横一列）。
//   - API/DB に触れない。
// 【依存関係】lib/utils（cn）, _data/variantKMock（VARIANT_K_TIER1_KPI, TIER1_TODAY_TREND）。

"use client";

import { cn } from "@/lib/utils";
import { VARIANT_K_TIER1_KPI, TIER1_TODAY_TREND } from "../_data/variantKMock";

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
    <div className="flex items-center gap-1.5 px-3">
      <span className="text-[11px] whitespace-nowrap text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold leading-none tabular-nums", accent && "text-primary")}>
        {value}
      </span>
      {children}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 64;
  const h = 18;
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
    </svg>
  );
}

export function Tier1KpiBar({ className }: { className?: string }) {
  const rate = VARIANT_K_TIER1_KPI.judged_rate;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-y-2 divide-border rounded-lg border bg-card py-1.5 sm:divide-x",
        className,
      )}
    >
      <Cell label="未判定" value={VARIANT_K_TIER1_KPI.unrated_count} accent />
      <Cell label="判定済み" value={VARIANT_K_TIER1_KPI.judged_count.toLocaleString()} />
      <Cell label="判定率" value={`${rate.toFixed(1)}%`}>
        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
        </div>
      </Cell>
      <Cell label="今日の処理目安" value={VARIANT_K_TIER1_KPI.today_target}>
        <Sparkline data={TIER1_TODAY_TREND} />
      </Cell>
    </div>
  );
}
