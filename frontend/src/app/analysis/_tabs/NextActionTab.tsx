"use client";

// 詰まり・次アクション タブ — KPI・進捗・偏り指標・候補一覧で次に触るべき動画を把握する（Stage C/D）。
// 【設計制約】VideoCard は載せず、DB 書き込み・localStorage 状態変更はしない。既存 read API の範囲のみ。
//   候補一覧は read-only のコンパクト行。次アクションは既存画面（/ /tier2 /watch-later /search）への導線のみ。
//   displayContext 3値・状態永続境界は変更しない。
// 【依存関係】@/lib/api、@/lib/types、@/lib/levels、@/components/KpiCard、lucide-react。

import Link from "next/link";
import { useMemo, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bookmark,
  ClipboardCheck,
  ListChecks,
  type LucideProps,
} from "lucide-react";

import {
  getAnalysisData,
  getAnalysisRankings,
  getConfig,
  getLastViewed,
  getKpi,
  getSelectionKpi,
  getViewCounts,
  listSelectionVideos,
  listVideos,
} from "@/lib/api";
import { levelName, storageLabel } from "@/lib/levels";
import type {
  AnalysisAvailability,
  AnalysisPeriodPreset,
  AnalysisQuery,
  AnalysisRankingItem,
  AnalysisVideoRecord,
  Video,
} from "@/lib/types";
import { KpiCard } from "@/components/KpiCard";

type NextActionTabProps = {
  period: AnalysisPeriodPreset;
  customStart: string;
  customEnd: string;
  availability: AnalysisAvailability;
  includeDeleted: boolean;
  topN: number;
};

type IconComponent = ComponentType<LucideProps>;

