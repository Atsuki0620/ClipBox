"use client";
// 旧分析タブ — 現行 /analysis の表示をそのまま保持する退避タブ。
// 【設計制約】集計ロジック・SQL・APP_PLAYBACK 計算・ランキング式は一切変更禁止。
//   挙動同一の純リファクタのみ（フィルタ state を props に移動、共通 _components に委譲）。
// 【依存関係】@/lib/api、@/lib/types、@/lib/levels、@/components/KpiCard、
//   @/components/ui/skeleton、../_components/ 配下の共通チャート部品。

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAnalysisData,
  getAnalysisRankings,
  getJudgmentTrend,
  getResponseTime,
  getSelectionDistribution,
  getSelectionTrend,
  getViewingTrend,
} from "@/lib/api";
import { levelName, storageLabel } from "@/lib/levels";
import type {
  AnalysisAvailability,
  AnalysisBucket,
  AnalysisPeriodPreset,
  AnalysisQuery,
  AnalysisRankingItem,
  AnalysisRankingKind,
  AnalysisTrendQuery,
  AnalysisVideoRecord,
  ResponseTimeItem,
  SelectionDistributionItem,
  SelectionTrendItem,
} from "@/lib/types";
import { KpiCard } from "@/components/KpiCard";
import { Skeleton } from "@/components/ui/skeleton";
import { BarValueChart } from "../_components/BarValueChart";
import { ChartPanel } from "../_components/ChartPanel";
import { EmptyMini } from "../_components/EmptyMini";
import { LineTrendChart } from "../_components/LineTrendChart";

// AnalysisBucket のエイリアス。ヘルパ関数の書き換えを最小にする。
type Bucket = AnalysisBucket;
type ChartDatum = Record<string, number | string>;

const RANKING_LABELS: Record<AnalysisRankingKind, string> = {
  view_count: "視聴回数",
  view_days: "視聴日数",
  likes: "いいね",
};

type LegacyAnalysisTabProps = {
  period: AnalysisPeriodPreset;
  customStart: string;
  customEnd: string;
  availability: AnalysisAvailability;
  includeDeleted: boolean;
  topN: number;
  bucket: Bucket;
};

