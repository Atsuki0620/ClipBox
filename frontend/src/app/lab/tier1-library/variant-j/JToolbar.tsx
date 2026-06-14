// UIラボ Variant J: 1段ツールバー（タブを左に分離・強調 ／ 右に 検索・フィルタ・並び替え・表示モード）。
// 【役割】タブ（使用頻度高→強調）と、検索=虫眼鏡のみ／フィルタ=漏斗→Popover（レベル/保存先/状態 chip＋再生可＋薄表示トグル）／
//   並び替え=2段Popover（項目＋昇順降順）／表示モード=カード・テーブル切替 を1段に収める。あとで見るフィルタは無し。
// 【設計制約】<TabsList> を含むため呼び出し側 <Tabs> 配下に置く。API には触れない。状態は親が保持（controlled）。
// 【依存関係】shadcn(Tabs/Popover/Input/Switch/Button), lucide, lib/levels(levelName/storageLabel/LEVEL_OPTIONS),
//   lib/utils(cn), _data/labMock(LAB_SORT_OPTIONS/LAB_STORAGES), ./shared（型・activeFilterCount）。

"use client";

import {
  Library,
  Shuffle,
  Dices,
  Search,
  SlidersHorizontal,
  ArrowDownUp,
  LayoutGrid,
  Rows3,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { levelName, storageLabel, LEVEL_OPTIONS } from "@/lib/levels";
import { LAB_SORT_OPTIONS, LAB_STORAGES } from "../../_data/labMock";
import {
  activeFilterCount,
  type JFilters,
  type SortField,
  type SortOrder,
  type StatusFilter,
  type ViewMode,
} from "./shared";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const triggerClass =
  "inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-[12px] text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted";
const iconTriggerClass =
  "inline-flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted";

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] tabular-nums transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

// 小さなセグメント切替（状態 / 昇順降順 / 表示モード で共用）。
function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; title?: string }[];
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[5px] font-medium transition-colors",
            size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]",
            value === o.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

