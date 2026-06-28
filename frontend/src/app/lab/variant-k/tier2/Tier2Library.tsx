// 統合 Variant K Tier2 ライブラリタブ。
// 【役割】Tier2対象を一覧で見て操作するカード優先のモック。KPI＋軽いフィルタ/ソート＋カードグリッド＋空状態。
// 【設計制約】
//   - フィルタ/ソートはメモリ相当（永続しない）。API/DB/localStorage に触れない。
//   - 視聴日数を主役。視聴回数/更新日/登録日は出さない。作成日/選別日は出す。サムネなし。
//   - 利用不可はカード薄表示＋再生/AVP候補追加 disabled（カード側で処理）。
// 【依存関係】lucide, shadcn(switch), _components(EmptyState/SectionHeader), ./shared, ./Tier2KpiBar, ./Tier2Card。

"use client";

import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { VariantKEmptyState } from "../_components/VariantKEmptyState";
import { VariantKSectionHeader } from "../_components/VariantKSectionHeader";
import {
  applyTier2Filters,
  DEFAULT_TIER2_FILTERS,
  sortTier2,
  TIER2_SORT_OPTIONS,
  TIER2_STATUS_OPTIONS,
  type Tier2Copy,
  type Tier2Filters,
} from "./shared";
import { Tier2Card } from "./Tier2Card";
import { Tier2KpiBar } from "./Tier2KpiBar";
import type { Tier2MockCardStateController } from "./useTier2MockCardState";

export function Tier2Library({ state, copy }: { state: Tier2MockCardStateController; copy: Tier2Copy }) {
  const [filters, setFilters] = useState<Tier2Filters>(DEFAULT_TIER2_FILTERS);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const visible = useMemo(
    () => sortTier2(applyTier2Filters(state.videos, filters), filters.sort),
    [filters, state.videos],
  );

  return (
    <div className="flex flex-col gap-3">
      <VariantKSectionHeader title="ライブラリ" description={copy.libraryDescription} />
      <Tier2KpiBar videos={state.videos} />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-2 py-2">
        <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
          {TIER2_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, status: opt.value }))}
              className={cn(
                "rounded-[5px] px-2.5 py-0.5 text-[12px] font-medium transition-colors",
                filters.status === opt.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[12px]">
          <span>再生可能だけ</span>
          <Switch
            checked={filters.availableOnly}
            onCheckedChange={(v) => setFilters((f) => ({ ...f, availableOnly: Boolean(v) }))}
          />
        </label>

        <div className="ml-auto inline-flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">並び替え</span>
          <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
            {TIER2_SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, sort: opt.value }))}
                className={cn(
                  "rounded-[5px] px-2 py-0.5 text-[11px] font-medium transition-colors",
                  filters.sort === opt.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <VariantKEmptyState
          icon={<Inbox className="size-6" />}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-2">
            {visible.map((video) => (
              <Tier2Card
                key={video.id}
                video={video}
                state={state.getCardState(video)}
                playing={playingId === video.id}
                onPlay={() => setPlayingId(video.id)}
              />
            ))}
          </div>
          <p className="px-1 text-[11px] text-muted-foreground">
            全 {visible.length} 件（モック）。再生を押すとカードが「再生中」ハイライトになります。
          </p>
        </>
      )}
    </div>
  );
}
