"use client";
// 作業量・結果分布 タブ — Tier1/Tier2 の判定件数KPIと分布グラフ（Stage B）。
// 【設計制約】Tier1 判定推移は judgment-trend?tier=1、Tier2 は selection-trend/selection-distribution を使う。
//   分布集計は getAnalysisData のフロント集計に依存。selection-trend は日次固定。
// 【依存関係】@/lib/api、@/lib/types、@/lib/levels、@/components/KpiCard、../_components/ 配下。

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAnalysisData,
  getJudgmentTrend,
  getKpi,
  getSelectionDistribution,
  getSelectionKpi,
  getSelectionTrend,
} from "@/lib/api";
import { levelName } from "@/lib/levels";
import type {
  AnalysisAvailability,
  AnalysisBucket,
  AnalysisPeriodPreset,
  AnalysisQuery,
  AnalysisTrendQuery,
  AnalysisVideoRecord,
  SelectionDistributionItem,
  SelectionTrendItem,
} from "@/lib/types";
import { KpiCard } from "@/components/KpiCard";
import { BarValueChart } from "../_components/BarValueChart";
import { ChartPanel } from "../_components/ChartPanel";
import { EmptyMini } from "../_components/EmptyMini";
import { LineTrendChart } from "../_components/LineTrendChart";

type Bucket = AnalysisBucket;
type ChartDatum = Record<string, number | string>;

type WorkloadDistributionTabProps = {
  period: AnalysisPeriodPreset;
  customStart: string;
  customEnd: string;
  availability: AnalysisAvailability;
  includeDeleted: boolean;
  bucket: Bucket;
};

