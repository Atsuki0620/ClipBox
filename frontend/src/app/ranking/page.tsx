"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLastViewed, getLikes, getRanking, getViewCounts } from "@/lib/api";
import { levelName } from "@/lib/levels";
import type {
  RankingAvailability,
  RankingItem,
  RankingParams,
  RankingPeriod,
  RankingType,
} from "@/lib/types";
import { VideoCard } from "@/components/VideoCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const RANKING_LABELS: Record<RankingType, string> = {
  view_count: "視聴回数",
  view_days: "視聴日数",
  likes: "いいね数",
  composite: "総合",
};

const SCORE_SUFFIX: Record<RankingType, string> = {
  view_count: "回",
  view_days: "日",
  likes: "個",
  composite: "pt",
};

const PERIODS: RankingPeriod[] = ["180日", "1年", "全期間"];
const AVAILABILITY_OPTIONS: { value: RankingAvailability; label: string }[] = [
  { value: "利用可能のみ", label: "再生可能だけ" },
  { value: "すべて", label: "全動画" },
];
const TOP_N_OPTIONS = [10, 20, 50];
const LEVEL_OPTIONS = [
  { value: "none", label: "制限なし" },
  { value: "3", label: "Lv3以上" },
  { value: "4", label: "Lv4のみ" },
];

export default function RankingPage() {
  const [type, setType] = useState<RankingType>("composite");
  const [period, setPeriod] = useState<RankingPeriod>("全期間");
  const [minLevel, setMinLevel] = useState<number | undefined>(undefined);
  const [topN, setTopN] = useState(20);
  const [availability, setAvailability] =
    useState<RankingAvailability>("利用可能のみ");

  const params: RankingParams = useMemo(
    () => ({
      type,
      period,
      min_level: minLevel,
      top_n: topN,
      availability,
    }),
    [availability, minLevel, period, topN, type],
  );

  const rankingQ = useQuery({
    queryKey: ["ranking", params],
    queryFn: () => getRanking(params),
  });

  const items = useMemo(() => rankingQ.data?.items ?? [], [rankingQ.data?.items]);
  const ids = useMemo(
    () =>
      items
        .map((item) => item.video.id)
        .filter((id): id is number => id !== null),
    [items],
  );

  const likesQ = useQuery({
    queryKey: ["likes", ids],
    queryFn: () => getLikes(ids),
    enabled: ids.length > 0,
  });
  const viewCountsQ = useQuery({
    queryKey: ["view-counts"],
    queryFn: getViewCounts,
  });
  const lastViewedQ = useQuery({
    queryKey: ["last-viewed"],
    queryFn: getLastViewed,
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">ランキング</h1>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        再生・判定・いいね検証は Streamlit 停止 + POST /api/backup 後に行ってください。
        再生はサーバー機で外部プレイヤーが開きます。
      </div>

      <RankingFilterBar
        type={type}
        period={period}
        minLevel={minLevel}
        topN={topN}
        availability={availability}
        onType={setType}
        onPeriod={setPeriod}
        onMinLevel={setMinLevel}
        onTopN={setTopN}
        onAvailability={setAvailability}
      />

      {rankingQ.isLoading || rankingQ.isFetching ? (
        <RankingSkeleton count={Math.min(topN, 8)} />
      ) : rankingQ.isError ? (
        <ErrorBox error={rankingQ.error} />
      ) : (
        <RankingList
          items={items}
          type={type}
          likeCounts={likesQ.data ?? {}}
          viewCounts={viewCountsQ.data ?? {}}
          lastViewed={lastViewedQ.data ?? {}}
        />
      )}
    </div>
  );
}

function RankingFilterBar({
  type,
  period,
  minLevel,
  topN,
  availability,
  onType,
  onPeriod,
  onMinLevel,
  onTopN,
  onAvailability,
}: {
  type: RankingType;
  period: RankingPeriod;
  minLevel: number | undefined;
  topN: number;
  availability: RankingAvailability;
  onType: (value: RankingType) => void;
  onPeriod: (value: RankingPeriod) => void;
  onMinLevel: (value: number | undefined) => void;
  onTopN: (value: number) => void;
  onAvailability: (value: RankingAvailability) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <Select value={type} onValueChange={(value) => onType(value as RankingType)}>
        <SelectTrigger className="w-32" size="sm">
          <span className="flex flex-1 text-left">{RANKING_LABELS[type]}</span>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(RANKING_LABELS) as RankingType[]).map((key) => (
            <SelectItem key={key} value={key}>
              {RANKING_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={period} onValueChange={(value) => onPeriod(value as RankingPeriod)}>
        <SelectTrigger className="w-28" size="sm">
          <span className="flex flex-1 text-left">{period}</span>
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={minLevel === undefined ? "none" : String(minLevel)}
        onValueChange={(value) =>
          onMinLevel(value === "none" ? undefined : Number(value))
        }
      >
        <SelectTrigger className="w-32" size="sm">
          <span className="flex flex-1 text-left">
            {LEVEL_OPTIONS.find((option) =>
              option.value === (minLevel === undefined ? "none" : String(minLevel))
            )?.label ?? "制限なし"}
          </span>
        </SelectTrigger>
        <SelectContent>
          {LEVEL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(topN)} onValueChange={(value) => onTopN(Number(value))}>
        <SelectTrigger className="w-24" size="sm">
          <span className="flex flex-1 text-left">{topN} 件</span>
        </SelectTrigger>
        <SelectContent>
          {TOP_N_OPTIONS.map((value) => (
            <SelectItem key={value} value={String(value)}>
              {value} 件
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={availability}
        onValueChange={(value) => onAvailability(value as RankingAvailability)}
      >
        <SelectTrigger className="w-32" size="sm">
          <span className="flex flex-1 text-left">
            {AVAILABILITY_OPTIONS.find((option) => option.value === availability)
              ?.label ?? "再生可能だけ"}
          </span>
        </SelectTrigger>
        <SelectContent>
          {AVAILABILITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function RankingList({
  items,
  type,
  likeCounts,
  viewCounts,
  lastViewed,
}: {
  items: RankingItem[];
  type: RankingType;
  likeCounts: Record<number, number>;
  viewCounts: Record<number, number>;
  lastViewed: Record<number, string>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        表示できるランキングデータがありません。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const id = item.video.id as number;

        return (
          <div
            key={`${item.rank}-${id}`}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 rounded-lg border p-3 sm:grid-cols-[5rem_minmax(0,1fr)]"
          >
            <div className="flex min-h-32 flex-col items-center justify-start rounded-md bg-muted/60 px-2 py-3 text-center">
              <div className="text-xs text-muted-foreground">順位</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                #{item.rank}
              </div>
              <div className="mt-2 text-sm font-medium tabular-nums">
                {item.score}
                {SCORE_SUFFIX[type]}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {levelName(item.video.current_favorite_level)}
              </div>
            </div>

            <VideoCard
              video={item.video}
              likeCount={likeCounts[id] ?? 0}
              viewCount={viewCounts[id] ?? 0}
              lastViewed={lastViewed[id] ?? null}
              invalidateKeys={[["ranking"]]}
            />
          </div>
        );
      })}
    </div>
  );
}

function RankingSkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 rounded-lg border p-3 sm:grid-cols-[5rem_minmax(0,1fr)]"
        >
          <Skeleton className="h-32" />
          <Skeleton className="h-40" />
        </div>
      ))}
    </div>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-md border border-destructive p-4 text-sm text-destructive">
      ランキング取得に失敗しました:{" "}
      {error instanceof Error ? error.message : "不明なエラー"}
    </div>
  );
}