export function LegacyAnalysisTab({
  period,
  customStart,
  customEnd,
  availability,
  includeDeleted,
  topN,
  bucket,
}: LegacyAnalysisTabProps) {
  const validationError = useMemo(
    () => validatePeriod(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

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
  const enabled = validationError == null;

  const analysisQ = useQuery({
    queryKey: ["analysis", "data", analysisQuery],
    queryFn: () => getAnalysisData(analysisQuery),
    enabled,
  });

  const records = useMemo(() => analysisQ.data?.items ?? [], [analysisQ.data]);
  const historyRange = useMemo(
    () => getHistoryRange(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  const trendQuery: AnalysisTrendQuery = useMemo(
    () => ({ ...analysisQuery, bucket }),
    [analysisQuery, bucket],
  );
  const viewingTrendQ = useQuery({
    queryKey: ["analysis", "viewing-trend", trendQuery],
    queryFn: () => getViewingTrend(trendQuery),
    enabled,
  });
  const judgmentTrendQ = useQuery({
    queryKey: ["analysis", "judgment-trend", trendQuery],
    queryFn: () => getJudgmentTrend(trendQuery),
    enabled,
  });
  const responseTimeQ = useQuery({
    queryKey: ["analysis", "response-time"],
    queryFn: getResponseTime,
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

  const rankingParams = useMemo(
    () => ({ ...analysisQuery, top_n: topN }),
    [analysisQuery, topN],
  );
  const viewCountRankingQ = useQuery({
    queryKey: ["analysis", "rankings", "view_count", rankingParams],
    queryFn: () => getAnalysisRankings({ ...rankingParams, kind: "view_count" }),
    enabled,
  });
  const viewDaysRankingQ = useQuery({
    queryKey: ["analysis", "rankings", "view_days", rankingParams],
    queryFn: () => getAnalysisRankings({ ...rankingParams, kind: "view_days" }),
    enabled,
  });
  const likesRankingQ = useQuery({
    queryKey: ["analysis", "rankings", "likes", rankingParams],
    queryFn: () => getAnalysisRankings({ ...rankingParams, kind: "likes" }),
    enabled,
  });

  const kpis = useMemo(() => buildKpis(records), [records]);
  const levelDistribution = useMemo(() => buildLevelDistribution(records), [records]);
  const storageStats = useMemo(() => buildStorageStats(records), [records]);
  const fileSizeDistribution = useMemo(
    () => buildFileSizeDistribution(records),
    [records],
  );
  const viewCountDistribution = useMemo(
    () => buildViewCountDistribution(records),
    [records],
  );
  const viewingTrend = useMemo<ChartDatum[]>(
    () => (viewingTrendQ.data ?? []).map((d) => ({ label: d.label, count: d.count })),
    [viewingTrendQ.data],
  );
  const judgmentTrend = useMemo<ChartDatum[]>(
    () => (judgmentTrendQ.data ?? []).map((d) => ({ label: d.label, count: d.count })),
    [judgmentTrendQ.data],
  );
  const selectionTrend = useMemo(
    () => buildSelectionTrend(selectionTrendQ.data ?? [], bucket),
    [bucket, selectionTrendQ.data],
  );
  const responseTimeStats = useMemo(
    () => buildResponseTimeStats(responseTimeQ.data ?? []),
    [responseTimeQ.data],
  );
  const selectionDistribution = useMemo(
    () => buildSelectionDistribution(selectionDistributionQ.data ?? []),
    [selectionDistributionQ.data],
  );

  const isInitialLoading = enabled && analysisQ.isLoading;
  const isFetchingCharts =
    viewingTrendQ.isFetching ||
    judgmentTrendQ.isFetching ||
    responseTimeQ.isFetching ||
    selectionTrendQ.isFetching ||
    selectionDistributionQ.isFetching;

  return (
    <div className="mt-4 flex flex-col gap-4">
      {analysisQ.data && (
        <div className="text-sm text-muted-foreground">
          対象 {analysisQ.data.total.toLocaleString()} 件
        </div>
      )}

      {validationError && <ErrorBox message={validationError} />}
      {analysisQ.isError && <ErrorBox error={analysisQ.error} />}

      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : !enabled || analysisQ.isError ? null : records.length === 0 ? (
        <EmptyBox>条件に一致する動画がありません。</EmptyBox>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <KpiCard label="総動画数" value={kpis.totalVideos} />
            <KpiCard label="総容量" value={formatBytes(kpis.totalSize)} />
            <KpiCard label="視聴済み" value={kpis.watchedVideos} />
            <KpiCard label="未視聴" value={kpis.unwatchedVideos} />
            <KpiCard label="期間内視聴" value={kpis.periodViews} />
          </div>

          {isFetchingCharts && (
            <div className="text-sm text-muted-foreground">集計を更新中...</div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartPanel title="視聴トレンド">
              <LineTrendChart
                data={viewingTrend}
                dataKey="count"
                color="#2563eb"
                empty="視聴履歴がありません。"
              />
            </ChartPanel>

            <ChartPanel title="判定トレンド">
              <LineTrendChart
                data={judgmentTrend}
                dataKey="count"
                color="#16a34a"
                empty="判定履歴がありません。"
              />
            </ChartPanel>

            <ChartPanel title="レベル分布">
              <BarValueChart
                data={levelDistribution}
                dataKey="count"
                color="#7c3aed"
                empty="レベル分布を表示できません。"
              />
            </ChartPanel>

            <ChartPanel title="ファイルサイズ分布">
              <BarValueChart
                data={fileSizeDistribution}
                dataKey="count"
                color="#ea580c"
                empty="ファイルサイズ情報がありません。"
              />
            </ChartPanel>

            <ChartPanel title="視聴回数分布">
              <BarValueChart
                data={viewCountDistribution}
                dataKey="count"
                color="#0891b2"
                empty="期間内の視聴回数がありません。"
              />
            </ChartPanel>

            <ChartPanel title="判定応答時間">
              <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Metric label="平均" value={formatMs(responseTimeStats.average)} />
                <Metric label="中央値" value={formatMs(responseTimeStats.median)} />
                <Metric label="最小" value={formatMs(responseTimeStats.min)} />
                <Metric label="最大" value={formatMs(responseTimeStats.max)} />
              </div>
              <BarValueChart
                data={responseTimeStats.bins}
                dataKey="count"
                color="#dc2626"
                empty="応答時間データがありません。"
              />
            </ChartPanel>

            <ChartPanel title="セレクション判定トレンド">
              <LineTrendChart
                data={selectionTrend}
                dataKey="count"
                color="#0d9488"
                empty="セレクション判定履歴がありません。"
              />
            </ChartPanel>

            <ChartPanel title="選別レベル分布">
              <BarValueChart
                data={selectionDistribution}
                dataKey="count"
                color="#be123c"
                empty="選別レベル分布がありません。"
              />
            </ChartPanel>
          </div>

          <StorageTable rows={storageStats} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <RankingTable
              kind="view_count"
              items={viewCountRankingQ.data?.items ?? []}
              loading={viewCountRankingQ.isLoading || viewCountRankingQ.isFetching}
              error={viewCountRankingQ.error}
            />
            <RankingTable
              kind="view_days"
              items={viewDaysRankingQ.data?.items ?? []}
              loading={viewDaysRankingQ.isLoading || viewDaysRankingQ.isFetching}
              error={viewDaysRankingQ.error}
            />
            <RankingTable
              kind="likes"
              items={likesRankingQ.data?.items ?? []}
              loading={likesRankingQ.isLoading || likesRankingQ.isFetching}
              error={likesRankingQ.error}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ---- inline sub-components (LegacyAnalysisTab 専用) ----

type StorageStats = {
  storage: string;
  count: number;
  size: number;
  watched: number;
  watchedRate: number;
};

function StorageTable({ rows }: { rows: StorageStats[] }) {
  return (
    <section className="rounded-md border p-3">
      <h2 className="mb-3 text-sm font-semibold">保存場所統計</h2>
      {rows.length === 0 ? (
        <EmptyMini>保存場所データがありません。</EmptyMini>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left font-medium">保存場所</th>
                <th className="px-2 py-2 text-right font-medium">本数</th>
                <th className="px-2 py-2 text-right font-medium">容量</th>
                <th className="px-2 py-2 text-right font-medium">視聴済み率</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.storage} className="border-b last:border-0">
                  <td className="px-2 py-2">{storageLabel(row.storage)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {row.count.toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatBytes(row.size)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {row.watchedRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RankingTable({
  kind,
  items,
  loading,
  error,
}: {
  kind: AnalysisRankingKind;
  items: AnalysisRankingItem[];
  loading: boolean;
  error: unknown;
}) {
  return (
    <section className="rounded-md border p-3">
      <h2 className="mb-3 text-sm font-semibold">{RANKING_LABELS[kind]}</h2>
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8" />
          ))}
        </div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : items.length === 0 ? (
        <EmptyMini>ランキングデータがありません。</EmptyMini>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left font-medium">順位</th>
                <th className="px-2 py-2 text-left font-medium">ファイル</th>
                <th className="px-2 py-2 text-right font-medium">値</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={`${kind}-${item.rank}-${item.filename}`}
                  className="border-b last:border-0"
                >
                  <td className="px-2 py-2 tabular-nums">#{item.rank}</td>
                  <td className="max-w-48 truncate px-2 py-2" title={item.filename}>
                    <span className="block truncate">{item.filename}</span>
                    <span className="text-xs text-muted-foreground">
                      {levelName(item.favorite_level)} /{" "}
                      {item.is_available === false ? "利用不可" : "利用可"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {item.score.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 flex-1" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-80" />
        ))}
      </div>
    </div>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-8 text-center text-muted-foreground">
      {children}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

// ---- pure helpers ----

function buildKpis(records: AnalysisVideoRecord[]) {
  const totalVideos = records.length;
  const totalSize = records.reduce(
    (sum, record) => sum + numberValue(record.file_size),
    0,
  );
  const watchedVideos = records.filter(
    (record) => numberValue(record.total_view_count) > 0,
  ).length;
  const periodViews = records.reduce(
    (sum, record) => sum + numberValue(record.period_view_count),
    0,
  );
  return {
    totalVideos,
    totalSize,
    watchedVideos,
    unwatchedVideos: Math.max(totalVideos - watchedVideos, 0),
    periodViews,
  };
}

function buildLevelDistribution(records: AnalysisVideoRecord[]): ChartDatum[] {
  const counts = new Map<number, number>();
  for (const record of records) {
    const level = numberValue(record.current_favorite_level, -1);
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }
  return [-1, 0, 1, 2, 3, 4].map((level) => ({
    label: levelName(level),
    count: counts.get(level) ?? 0,
  }));
}

function buildStorageStats(records: AnalysisVideoRecord[]): StorageStats[] {
  const stats = new Map<string, StorageStats>();
  for (const record of records) {
    const storage = String(record.storage_location ?? "UNKNOWN");
    const current =
      stats.get(storage) ??
      ({
        storage,
        count: 0,
        size: 0,
        watched: 0,
        watchedRate: 0,
      } satisfies StorageStats);
    current.count += 1;
    current.size += numberValue(record.file_size);
    if (numberValue(record.total_view_count) > 0) current.watched += 1;
    stats.set(storage, current);
  }
  return [...stats.values()]
    .map((row) => ({
      ...row,
      watchedRate: row.count === 0 ? 0 : (row.watched / row.count) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildFileSizeDistribution(records: AnalysisVideoRecord[]): ChartDatum[] {
  const bins = [
    { label: "<0.5GB", min: 0, max: 0.5 },
    { label: "0.5-1GB", min: 0.5, max: 1 },
    { label: "1-2GB", min: 1, max: 2 },
    { label: "2-4GB", min: 2, max: 4 },
    { label: "4-8GB", min: 4, max: 8 },
    { label: "8GB+", min: 8, max: Infinity },
  ].map((bin) => ({ ...bin, count: 0 }));

  for (const record of records) {
    const size = numberValue(record.file_size);
    if (size <= 0) continue;
    const gb = size / 1024 ** 3;
    const bin = bins.find((item) => gb >= item.min && gb < item.max);
    if (bin) bin.count += 1;
  }
  return bins.map(({ label, count }) => ({ label, count }));
}

function buildViewCountDistribution(records: AnalysisVideoRecord[]): ChartDatum[] {
  const bins = [
    { label: "1", min: 1, max: 2 },
    { label: "2", min: 2, max: 3 },
    { label: "3-5", min: 3, max: 6 },
    { label: "6-10", min: 6, max: 11 },
    { label: "11-20", min: 11, max: 21 },
    { label: "21+", min: 21, max: Infinity },
  ].map((bin) => ({ ...bin, count: 0 }));

  for (const record of records) {
    const count = numberValue(record.period_view_count);
    if (count <= 0) continue;
    const bin = bins.find((item) => count >= item.min && count < item.max);
    if (bin) bin.count += 1;
  }
  return bins.map(({ label, count }) => ({ label, count }));
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

function buildResponseTimeStats(items: ResponseTimeItem[]) {
  const values = items
    .map((item) => item.duration_ms)
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
  const bins = [
    { label: "<0.5s", min: 0, max: 500 },
    { label: "0.5-1s", min: 500, max: 1000 },
    { label: "1-2s", min: 1000, max: 2000 },
    { label: "2-5s", min: 2000, max: 5000 },
    { label: "5-10s", min: 5000, max: 10000 },
    { label: "10s+", min: 10000, max: Infinity },
  ].map((bin) => ({ ...bin, count: 0 }));

  for (const value of values) {
    const bin = bins.find((item) => value >= item.min && value < item.max);
    if (bin) bin.count += 1;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  const middle = Math.floor(values.length / 2);
  const median =
    values.length === 0
      ? 0
      : values.length % 2 === 0
        ? (values[middle - 1] + values[middle]) / 2
        : values[middle];

  return {
    average: values.length === 0 ? 0 : sum / values.length,
    median,
    min: values[0] ?? 0,
    max: values.at(-1) ?? 0,
    bins: bins.map(({ label, count }) => ({ label, count })),
  };
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

function numberValue(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatBytes(value: number): string {
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatMs(value: number): string {
  if (value <= 0) return "-";
  return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(2)} s`;
}
