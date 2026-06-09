// Tier1 ライブラリの選択中フィルタ（クライアント横断状態）。
// サーバー状態は TanStack Query が持ち、ここは API に依存しない UI 状態のみ。

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
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

// 再生中ハイライト用ストア（単体=1本 / AVP=最大4本）。
// タブ・ページ移動を越えて保持し、localStorage 永続でリロードも越える。
// 次の単体/AVP再生で対象IDを置換する（single と avp は排他）。
interface PlaybackStore {
  singlePlayingId: number | null;
  avpPlayingIds: number[];
  setSinglePlaying: (id: number) => void;
  setAvpPlaying: (ids: number[]) => void;
  clearPlaying: () => void;
}

export const usePlaybackStore = create<PlaybackStore>()(
  persist(
    (set) => ({
      singlePlayingId: null,
      avpPlayingIds: [],
      // 単体再生: single をセットし avp をクリア。
      setSinglePlaying: (id) => set({ singlePlayingId: id, avpPlayingIds: [] }),
      // AVP再生: avp をセット（最大4）し single をクリア。
      setAvpPlaying: (ids) =>
        set({ singlePlayingId: null, avpPlayingIds: ids.slice(0, MAX_AVP_SELECTION) }),
      clearPlaying: () => set({ singlePlayingId: null, avpPlayingIds: [] }),
    }),
    { name: "clipbox-playback" },
  ),
);

// ハイドレーション検出。SSR と初回クライアントレンダリングでは false、以降 true。
// useSyncExternalStore を使うことで setState-in-effect を避けつつ不整合を防ぐ。
const emptySubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

// 再生中ハイライト判定。localStorage 由来の状態はハイドレーション後にのみ反映する
// （初回レンダリングはサーバーと一致させて false）。
export function useIsPlaying(id: number | null): boolean {
  const singlePlayingId = usePlaybackStore((state) => state.singlePlayingId);
  const avpPlayingIds = usePlaybackStore((state) => state.avpPlayingIds);
  const hydrated = useHydrated();
  if (!hydrated || id == null) return false;
  return id === singlePlayingId || avpPlayingIds.includes(id);
}
