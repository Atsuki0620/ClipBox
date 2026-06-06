"use client";

import { useQuery } from "@tanstack/react-query";
import { getFilterOptions } from "@/lib/api";
import { useLibraryStore } from "@/lib/store";
import { levelName, storageLabel } from "@/lib/levels";
import { MultiSelect } from "@/components/MultiSelect";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortField } from "@/lib/types";

const SORT_LABELS: Record<SortField, string> = {
  favorite_level: "レベル",
  creation_date: "作成日",
  view_count: "視聴回数",
  last_viewed: "最終視聴",
  title: "タイトル",
  modified: "更新日",
};

export function FilterPanel() {
  const { data: options } = useQuery({
    queryKey: ["filter-options"],
    queryFn: getFilterOptions,
  });

  const store = useLibraryStore();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <Input
        placeholder="キーワード検索（ファイル名）"
        value={store.keyword}
        onChange={(e) => store.setFilter("keyword", e.target.value)}
        className="w-64"
      />

      <MultiSelect
        label="レベル"
        options={(options?.favorite_levels ?? []).map((l) => ({
          value: String(l),
          label: levelName(l),
        }))}
        selected={store.levels.map(String)}
        onChange={(vals) => store.setFilter("levels", vals.map(Number))}
        searchable={false}
      />

      <MultiSelect
        label="登場人物"
        options={(options?.performers ?? []).map((p) => ({ value: p, label: p }))}
        selected={store.performers}
        onChange={(vals) => store.setFilter("performers", vals)}
      />

      <MultiSelect
        label="保存場所"
        options={(options?.storage_locations ?? []).map((s) => ({
          value: s,
          label: storageLabel(s),
        }))}
        selected={store.storage}
        onChange={(vals) => store.setFilter("storage", vals)}
        searchable={false}
      />

      <Select
        value={store.sort ?? "default"}
        onValueChange={(v) =>
          store.setFilter("sort", v === "default" ? undefined : (v as SortField))
        }
      >
        <SelectTrigger className="w-36" size="sm">
          <SelectValue placeholder="並び順" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">既定（レベル順）</SelectItem>
          {(Object.keys(SORT_LABELS) as SortField[]).map((k) => (
            <SelectItem key={k} value={k}>
              {SORT_LABELS[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={store.availabilityMode}
        onValueChange={(v) =>
          store.setFilter("availabilityMode", v as typeof store.availabilityMode)
        }
      >
        <SelectTrigger className="w-36" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="available">利用可能のみ</SelectItem>
          <SelectItem value="unavailable">利用不可のみ</SelectItem>
          <SelectItem value="all">すべて表示</SelectItem>
        </SelectContent>
      </Select>

      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={store.exclude_selection}
          onCheckedChange={(c) => store.setFilter("exclude_selection", c)}
        />
        セレクション除外
      </label>
    </div>
  );
}
