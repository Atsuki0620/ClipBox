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
import { VariantKLevelSelect } from "../_components/VariantKLevelSelect";
import { VariantKBadge } from "../_components/VariantKBadge";
import type { VariantKRowStateController } from "../_components/useVariantKRowStates";
import {
  TIER1_SELECT_OPTIONS,
  TIER2_SELECT_OPTIONS,
  tier1ToSelectValue,
  tier2ToSelectValue,
  selectValueToTier1,
  selectValueToTier2,
  type VariantKVideo,
} from "../_data/variantKMock";
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

const storageLabel = (storage: string) =>
  storage === "C_DRIVE" ? "Cドライブ" : storage === "EXTERNAL_HDD" ? "外付けHDD" : storage;

export function SearchResults({
  rows,
  controller,
  sort,
  onSortChange,
  showDetailColumn,
  emptyState,
}: {
  rows: VariantKVideo[];
  controller: VariantKRowStateController;
  sort: SearchSort;
  onSortChange: (sort: SearchSort) => void;
  showDetailColumn: boolean;
  emptyState?: React.ReactNode;
}) {
  const handleSort = (key: SortableKey) => onSortChange(nextSearchSort(sort, key));

  const columns: VariantKColumn<VariantKVideo>[] = [
    {
      key: "title",
      header: "タイトル",
      // 利用不可はタイトル横にバッジ（行全体の薄表示は dimRow 側で維持）。
      render: (row) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-medium text-foreground">{row.title}</span>
          {!row.available ? <VariantKBadge kind="unavailable" /> : null}
        </span>
      ),
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
    {
      key: "tier1",
      header: "Tier1",
      align: "center",
      render: (row) => {
        const state = controller.getRowState(row);
        return (
          <VariantKLevelSelect
            ariaLabel="Tier1レベル"
            value={tier1ToSelectValue(row.tier1_status)}
            options={TIER1_SELECT_OPTIONS}
            onChange={(v) => state.setTier1Level(selectValueToTier1(v))}
          />
        );
      },
    },
    {
      key: "tier2",
      header: "Tier2",
      align: "center",
      render: (row) => {
        if (row.tier2_status === "none") return <span className="text-muted-foreground">—</span>;
        const state = controller.getRowState(row);
        return (
          <VariantKLevelSelect
            ariaLabel="Tier2レベル"
            value={tier2ToSelectValue(row.tier2_status)}
            options={TIER2_SELECT_OPTIONS}
            onChange={(v) => state.setTier2Level(selectValueToTier2(v))}
          />
        );
      },
    },
    ...(showDetailColumn
      ? ([
          {
            key: "storage",
            header: "保存先",
            align: "center",
            // 匿名化分類（実パスは出さない）。
            render: (row: VariantKVideo) => storageLabel(row.storage),
          },
        ] as VariantKColumn<VariantKVideo>[])
      : []),
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
