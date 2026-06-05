// Tier1 ライブラリの選択中フィルタ（クライアント横断状態）。
// サーバー状態は TanStack Query が持ち、ここは API に依存しない UI 状態のみ。

import { create } from "zustand";
import type { SortField, SortOrder } from "./types";

// 利用可否の3択。API パラメータ（availability / show_unavailable）への写像は page.tsx 側。
export type AvailabilityMode = "available" | "unavailable" | "all";

export interface LibraryFilters {
  levels: number[];
  performers: string[];
  storage: string[];
  keyword: string;
  availabilityMode: AvailabilityMode;
  exclude_selection: boolean;
  sort?: SortField;
  order?: SortOrder;
  page: number;
  page_size: number;
}

interface LibraryStore extends LibraryFilters {
  setFilter: <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => void;
  // フィルタ変更時は 1 ページ目へ戻す（page 自体の変更は除く）。
  patch: (partial: Partial<LibraryFilters>) => void;
  reset: () => void;
}

// 既定は Streamlit 現行に寄せる（セレクション除外 ON・未判定含む全レベル・利用可能のみ）。
const DEFAULTS: LibraryFilters = {
  levels: [],
  performers: [],
  storage: [],
  keyword: "",
  availabilityMode: "available",
  exclude_selection: true,
  sort: undefined,
  order: undefined,
  page: 1,
  page_size: 50,
};

export const useLibraryStore = create<LibraryStore>((set) => ({
  ...DEFAULTS,
  setFilter: (key, value) =>
    set((state) => ({
      ...state,
      [key]: value,
      page: key === "page" ? (value as number) : 1,
    })),
  patch: (partial) =>
    set((state) => ({
      ...state,
      ...partial,
      page: "page" in partial ? (partial.page as number) : 1,
    })),
  reset: () => set(DEFAULTS),
}));