export function JToolbar({
  keyword,
  onKeyword,
  filters,
  onFilters,
  sortField,
  sortOrder,
  onSort,
  viewMode,
  onViewMode,
  dimJudged,
  onDimJudged,
}: {
  keyword: string;
  onKeyword: (v: string) => void;
  filters: JFilters;
  onFilters: (f: JFilters) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField, order: SortOrder) => void;
  viewMode: ViewMode;
  onViewMode: (v: ViewMode) => void;
  dimJudged: boolean;
  onDimJudged: (v: boolean) => void;
}) {
  const count = activeFilterCount(filters, keyword);
  const sortLabel = LAB_SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? "並び替え";

  const toggleLevel = (lv: number) =>
    onFilters({
      ...filters,
      levels: filters.levels.includes(lv)
        ? filters.levels.filter((x) => x !== lv)
        : [...filters.levels, lv],
    });
  const toggleStorage = (s: string) =>
    onFilters({
      ...filters,
      storages: filters.storages.includes(s)
        ? filters.storages.filter((x) => x !== s)
        : [...filters.storages, s],
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* タブ（左・強調＝セグメント塗り） */}
      <TabsList className="h-8">
        <TabsTrigger value="library" className="gap-1 text-[13px]">
          <Library className="size-3.5" />
          ライブラリ
        </TabsTrigger>
        <TabsTrigger value="random" className="gap-1 text-[13px]">
          <Shuffle className="size-3.5" />
          ランダム
        </TabsTrigger>
        <TabsTrigger value="fate" className="gap-1 text-[13px]">
          <Dices className="size-3.5" />
          運命の1本
        </TabsTrigger>
      </TabsList>

      {/* 右クラスタ（検索・フィルタ・並び替え・表示モード） */}
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {/* 検索（虫眼鏡のみ → Popover に入力） */}
        <Popover>
          <PopoverTrigger
            className={cn(iconTriggerClass, keyword.trim() && "border-primary text-primary")}
            title="キーワード検索"
            aria-label="キーワード検索"
          >
            <Search className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={keyword}
                onChange={(e) => onKeyword(e.target.value)}
                placeholder="キーワード検索（タイトル）"
                className="h-8 pr-7 pl-7 text-[12px]"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => onKeyword("")}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="クリア"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* フィルタ（漏斗 → Popover パネル） */}
        <Popover>
          <PopoverTrigger className={cn(triggerClass, count > 0 && "border-primary text-primary")}>
            <SlidersHorizontal className="size-3.5" />
            フィルタ
            {count > 0 && (
              <span className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
                {count}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="flex w-72 flex-col gap-3 p-3">
            <FilterSection label="レベル">
              {LEVEL_OPTIONS.map((lv) => (
                <Chip
                  key={lv}
                  active={filters.levels.includes(lv)}
                  onClick={() => toggleLevel(lv)}
                  title={levelName(lv)}
                >
                  {lv === -1 ? "未" : lv}
                </Chip>
              ))}
            </FilterSection>

            <FilterSection label="保存先">
              {LAB_STORAGES.map((s) => (
                <Chip key={s} active={filters.storages.includes(s)} onClick={() => toggleStorage(s)}>
                  {storageLabel(s)}
                </Chip>
              ))}
            </FilterSection>

            <FilterSection label="状態">
              <Segmented<StatusFilter>
                value={filters.status}
                onChange={(status) => onFilters({ ...filters, status })}
                size="sm"
                options={[
                  { value: "all", label: "すべて" },
                  { value: "unrated", label: "未判定" },
                  { value: "judged", label: "判定済み" },
                ]}
              />
            </FilterSection>

            <label className="flex items-center justify-between gap-2 text-[12px]">
              <span>再生可のみ</span>
              <Switch
                checked={filters.availableOnly}
                onCheckedChange={(v) => onFilters({ ...filters, availableOnly: Boolean(v) })}
              />
            </label>

            <div className="border-t" />

            <label className="flex items-center justify-between gap-2 text-[12px]">
              <span>判定済みを薄くする</span>
              <Switch checked={dimJudged} onCheckedChange={(v) => onDimJudged(Boolean(v))} />
            </label>

            {count > 0 && (
              <button
                type="button"
                onClick={() => onFilters({ levels: [], storages: [], status: "all", availableOnly: false })}
                className="self-start text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                フィルタをクリア
              </button>
            )}
          </PopoverContent>
        </Popover>

        {/* 並び替え（2段：項目 ＋ 昇順/降順） */}
        <Popover>
          <PopoverTrigger className={triggerClass}>
            <ArrowDownUp className="size-3.5" />
            {sortLabel}
            <span className="text-muted-foreground">{sortOrder === "asc" ? "↑" : "↓"}</span>
          </PopoverTrigger>
          <PopoverContent align="end" className="flex w-44 flex-col gap-2 p-2">
            <div className="flex flex-col gap-0.5">
              {LAB_SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onSort(o.value as SortField, sortOrder)}
                  className={cn(
                    "rounded px-2 py-1 text-left text-[12px] transition-colors",
                    sortField === o.value
                      ? "bg-primary/10 font-medium text-primary"
                      : "hover:bg-muted",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="border-t" />
            <Segmented<SortOrder>
              value={sortOrder}
              onChange={(order) => onSort(sortField, order)}
              size="sm"
              options={[
                { value: "desc", label: "降順" },
                { value: "asc", label: "昇順" },
              ]}
            />
          </PopoverContent>
        </Popover>

        {/* 表示モード（カード / テーブル） */}
        <Segmented<ViewMode>
          value={viewMode}
          onChange={onViewMode}
          options={[
            { value: "card", label: <LayoutGrid className="size-3.5" />, title: "カード表示" },
            { value: "table", label: <Rows3 className="size-3.5" />, title: "テーブル表示" },
          ]}
        />
      </div>
    </div>
  );
}
