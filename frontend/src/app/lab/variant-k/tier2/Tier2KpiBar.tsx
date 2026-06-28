// 統合 Variant K Tier2 KPI バー（軽量・見た目確認用）。
// 【役割】未選別 / 選別済み / 選別率 / 本日の選別数を1段で表示する。
// 【設計制約】Recharts 等は使わない。API/DB に触れない。合成データとページ内状態だけを見る。
// 【依存関係】lib/utils（cn）, _data/variantKMock（VariantKVideo 型）, ./shared。

"use client";

import { cn } from "@/lib/utils";
import type { VariantKVideo } from "../_data/variantKMock";
import { isTier2Completed, isTier2Target, isTier2Unselected } from "./shared";

const TIER2_TODAY_TREND = [3, 5, 2, 4, 6, 3, 7, 4, 5, 8, 6, 7, 5, 9, 6, 8, 10, 7, 8, 11, 9, 12, 8, 10, 13, 9, 11, 14, 12, 15];

function todayIsoDate(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

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
        <span className={cn("text-xl font-semibold leading-none tabular-nums", accent && "text-primary")}>
          {value}
        </span>
        {children}
      </div>
    </div>
  );
}

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
    </svg>
  );
}

export function Tier2KpiBar({ videos, className }: { videos: VariantKVideo[]; className?: string }) {
  const tier2Videos = videos.filter(isTier2Target);
  const unselected = tier2Videos.filter(isTier2Unselected).length;
  const completed = tier2Videos.filter(isTier2Completed).length;
  const rate = tier2Videos.length === 0 ? 0 : (completed / tier2Videos.length) * 100;
  const today = todayIsoDate();
  const todaySelected = tier2Videos.filter((video) => video.selected_at === today).length;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-y-2 divide-border rounded-lg border bg-card py-2 sm:divide-x md:grid-cols-4",
        className,
      )}
    >
      <Cell label="未選別" value={unselected} accent />
      <Cell label="選別済み" value={completed} />
      <Cell label="選別率" value={`${rate.toFixed(1)}%`}>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
        </div>
      </Cell>
      <Cell label="本日の選別数" value={todaySelected}>
        <Sparkline data={TIER2_TODAY_TREND} />
      </Cell>
    </div>
  );
}
