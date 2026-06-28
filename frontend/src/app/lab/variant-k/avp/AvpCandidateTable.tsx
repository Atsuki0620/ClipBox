// 統合 Variant K AVP 上段：AVP候補テーブル。
// 【役割】AVP候補（上限なし）を操作付きテーブルで一覧し、再生対象（最大4本）への追加/候補からの除外を行う。
//   ランキング/検索と共有する VariantKActionTable 土台を使う（詳細な並べ替え列は段階6）。
// 【設計制約】
//   - 表示と委譲のみ。状態は controller（ページ内メモリ）。スコア/順位はモック値をそのまま見せる。
//   - 利用不可は行を薄くし、再生対象に追加できない。あとで見る列は状態表示のみ（AVP候補と混同しない）。
//   - テーブルにはバッジを置かない（土台方針）。
// 【依存関係】react, lucide, shadcn(button/switch), _components(ActionTable/SectionHeader/EmptyState/TooltipLabel),
//   _data/variantKMock（ラベル）, ./useAvpMockState, ./shared。

"use client";

import { useMemo, useState } from "react";
import { Heart, Plus, X, Inbox, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  VariantKActionTable,
  type VariantKColumn,
} from "../_components/VariantKActionTable";
import { VariantKSectionHeader } from "../_components/VariantKSectionHeader";
import { VariantKEmptyState } from "../_components/VariantKEmptyState";
import { VariantKTooltipLabel } from "../_components/VariantKTooltipLabel";
import { tier1Label, tier2Label, type VariantKVideo } from "../_data/variantKMock";
import type { AvpMockController } from "./useAvpMockState";
import { avpCandidateRows, avpRankMap, formatScoreWithRank, MAX_AVP_PLAY_TARGET, type AvpRankScope } from "./shared";

export function AvpCandidateTable({ controller }: { controller: AvpMockController }) {
  const [scope, setScope] = useState<AvpRankScope>("available");

  const rows = useMemo(
    () => avpCandidateRows(controller.videos, controller.candidateIds, scope),
    [controller.videos, controller.candidateIds, scope],
  );

  // 総合順位は scope 母集団で公式どおりに再計算（ランキング/検索と同じ式・桁）。
  const rankMap = useMemo(() => avpRankMap(controller.videos, scope), [controller.videos, scope]);

  const columns: VariantKColumn<VariantKVideo>[] = [
    {
      key: "title",
      header: "タイトル",
      className: "max-w-[14rem]",
      render: (row) => (
        <span className="block max-w-[14rem] truncate font-medium text-foreground" title={row.title}>
          {row.title}
        </span>
      ),
    },
    {
      key: "score",
      header: <VariantKTooltipLabel label="総合スコア" tooltip="総合スコアと総合順位は公式どおりに再計算（ランキング/検索と同じ式・桁）。順位は母集団（再生可能だけ/全動画）で切替わります。" />,
      align: "right",
      render: (row) => <span className="text-foreground">{formatScoreWithRank(row, rankMap)}</span>,
    },
    { key: "view_days", header: "視聴日数", align: "right", render: (row) => `${row.view_days}日` },
    {
      key: "liked",
      header: "いいね",
      align: "right",
      render: (row) => (
        <span className={cn("inline-flex items-center gap-1", row.liked ? "text-rose-600" : "text-muted-foreground")}>
          <Heart className={cn("size-3.5", row.liked && "fill-current")} />
          <span className="tabular-nums">{row.like_count}</span>
        </span>
      ),
    },
    {
      key: "watch_later",
      header: <VariantKTooltipLabel label="あとで見る" tooltip="あとで見る（DB相当）の状態を表示するだけの列です。AVP候補とは別物で、ここからは操作しません。" />,
      align: "center",
      render: (row) => (
        <span className={row.watch_later ? "text-foreground" : "text-muted-foreground"}>
          {row.watch_later ? "あり" : "—"}
        </span>
      ),
    },
    { key: "tier1", header: "Tier1", align: "center", render: (row) => tier1Label(row.tier1_status) },
    { key: "tier2", header: "Tier2", align: "center", render: (row) => tier2Label(row.tier2_status) },
    {
      key: "available",
      header: "利用可否",
      align: "center",
      render: (row) => (
        <span className={row.available ? "text-foreground" : "text-muted-foreground"}>
          {row.available ? "可" : "不可"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      render: (row) => {
        const inTarget = controller.isPlayTarget(row.id);
        const addDisabled = !row.available || (!inTarget && !controller.canAddPlayTarget);
        const addTitle = !row.available
          ? "利用不可は再生対象に追加できません"
          : inTarget
            ? "すでに再生対象です"
            : !controller.canAddPlayTarget
              ? `再生対象は最大${MAX_AVP_PLAY_TARGET}本までです`
              : "再生対象に追加";
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => controller.addToPlayTarget(row)}
              disabled={addDisabled || inTarget}
              aria-pressed={inTarget}
              title={addTitle}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40",
                inTarget
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Plus className="size-3.5" />
              {inTarget ? "追加済み" : "再生対象に追加"}
            </button>
            <button
              type="button"
              onClick={() => controller.removeCandidate(row.id)}
              className="inline-flex h-7 items-center gap-1 rounded-md border bg-card px-2 text-[11px] whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-3.5" />
              候補から外す
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <VariantKSectionHeader
        title="AVP候補"
        description="並列再生する候補のプール（上限なし）。ここから再生対象（最大4本）に追加します。"
        actions={
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[12px]">
              <span>再生可能だけ</span>
              <Switch
                checked={scope === "available"}
                onCheckedChange={(v) => setScope(v ? "available" : "all")}
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={controller.clearAllCandidates}
              disabled={controller.candidateIds.length === 0}
            >
              <Trash2 className="size-3.5" />
              全候補をクリア
            </Button>
          </div>
        }
      />

      <VariantKActionTable<VariantKVideo>
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        dimRow={(row) => !row.available}
        playingRow={(row) => controller.isPlaying(row.id)}
        emptyState={
          <VariantKEmptyState
            icon={<Inbox className="size-5" />}
            title="AVP候補がありません"
            description="Tier1/Tier2 のカードから「AVP候補に追加」すると、ここに並びます（モック）。"
          />
        }
      />
    </section>
  );
}
