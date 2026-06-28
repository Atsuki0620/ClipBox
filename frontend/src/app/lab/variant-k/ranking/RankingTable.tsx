// 統合 Variant K ランキング: 操作付きスコアテーブル。
// 【役割】rankVideos→フィルタ→ソート済みの行を VariantKActionTable で一覧する。順位/総合スコア/視聴日数/
//   いいね/Tier1/Tier2/操作を通常列に、詳細列ON で 基礎点/Tier1補正/Tier2補正/補正倍率/保存先 を加える。
//   ソート可能ヘッダ（総合スコア/視聴日数/いいね）はクリックで矢印表示＋向き切替。順位は現在のソート順での 1..N。
// 【設計制約】
//   - 表示と委譲のみ。状態は controller（ページ内メモリ）。総合スコアは公式から再計算（_data/variantKScore）。
//   - 利用不可は行を薄く（dimRow）・再生/AVP候補を disabled。再生中は行ハイライト（playingRow）。
//   - 視聴回数/更新日/登録日/サムネは出さない。テーブルにバッジを置かない（土台方針）。
// 【依存関係】lucide, lib/utils（cn）, _components(ActionTable/RowActions), _data(variantKMock ラベル/variantKScore), ./shared。

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
import {
  baseScore,
  bonusMultiplier,
  compositeScore,
  formatBonus,
  tier1Bonus,
  tier2Bonus,
} from "../_data/variantKScore";
import {
  nextRankingSort,
  type RankingSort,
  type RankingSortKey,
} from "./shared";

const storageLabel = (storage: string) =>
  storage === "C_DRIVE" ? "Cドライブ" : storage === "EXTERNAL_HDD" ? "外付けHDD" : storage;

// クリックでソートするヘッダ（矢印付き）。
function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: RankingSortKey;
  sort: RankingSort;
  onSort: (key: RankingSortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      title={`${label}で並べ替え（クリックで降順⇔昇順）`}
      className={cn(
        "inline-flex items-center gap-1 transition-colors hover:text-foreground",
        active && "text-foreground",
      )}
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

export function RankingTable({
  rows,
  controller,
  sort,
  onSortChange,
  showDetails,
  emptyState,
}: {
  rows: VariantKVideo[];
  controller: VariantKRowStateController;
  sort: RankingSort;
  onSortChange: (sort: RankingSort) => void;
  showDetails: boolean;
  emptyState?: React.ReactNode;
}) {
  const handleSort = (key: RankingSortKey) => onSortChange(nextRankingSort(sort, key));

  // 順位は現在のソート順での 1..N。render は row しか受け取らないため id→順位の Map を作る。
  const rankById = new Map(rows.map((row, index) => [row.id, index + 1]));

  const columns: VariantKColumn<VariantKVideo>[] = [
    {
      key: "rank",
      header: "順位",
      align: "right",
      className: "w-12",
      render: (row) => <span className="font-medium text-foreground">{rankById.get(row.id)}</span>,
    },
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
    ...(showDetails
      ? ([
          { key: "base", header: "基礎点", align: "right", render: (row: VariantKVideo) => baseScore(row) },
          {
            key: "t1bonus",
            header: "Tier1補正",
            align: "right",
            render: (row: VariantKVideo) => (
              <span className={tier1Bonus(row) > 0 ? "text-foreground" : "text-muted-foreground"}>{formatBonus(tier1Bonus(row))}</span>
            ),
          },
          {
            key: "t2bonus",
            header: "Tier2補正",
            align: "right",
            render: (row: VariantKVideo) => (
              <span className={tier2Bonus(row) > 0 ? "text-foreground" : "text-muted-foreground"}>{formatBonus(tier2Bonus(row))}</span>
            ),
          },
          { key: "mult", header: "補正倍率", align: "right", render: (row: VariantKVideo) => `×${bonusMultiplier(row).toFixed(1)}` },
          { key: "storage", header: "保存先", align: "center", render: (row: VariantKVideo) => storageLabel(row.storage) },
        ] as VariantKColumn<VariantKVideo>[])
      : []),
    {
      key: "actions",
      header: "操作",
      align: "right",
      render: (row) => {
        const state = controller.getRowState(row);
        return (
          <VariantKRowActions
            state={state}
            unavailable={!row.available}
            playing={controller.playingId === row.id}
            onPlay={() => controller.setPlaying(row.id)}
          />
        );
      },
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
