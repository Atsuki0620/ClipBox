// 統合 Variant K Tier2 KPI バー（軽量・見た目確認用）。
// 【役割】未選別 / 選別済み / 選別率 / 本日の選別数 を「KPI名→数値→（バー/折れ線）」の横一列で表示。
//   Tier1KpiBar と同じ見た目（カード枠サイズ据え置きでラベル文字・数値を大きく）。値はページ内状態から算出。
// 【設計制約】
//   - Recharts 等は使わず、合成データ＋ページ内状態だけで軽く表示する。
//   - 各 KPI は名前の右に数値、バー/折れ線を含む KPI は数値の右にバー/折れ線を置く（横一列）。
//   - API/DB に触れない。
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
  withDivider = false,
  children,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  withDivider?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[3.75rem] items-center justify-between gap-3 px-3 py-2.5",
        withDivider &&
          "lg:before:absolute lg:before:bottom-3 lg:before:left-0 lg:before:top-3 lg:before:w-px lg:before:bg-border lg:before:content-['']",
      )}
    >
      <span className="min-w-0 text-[13px] font-medium text-muted-foreground">{label}</span>
      <div className="flex shrink-0 items-center gap-3">
        <span className={cn("text-3xl font-semibold leading-none tabular-nums", accent && "text-primary")}>
          {value}
        </span>
        {children}
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 96;
  const h = 28;
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
        strokeWidth="2"
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
        "grid w-full overflow-hidden rounded-lg border bg-card p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      <Cell label="未選別" value={unselected} accent />
      <Cell label="選別済み" value={completed.toLocaleString()} withDivider />
      <Cell label="選別率" value={`${rate.toFixed(1)}%`} withDivider>
        <div className="h-2.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
        </div>
      </Cell>
      <Cell label="本日の選別数" value={todaySelected} withDivider>
        <Sparkline data={TIER2_TODAY_TREND} />
      </Cell>
    </div>
  );
}
