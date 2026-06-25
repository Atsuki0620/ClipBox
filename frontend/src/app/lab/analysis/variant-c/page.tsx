// UIラボ「分析画面」案C: 進捗・偏り・次アクション型 → /lab/analysis/variant-c
// 【役割】数字を見るだけでなく「次に何を見る/整理するか」につながる運用ダッシュボード。進捗・偏り・次アクション・ランキング連動。
// 【設計制約】API/DB/localStorage に接続しない。値はダミー（本体の分析ロジック・集計SQL・APP_PLAYBACK 計算は不変）。
//   次アクションは導線の見た目のみ（遷移・書き込みしない）。テーマはルート div の CSS 変数上書きのみ。サムネ不使用。
// 【依存関係】LabFrame, ModernSidebar, AnalysisKpi, AnalysisCharts, AnalysisListCard, ANALYSIS_THEME, _data/analysisMock。

"use client";

import { ListChecks, Bookmark, Eye, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ANALYSIS_THEME } from "../_components/theme";
import { AnalysisKpiGrid } from "../_components/AnalysisKpi";
import { ChartPanel, MiniBarList, ProgressRow } from "../_components/AnalysisCharts";
import { AnalysisListCard } from "../_components/AnalysisListCard";
import {
  ANALYSIS_AREA_VARIANTS,
  KPIS,
  PROGRESS,
  BIAS,
  LEVEL_DISTRIBUTION,
  STALE_HIGH_LEVEL,
  RECENTLY_PLAYED,
  LONG_NOT_VIEWED,
  LIKED_NOT_RECENT,
  daysSince,
} from "../_data/analysisMock";

const NEXT_ACTIONS = [
  { icon: ListChecks, label: "未判定を処理する", count: KPIS.unrated },
  { icon: Bookmark, label: "あとで見るを整理する", count: KPIS.watch_later },
  { icon: Eye, label: "最近見ていない高レベルを見る", count: STALE_HIGH_LEVEL.length },
  { icon: AlertTriangle, label: "利用不可動画を確認する", count: KPIS.unavailable_videos },
];

const BIAS_CARDS = [
  { title: "Lv0 に偏り", value: `${BIAS.lv0_rate}%`, note: "判定済みのうち Lv0 の割合。基準が辛めかも。" },
  { title: "再生が一部に集中", value: `${BIAS.top_play_share}%`, note: "期間内 APP 再生の最多1本が占める割合。" },
  { title: "外付けHDD相当が利用不可", value: `${BIAS.hdd_unavailable} 本`, note: "ドライブ未接続。接続を確認。" },
];

function lastSeenLabel(iso: string | null): string {
  const d = daysSince(iso);
  return d === null ? "履歴なし" : `${d}日前`;
}

export default function AnalysisVariantCPage() {
  const kpis = [
    { label: "未判定", value: KPIS.unrated, tone: "primary" as const },
    { label: "未選別", value: KPIS.needs_selection, tone: "primary" as const },
    { label: "あとで見る", value: KPIS.watch_later, tone: "amber" as const },
    { label: "利用不可", value: KPIS.unavailable_videos, tone: "default" as const },
    { label: "最近見ていない高レベル", value: STALE_HIGH_LEVEL.length, tone: "teal" as const },
  ];

  return (
    <LabFrame active="c" title="分析・進捗・次アクション" variants={ANALYSIS_AREA_VARIANTS} indexHref="/lab/analysis">
      <div style={ANALYSIS_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="分析" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">分析 ・ 進捗・次アクション</h1>
              <p className="text-xs text-muted-foreground">作業の詰まりを見つけ、次に何をするかにつなげる運用ダッシュボード</p>
            </div>
            <span className="text-[11px] text-muted-foreground">モック・保存されません</span>
          </div>

          <AnalysisKpiGrid items={kpis} className="lg:grid-cols-5" />

          {/* 進捗 */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="flex flex-col gap-3 rounded-lg border bg-card p-3">
              <h2 className="text-sm font-semibold">進捗</h2>
              <ProgressRow
                label="Tier1 判定進捗"
                value={PROGRESS.tier1_judged_rate}
                sub={`${KPIS.judged}/${KPIS.tier1_total}`}
              />
              <ProgressRow
                label="Tier2 選別進捗"
                value={PROGRESS.tier2_selected_rate}
                sub={`${KPIS.selection_completed}/${KPIS.tier2_total}`}
                color="bg-teal-500"
              />
            </section>
            <ChartPanel title="レベル別分布" hint="Tier1">
              <MiniBarList data={LEVEL_DISTRIBUTION} color="bg-violet-500" />
            </ChartPanel>
          </div>

          {/* 偏り */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {BIAS_CARDS.map((b) => (
              <div key={b.title} className="flex flex-col gap-1 rounded-lg border bg-card p-3">
                <span className="text-[11px] text-muted-foreground">{b.title}</span>
                <span className="text-xl font-semibold tabular-nums text-primary">{b.value}</span>
                <span className="text-[10px] text-muted-foreground">{b.note}</span>
              </div>
            ))}
          </div>

          {/* 次アクション候補 */}
          <section className="flex flex-col gap-2 rounded-lg border bg-card p-3">
            <h2 className="text-sm font-semibold">次アクション候補</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {NEXT_ACTIONS.map(({ icon: Icon, label, count }) => (
                <button
                  key={label}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-left text-[12px] transition-colors hover:border-primary/40 hover:bg-muted/40",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span className="flex-1">{label}</span>
                  <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-medium tabular-nums text-primary">
                    {count}
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </section>

          {/* 小ランキング連動 */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <AnalysisListCard
              title="最近よく見た"
              hint="期間内 APP 再生"
              videos={RECENTLY_PLAYED}
              metric={(v) => `${v.period_view_count}回`}
            />
            <AnalysisListCard
              title="長く見ていない"
              hint="Lv2 以上・最終再生が古い順"
              videos={LONG_NOT_VIEWED}
              metric={(v) => lastSeenLabel(v.last_viewed)}
            />
            <AnalysisListCard
              title="いいね済みだが最近見ていない"
              hint="♡あり・60日以上"
              videos={LIKED_NOT_RECENT}
              metric={(v) => `♡${v.like_count}`}
            />
          </div>
        </main>
      </div>
    </LabFrame>
  );
}
