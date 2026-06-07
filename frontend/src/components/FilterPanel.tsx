"use client";

import { useLibraryStore } from "@/lib/store";
import { LibraryFilterBar } from "@/components/LibraryFilterBar";

export function FilterPanel() {
  const store = useLibraryStore();

  return (
    <LibraryFilterBar
      keyword={store.keyword}
      levels={store.levels}
      storage={store.storage}
      sort={store.sort}
      order={store.order ?? "desc"}
      availabilityMode={store.availabilityMode}
      onKeywordChange={(value) => store.setFilter("keyword", value)}
      onLevelsChange={(value) => store.setFilter("levels", value)}
      onStorageChange={(value) => store.setFilter("storage", value)}
      onSortChange={(value) => store.setFilter("sort", value)}
      onOrderChange={(value) => store.setFilter("order", value)}
      onAvailabilityModeChange={(value) =>
        store.setFilter("availabilityMode", value)
      }
    />
  );
}
