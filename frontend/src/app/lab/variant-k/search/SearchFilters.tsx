// 統合 Variant K 検索: 高機能フィルタ行（キーワードは常時表示・詳細は漏斗 Popover に畳む）。
// 【役割】キーワード入力＋詳細フィルタ（保存先/利用可否/Tier1/Tier2/最低視聴日数/あとで見る/いいね）を畳む Popover、
//   ＋詳細列（保存先）トグル。有効な詳細フィルタ数を漏斗にバッジ表示する。
// 【設計制約】
//   - すべてメモリのみ（永続しない）。実 API/DB/localStorage に触れない。
//   - キーワード以外は常時全表示しない（Popover に畳む）。リセットは初期フィルタへ戻すだけ。
//   - 詳細列は保存先のみ（実パスでなく匿名化分類）。表示状態は呼び出し側が保持。
// 【依存関係】lucide, lib/utils（cn）, shadcn(input/switch/button/popover), ./shared。
"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  activeSearchFilterCount,
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

const triggerClass =
  "inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-[12px] text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted";

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

export function SearchFilters({
  filters,
  onChange,
  showDetailColumn,
  onShowDetailColumn,
}: {
  filters: SearchFiltersType;
  onChange: (filters: SearchFiltersType) => void;
  showDetailColumn: boolean;
  onShowDetailColumn: (value: boolean) => void;
}) {
  const set = <K extends keyof SearchFiltersType>(key: K, value: SearchFiltersType[K]) =>
    onChange({ ...filters, [key]: value });
  const count = activeSearchFilterCount(filters);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-3">
      {/* キーワード（常時表示・ダミータイトルの部分一致） */}
      <div className="relative min-w-[14rem] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.keyword}
          onChange={(e) => set("keyword", e.target.value)}
          placeholder="キーワードでタイトルを検索（モック）"
          className="pl-8"
        />
      </div>

      {/* 詳細フィルタ（漏斗 → Popover・キーワード以外を畳む） */}
      <Popover>
        <PopoverTrigger className={cn(triggerClass, count > 0 && "border-primary text-primary")}>
          <SlidersHorizontal className="size-3.5" />
          詳細フィルタ
          {count > 0 && (
            <span className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
              {count}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-80 flex-col gap-3 p-3">
          <Field label="保存先">
            <Segmented options={SEARCH_STORAGE_OPTIONS} value={filters.storage} onChange={(v) => set("storage", v)} />
          </Field>
          <Field label="利用可否">
            <Segmented options={SEARCH_AVAILABILITY_OPTIONS} value={filters.availability} onChange={(v) => set("availability", v)} />
          </Field>
          <Field label="最低視聴日数">
            <Segmented options={MIN_VIEW_DAYS_OPTIONS} value={filters.minViewDays} onChange={(v) => set("minViewDays", v)} />
          </Field>
          <Field label="Tier1レベル">
            <Segmented options={SEARCH_TIER1_OPTIONS} value={filters.tier1} onChange={(v) => set("tier1", v)} />
          </Field>
          <Field label="Tier2レベル">
            <Segmented options={SEARCH_TIER2_OPTIONS} value={filters.tier2} onChange={(v) => set("tier2", v)} />
          </Field>
          <div className="border-t" />
          <label className="flex items-center justify-between gap-2 text-[12px]">
            <span>あとで見るだけ</span>
            <Switch checked={filters.watchLater === "only"} onCheckedChange={(v) => set("watchLater", v ? "only" : "all")} />
          </label>
          <label className="flex items-center justify-between gap-2 text-[12px]">
            <span>いいねだけ</span>
            <Switch checked={filters.liked === "only"} onCheckedChange={(v) => set("liked", v ? "only" : "all")} />
          </label>
          {count > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...DEFAULT_SEARCH_FILTERS, keyword: filters.keyword })}
              className="self-start text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              詳細フィルタをクリア
            </button>
          )}
        </PopoverContent>
      </Popover>

      {/* 詳細列（保存先）トグル */}
      <label className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-[12px]">
        <span>詳細列（保存先）</span>
        <Switch checked={showDetailColumn} onCheckedChange={(v) => onShowDetailColumn(Boolean(v))} />
      </label>

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
  );
}
