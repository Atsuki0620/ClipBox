"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getConfig,
  getSelectionFate,
  getSelectionKpi,
  listSelectionVideos,
} from "@/lib/api";
import type {
  SelectionStatus,
  SelectionVideoListParams,
  SortField,
  SortOrder,
  Video,
  VideosResponse,
} from "@/lib/types";
import { KpiCard } from "@/components/KpiCard";
import { Pagination } from "@/components/Pagination";
import { VideoGrid } from "@/components/VideoGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Dices, Library, RefreshCcw, Shuffle } from "lucide-react";

const RANDOM_COUNTS = [5, 10, 15, 20];
const MAX_FETCH_PAGE_SIZE = 200;

const SORT_LABELS: Record<SortField, string> = {
  favorite_level: "レベル",
  creation_date: "作成日",
  view_count: "視聴回数",
  last_viewed: "最終視聴",
  title: "タイトル",
  modified: "更新日",
};

const STATUS_LABELS: Record<SelectionStatus, string> = {
  all: "全セレクション",
  unselected: "未選別",
  completed: "選別済み",
};

export default function Tier2Page() {
  const configQ = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const configuredFolder = configQ.data?.selection_folder?.trim() ?? "";
  const [folderDraftOverride, setFolderDraftOverride] = useState<string | null>(null);
  const [activeFolderOverride, setActiveFolderOverride] = useState<string | null>(null);
  const folderDraft = folderDraftOverride ?? configuredFolder;
  const activeFolder = activeFolderOverride ?? configuredFolder;

  const [status, setStatus] = useState<SelectionStatus>("all");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<SortField | "default">("default");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [randomCount, setRandomCount] = useState(10);
  const [randomToken, setRandomToken] = useState(0);
  const [fateToken, setFateToken] = useState(0);

  const sortParam = sort === "default" ? undefined : sort;
  const hasFolder = activeFolder.trim().length > 0;

  const selectionParams: SelectionVideoListParams = useMemo(
    () => ({
      folder: activeFolder,
      status,
      sort: sortParam,
      order,
      page,
      page_size: pageSize,
    }),
    [activeFolder, order, page, pageSize, sortParam, status],
  );

  const kpiQ = useQuery({
    queryKey: ["selection-kpi", activeFolder],
    queryFn: () => getSelectionKpi(activeFolder),
    enabled: hasFolder,
  });

  const videosQ = useQuery({
    queryKey: ["selection-videos", selectionParams, keyword],
    queryFn: () => fetchSelectionLibrary(selectionParams, keyword),
    enabled: hasFolder,
  });

  const randomSourceQ = useQuery({
    queryKey: ["selection-random-source", activeFolder],
    queryFn: () => fetchAllSelectionVideos(activeFolder, "unselected"),
    enabled: hasFolder,
  });

  const randomVideos = useMemo(
    () => {
      if (randomToken < 0) return [];
      return sampleVideos(randomSourceQ.data ?? [], randomCount);
    },
    [randomSourceQ.data, randomCount, randomToken],
  );

  const fateQ = useQuery({
    queryKey: ["selection-fate", activeFolder, fateToken],
    queryFn: () => getSelectionFate(activeFolder),
    enabled: hasFolder && fateToken > 0,
  });

  const applyFolder = () => {
    setActiveFolderOverride(folderDraft.trim());
    setPage(1);
    setRandomToken((t) => t + 1);
    setFateToken(0);
  };

  const resetPage = () => setPage(1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Tier 2 — セレクション</h1>
        <div className="text-sm text-muted-foreground">
          適用中: {activeFolder || "未設定"}
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        再生・判定・いいね検証は Streamlit 停止 + POST /api/backup 後に行ってください。
        再生はサーバー機で外部プレイヤーが開きます。
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <Input
          value={folderDraft}
          onChange={(e) => setFolderDraftOverride(e.target.value)}
          placeholder="セレクションフォルダ"
          className="min-w-72 flex-1"
        />
        <Button size="sm" onClick={applyFolder}>
          <Check className="size-4" />
          適用
        </Button>
        {configQ.isError && <ErrorText error={configQ.error} prefix="設定の取得に失敗" />}
      </div>

      <div className="flex flex-wrap gap-3">
        {!hasFolder ? (
          <>
            <KpiCard label="未選別" value="-" />
            <KpiCard label="選別済み" value="-" />
            <KpiCard label="選別率" value="-" />
            <KpiCard label="本日の選別" value="-" />
          </>
        ) : kpiQ.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 flex-1" />
          ))
        ) : kpiQ.data ? (
          <>
            <KpiCard label="未選別" value={kpiQ.data.unselected_count} />
            <KpiCard label="選別済み" value={kpiQ.data.judged_count} />
            <KpiCard label="選別率" value={`${kpiQ.data.judged_rate.toFixed(1)}%`} />
            <KpiCard label="本日の選別" value={kpiQ.data.today_judged_count} />
          </>
        ) : (
          <ErrorText error={kpiQ.error} prefix="KPI の取得に失敗" />
        )}
      </div>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">
            <Library className="size-4" />
            ライブラリ
          </TabsTrigger>
          <TabsTrigger value="random">
            <Shuffle className="size-4" />
            ランダム
          </TabsTrigger>
          <TabsTrigger value="fate">
            <Dices className="size-4" />
            運命の1本
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="flex flex-col gap-3">
          <SelectionFilterBar
            keyword={keyword}
            status={status}
            sort={sort}
            order={order}
            onKeyword={(value) => {
              setKeyword(value);
              resetPage();
            }}
            onStatus={(value) => {
              setStatus(value);
              resetPage();
            }}
            onSort={(value) => {
              setSort(value);
              resetPage();
            }}
            onOrder={(value) => {
              setOrder(value);
              resetPage();
            }}
          />

          {!hasFolder ? (
            <EmptyBox>セレクションフォルダが未設定</EmptyBox>
          ) : videosQ.isLoading || videosQ.isFetching ? (
            <VideoSkeleton count={Math.min(pageSize, 8)} />
          ) : videosQ.isError ? (
            <ErrorBox error={videosQ.error} />
          ) : (
            <>
              <VideoGrid
                videos={videosQ.data?.items ?? []}
                emptyMessage="条件に一致するセレクション動画がありません。"
                invalidateKeys={[["selection-videos"], ["selection-kpi"]]}
              />
              {(videosQ.data?.total ?? 0) > 0 && (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={videosQ.data?.total ?? 0}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    resetPage();
                  }}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="random" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(randomCount)}
              onValueChange={(value) => setRandomCount(Number(value))}
            >
              <SelectTrigger className="w-28" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANDOM_COUNTS.map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {count} 本
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => setRandomToken((t) => t + 1)}
              disabled={!hasFolder || randomSourceQ.isFetching}
            >
              <RefreshCcw className="size-4" />
              シャッフル
            </Button>
          </div>

          {!hasFolder ? (
            <EmptyBox>セレクションフォルダが未設定</EmptyBox>
          ) : randomSourceQ.isLoading || randomSourceQ.isFetching ? (
            <VideoSkeleton count={Math.min(randomCount, 8)} />
          ) : randomSourceQ.isError ? (
            <ErrorBox error={randomSourceQ.error} />
          ) : (
            <VideoGrid
              videos={randomVideos}
              emptyMessage="条件に一致するセレクション動画がありません。"
              invalidateKeys={[["selection-kpi"]]}
            />
          )}
        </TabsContent>

        <TabsContent value="fate" className="flex flex-col gap-3">
          <Button
            size="sm"
            className="w-fit"
            onClick={() => setFateToken((t) => t + 1)}
            disabled={!hasFolder || fateQ.isFetching}
          >
            <Dices className="size-4" />
            運命の1本を引く
          </Button>

          {!hasFolder ? (
            <EmptyBox>セレクションフォルダが未設定</EmptyBox>
          ) : fateToken === 0 ? (
            <EmptyBox>ボタンを押して運命の1本を引いてください。</EmptyBox>
          ) : fateQ.isFetching ? (
            <Skeleton className="h-40 w-full max-w-sm" />
          ) : fateQ.isError ? (
            <ErrorBox error={fateQ.error} />
          ) : fateQ.data == null ? (
            <EmptyBox>対象なし</EmptyBox>
          ) : (
            <div className="max-w-sm">
              <VideoGrid videos={[fateQ.data]} invalidateKeys={[["selection-kpi"]]} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SelectionFilterBar({
  keyword,
  status,
  sort,
  order,
  onKeyword,
  onStatus,
  onSort,
  onOrder,
}: {
  keyword: string;
  status: SelectionStatus;
  sort: SortField | "default";
  order: SortOrder;
  onKeyword: (value: string) => void;
  onStatus: (value: SelectionStatus) => void;
  onSort: (value: SortField | "default") => void;
  onOrder: (value: SortOrder) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <Input
        placeholder="キーワード検索（ファイル名）"
        value={keyword}
        onChange={(e) => onKeyword(e.target.value)}
        className="w-64"
      />

      <Select value={status} onValueChange={(value) => onStatus(value as SelectionStatus)}>
        <SelectTrigger className="w-36" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(STATUS_LABELS) as SelectionStatus[]).map((key) => (
            <SelectItem key={key} value={key}>
              {STATUS_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sort}
        onValueChange={(value) => onSort(value as SortField | "default")}
      >
        <SelectTrigger className="w-36" size="sm">
          <SelectValue placeholder="並び順" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">既定</SelectItem>
          {(Object.keys(SORT_LABELS) as SortField[]).map((key) => (
            <SelectItem key={key} value={key}>
              {SORT_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={order} onValueChange={(value) => onOrder(value as SortOrder)}>
        <SelectTrigger className="w-28" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">降順</SelectItem>
          <SelectItem value="asc">昇順</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

async function fetchSelectionLibrary(
  params: SelectionVideoListParams,
  keyword: string,
): Promise<VideosResponse> {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) {
    return listSelectionVideos(params);
  }

  const allItems = await fetchAllSelectionVideos(
    params.folder,
    params.status ?? "all",
    params.sort,
    params.order,
  );
  const normalizedKeyword = normalizeVideoText(trimmedKeyword);
  const filtered = allItems.filter((video) =>
    normalizeVideoText(video.essential_filename).includes(normalizedKeyword),
  );
  const page = params.page ?? 1;
  const pageSize = params.page_size ?? 50;

  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    page_size: pageSize,
  };
}

async function fetchAllSelectionVideos(
  folder: string,
  status: SelectionStatus,
  sort?: SortField,
  order?: SortOrder,
): Promise<Video[]> {
  const firstPage = await listSelectionVideos({
    folder,
    status,
    sort,
    order,
    page: 1,
    page_size: MAX_FETCH_PAGE_SIZE,
  });
  const totalPages = Math.ceil(firstPage.total / MAX_FETCH_PAGE_SIZE);
  if (totalPages <= 1) return firstPage.items;

  const restPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      listSelectionVideos({
        folder,
        status,
        sort,
        order,
        page: index + 2,
        page_size: MAX_FETCH_PAGE_SIZE,
      }),
    ),
  );

  return [firstPage, ...restPages].flatMap((response) => response.items);
}

function sampleVideos(videos: Video[], count: number): Video[] {
  if (videos.length <= count) return videos;
  const shuffled = [...videos];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function normalizeVideoText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0x60),
    );
}

function VideoSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-40" />
      ))}
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

function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-md border border-destructive p-4 text-sm text-destructive">
      読み込みに失敗しました:{" "}
      {error instanceof Error ? error.message : "不明なエラー"}
    </div>
  );
}

function ErrorText({ error, prefix }: { error: unknown; prefix: string }) {
  return (
    <div className="text-sm text-destructive">
      {prefix}: {error instanceof Error ? error.message : "不明なエラー"}
    </div>
  );
}
