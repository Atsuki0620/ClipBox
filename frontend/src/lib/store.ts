// Tier1 ライブラリの選択中フィルタ（クライアント横断状態）。
// サーバー状態は TanStack Query が持ち、ここは API に依存しない UI 状態のみ。

import { create } from "zustand";
import type { JudgmentStatus, SortField, SortOrder } from "./types";

// 利用可否の3択。API パラメータ（availability / show_unavailable）への写像は page.tsx 側。
export type AvailabilityMode = "available" | "unavailable" | "all";

export interface LibraryFilters {
  levels: number[];
  storage: string[];
  keyword: string;
  // Tier1 の判定状態フィルタ。levels への写像は page.tsx（all=levels そのまま）。
  judgmentStatus: JudgmentStatus;
  availabilityMode: AvailabilityMode;
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

interface AvpStore {
  avpSelectedIds: number[];
  avpLaunchSelectedIds: number[];
  avpPlayingIds: number[];
  toggleAvpSelectedId: (id: number) => void;
  removeAvpSelectedId: (id: number) => void;
  clearAvpSelectedIds: () => void;
  toggleAvpLaunchSelectedId: (id: number) => void;
  clearAvpLaunchSelectedIds: () => void;
  setAvpPlayingIds: (ids: number[]) => void;
  clearAvpPlayingIds: () => void;
}

export const MAX_AVP_SELECTION = 4;

// 既定は Streamlit 現行に寄せる（セレクション除外 ON・未判定含む全レベル・利用可能のみ）。
const DEFAULTS: LibraryFilters = {
  levels: [],
  storage: [],
  keyword: "",
  judgmentStatus: "all",
  availabilityMode: "available",
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

export const useAvpStore = create<AvpStore>((set) => ({
  avpSelectedIds: [],
  avpLaunchSelectedIds: [],
  avpPlayingIds: [],
  toggleAvpSelectedId: (id) =>
    set((state) => {
      const selected = state.avpSelectedIds.includes(id);
      if (selected) {
        return {
          avpSelectedIds: state.avpSelectedIds.filter((value) => value !== id),
          avpLaunchSelectedIds: state.avpLaunchSelectedIds.filter(
            (value) => value !== id,
          ),
        };
      }
      if (state.avpSelectedIds.length >= MAX_AVP_SELECTION) {
        return state;
      }
      return { avpSelectedIds: [...state.avpSelectedIds, id] };
    }),
  removeAvpSelectedId: (id) =>
    set((state) => ({
      avpSelectedIds: state.avpSelectedIds.filter((value) => value !== id),
      avpLaunchSelectedIds: state.avpLaunchSelectedIds.filter(
        (value) => value !== id,
      ),
    })),
  clearAvpSelectedIds: () =>
    set({ avpSelectedIds: [], avpLaunchSelectedIds: [] }),
  toggleAvpLaunchSelectedId: (id) =>
    set((state) => {
      const selected = state.avpLaunchSelectedIds.includes(id);
      if (selected) {
        return {
          avpLaunchSelectedIds: state.avpLaunchSelectedIds.filter(
            (value) => value !== id,
          ),
        };
      }
      if (
        !state.avpSelectedIds.includes(id) ||
        state.avpLaunchSelectedIds.length >= MAX_AVP_SELECTION
      ) {
        return state;
      }
      return { avpLaunchSelectedIds: [...state.avpLaunchSelectedIds, id] };
    }),
  clearAvpLaunchSelectedIds: () => set({ avpLaunchSelectedIds: [] }),
  setAvpPlayingIds: (ids) => set({ avpPlayingIds: ids.slice(0, MAX_AVP_SELECTION) }),
  clearAvpPlayingIds: () => set({ avpPlayingIds: [] }),
}));
