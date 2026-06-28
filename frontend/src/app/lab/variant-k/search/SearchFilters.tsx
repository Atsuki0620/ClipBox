// 統合 Variant K 検索: 高機能フィルタ行。
// 【役割】キーワード入力＋詳細フィルタ（保存先/利用可否/Tier1レベル/Tier2レベル/あとで見る/いいね/最低視聴日数）。
// 【設計制約】
//   - すべてメモリのみ（永続しない）。実 API/DB/localStorage に触れない。
//   - キーワードはダミータイトルへの部分一致。条件はランキングと共有しない（別インスタンス）。
//   - リセットは初期フィルタへ戻すだけ（保存しない）。
// 【依存関係】lucide, lib/utils（cn）, shadcn(input/switch/button), ./shared。

"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SEARCH_FILTERS,
  SEARCH_AVAILABILITY_OPTIONS,
  SEARCH_STORAGE_OPTIONS,
  SEARCH_TIER1_OPTIONS,
  SEARCH_TIER2_OPTIONS,
  type SearchFilters as SearchFiltersType,
} from "./shared";

const MIN_VIEW_DAYS_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "指定なし" },
  { value: 1, label: "1日+" },
  { value: 3, label: "3日+" },
  { value: 5, label: "5日+" },
  { value: 10, label: "10日+" },
];

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
    <div className="inline-flex flex-wrap rounded-md border bg-muted/50 p-0.5">
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

export function SearchFilters({
  filters,
  onChange,
}: {
  filters: SearchFiltersType;
  onChange: (filters: SearchFiltersType) => void;
}) {
  const set = <K extends keyof SearchFiltersType>(key: K, value: SearchFiltersType[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-3 py-3">
      {/* キーワード（ダミータイトルの部分一致） */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.keyword}
            onChange={(e) => set("keyword", e.target.value)}
            placeholder="キーワードでタイトルを検索（モック）"
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[11px]"
          onClick={() => onChange(DEFAULT_SEARCH_FILTERS)}
          title="検索条件をリセット（保存はしません）"
        >
          <X className="size-3.5" />
          条件をリセット
        </Button>
      </div>

      {/* 詳細フィルタ（すべてメモリ・永続しない） */}
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          保存先
          <Segmented options={SEARCH_STORAGE_OPTIONS} value={filters.storage} onChange={(v) => set("storage", v)} />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          利用可否
          <Segmented options={SEARCH_AVAILABILITY_OPTIONS} value={filters.availability} onChange={(v) => set("availability", v)} />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          最低視聴日数
          <Segmented options={MIN_VIEW_DAYS_OPTIONS} value={filters.minViewDays} onChange={(v) => set("minViewDays", v)} />
        </label>
      </div>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          Tier1レベル
          <Segmented options={SEARCH_TIER1_OPTIONS} value={filters.tier1} onChange={(v) => set("tier1", v)} />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          Tier2レベル
          <Segmented options={SEARCH_TIER2_OPTIONS} value={filters.tier2} onChange={(v) => set("tier2", v)} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[12px]">
          <span>あとで見るだけ</span>
          <Switch checked={filters.watchLater === "only"} onCheckedChange={(v) => set("watchLater", v ? "only" : "all")} />
        </label>
        <label className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-[12px]">
          <span>いいねだけ</span>
          <Switch checked={filters.liked === "only"} onCheckedChange={(v) => set("liked", v ? "only" : "all")} />
        </label>
      </div>
    </div>
  );
}
