"use client";

import { useQuery } from "@tanstack/react-query";

import { getFilterOptions } from "@/lib/api";
import { levelName, storageLabel } from "@/lib/levels";
import type { AvailabilityMode } from "@/lib/store";
import type { SortField, SortOrder } from "@/lib/types";
import { MultiSelect } from "@/components/MultiSelect";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_LABELS: Record<SortField, string> = {
  favorite_level: "レベル",
  creation_date: "作成日",
  view_count: "視聴回数",
  last_viewed: "最終視聴",
  title: "タイトル",
  judged_at: "判定日時",
};

const AVAILABILITY_LABELS: Record<AvailabilityMode, string> = {
  available: "利用可能のみ",
  unavailable: "利用不可のみ",
  all: "すべて表示",
};

export interface LibraryFilterBarProps {
  keyword: string;
  levels: number[];
  storage: string[];
  sort?: SortField;
  order?: SortOrder;
  availabilityMode?: AvailabilityMode;
  onKeywordChange: (value: string) => void;
  onLevelsChange: (value: number[]) => void;
  onStorageChange: (value: string[]) => void;
  onSortChange: (value: SortField | undefined) => void;
  onOrderChange: (value: SortOrder) => void;
  onAvailabilityModeChange?: (value: AvailabilityMode) => void;
}

export function LibraryFilterBar({
  keyword,
  levels,
  storage,
  sort,
  order,
  availabilityMode,
  onKeywordChange,
  onLevelsChange,
  onStorageChange,
  onSortChange,
  onOrderChange,
  onAvailabilityModeChange,
}: LibraryFilterBarProps) {
  const { data: options } = useQuery({
    queryKey: ["filter-options"],
    queryFn: getFilterOptions,
  });

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <Input
        placeholder="キーワード検索"
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
        className="w-64"
      />

      <MultiSelect
        label="レベル"
        options={(options?.favorite_levels ?? []).map((level) => ({
          value: String(level),
          label: levelName(level),
        }))}
        selected={levels.map(String)}
        onChange={(values) => onLevelsChange(values.map(Number))}
        searchable={false}
      />

      <MultiSelect
        label="保存先"
        options={(options?.storage_locations ?? []).map((value) => ({
          value,
          label: storageLabel(value),
        }))}
        selected={storage}
        onChange={onStorageChange}
        searchable={false}
      />

      <Select
        value={sort ?? "default"}
        onValueChange={(value) =>
          onSortChange(value === "default" ? undefined : (value as SortField))
        }
      >
        <SelectTrigger className="w-36" size="sm">
          <SelectValue placeholder="並び替え" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">既定</SelectItem>
          {(Object.keys(SORT_LABELS) as SortField[]).map((key) => (
            <SelectItem key={key} value={key}>
              {SORT_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={order} onValueChange={(value) => onOrderChange(value as SortOrder)}>
        <SelectTrigger className="w-28" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">降順</SelectItem>
          <SelectItem value="asc">昇順</SelectItem>
        </SelectContent>
      </Select>

      {availabilityMode && onAvailabilityModeChange ? (
        <Select value={availabilityMode} onValueChange={(value) => onAvailabilityModeChange(value as AvailabilityMode)}>
          <SelectTrigger className="w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(AVAILABILITY_LABELS) as AvailabilityMode[]).map((key) => (
              <SelectItem key={key} value={key}>
                {AVAILABILITY_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
