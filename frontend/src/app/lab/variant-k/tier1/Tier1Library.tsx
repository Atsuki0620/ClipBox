// 統合 Variant K Tier1 ライブラリタブ。
// 【役割】判定対象を一覧で操作するカード優先のモック。KPI＋ツールバー（フィルタ Popover／並び替え2段 Popover／
//   カード⇄テーブル切替）＋カードグリッド or 操作付きテーブル＋ページャ＋空状態。
//   再生クリックで該当を「再生中ハイライト」にする（amber・バッジより優先）。
// 【設計制約】
//   - フィルタ/ソート/表示モード/ページはメモリ相当（永続しない）。API/DB/localStorage に触れない。
//   - 視聴日数を主役。視聴回数/更新日/登録日は出さない。作成日/判定日は出す。サムネなし。
//   - フィルタは漏斗 Popover に畳む（全表示しない）。並び替えは2段 Popover（項目＋昇降）。
//   - レベルは 未/0..4。「判定済みを薄くする」は薄表示と連動。利用不可は薄表示＋再生/AVP disabled。
// 【依存関係】lucide, shadcn(switch/popover), lib(levels/utils), _data(variantKMock),
//   _components(EmptyState/ActionTable/RowActions/LevelButtons), ./shared, ./Tier1KpiBar, ./Tier1Card, ./Tier1CardActions。
"use client";

import { useMemo, useState } from "react";
import {
  Inbox,
  SlidersHorizontal,
  ArrowDownUp,
  LayoutGrid,
  Rows3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { levelName, storageLabel } from "@/lib/levels";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VariantKEmptyState } from "../_components/VariantKEmptyState";
import {
  VariantKActionTable,
  type VariantKColumn,
} from "../_components/VariantKActionTable";
import { VariantKRowActions } from "../_components/VariantKRowActions";
import { VariantKLevelButtons } from "../_components/VariantKLevelButtons";
import { formatVariantKDate, type VariantKVideo } from "../_data/variantKMock";
import { Tier1KpiBar } from "./Tier1KpiBar";
import { Tier1Card } from "./Tier1Card";
import { TIER1_LEVEL_OPTIONS } from "./Tier1CardActions";
import type { Tier1MockCardStateController } from "./useTier1MockCardState";
import {
  applyTier1Filters,
  sortTier1,
  paginate,
  pageCount,
  isUnrated,
  activeTier1FilterCount,
  DEFAULT_TIER1_FILTERS,
  DEFAULT_TIER1_SORT,
  TIER1_STATUS_OPTIONS,
  TIER1_SORT_OPTIONS,
  TIER1_LEVEL_VALUES,
  TIER1_PAGE_SIZES,
  type Tier1Filters,
  type Tier1Sort,
  type Tier1SortDir,
  type Tier1StatusFilter,
  type Tier1ViewMode,
} from "./shared";

const STORAGE_VALUES = ["C_DRIVE", "EXTERNAL_HDD"] as const;

const triggerClass =
  "inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-[12px] text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted";

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
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
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