export function NextActionTab({
  period,
  customStart,
  customEnd,
  availability,
  includeDeleted,
  topN,
}: NextActionTabProps) {
  const validationError = useMemo(
    () => validatePeriod(period, customStart, customEnd),
    [customEnd, customStart, period],
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
  const rankingTopN = Math.max(1, Math.min(topN, 5));
  const candidateLimit = rankingTopN;

  const kpiQ = useQuery({ queryKey: ["kpi"], queryFn: getKpi });
  const selectionKpiQ = useQuery({
    queryKey: ["selection-kpi"],
    queryFn: () => getSelectionKpi(),
  });
  const watchLaterQ = useQuery({
    queryKey: ["analysis", "next-action", "watch-later-total"],
    queryFn: () =>
      listVideos({
        watch_later: true,
        show_unavailable: true,
        page: 1,
        page_size: 1,
      }),
  });
  const unavailableQ = useQuery({
    queryKey: ["analysis", "next-action", "unavailable-total"],
    queryFn: () =>
      listVideos({
        availability: "unavailable",
        show_unavailable: true,
        page: 1,
        page_size: 1,
      }),
  });
  const configQ = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const selectionFolder = configQ.data?.selection_folder?.trim() || "";
  const unratedCandidatesQ = useQuery({
    queryKey: [
      "analysis",
      "next-action",
      "candidates",
      "unrated",
      candidateLimit,
      includeDeleted,
    ],
    queryFn: () =>
      listVideos({
        levels: [-1],
        exclude_selection: true,
        show_deleted: includeDeleted,
        sort: "last_viewed",
        order: "asc",
        page: 1,
        page_size: candidateLimit,
      }),
  });
  const unselectedCandidatesQ = useQuery({
    queryKey: [
      "analysis",
      "next-action",
      "candidates",
      "unselected",
      selectionFolder,
      candidateLimit,
    ],
    queryFn: () =>
      listSelectionVideos({
        folder: selectionFolder,
        status: "unselected",
        sort: "last_viewed",
        order: "asc",
        page: 1,
        page_size: candidateLimit,
      }),
    enabled: selectionFolder.length > 0,
  });
  const watchLaterCandidatesQ = useQuery({
    queryKey: [
      "analysis",
      "next-action",
      "candidates",
      "watch-later",
      candidateLimit,
      includeDeleted,
    ],
    queryFn: () =>
      listVideos({
        watch_later: true,
        show_unavailable: true,
        show_deleted: includeDeleted,
        sort: "last_viewed",
        order: "desc",
        page: 1,
        page_size: candidateLimit,
      }),
  });
  const unavailableCandidatesQ = useQuery({
    queryKey: [
      "analysis",
      "next-action",
      "candidates",
      "unavailable",
      candidateLimit,
      includeDeleted,
    ],
    queryFn: () =>
      listVideos({
        availability: "unavailable",
        show_unavailable: true,
        show_deleted: includeDeleted,
        sort: "last_viewed",
        order: "desc",
        page: 1,
        page_size: candidateLimit,
      }),
  });
  const analysisQ = useQuery({
    queryKey: ["analysis", "data", analysisQuery],
    queryFn: () => getAnalysisData(analysisQuery),
    enabled,
  });
  const viewCountRankingQ = useQuery({
    queryKey: ["analysis", "next-action", "ranking", "view_count", analysisQuery, rankingTopN],
    queryFn: () =>
      getAnalysisRankings({
        ...analysisQuery,
        kind: "view_count",
        top_n: rankingTopN,
      }),
    enabled,
  });
  const viewDaysRankingQ = useQuery({
    queryKey: ["analysis", "next-action", "ranking", "view_days", analysisQuery, rankingTopN],
    queryFn: () =>
      getAnalysisRankings({
        ...analysisQuery,
        kind: "view_days",
        top_n: rankingTopN,
      }),
    enabled,
  });
  const likesRankingQ = useQuery({
    queryKey: ["analysis", "next-action", "ranking", "likes", analysisQuery, rankingTopN],
    queryFn: () =>
      getAnalysisRankings({
        ...analysisQuery,
        kind: "likes",
        top_n: rankingTopN,
      }),
    enabled,
  });

  const focusSignals = useMemo(
    () => buildFocusSignals(analysisQ.data?.items ?? []),
    [analysisQ.data?.items],
  );
  const candidateIds = useMemo(
    () =>
      [
        ...(unratedCandidatesQ.data?.items ?? []),
        ...(unselectedCandidatesQ.data?.items ?? []),
        ...(watchLaterCandidatesQ.data?.items ?? []),
        ...(unavailableCandidatesQ.data?.items ?? []),
      ]
        .map((video) => video.id)
        .filter((id): id is number => id != null),
    [
      unavailableCandidatesQ.data?.items,
      unratedCandidatesQ.data?.items,
      unselectedCandidatesQ.data?.items,
      watchLaterCandidatesQ.data?.items,
    ],
  );
  const candidateLastViewedQ = useQuery({
    queryKey: ["last-viewed"],
    queryFn: getLastViewed,
    enabled: candidateIds.length > 0,
  });
  const candidateViewCountsQ = useQuery({
    queryKey: ["view-counts"],
    queryFn: getViewCounts,
    enabled: candidateIds.length > 0,
  });

  const tier1Total =
    (kpiQ.data?.unrated_count ?? 0) + (kpiQ.data?.judged_count ?? 0);
  const tier2Total =
    (selectionKpiQ.data?.unselected_count ?? 0) +
    (selectionKpiQ.data?.judged_count ?? 0);

  return (
    <div className="mt-4 flex flex-col gap-4">
      {validationError && <ErrorBox message={validationError} />}

      <div className="flex flex-wrap gap-3">
        <KpiCard
          label="未判定"
          value={formatCount(kpiQ.data?.unrated_count)}
        />
        <KpiCard
          label="未選別"
          value={formatCount(selectionKpiQ.data?.unselected_count)}
        />
        <KpiCard
          label="あとで見る"
          value={formatCount(watchLaterQ.data?.total)}
        />
        <KpiCard
          label="利用不可"
          value={formatCount(unavailableQ.data?.total)}
        />
      </div>

      {(kpiQ.isError ||
        selectionKpiQ.isError ||
        watchLaterQ.isError ||
        unavailableQ.isError) && (
        <ErrorBox message="一部の詰まり指標を取得できませんでした。" />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-md border p-3">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">進捗</h2>
          </div>
          <div className="space-y-4">
            <ProgressRow
              label="Tier1 判定進捗"
              rate={kpiQ.data?.judged_rate}
              detail={`${formatCount(kpiQ.data?.judged_count)} / ${formatCount(
                tier1Total,
              )}`}
            />
            <ProgressRow
              label="Tier2 選別進捗"
              rate={selectionKpiQ.data?.judged_rate}
              detail={`${formatCount(
                selectionKpiQ.data?.judged_count,
              )} / ${formatCount(tier2Total)}`}
              color="bg-teal-500"
            />
          </div>
        </section>

        <section className="rounded-md border p-3">
          <h2 className="mb-3 text-sm font-semibold">偏り・詰まりの兆候</h2>
          {analysisQ.isError ? (
            <ErrorBox message="期間内の偏り指標を取得できませんでした。" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SignalCard
                title="Lv0 比率"
                value={analysisQ.isLoading ? "-" : formatRate(focusSignals.lv0Rate)}
                note="表示条件内の判定済み"
              />
              <SignalCard
                title="再生集中"
                value={
                  analysisQ.isLoading ? "-" : formatRate(focusSignals.topViewShare)
                }
                note="期間内再生の最多1本"
              />
              <SignalCard
                title="利用不可"
                value={formatCount(unavailableQ.data?.total)}
                note={`表示条件内 ${focusSignals.unavailableInScope} 本`}
              />
            </div>
          )}
        </section>
      </div>

      <section className="rounded-md border p-3">
        <h2 className="mb-3 text-sm font-semibold">次アクション</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <ActionLink
            href="/"
            icon={ListChecks}
            label="未判定を処理する"
            count={kpiQ.data?.unrated_count}
          />
          <ActionLink
            href="/tier2"
            icon={ClipboardCheck}
            label="未選別を処理する"
            count={selectionKpiQ.data?.unselected_count}
          />
          <ActionLink
            href="/watch-later"
            icon={Bookmark}
            label="あとで見るを整理する"
            count={watchLaterQ.data?.total}
          />
          <ActionLink
            href="/search"
            icon={AlertTriangle}
            label="利用不可を確認する"
            count={unavailableQ.data?.total}
          />
        </div>
      </section>

      <section className="rounded-md border p-3">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">候補一覧</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              各カテゴリ最大 {candidateLimit} 件。ここでは操作せず、既存画面で確認します。
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <CandidateSection
            title="未判定"
            href="/"
            total={unratedCandidatesQ.data?.total}
            items={unratedCandidatesQ.data?.items ?? []}
            loading={unratedCandidatesQ.isLoading}
            error={unratedCandidatesQ.error}
            emptyMessage="未判定の候補はありません。"
            lastViewed={candidateLastViewedQ.data ?? {}}
            viewCounts={candidateViewCountsQ.data ?? {}}
          />
          <CandidateSection
            title="未選別"
            href="/tier2"
            total={unselectedCandidatesQ.data?.total}
            items={unselectedCandidatesQ.data?.items ?? []}
            loading={configQ.isLoading || unselectedCandidatesQ.isLoading}
            error={configQ.error ?? unselectedCandidatesQ.error}
            emptyMessage={
              selectionFolder
                ? "未選別の候補はありません。"
                : "設定でセレクションフォルダを指定すると候補を表示できます。"
            }
            disabled={!selectionFolder}
            lastViewed={candidateLastViewedQ.data ?? {}}
            viewCounts={candidateViewCountsQ.data ?? {}}
          />
          <CandidateSection
            title="あとで見る"
            href="/watch-later"
            total={watchLaterCandidatesQ.data?.total}
            items={watchLaterCandidatesQ.data?.items ?? []}
            loading={watchLaterCandidatesQ.isLoading}
            error={watchLaterCandidatesQ.error}
            emptyMessage="あとで見るの候補はありません。"
            lastViewed={candidateLastViewedQ.data ?? {}}
            viewCounts={candidateViewCountsQ.data ?? {}}
          />
          <CandidateSection
            title="利用不可"
            href="/search"
            total={unavailableCandidatesQ.data?.total}
            items={unavailableCandidatesQ.data?.items ?? []}
            loading={unavailableCandidatesQ.isLoading}
            error={unavailableCandidatesQ.error}
            emptyMessage="利用不可の候補はありません。"
            lastViewed={candidateLastViewedQ.data ?? {}}
            viewCounts={candidateViewCountsQ.data ?? {}}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RankingMiniList
          title="期間内よく見た"
          unit="回"
          items={viewCountRankingQ.data?.items ?? []}
          loading={viewCountRankingQ.isLoading}
          error={viewCountRankingQ.error}
        />
        <RankingMiniList
          title="視聴日数が多い"
          unit="日"
          items={viewDaysRankingQ.data?.items ?? []}
          loading={viewDaysRankingQ.isLoading}
          error={viewDaysRankingQ.error}
        />
        <RankingMiniList
          title="いいねが多い"
          unit="個"
          items={likesRankingQ.data?.items ?? []}
          loading={likesRankingQ.isLoading}
          error={likesRankingQ.error}
        />
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  rate,
  detail,
  color = "bg-primary",
}: {
  label: string;
  rate: number | undefined;
  detail: string;
  color?: string;
}) {
  const safeRate = clamp(rate ?? 0, 0, 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {rate == null ? "-" : `${rate.toFixed(1)}%`} · {detail}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${safeRate}%` }} />
      </div>
    </div>
  );
}

function SignalCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: IconComponent;
  label: string;
  count: number | undefined;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-2 rounded-md border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <Icon className="size-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">{label}</span>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
        {formatCount(count)}
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function CandidateSection({
  title,
  href,
  total,
  items,
  loading,
  error,
  emptyMessage,
  disabled = false,
  lastViewed,
  viewCounts,
}: {
  title: string;
  href: string;
  total: number | undefined;
  items: Video[];
  loading: boolean;
  error: unknown;
  emptyMessage: string;
  disabled?: boolean;
  lastViewed: Record<number, string>;
  viewCounts: Record<number, number>;
}) {
  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          <div className="text-xs text-muted-foreground">
            {total == null ? "-" : `${formatCount(total)} 件`}
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          既存画面
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="p-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : error ? (
          <ErrorBox message={`${title}候補を取得できませんでした。`} />
        ) : disabled || items.length === 0 ? (
          <div className="rounded-md bg-muted/40 p-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((video) => (
              <CandidateRow
                key={video.id ?? video.current_full_path}
                href={href}
                video={video}
                lastViewed={video.id == null ? undefined : lastViewed[video.id]}
                viewCount={video.id == null ? undefined : viewCounts[video.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CandidateRow({
  href,
  video,
  lastViewed,
  viewCount,
}: {
  href: string;
  video: Video;
  lastViewed: string | undefined;
  viewCount: number | undefined;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{video.essential_filename}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{levelName(video.current_favorite_level)}</span>
          <span>{storageLabel(video.storage_location)}</span>
          <span>{video.is_available ? "利用可" : "利用不可"}</span>
          <span>最終再生 {formatLastViewed(lastViewed)}</span>
          <span>再生 {formatCount(viewCount)} 回</span>
        </div>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-muted/40"
      >
        確認
        <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}

function RankingMiniList({
  title,
  unit,
  items,
  loading,
  error,
}: {
  title: string;
  unit: string;
  items: AnalysisRankingItem[];
  loading: boolean;
  error: unknown;
}) {
  return (
    <section className="rounded-md border p-3">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : error ? (
        <ErrorBox message="ランキングを取得できませんでした。" />
      ) : items.length === 0 ? (
        <div className="rounded-md bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          表示できるデータがありません。
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={`${title}-${item.rank}-${item.filename}`}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)_4rem] items-center gap-2 rounded-md border px-2 py-2"
            >
              <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                #{item.rank}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.filename}</div>
                <div className="text-xs text-muted-foreground">
                  {levelName(item.favorite_level)}
                </div>
              </div>
              <span className="text-right text-sm font-semibold tabular-nums">
                {item.score}
                {unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function buildFocusSignals(records: AnalysisVideoRecord[]) {
  const judged = records.filter((record) => getLevel(record) >= 0);
  const lv0Count = judged.filter((record) => getLevel(record) === 0).length;
  const periodViews = records.map((record) => toNumber(record.period_view_count));
  const totalViews = periodViews.reduce((sum, value) => sum + value, 0);
  const topViews = periodViews.length > 0 ? Math.max(...periodViews) : 0;
  const unavailableInScope = records.filter(
    (record) => record.is_available === false || record.is_available === 0,
  ).length;

  return {
    lv0Rate: judged.length > 0 ? (lv0Count / judged.length) * 100 : 0,
    topViewShare: totalViews > 0 ? (topViews / totalViews) * 100 : 0,
    unavailableInScope,
  };
}

function getLevel(record: AnalysisVideoRecord): number {
  return toNumber(record.current_favorite_level ?? -1);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCount(value: number | undefined): string {
  return value == null ? "-" : value.toLocaleString("ja-JP");
}

function formatLastViewed(value: string | undefined): string {
  if (!value) return "-";
  return value.slice(0, 10).replace(/-/g, "/");
}

function formatRate(value: number): string {
  return `${value.toFixed(1)}%`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
