// 統合 Variant K Tier2 ページ内のローカルモック状態フック。
// 【役割】Tier2 のカード操作状態（未選別/Lv0..Lv4・いいね・あとで見る・AVP候補）を video id 単位で保持する。
//   ライブラリ/ランダム/運命の1本で同じ動画の状態が矛盾しないよう、ページ内で共有する。
// 【設計制約】
//   - メモリのみ（永続しない）。実 localStorage / sessionStorage / DB / API には触れない。
//   - あとで見る（DB相当）と AVP候補（localStorage相当）は別々の状態として持ち、混同しない。
//   - 未選別から Lv0..Lv4 にしたときは選別日を当日へ更新し、あとで見るを自動解除する。
// 【依存関係】react, _data/variantKMock（VariantKVideo 型）, ./shared。

"use client";

import { useCallback, useMemo, useState } from "react";
import type { VariantKVideo } from "../_data/variantKMock";
import type { Tier2SelectionValue } from "./shared";

type Tier2MockCardSnapshot = {
  selection: Tier2SelectionValue;
  liked: boolean;
  likeCount: number;
  watchLater: boolean;
  avpCandidate: boolean;
  selectedAt: string | null;
};

export type Tier2MockCardState = {
  selection: Tier2SelectionValue;
  setSelection: (selection: Tier2SelectionValue) => void;
  liked: boolean;
  likeCount: number;
  toggleLike: () => void;
  watchLater: boolean;
  toggleWatchLater: () => void;
  avpCandidate: boolean;
  toggleAvpCandidate: () => void;
  selectedAt: string | null;
};

type Tier2MockCardStateById = Record<number, Tier2MockCardSnapshot>;

export type Tier2MockCardStateController = {
  videos: VariantKVideo[];
  getCardState: (video: VariantKVideo) => Tier2MockCardState;
};

function selectionFromVideo(video: VariantKVideo): Tier2SelectionValue {
  if (video.tier2_status === "none" || video.tier2_status === "unselected") return "unselected";
  return video.tier2_status as Tier2SelectionValue;
}

function snapshotFromVideo(video: VariantKVideo): Tier2MockCardSnapshot {
  return {
    selection: selectionFromVideo(video),
    liked: video.liked,
    likeCount: video.like_count,
    watchLater: video.watch_later,
    avpCandidate: false,
    selectedAt: video.selected_at,
  };
}

function initialStateById(videos: VariantKVideo[]): Tier2MockCardStateById {
  return Object.fromEntries(videos.map((video) => [video.id, snapshotFromVideo(video)]));
}

function todayIsoDate(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export function useTier2MockCardStates(videos: VariantKVideo[]): Tier2MockCardStateController {
  const [stateById, setStateById] = useState<Tier2MockCardStateById>(() => initialStateById(videos));

  const updateVideoState = useCallback(
    (video: VariantKVideo, updater: (current: Tier2MockCardSnapshot) => Tier2MockCardSnapshot) => {
      setStateById((currentById) => {
        const current = currentById[video.id] ?? snapshotFromVideo(video);
        return { ...currentById, [video.id]: updater(current) };
      });
    },
    [],
  );

  const getCardState = useCallback(
    (video: VariantKVideo): Tier2MockCardState => {
      const snapshot = stateById[video.id] ?? snapshotFromVideo(video);

      return {
        ...snapshot,
        setSelection: (selection) => {
          updateVideoState(video, (current) => ({
            ...current,
            selection,
            selectedAt: selection === "unselected" ? null : todayIsoDate(),
            watchLater: selection === "unselected" ? current.watchLater : false,
          }));
        },
        // インクリメント式：押すたびに +1（解除しない）。liked は一度押したら true 固定（ハート塗り用）。
        // フィールド名 toggleLike は共有ボタンの Pick 互換のため維持（挙動はインクリメント）。
        toggleLike: () => {
          updateVideoState(video, (current) => ({
            ...current,
            liked: true,
            likeCount: current.likeCount + 1,
          }));
        },
        toggleWatchLater: () => {
          updateVideoState(video, (current) => ({ ...current, watchLater: !current.watchLater }));
        },
        toggleAvpCandidate: () => {
          updateVideoState(video, (current) => ({ ...current, avpCandidate: !current.avpCandidate }));
        },
      };
    },
    [stateById, updateVideoState],
  );

  const videosWithState = useMemo(
    () =>
      videos.map((video) => {
        const snapshot = stateById[video.id] ?? snapshotFromVideo(video);
        if (video.tier2_status === "none") return video;
        return {
          ...video,
          tier2_status: snapshot.selection,
          liked: snapshot.liked,
          like_count: snapshot.likeCount,
          watch_later: snapshot.watchLater,
          selected_at: snapshot.selectedAt,
        };
      }),
    [stateById, videos],
  );

  return { videos: videosWithState, getCardState };
}
