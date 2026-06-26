"use client";

// 詰まり・次アクション タブ — Stage D: 候補行から再生・いいね・あとで見る・AVP候補操作が可能。
//   Stage E: 未判定候補は Tier1 レベル変更（未判定/Lv0〜Lv4）、未選別候補は Tier2 選別（未選別/Lv0〜Lv4）が可能。
// 【設計制約】既存 setLevel / unselectVideo / likeVideo / toggleWatchLater / usePlayVideo を流用。
//   新 API・DB スキーマ変更・displayContext 4値目・ファイル名プレフィックスロジック複製は禁止。
//   状態境界: DB 状態は API 経由、AVP候補/再生中ハイライトは localStorage（SPEC_NEXTJS.md §0）。
// 【依存関係】@/lib/api、@/lib/types、@/lib/levels、@/lib/store、@/lib/usePlayVideo、
//   @/components/KpiCard、@/components/ui/button、checkbox、select、tooltip、lucide-react。

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bookmark,
  ClipboardCheck,
  Heart,
  ListChecks,
  Play,
  type LucideProps,
} from "lucide-react";

import {
  getAnalysisData,
  getAnalysisRankings,
  getConfig,
  getLastViewed,
  getKpi,
  getLikes,
  getSelectionKpi,
  getViewCounts,
  likeVideo,
  listSelectionVideos,
  listVideos,
  setLevel,
  toggleWatchLater,
  unselectVideo,
} from "@/lib/api";
import { LEVEL_OPTIONS, levelName, storageLabel } from "@/lib/levels";
import { useAvpStore } from "@/lib/store";
import { usePlayVideo } from "@/lib/usePlayVideo";
import type {
  AnalysisAvailability,
  AnalysisPeriodPreset,
  AnalysisQuery,
  AnalysisRankingItem,
  AnalysisVideoRecord,
  Video,
} from "@/lib/types";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NextActionTabProps = {
  period: AnalysisPeriodPreset;
  customStart: string;
  customEnd: string;
  availability: AnalysisAvailability;
  includeDeleted: boolean;
  topN: number;
};

type IconComponent = ComponentType<LucideProps>;

