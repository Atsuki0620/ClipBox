// 統合 Variant K Tier1 ライブラリタブ。
// 【役割】判定対象を一覧で見て操作するカード優先のモック。KPI＋軽いフィルタ/ソート＋カードグリッド＋空状態。
//   再生クリックで該当カードを「再生中ハイライト」にする（amber・バッジより優先）。
// 【設計制約】
//   - フィルタ/ソートはメモリ相当（永続しない）。API/DB/localStorage に触れない。
//   - 視聴日数を主役。視聴回数/更新日/登録日は出さない。作成日/判定日は出す。サムネなし。
//   - 利用不可はカード薄表示＋再生/AVP候補追加 disabled（カード側で処理）。
// 【依存関係】lucide, shadcn(button/switch), _data/variantKMock, _components(EmptyState),
//   ./shared, ./Tier1KpiBar, ./Tier1Card。

"use client";

import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { VARIANT_K_VIDEOS } from "../_data/variantKMock";
import { VariantKEmptyState } from "../_components/VariantKEmptyState";
import { Tier1KpiBar } from "./Tier1KpiBar";
import { Tier1Card } from "./Tier1Card";
import {
  applyTier1Filters,
  sortTier1,
  DEFAULT_TIER1_FILTERS,
  TIER1_STATUS_OPTIONS,
  TIER1_SORT_OPTIONS,
  type Tier1Filters,
} from "./shared";

export function Tier1Library() {
  const [filters, setFilters] = useState<Tier1Filters>(DEFAULT_TIER1_FILTERS);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const visible = useMemo(
    () => sortTier1(applyTier1Filters(VARIANT_K_VIDEOS, filters), filters.sort),
    [filters],
  );

  return (
    <div className="flex flex-col gap-3">
      <Tier1KpiBar />

      {/* ツールバー（状態セグメント / 再生可能だけ / 並び替え。すべてメモリ・永続しない） */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-2 py-2">
        <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
          {TIER1_STATUS_OPTIONS.map((opt) => (
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
            {TIER1_SORT_OPTIONS.map((opt) => (
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
          title="条件に一致する動画がありません"
          description="フィルタを見直してください。フィルタ条件は保存されません。"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((video) => (
              <Tier1Card
                key={video.id}
                video={video}
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
