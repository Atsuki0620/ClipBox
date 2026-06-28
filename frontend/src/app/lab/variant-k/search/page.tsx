// 統合 Variant K 検索 → /lab/variant-k/search
// 【役割】キーワード/条件で見つけてその場で処理する高機能フィルタ＋操作付きテーブル。キーワード未入力は空状態。
// 【設計制約】
//   - UI LAB モック。API/DB/localStorage/sessionStorage 本体仕様に触れない（状態はページ内メモリ）。
//   - 検索条件・結果は永続化しない。ランキングと統合しない（テーブル土台のみ共有）。順位列は出さない。
//   - 総合スコアは SPEC §9 の公式から再計算（_data/variantKScore）。既定=全動画（利用可否はフィルタで切替）。
//   - 視聴回数/更新日/登録日/サムネは出さない。
// 【依存関係】react, lucide, _data(variantKMock), _components(useVariantKRowStates/EmptyState/TooltipLabel),
//   ./shared, ./SearchFilters, ./SearchResults。

"use client";

import { useMemo, useState } from "react";
import { SearchX, Inbox } from "lucide-react";
import { VARIANT_K_VIDEOS } from "../_data/variantKMock";
import { useVariantKRowStates } from "../_components/useVariantKRowStates";
import { VariantKEmptyState } from "../_components/VariantKEmptyState";
import { VariantKTooltipLabel } from "../_components/VariantKTooltipLabel";
import { SearchFilters } from "./SearchFilters";
import { SearchResults } from "./SearchResults";
import {
  applySearchFilters,
  sortSearch,
  DEFAULT_SEARCH_FILTERS,
  DEFAULT_SEARCH_SORT,
  type SearchFilters as SearchFiltersType,
  type SearchSort,
} from "./shared";

export default function VariantKSearchPage() {
  const controller = useVariantKRowStates(VARIANT_K_VIDEOS);
  const [filters, setFilters] = useState<SearchFiltersType>(DEFAULT_SEARCH_FILTERS);
  const [sort, setSort] = useState<SearchSort>(DEFAULT_SEARCH_SORT);

  const hasKeyword = filters.keyword.trim().length > 0;

  const rows = useMemo(
    () => (hasKeyword ? sortSearch(applySearchFilters(controller.videos, filters), sort) : []),
    [controller.videos, filters, sort, hasKeyword],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          <VariantKTooltipLabel
            label="検索"
            tooltip={
              <div className="flex max-w-xs flex-col gap-1 text-[11px] leading-relaxed">
                <p>キーワード（タイトル部分一致）＋詳細フィルタで見つけて、その場で処理します。</p>
                <p>総合スコアは公式どおりに再計算（ランキングと同じ式）。順位は出しません。</p>
                <p>既定の並びは Tier1行→Tier2行→総合スコア降順。ヘッダで各指標の降順⇔昇順に切替。</p>
                <p className="font-medium text-foreground">検索条件・結果は永続化しません（メモリのみ）。</p>
              </div>
            }
          />
        </h1>
        <p className="text-[12px] text-muted-foreground">
          条件で絞り込み、再生／いいね／あとで見る／AVP候補をその場で操作します（モック）。
        </p>
      </div>

      <SearchFilters filters={filters} onChange={setFilters} />

      {!hasKeyword ? (
        <VariantKEmptyState
          icon={<SearchX className="size-5" />}
          title="キーワードを入力してください"
          description="タイトルのキーワードを入れると検索結果が表示されます。詳細フィルタだけでは検索しません（検索条件は保存されません）。"
        />
      ) : (
        <>
          <SearchResults
            rows={rows}
            controller={controller}
            sort={sort}
            onSortChange={setSort}
            emptyState={
              <VariantKEmptyState
                icon={<Inbox className="size-5" />}
                title="条件に一致する動画がありません"
                description="キーワードやフィルタを見直してください。検索条件は保存されません。"
              />
            }
          />
          <p className="px-1 text-[11px] text-muted-foreground">
            該当 {rows.length} 件（モック）。ヘッダの 総合スコア／視聴日数／いいね はクリックで降順⇔昇順、再生でその行が「再生中」ハイライトになります。
          </p>
        </>
      )}
    </div>
  );
}
