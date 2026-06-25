// UIラボ「分析画面」案A: 概況ダッシュボード型 → /lab/analysis/variant-a
// 【役割】開いた瞬間に ClipBox 全体の状態を把握できる KPI 中心のダッシュボード。KPIカード＋推移＋Tier内訳＋洞察カード。
// 【設計制約】API/DB/localStorage に接続しない。グラフ・KPI はダミー（本体の分析ロジック・集計SQL・APP_PLAYBACK 計算は不変）。
//   テーマはルート div の CSS 変数上書きのみ。サムネ不使用。本体 /analysis は変更しない。
// 【依存関係】LabFrame, ModernSidebar, AnalysisKpi, AnalysisCharts, AnalysisListCard, ANALYSIS_THEME, _data/analysisMock。

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ANALYSIS_THEME, CHART_COLORS } from "../_components/theme";
import { AnalysisKpiGrid } from "../_components/AnalysisKpi";
import { ChartPanel, LineTrendChart, BarValueChart, ProportionBar } from "../_components/AnalysisCharts";
import { AnalysisListCard } from "../_components/AnalysisListCard";
import {
  ANALYSIS_AREA_VARIANTS,
  KPIS,
  TIER_BREAKDOWN,
  LEVEL_BAND_VIEWS,
  RECENTLY_PLAYED,
  NEXT_TO_REVIEW,
  ANALYSIS_VIDEOS,
  PERIOD_TABS,
  trendSeries,
} from "../_data/analysisMock";

export default function AnalysisVariantAPage() {
  const [periodKey, setPeriodKey] = useState<string>("30");
  const days = PERIOD_TABS.find((p) => p.key === periodKey)?.days ?? 30;
  const series = trendSeries(days);
  const unavailable = ANALYSIS_VIDEOS.filter((v) => !v.is_available);

  const kpis = [
    { label: "総動画数", value: KPIS.total_videos },
    { label: "再生可能数", value: KPIS.available_videos, tone: "primary" as const },
    { label: "今月のAPP再生数", value: KPIS.period_app_plays, tone: "primary" as const },
    { label: "判定済み数", value: KPIS.judged },
    { label: "選別済み数", value: KPIS.selection_completed, tone: "teal" as const },
    { label: "あとで見る件数", value: KPIS.watch_later, tone: "amber" as const },
  ];

  return (
    <LabFrame active="a" title="分析・概況" variants={ANALYSIS_AREA_VARIANTS} indexHref="/lab/analysis">
      <div style={ANALYSIS_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="分析" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">分析 ・ 概況</h1>
              <p className="text-xs text-muted-foreground">開いた瞬間に全体状態を把握する（KPI 中心）</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
                {PERIOD_TABS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPeriodKey(p.key)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[12px] transition-colors",
                      p.key === periodKey ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">モック・保存されません</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-950">
            APP_PLAYBACK ベースの集計例（ダミー）。実際の集計・スコアは本体 API で算出します。
          </div>

          <AnalysisKpiGrid items={kpis} />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChartPanel title="APP再生推移" hint={`直近${days}日・ダミー`}>
              <LineTrendChart data={series} dataKey="app_plays" color={CHART_COLORS.primary} />
            </ChartPanel>
            <ChartPanel title="Tier1 / Tier2 状態内訳" hint="判定・選別の進み具合">
              <div className="flex h-52 flex-col justify-center">
                <ProportionBar segments={TIER_BREAKDOWN} />
              </div>
            </ChartPanel>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChartPanel title="よく見ているレベル帯" hint="期間内 APP 再生の合計">
              <BarValueChart data={LEVEL_BAND_VIEWS} dataKey="count" color={CHART_COLORS.cyan} height="h-44" />
            </ChartPanel>
            <AnalysisListCard
              title="最近伸びている動画"
              hint="期間内 APP 再生 上位"
              videos={RECENTLY_PLAYED}
              metric={(v) => `${v.period_view_count}回`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <AnalysisListCard
              title="利用不可動画"
              hint={`${KPIS.unavailable_videos} 件・ドライブ未接続`}
              videos={unavailable}
              metric={() => "未接続"}
              emptyText="利用不可はありません"
            />
            <AnalysisListCard
              title="次に確認したい候補"
              hint="未判定 / 未選別 / あとで見る / 利用不可"
              videos={NEXT_TO_REVIEW}
              metric={(v) => (v.watch_later ? "あとで" : !v.is_available ? "確認" : "未処理")}
            />
          </div>
        </main>
      </div>
    </LabFrame>
  );
}
