// 統合 Variant K ランキング → /lab/variant-k/ranking
// 【役割】総合スコアで俯瞰する操作付きスコアテーブル。概要KPI＋詳細フィルタ＋詳細列ON/OFF＋ソート可能ヘッダ。
// 【設計制約】
//   - UI LAB モック。API/DB/localStorage/sessionStorage 本体仕様に触れない（状態はページ内メモリ）。
//   - 総合スコアは SPEC §9 の公式から再計算（_data/variantKScore）。係数・タイブレークは変えない。score=0 は除外。
//   - フィルタ/ソートは永続しない。既定=再生可能だけ。全動画時は利用不可行を薄表示＋再生/AVP不可。
//   - 検索とは統合しない（テーブル土台のみ共有）。視聴回数/更新日/登録日/サムネは出さない。
// 【依存関係】react, lucide, lib/utils（cn）, shadcn(switch), _data(variantKMock/variantKScore),
//   _components(useVariantKRowStates/SectionHeader/EmptyState/TooltipLabel), ./shared, ./RankingTable。

"use client";

import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { VARIANT_K_VIDEOS } from "../_data/variantKMock";
import { compositeScore } from "../_data/variantKScore";
import { useVariantKRowStates } from "../_components/useVariantKRowStates";
import { VariantKEmptyState } from "../_components/VariantKEmptyState";
import { VariantKTooltipLabel } from "../_components/VariantKTooltipLabel";
import { RankingTable } from "./RankingTable";
import {
  applyRankingFilters,
  sortRanking,
  DEFAULT_RANKING_FILTERS,
  DEFAULT_RANKING_SORT,
  RANKING_MIN_LEVEL_OPTIONS,
  RANKING_PERIOD_OPTIONS,
  RANKING_STORAGE_OPTIONS,
  type RankingFilters,
  type RankingSort,
} from "./shared";

// セグメント切替（既存 Tier1 ツールバーの cn イディオムを踏襲・メモリのみ）。
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-[5px] px-2 py-0.5 text-[11px] font-medium transition-colors",
            value === opt.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function VariantKRankingPage() {
  const controller = useVariantKRowStates(VARIANT_K_VIDEOS);
  const [filters, setFilters] = useState<RankingFilters>(DEFAULT_RANKING_FILTERS);
  const [sort, setSort] = useState<RankingSort>(DEFAULT_RANKING_SORT);
  const [showDetails, setShowDetails] = useState(false);

  const rows = useMemo(
    () => sortRanking(applyRankingFilters(controller.videos, filters), sort),
    [controller.videos, filters, sort],
  );

  const kpi = useMemo(() => {
    if (rows.length === 0) return { count: 0, avg: 0, max: 0 };
    const scores = rows.map((row) => compositeScore(row));
    return {
      count: rows.length,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      max: Math.max(...scores),
    };
  }, [rows]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          <VariantKTooltipLabel
            label="ランキング"
            tooltip={
              <div className="flex max-w-xs flex-col gap-1 text-[11px] leading-relaxed">
                <p>総合スコア＝round((視聴日数＋いいね×3)×補正倍率×100)。</p>
                <p>補正倍率＝1＋Tier1判定済み(+0.5)＋Tier2選別済み(+0.3)。</p>
                <p>並び順は 総合スコア降順→最終再生日降順→ID昇順。スコア0は除外します。</p>
                <p className="font-medium text-foreground">本体の計算式・係数は変えていません（公式どおりに再計算）。</p>
                <p>検索とは統合しません。順位は現在の並び順での 1..N です。</p>
              </div>
            }
          />
        </h1>
        <p className="text-[12px] text-muted-foreground">
          総合スコアで俯瞰し、その場で再生／いいね／あとで見る／AVP候補を操作します（モック）。
        </p>
      </div>

      {/* 概要KPI（フィルタ後の対象本数・平均/最高スコア） */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "対象本数", value: `${kpi.count} 件` },
          { label: "平均スコア", value: kpi.avg.toLocaleString("en-US") },
          { label: "最高スコア", value: kpi.max.toLocaleString("en-US") },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card px-3 py-2">
            <div className="text-[11px] text-muted-foreground">{item.label}</div>
            <div className="text-lg font-semibold tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>

      {/* 詳細フィルタ（すべてメモリ・永続しない） */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-3 py-2">
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          期間
          <Segmented options={RANKING_PERIOD_OPTIONS} value={filters.period} onChange={(v) => setFilters((f) => ({ ...f, period: v }))} />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          最低レベル
          <Segmented options={RANKING_MIN_LEVEL_OPTIONS} value={filters.minLevel} onChange={(v) => setFilters((f) => ({ ...f, minLevel: v }))} />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          保存先
          <Segmented options={RANKING_STORAGE_OPTIONS} value={filters.storage} onChange={(v) => setFilters((f) => ({ ...f, storage: v }))} />
        </label>
        <label className="ml-auto inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[12px]">
          <span>再生可能だけ</span>
          <Switch checked={filters.availableOnly} onCheckedChange={(v) => setFilters((f) => ({ ...f, availableOnly: Boolean(v) }))} />
        </label>
        <label className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[12px]">
          <span>詳細列（計算内訳）</span>
          <Switch checked={showDetails} onCheckedChange={(v) => setShowDetails(Boolean(v))} />
        </label>
      </div>

      <RankingTable
        rows={rows}
        controller={controller}
        sort={sort}
        onSortChange={setSort}
        showDetails={showDetails}
        emptyState={
          <VariantKEmptyState
            icon={<Inbox className="size-5" />}
            title="条件に一致する動画がありません"
            description="フィルタを見直してください。スコア0（未再生・いいねなし）は対象外です。フィルタ条件は保存されません。"
          />
        }
      />

      <p className="px-1 text-[11px] text-muted-foreground">
        全 {rows.length} 件（モック）。ヘッダの 総合スコア／視聴日数／いいね はクリックで降順⇔昇順、再生でその行が「再生中」ハイライトになります。
      </p>
    </div>
  );
}
