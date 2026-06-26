"use client";
// 視聴との関係 タブ — APP再生・Tier1判定・Tier2選別・いいねの時系列比較（Stage B）。
// 【設計制約】判定推移は judgment-trend?tier=1。selection-trend は日次固定（bucket集計はクライアント側）。
//   いいね推移は likes.liked_at 基準で、APP_PLAYBACK のみ視聴基準。
// 【依存関係】@/lib/api、@/lib/types、../_components/ 配下。

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getJudgmentTrend,
  getLikesTrend,
  getSelectionTrend,
  getViewingTrend,
} from "@/lib/api";
import type {
  AnalysisAvailability,
  AnalysisBucket,
  AnalysisPeriodPreset,
  AnalysisQuery,
  AnalysisTrendQuery,
  SelectionTrendItem,
} from "@/lib/types";
import { ChartPanel } from "../_components/ChartPanel";
import { EmptyMini } from "../_components/EmptyMini";
import { LineTrendChart } from "../_components/LineTrendChart";

type Bucket = AnalysisBucket;
type ChartDatum = Record<string, number | string>;

type ViewingRelationTabProps = {
  period: AnalysisPeriodPreset;
  customStart: string;
  customEnd: string;
  availability: AnalysisAvailability;
  includeDeleted: boolean;
  bucket: Bucket;
};

export function ViewingRelationTab({
  period,
  customStart,
  customEnd,
  availability,
  includeDeleted,
  bucket,
}: ViewingRelationTabProps) {
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
  const viewingTrendQ = useQuery({
    queryKey: ["analysis", "viewing-trend", trendQuery],
    queryFn: () => getViewingTrend(trendQuery),
    enabled,
  });
  const judgmentTrendQ = useQuery({
    queryKey: ["analysis", "judgment-trend", tier1TrendQuery],
    queryFn: () => getJudgmentTrend(tier1TrendQuery),
    enabled,
  });
  const selectionTrendQ = useQuery({
    queryKey: ["analysis", "selection-trend", historyRange],
    queryFn: () => getSelectionTrend(historyRange),
    enabled,
  });
  const likesTrendQ = useQuery({
    queryKey: ["analysis", "likes-trend", trendQuery],
    queryFn: () => getLikesTrend(trendQuery),
    enabled,
  });

  const viewingTrend = useMemo<ChartDatum[]>(
    () =>
      (viewingTrendQ.data ?? []).map((d) => ({ label: d.label, count: d.count })),
    [viewingTrendQ.data],
  );
  const judgmentTrend = useMemo<ChartDatum[]>(
    () =>
      (judgmentTrendQ.data ?? []).map((d) => ({ label: d.label, count: d.count })),
    [judgmentTrendQ.data],
  );
  const selectionTrend = useMemo(
    () => buildSelectionTrend(selectionTrendQ.data ?? [], bucket),
    [bucket, selectionTrendQ.data],
  );
  const likesTrend = useMemo<ChartDatum[]>(
    () => (likesTrendQ.data ?? []).map((d) => ({ label: d.label, count: d.count })),
    [likesTrendQ.data],
  );

  return (
    <div className="mt-4 flex flex-col gap-4">
      {validationError && <ErrorBox message={validationError} />}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartPanel title="APP 再生数推移">
          {viewingTrendQ.isLoading ? (
            <EmptyMini>読み込み中...</EmptyMini>
          ) : viewingTrendQ.isError ? (
            <ErrorBox error={viewingTrendQ.error} />
          ) : (
            <LineTrendChart
              data={viewingTrend}
              dataKey="count"
              color="#2563eb"
              empty="視聴履歴がありません。"
            />
          )}
        </ChartPanel>

        <ChartPanel title="判定数推移" note="Tier1のみ">
          {judgmentTrendQ.isLoading ? (
            <EmptyMini>読み込み中...</EmptyMini>
          ) : judgmentTrendQ.isError ? (
            <ErrorBox error={judgmentTrendQ.error} />
          ) : (
            <LineTrendChart
              data={judgmentTrend}
              dataKey="count"
              color="#16a34a"
              empty="Tier1 判定履歴がありません。"
            />
          )}
        </ChartPanel>

        <ChartPanel
          title="Tier2 選別数推移"
          note="APIは日次取得。画面側で選択粒度に再集計します。"
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

        <ChartPanel title="いいね数推移">
          {likesTrendQ.isLoading ? (
            <EmptyMini>読み込み中...</EmptyMini>
          ) : likesTrendQ.isError ? (
            <ErrorBox error={likesTrendQ.error} />
          ) : (
            <LineTrendChart
              data={likesTrend}
              dataKey="count"
              color="#db2777"
              empty="いいね履歴がありません。"
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

function buildSelectionTrend(
  items: SelectionTrendItem[],
  bucket: Bucket,
): ChartDatum[] {
  return aggregateByBucket(items, bucket, (item) => item.date, (item) => item.count);
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
