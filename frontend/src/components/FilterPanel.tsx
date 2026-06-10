"use client";

import { useLibraryStore } from "@/lib/store";
import type { JudgmentStatus } from "@/lib/types";
import { LibraryFilterBar } from "@/components/LibraryFilterBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

// Tier1 専用フィルタ（Tier2 は LibraryFilterBar を直接利用するため影響しない）。
// セレクション関連(!/+)は Tier1 では常に非表示（exclude_selection 固定）なので、
// ここでは「判定状態」（すべて/未判定/判定済み）を切り替える。
const JUDGMENT_STATUS_LABELS: Record<JudgmentStatus, string> = {
  all: "すべて",
  unrated: "未判定",
  judged: "判定済み",
};

export function FilterPanel() {
  const store = useLibraryStore();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={store.judgmentStatus}
          onValueChange={(value) =>
            store.setFilter("judgmentStatus", value as JudgmentStatus)
          }
        >
          <SelectTrigger className="w-36" size="sm">
            <span>{JUDGMENT_STATUS_LABELS[store.judgmentStatus]}</span>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(JUDGMENT_STATUS_LABELS) as JudgmentStatus[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {JUDGMENT_STATUS_LABELS[key]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <LibraryFilterBar
        keyword={store.keyword}
        levels={store.levels}
        storage={store.storage}
        sort={store.sort}
        order={store.order ?? "desc"}
        availabilityMode={store.availabilityMode}
        watchLater={store.watchLater}
        onKeywordChange={(value) => store.setFilter("keyword", value)}
        onLevelsChange={(value) => store.setFilter("levels", value)}
        onStorageChange={(value) => store.setFilter("storage", value)}
        onSortChange={(value) => store.setFilter("sort", value)}
        onOrderChange={(value) => store.setFilter("order", value)}
        onAvailabilityModeChange={(value) =>
          store.setFilter("availabilityMode", value)
        }
        onWatchLaterChange={(value) => store.setFilter("watchLater", value)}
      />
    </div>
  );
}