export function WorkloadDistributionTab({
  period,
  customStart,
  customEnd,
  availability,
  includeDeleted,
  bucket,
}: WorkloadDistributionTabProps) {
  const validationError = useMemo(
    () => validatePeriod(period, customStart, customEnd),
    [period, customStart, customEnd],
  );
  const enabled = validationError == null;

  const analysisQuery: AnalysisQuery = useMemo(
    () => ({
      period,
      start: period === "カスタム" ? customStart : undefined,
      end: period === "カスタム" ? customEnd : undefined,
      availability,
      include_deleted: includeDeleted,
    }),
    [availability, customEnd, customStart, includeDeleted, period],
  );

  const trendQuery: AnalysisTrendQuery = useMemo(
    () => ({ ...analysisQuery, bucket }),
    [analysisQuery, bucket],
  );
  const tier1TrendQuery: AnalysisTrendQuery = useMemo(
    () => ({ ...trendQuery, tier: 1 as const }),
    [trendQuery],
  );

  const historyRange = useMemo(
    () => getHistoryRange(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  const kpiQ = useQuery({ queryKey: ["kpi"], queryFn: getKpi });
  const selectionKpiQ = useQuery({
    queryKey: ["selection-kpi"],
    queryFn: () => getSelectionKpi(),
  });
  const analysisQ = useQuery({
    queryKey: ["analysis", "data", analysisQuery],
    queryFn: () => getAnalysisData(analysisQuery),
    enabled,
  });
  const tier1JudgmentTrendQ = useQuery({
    queryKey: ["analysis", "judgment-trend", tier1TrendQuery],
    queryFn: () => getJudgmentTrend(tier1TrendQuery),
    enabled,
  });
  const selectionTrendQ = useQuery({
    queryKey: ["analysis", "selection-trend", historyRange],
    queryFn: () => getSelectionTrend(historyRange),
    enabled,
  });
  const selectionDistributionQ = useQuery({
    queryKey: ["analysis", "selection-distribution"],
    queryFn: getSelectionDistribution,
  });

  const levelDistribution = useMemo(
    () => buildLevelDistribution(analysisQ.data?.items ?? []),
    [analysisQ.data],
  );
  const tier1JudgmentTrend = useMemo<ChartDatum[]>(
    () =>
      (tier1JudgmentTrendQ.data ?? []).map((d) => ({
        label: d.label,
        count: d.count,
      })),
    [tier1JudgmentTrendQ.data],
  );
  const selectionTrend = useMemo(
    () => buildSelectionTrend(selectionTrendQ.data ?? [], bucket),
    [bucket, selectionTrendQ.data],
  );
  const selectionDistribution = useMemo(
    () => buildSelectionDistribution(selectionDistributionQ.data ?? []),
    [selectionDistributionQ.data],
  );

  return (
    <div className="mt-4 flex flex-col gap-4">
      {validationError && <ErrorBox message={validationError} />}

      <div className="flex flex-wrap gap-3">
        <KpiCard
          label="未判定（Tier1）"
          value={kpiQ.data?.unrated_count ?? 0}
        />
        <KpiCard
          label="今日のTier1判定"
          value={kpiQ.data?.today_judged_count ?? 0}
        />
        <KpiCard
          label="未選別（Tier2）"
          value={selectionKpiQ.data?.unselected_count ?? 0}
        />
        <KpiCard
          label="今日のTier2選別"
          value={selectionKpiQ.data?.today_judged_count ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartPanel title="Tier1 判定数推移">
          {tier1JudgmentTrendQ.isLoading ? (
            <EmptyMini>読み込み中...</EmptyMini>
          ) : tier1JudgmentTrendQ.isError ? (
            <ErrorBox error={tier1JudgmentTrendQ.error} />
          ) : (
            <LineTrendChart
              data={tier1JudgmentTrend}
              dataKey="count"
              color="#16a34a"
              empty="Tier1 判定履歴がありません。"
            />
          )}
        </ChartPanel>

        <ChartPanel title="Tier1 レベル分布">
          {analysisQ.isLoading ? (
            <EmptyMini>読み込み中...</EmptyMini>
          ) : analysisQ.isError ? (
            <ErrorBox error={analysisQ.error} />
          ) : (
            <BarValueChart
              data={levelDistribution}
              dataKey="count"
              color="#7c3aed"
              empty="レベル分布を表示できません。"
            />
          )}
        </ChartPanel>

        <ChartPanel
          title="Tier2 選別数推移"
          note="日次集計のみ（bucket 設定は反映されません）"
        >
          {selectionTrendQ.isLoading ? (
            <EmptyMini>読み込み中...</EmptyMini>
          ) : selectionTrendQ.isError ? (
            <ErrorBox error={selectionTrendQ.error} />
          ) : (
            <LineTrendChart
              data={selectionTrend}
              dataKey="count"
              color="#0d9488"
              empty="選別履歴がありません。"
            />
          )}
        </ChartPanel>

        <ChartPanel title="Tier2 選別レベル分布">
          {selectionDistributionQ.isLoading ? (
            <EmptyMini>読み込み中...</EmptyMini>
          ) : selectionDistributionQ.isError ? (
            <ErrorBox error={selectionDistributionQ.error} />
          ) : (
            <BarValueChart
              data={selectionDistribution}
              dataKey="count"
              color="#be123c"
              empty="選別レベル分布がありません。"
            />
          )}
        </ChartPanel>
      </div>
    </div>
  );
}

function ErrorBox({ error, message }: { error?: unknown; message?: string }) {
  const text =
    message ??
    (error instanceof Error ? error.message : "不明なエラーが発生しました。");
  return (
    <div className="rounded-md border border-destructive p-4 text-sm text-destructive">
      {text}
    </div>
  );
}

// ---- pure helpers ----

function buildLevelDistribution(records: AnalysisVideoRecord[]): ChartDatum[] {
  const counts = new Map<number, number>();
  for (const record of records) {
    const level =
      typeof record.current_favorite_level === "number"
        ? record.current_favorite_level
        : -1;
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }
  return [-1, 0, 1, 2, 3, 4].map((level) => ({
    label: levelName(level),
    count: counts.get(level) ?? 0,
  }));
}

function buildSelectionTrend(
  items: SelectionTrendItem[],
  bucket: Bucket,
): ChartDatum[] {
  return aggregateByBucket(items, bucket, (item) => item.date, (item) => item.count);
}

function buildSelectionDistribution(
  items: SelectionDistributionItem[],
): ChartDatum[] {
  const counts = new Map<number, number>();
  for (const item of items) {
    const level = item.level ?? -1;
    counts.set(level, (counts.get(level) ?? 0) + item.count);
  }
  return [-1, 0, 1, 2, 3, 4]
    .map((level) => ({
      label: levelName(level),
      count: counts.get(level) ?? 0,
    }))
    .filter((item) => item.count > 0);
}

function aggregateByBucket<T>(
  items: T[],
  bucket: Bucket,
  getDate: (item: T) => string | null,
  getCount: (item: T) => number,
): ChartDatum[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = bucketLabel(getDate(item), bucket);
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + getCount(item));
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));
}

function bucketLabel(value: string | null, bucket: Bucket): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (bucket === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  if (bucket === "week") {
    const weekStart = new Date(date);
    const day = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - day);
    return formatDate(weekStart);
  }
  return formatDate(date);
}

function getHistoryRange(
  period: AnalysisPeriodPreset,
  customStart: string,
  customEnd: string,
): { start?: string; end?: string } {
  if (period === "全期間") return {};
  if (period === "カスタム") {
    return customStart && customEnd
      ? { start: `${customStart}T00:00:00`, end: `${customEnd}T23:59:59` }
      : {};
  }
  const days = {
    "直近7日": 7,
    "直近30日": 30,
    "直近90日": 90,
    "直近180日": 180,
  }[period];
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start: start.toISOString(), end: end.toISOString() };
}

function validatePeriod(
  period: AnalysisPeriodPreset,
  start: string,
  end: string,
): string | null {
  if (period !== "カスタム") return null;
  if (!start || !end) return "カスタム期間では開始日と終了日を入力してください。";
  if (start > end) return "開始日は終了日以前にしてください。";
  return null;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}
