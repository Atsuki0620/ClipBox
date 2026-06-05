"use client";

// 検索画面。GET /videos/search（normalize_text 正規化一致・利用不可含む・unpaged）。
// 結果はクライアントページングし、現在ページ分のみ VideoGrid に渡す（getLikes の id を ≤page_size に抑える）。

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFilterOptions, searchVideos } from "@/lib/api";
import { storageLabel } from "@/lib/levels";
import { VideoGrid } from "@/components/VideoGrid";
import { MultiSelect } from "@/components/MultiSelect";
import { Pagination } from "@/components/Pagination";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [storage, setStorage] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data: options } = useQuery({
    queryKey: ["filter-options"],
    queryFn: getFilterOptions,
  });

  const searchQ = useQuery({
    queryKey: ["search", keyword, storage],
    queryFn: () => searchVideos(keyword, storage),
    enabled: keyword.trim().length > 0,
  });

  const results = useMemo(() => searchQ.data ?? [], [searchQ.data]);
  // 現在ページ分だけ切り出す（page は結果が変わったら 1 に戻す）。
  const pageItems = useMemo(
    () => results.slice((page - 1) * pageSize, page * pageSize),
    [results, page, pageSize],
  );

  // キーワード/絞り込み変更時にページを 1 へ戻す。
  const onKeyword = (v: string) => {
    setKeyword(v);
    setPage(1);
  };
  const onStorage = (v: string[]) => {
    setStorage(v);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">検索</h1>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
        <Input
          placeholder="キーワード検索（ファイル名）"
          value={keyword}
          onChange={(e) => onKeyword(e.target.value)}
          className="w-64"
        />
        <MultiSelect
          label="保存場所"
          options={(options?.storage_locations ?? []).map((s) => ({
            value: s,
            label: storageLabel(s),
          }))}
          selected={storage}
          onChange={onStorage}
          searchable={false}
        />
      </div>

      {keyword.trim().length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          キーワードを入力してください。
        </div>
      ) : searchQ.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : searchQ.isError ? (
        <div className="rounded-md border border-destructive p-4 text-sm text-destructive">
          検索に失敗しました:{" "}
          {searchQ.error instanceof Error ? searchQ.error.message : "不明なエラー"}
        </div>
      ) : (
        <>
          <VideoGrid
            videos={pageItems}
            emptyMessage="一致する動画がありません。"
            invalidateKeys={[["search"]]}
          />
          {results.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={results.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