export function Tier1Library({ state }: { state: Tier1MockCardStateController }) {
  const [filters, setFilters] = useState<Tier1Filters>(DEFAULT_TIER1_FILTERS);
  const [sort, setSort] = useState<Tier1Sort>(DEFAULT_TIER1_SORT);
  const [viewMode, setViewMode] = useState<Tier1ViewMode>("card");
  const [dimJudged, setDimJudged] = useState(true);
  const [pageSize, setPageSize] = useState<number>(TIER1_PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const sorted = useMemo(
    () => sortTier1(applyTier1Filters(state.videos, filters), sort),
    [filters, sort, state.videos],
  );

  const total = sorted.length;
  const pages = pageCount(total, pageSize);
  const currentPage = Math.min(page, pages);
  const visible = useMemo(() => paginate(sorted, currentPage, pageSize), [sorted, currentPage, pageSize]);

  const filterCount = activeTier1FilterCount(filters);
  const sortLabel = TIER1_SORT_OPTIONS.find((o) => o.value === sort.key)?.label ?? "並び替え";

  // フィルタ/並び替え/ページサイズ変更時はページを先頭へ戻す。
  const resetPage = () => setPage(1);
  const updateFilters = (next: Tier1Filters) => {
    setFilters(next);
    resetPage();
  };
  const toggleLevel = (lv: number) =>
    updateFilters({
      ...filters,
      levels: filters.levels.includes(lv)
        ? filters.levels.filter((x) => x !== lv)
        : [...filters.levels, lv],
    });
  const toggleStorage = (s: string) =>
    updateFilters({
      ...filters,
      storages: filters.storages.includes(s)
        ? filters.storages.filter((x) => x !== s)
        : [...filters.storages, s],
    });

  // テーブル列（カード優先画面のテーブル表示モード）。
  const columns: VariantKColumn<VariantKVideo>[] = [
    { key: "title", header: "タイトル", render: (row) => <span className="font-medium text-foreground">{row.title}</span> },
    { key: "view_days", header: "視聴日数", align: "right", render: (row) => `${row.view_days}日` },
    {
      key: "created",
      header: "作成日",
      align: "right",
      render: (row) => <span className="tabular-nums">{formatVariantKDate(row.file_created_at)}</span>,
    },
    {
      key: "judged",
      header: "判定日",
      align: "right",
      render: (row) => <span className="tabular-nums">{formatVariantKDate(row.judged_at)}</span>,
    },
    {
      key: "level",
      header: "レベル",
      align: "center",
      render: (row) => {
        const cardState = state.getCardState(row);
        return (
          <VariantKLevelButtons
            ariaLabel="判定レベル"
            value={cardState.level}
            onChange={cardState.setLevel}
            options={TIER1_LEVEL_OPTIONS}
            disabled={!row.available}
            className="w-[8.5rem]"
          />
        );
      },
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      render: (row) => {
        const cardState = state.getCardState(row);
        return (
          <VariantKRowActions
            state={cardState}
            unavailable={!row.available}
            playing={playingId === row.id}
            onPlay={() => setPlayingId(row.id)}
          />
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Tier1KpiBar />

      {/* ツールバー（フィルタ Popover / 並び替え2段 Popover / カード・テーブル切替。すべてメモリ） */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-card px-2 py-2">
        {/* フィルタ（漏斗 → Popover） */}
        <Popover>
          <PopoverTrigger className={cn(triggerClass, filterCount > 0 && "border-primary text-primary")}>
            <SlidersHorizontal className="size-3.5" />
            フィルタ
            {filterCount > 0 && (
              <span className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
                {filterCount}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent align="start" className="flex w-72 flex-col gap-3 p-3">
            <FilterSection label="レベル">
              {TIER1_LEVEL_VALUES.map((lv) => (
                <Chip key={lv} active={filters.levels.includes(lv)} onClick={() => toggleLevel(lv)} title={levelName(lv)}>
                  {lv === -1 ? "未" : lv}
                </Chip>
              ))}
            </FilterSection>

            <FilterSection label="保存先">
              {STORAGE_VALUES.map((s) => (
                <Chip key={s} active={filters.storages.includes(s)} onClick={() => toggleStorage(s)}>
                  {storageLabel(s)}
                </Chip>
              ))}
            </FilterSection>

            <FilterSection label="状態">
              <Segmented<Tier1StatusFilter>
                value={filters.status}
                onChange={(status) => updateFilters({ ...filters, status })}
                size="sm"
                options={TIER1_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </FilterSection>

            <label className="flex items-center justify-between gap-2 text-[12px]">
              <span>再生可のみ</span>
              <Switch
                checked={filters.availableOnly}
                onCheckedChange={(v) => updateFilters({ ...filters, availableOnly: Boolean(v) })}
              />
            </label>

            <div className="border-t" />

            <label className="flex items-center justify-between gap-2 text-[12px]">
              <span>判定済みを薄くする</span>
              <Switch checked={dimJudged} onCheckedChange={(v) => setDimJudged(Boolean(v))} />
            </label>

            {filterCount > 0 && (
              <button
                type="button"
                onClick={() => updateFilters(DEFAULT_TIER1_FILTERS)}
                className="self-start text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                フィルタをクリア
              </button>
            )}
          </PopoverContent>
        </Popover>

        {/* 並び替え（2段：項目＋昇順/降順） */}
        <Popover>
          <PopoverTrigger className={triggerClass}>
            <ArrowDownUp className="size-3.5" />
            {sortLabel}
            <span className="text-muted-foreground">{sort.dir === "asc" ? "↑" : "↓"}</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="flex w-44 flex-col gap-2 p-2">
            <div className="flex flex-col gap-0.5">
              {TIER1_SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setSort((s) => ({ ...s, key: o.value }));
                    resetPage();
                  }}
                  className={cn(
                    "rounded px-2 py-1 text-left text-[12px] transition-colors",
                    sort.key === o.value ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="border-t" />
            <Segmented<Tier1SortDir>
              value={sort.dir}
              onChange={(dir) => {
                setSort((s) => ({ ...s, dir }));
                resetPage();
              }}
              size="sm"
              options={[
                { value: "desc", label: "降順" },
                { value: "asc", label: "昇順" },
              ]}
            />
          </PopoverContent>
        </Popover>

        {/* 表示モード（カード / テーブル） */}
        <div className="ml-auto">
          <Segmented<Tier1ViewMode>
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "card", label: <LayoutGrid className="size-3.5" />, title: "カード表示" },
              { value: "table", label: <Rows3 className="size-3.5" />, title: "テーブル表示" },
            ]}
          />
        </div>
      </div>

      {total === 0 ? (
        <VariantKEmptyState
          icon={<Inbox className="size-6" />}
          title="条件に一致する動画がありません"
          description="フィルタを見直してください。フィルタ条件は保存されません。"
        />
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-2">
          {visible.map((video) => (
            <Tier1Card
              key={video.id}
              video={video}
              state={state.getCardState(video)}
              playing={playingId === video.id}
              dimmed={dimJudged && !isUnrated(video) && video.available}
              onPlay={() => setPlayingId(video.id)}
            />
          ))}
        </div>
      ) : (
        <VariantKActionTable<VariantKVideo>
          columns={columns}
          rows={visible}
          rowKey={(row) => row.id}
          dimRow={(row) => !row.available || (dimJudged && !isUnrated(row) && row.available)}
          playingRow={(row) => playingId === row.id}
        />
      )}

      {/* ページャ（カード/テーブル共用） */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>全 {total} 件（モック）</span>
            <span className="inline-flex items-center gap-1">
              1ページ
              <Segmented<string>
                value={String(pageSize)}
                onChange={(v) => {
                  setPageSize(Number(v));
                  resetPage();
                }}
                size="sm"
                options={TIER1_PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
              />
              件
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="inline-flex size-7 items-center justify-center rounded-md border bg-card transition-colors hover:bg-accent disabled:opacity-40"
              aria-label="前のページ"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="tabular-nums">
              {currentPage} / {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={currentPage >= pages}
              className="inline-flex size-7 items-center justify-center rounded-md border bg-card transition-colors hover:bg-accent disabled:opacity-40"
              aria-label="次のページ"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
