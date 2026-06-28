// 統合 Variant K 検索: 結果テーブル（操作付き・順位列なし）。
// 【役割】フィルタ/ソート済みの結果を VariantKActionTable で一覧する。列＝タイトル/総合スコア/視聴日数/
//   いいね/Tier1/Tier2/操作。ソート可能ヘッダ＝総合スコア/視聴日数/いいね。
// 【設計制約】
//   - 表示と委譲のみ。状態は controller（ページ内メモリ）。総合スコアは公式から再計算（_data/variantKScore）。
//   - 順位列は出さない（ランキングと統合しない）。利用不可は行を薄く＋再生/AVP候補を disabled。
//   - 視聴回数/更新日/登録日/サムネは出さない。テーブルにバッジを置かない（土台方針）。
// 【依存関係】lucide, lib/utils（cn）, _components(ActionTable/RowActions/useVariantKRowStates), _data(variantKMock/variantKScore), ./shared。

"use client";

import { ArrowDown, ArrowUp, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VariantKActionTable,
  type VariantKColumn,
} from "../_components/VariantKActionTable";
import { VariantKRowActions } from "../_components/VariantKRowActions";
import type { VariantKRowStateController } from "../_components/useVariantKRowStates";
import { tier1Label, tier2Label, type VariantKVideo } from "../_data/variantKMock";
import { compositeScore } from "../_data/variantKScore";
import { nextSearchSort, type SearchSort, type SearchSortKey } from "./shared";

type SortableKey = Exclude<SearchSortKey, "default">;

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortableKey;
  sort: SearchSort;
  onSort: (key: SortableKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      title={`${label}で並べ替え（クリックで降順⇔昇順）`}
      className={cn("inline-flex items-center gap-1 transition-colors hover:text-foreground", active && "text-foreground")}
    >
      {label}
      {active ? (
        sort.dir === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />
      ) : (
        <ArrowDown className="size-3 opacity-20" />
      )}
    </button>
  );
}

export function SearchResults({
  rows,
  controller,
  sort,
  onSortChange,
  emptyState,
}: {
  rows: VariantKVideo[];
  controller: VariantKRowStateController;
  sort: SearchSort;
  onSortChange: (sort: SearchSort) => void;
  emptyState?: React.ReactNode;
}) {
  const handleSort = (key: SortableKey) => onSortChange(nextSearchSort(sort, key));

  const columns: VariantKColumn<VariantKVideo>[] = [
    {
      key: "title",
      header: "タイトル",
      render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
    },
    {
      key: "score",
      header: <SortHeader label="総合スコア" sortKey="composite" sort={sort} onSort={handleSort} />,
      align: "right",
      render: (row) => <span className="text-foreground">{compositeScore(row).toLocaleString("en-US")}</span>,
    },
    {
      key: "view_days",
      header: <SortHeader label="視聴日数" sortKey="view_days" sort={sort} onSort={handleSort} />,
      align: "right",
      render: (row) => `${row.view_days}日`,
    },
    {
      key: "likes",
      header: <SortHeader label="いいね" sortKey="likes" sort={sort} onSort={handleSort} />,
      align: "right",
      render: (row) => (
        <span className={cn("inline-flex items-center justify-end gap-1", row.liked ? "text-rose-600" : "text-muted-foreground")}>
          <Heart className={cn("size-3.5", row.liked && "fill-current")} />
          <span className="tabular-nums">{row.like_count}</span>
        </span>
      ),
    },
    { key: "tier1", header: "Tier1", align: "center", render: (row) => tier1Label(row.tier1_status) },
    { key: "tier2", header: "Tier2", align: "center", render: (row) => tier2Label(row.tier2_status) },
    {
      key: "actions",
      header: "操作",
      align: "right",
      render: (row) => (
        <VariantKRowActions
          state={controller.getRowState(row)}
          unavailable={!row.available}
          playing={controller.playingId === row.id}
          onPlay={() => controller.setPlaying(row.id)}
        />
      ),
    },
  ];

  return (
    <VariantKActionTable<VariantKVideo>
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      dimRow={(row) => !row.available}
      playingRow={(row) => controller.playingId === row.id}
      emptyState={emptyState}
    />
  );
}