// 候補セクションの種別。tier1=未判定（Tier1判定）、tier2=未選別（Tier2選別）、plain=操作のみ。
// Stage D 時点では全セクション plain。Stage E で未判定/未選別に tier1/tier2 を割り当てる。
type CandidateKind = "tier1" | "tier2" | "plain";

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
  // 4カテゴリ連結の candidateIds は同一動画が重複し得るため、getLikes 前に重複排除する。
  // queryKey は ["likes", ...] prefix にマッチするので like/play 後の invalidate(["likes"]) で再取得される。
  const likeIds = useMemo(() => [...new Set(candidateIds)], [candidateIds]);
  const candidateLikesQ = useQuery({
    queryKey: ["likes", likeIds],
    queryFn: () => getLikes(likeIds),
    enabled: likeIds.length > 0,
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
              各カテゴリ最大 {candidateLimit} 件。各候補行から再生・いいね・あとで見る・AVP候補操作ができ、未判定・未選別は判定・選別操作も可能です。
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <CandidateSection
            title="未判定"
            href="/"
            kind="tier1"
            total={unratedCandidatesQ.data?.total}
            items={unratedCandidatesQ.data?.items ?? []}
            loading={unratedCandidatesQ.isLoading}
            error={unratedCandidatesQ.error}
            emptyMessage="未判定の候補はありません。"
            lastViewed={candidateLastViewedQ.data ?? {}}
            viewCounts={candidateViewCountsQ.data ?? {}}
            likeCounts={candidateLikesQ.data ?? {}}
          />
          <CandidateSection
            title="未選別"
            href="/tier2"
            kind="tier2"
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
            likeCounts={candidateLikesQ.data ?? {}}
          />
          <CandidateSection
            title="あとで見る"
            href="/watch-later"
            kind="plain"
            total={watchLaterCandidatesQ.data?.total}
            items={watchLaterCandidatesQ.data?.items ?? []}
            loading={watchLaterCandidatesQ.isLoading}
            error={watchLaterCandidatesQ.error}
            emptyMessage="あとで見るの候補はありません。"
            lastViewed={candidateLastViewedQ.data ?? {}}
            viewCounts={candidateViewCountsQ.data ?? {}}
            likeCounts={candidateLikesQ.data ?? {}}
          />
          <CandidateSection
            title="利用不可"
            href="/search"
            kind="plain"
            total={unavailableCandidatesQ.data?.total}
            items={unavailableCandidatesQ.data?.items ?? []}
            loading={unavailableCandidatesQ.isLoading}
            error={unavailableCandidatesQ.error}
            emptyMessage="利用不可の候補はありません。"
            lastViewed={candidateLastViewedQ.data ?? {}}
            viewCounts={candidateViewCountsQ.data ?? {}}
            likeCounts={candidateLikesQ.data ?? {}}
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
  kind,
  total,
  items,
  loading,
  error,
  emptyMessage,
  disabled = false,
  lastViewed,
  viewCounts,
  likeCounts,
}: {
  title: string;
  href: string;
  kind: CandidateKind;
  total: number | undefined;
  items: Video[];
  loading: boolean;
  error: unknown;
  emptyMessage: string;
  disabled?: boolean;
  lastViewed: Record<number, string>;
  viewCounts: Record<number, number>;
  likeCounts: Record<number, number>;
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
              <div key={index} className="h-20 animate-pulse rounded-md bg-muted" />
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
                kind={kind}
                href={href}
                video={video}
                lastViewed={video.id == null ? undefined : lastViewed[video.id]}
                viewCount={video.id == null ? undefined : viewCounts[video.id]}
                likeCount={video.id == null ? undefined : likeCounts[video.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type CandidateRowProps = {
  kind: CandidateKind;
  href: string;
  video: Video;
  lastViewed: string | undefined;
  viewCount: number | undefined;
  likeCount: number | undefined;
};

// id が取れない動画は操作できないため read-only 行に落とす。
// Hooks ルール（早期 return の前に hooks を置けない）を守るため、操作行は別コンポーネントに分離する。
function CandidateRow(props: CandidateRowProps) {
  if (props.video.id == null) return <CandidateReadOnlyRow {...props} />;
  return <CandidateInteractiveRow {...props} id={props.video.id} />;
}

// タイトル + メタ情報の共通ヘッダー（read-only / interactive で共有）。
function CandidateRowHeader({
  href,
  video,
  lastViewed,
  viewCount,
  levelLabel,
}: {
  href: string;
  video: Video;
  lastViewed: string | undefined;
  viewCount: number | undefined;
  levelLabel: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{video.essential_filename}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{levelLabel}</span>
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

function CandidateReadOnlyRow({
  href,
  video,
  lastViewed,
  viewCount,
}: CandidateRowProps) {
  return (
    <div className="rounded-md border px-3 py-2">
      <CandidateRowHeader
        href={href}
        video={video}
        lastViewed={lastViewed}
        viewCount={viewCount}
        levelLabel={levelName(video.current_favorite_level)}
      />
    </div>
  );
}

function CandidateInteractiveRow({
  kind,
  href,
  video,
  lastViewed,
  viewCount,
  likeCount,
  id,
}: CandidateRowProps & { id: number }) {
  const qc = useQueryClient();
  const avpCandidateIds = useAvpStore((state) => state.avpCandidateIds);
  const toggleAvpCandidateId = useAvpStore(
    (state) => state.toggleAvpCandidateId,
  );

  // あとで見るは応答値で即時反映し、video prop が refetch で変わったら追従する。
  // prop 変化の検知はレンダー中に行う（React 推奨。effect 内 setState を避ける）。
  const [localWatchLater, setLocalWatchLater] = useState(video.watch_later);
  const [prevWatchLater, setPrevWatchLater] = useState(video.watch_later);
  if (video.watch_later !== prevWatchLater) {
    setPrevWatchLater(video.watch_later);
    setLocalWatchLater(video.watch_later);
  }

  // 再生は /analysis 自身のソート済み候補・集計・ランキングに影響するため、
  // usePlayVideo の共通 invalidate（kpi/likes/view-counts/last-viewed）に加えて以下を渡す。
  // - candidates prefix: 4カテゴリの last_viewed 順並びを再取得（不在検出時の利用不可移動も反映）
  // - ranking prefix: view_count / view_days ランキングへ反映
  // - data: 偏り指標など analysisQ
  // - unavailable-total: 再生失敗（不在検出）時の件数更新
  const playM = usePlayVideo([
    ["analysis", "next-action", "candidates"],
    ["analysis", "next-action", "ranking"],
    ["analysis", "next-action", "unavailable-total"],
    ["analysis", "data"],
  ]);

  // あとで見る系（/watch-later キャッシュ + タブ内件数 + 候補リスト）の無効化をまとめる。
  const invalidateWatchLaterKeys = () => {
    qc.invalidateQueries({ queryKey: ["watch-later-videos"] });
    qc.invalidateQueries({
      queryKey: ["analysis", "next-action", "watch-later-total"],
    });
    qc.invalidateQueries({
      queryKey: ["analysis", "next-action", "candidates", "watch-later"],
    });
  };

  const likeM = useMutation({
    mutationFn: () => likeVideo(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["likes"] });
      // いいねランキング（kind=likes）へ反映。
      qc.invalidateQueries({
        queryKey: ["analysis", "next-action", "ranking", "likes"],
      });
      // SPEC §135: 処理済み動画はいいねで watch_later が自動解除され得る。
      invalidateWatchLaterKeys();
    },
  });

  const watchLaterM = useMutation({
    mutationFn: () => toggleWatchLater(id),
    onSuccess: (res) => setLocalWatchLater(res.watch_later),
    onSettled: invalidateWatchLaterKeys,
  });

  // Tier1判定（未判定セクション）/ Tier2選別（未選別セクション）のレベル変更。
  // setLevel は DB 更新・ファイル名リネーム・judgment_history 追記をサーバー側で行う（複製しない）。
  const levelM = useMutation({
    mutationFn: (level: number) => setLevel(id, level === -1 ? null : level),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["kpi"] });
      qc.invalidateQueries({ queryKey: ["selection-kpi"] });
      qc.invalidateQueries({ queryKey: ["likes"] });
      qc.invalidateQueries({
        queryKey: [
          "analysis",
          "next-action",
          "candidates",
          kind === "tier1" ? "unrated" : "unselected",
        ],
      });
      qc.invalidateQueries({ queryKey: ["analysis", "judgment-trend"] });
      qc.invalidateQueries({ queryKey: ["analysis", "selection-trend"] });
      qc.invalidateQueries({
        queryKey: ["analysis", "selection-distribution"],
      });
      qc.invalidateQueries({ queryKey: ["analysis", "data"] });
      // 判定/選別完了で watch_later が自動解除され得る（SPEC §134/§135）。
      invalidateWatchLaterKeys();
    },
  });

  // Tier2 の「未選別」戻し（! プレフィックス付与・needs_selection=1）。
  const unselectM = useMutation({
    mutationFn: () => unselectVideo(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["selection-kpi"] });
      qc.invalidateQueries({ queryKey: ["likes"] });
      qc.invalidateQueries({
        queryKey: ["analysis", "next-action", "candidates", "unselected"],
      });
      qc.invalidateQueries({ queryKey: ["analysis", "selection-trend"] });
      qc.invalidateQueries({
        queryKey: ["analysis", "selection-distribution"],
      });
      invalidateWatchLaterKeys();
    },
  });

  const busy =
    playM.isPending ||
    likeM.isPending ||
    watchLaterM.isPending ||
    levelM.isPending ||
    unselectM.isPending;
  // 再生・レベル変更は利用不可で抑止。いいね・あとで見るは利用不可でも許可（busy のみ）。AVP は利用不可で不可。
  const mutateDisabled = busy || !video.is_available;
  const avpDisabled = !video.is_available;
  const error =
    playM.error ||
    likeM.error ||
    watchLaterM.error ||
    levelM.error ||
    unselectM.error;
  const isAvpSelected = avpCandidateIds.includes(id);

  // Tier2 では needs_selection=true または level=-1 を「未選別」と表示（「未判定」は Tier2 では出さない）。
  const isTier2Unselected =
    kind === "tier2" &&
    (video.needs_selection || video.current_favorite_level === -1);
  const levelDisplay = isTier2Unselected
    ? "未選別"
    : levelName(video.current_favorite_level);
  const levelSelectValue = isTier2Unselected
    ? "unselect"
    : String(video.current_favorite_level);

  return (
    <div className="space-y-2 rounded-md border px-3 py-2">
      <CandidateRowHeader
        href={href}
        video={video}
        lastViewed={lastViewed}
        viewCount={viewCount}
        levelLabel={levelDisplay}
      />

      {error && (
        <div className="text-xs text-destructive">操作に失敗しました。</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="default"
          disabled={mutateDisabled}
          onClick={() => playM.mutate(id)}
        >
          <Play className="size-4" />
          再生
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => likeM.mutate()}
        >
          <Heart className="size-4" />
          {formatCount(likeCount)}
        </Button>

        <Button
          size="sm"
          variant={localWatchLater ? "default" : "outline"}
          disabled={busy}
          onClick={() => watchLaterM.mutate()}
          title={localWatchLater ? "あとで見るを解除" : "あとで見るに追加"}
        >
          <Bookmark className="size-4" />
        </Button>

        <Tooltip>
          <TooltipTrigger
            render={
              <label
                className={`flex w-fit items-center gap-1 text-xs ${
                  avpDisabled ? "text-muted-foreground" : ""
                }`}
              />
            }
          >
            <Checkbox
              checked={isAvpSelected}
              disabled={avpDisabled}
              onCheckedChange={() => toggleAvpCandidateId(id)}
            />
            AVP
          </TooltipTrigger>
          <TooltipContent>AVPで再生する候補に追加</TooltipContent>
        </Tooltip>

        {(kind === "tier1" || kind === "tier2") && (
          <Select
            value={levelSelectValue}
            onValueChange={(v) => {
              if (v === "unselect") unselectM.mutate();
              else levelM.mutate(Number(v));
            }}
            disabled={mutateDisabled}
          >
            <SelectTrigger className="w-28" size="sm">
              <span>{levelDisplay}</span>
            </SelectTrigger>
            <SelectContent>
              {kind === "tier2" ? (
                <>
                  <SelectItem value="unselect">未選別</SelectItem>
                  {[0, 1, 2, 3, 4].map((l) => (
                    <SelectItem key={l} value={String(l)}>
                      {levelName(l)}
                    </SelectItem>
                  ))}
                </>
              ) : (
                LEVEL_OPTIONS.map((l) => (
                  <SelectItem key={l} value={String(l)}>
                    {levelName(l)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>
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
