// 統合 Variant K あとで見る ページ内のローカルモック状態フック。
// 【役割】あとで見るカードの操作状態（いいね・あとで見る・AVP候補）を video id 単位でページ内共有する。
//   3セクション（未処理／確認・見直し／処理済み候補）は同じ状態を投影して分類する。
// 【設計制約】
//   - メモリのみ（永続しない）。実 localStorage / sessionStorage / DB / API には触れない。
//   - あとで見る（DB相当）と AVP候補（localStorage相当）は別状態として持ち、混同しない。
//   - AVP候補追加・通常再生では あとで見る を自動解除しない（自動解除の見せ方は page の Tooltip）。
//   - レベル操作はこの画面では出さない（判定/選別は Tier1/Tier2 画面の役割）。
// 【依存関係】react, _data/variantKMock（VariantKVideo 型）。

"use client";

import { useCallback, useMemo, useState } from "react";
import type { VariantKVideo } from "../_data/variantKMock";

type WatchLaterMockSnapshot = {
  liked: boolean;
  likeCount: number;
  watchLater: boolean; // DB相当（モック）
  avpCandidate: boolean; // localStorage相当（メモリのみ）
};

export type WatchLaterMockCardState = {
  liked: boolean;
  likeCount: number;
  toggleLike: () => void;
  watchLater: boolean;
  removeWatchLater: () => void;
  avpCandidate: boolean;
  toggleAvpCandidate: () => void;
};

type WatchLaterMockStateById = Record<number, WatchLaterMockSnapshot>;

export type WatchLaterMockStateController = {
  videos: VariantKVideo[];
  getCardState: (video: VariantKVideo) => WatchLaterMockCardState;
};

function snapshotFromVideo(video: VariantKVideo): WatchLaterMockSnapshot {
  return {
    liked: video.liked,
    likeCount: video.like_count,
    watchLater: video.watch_later,
    avpCandidate: false,
  };
}

function initialStateById(videos: VariantKVideo[]): WatchLaterMockStateById {
  return Object.fromEntries(videos.map((video) => [video.id, snapshotFromVideo(video)]));
}

export function useWatchLaterMockStates(videos: VariantKVideo[]): WatchLaterMockStateController {
  const [stateById, setStateById] = useState<WatchLaterMockStateById>(() => initialStateById(videos));

  const updateVideoState = useCallback(
    (video: VariantKVideo, updater: (current: WatchLaterMockSnapshot) => WatchLaterMockSnapshot) => {
      setStateById((currentById) => {
        const current = currentById[video.id] ?? snapshotFromVideo(video);
        return { ...currentById, [video.id]: updater(current) };
      });
    },
    [],
  );

  const getCardState = useCallback(
    (video: VariantKVideo): WatchLaterMockCardState => {
      const snapshot = stateById[video.id] ?? snapshotFromVideo(video);

      return {
        ...snapshot,
        toggleLike: () => {
          updateVideoState(video, (current) => ({
            ...current,
            liked: !current.liked,
            likeCount: Math.max(0, current.likeCount + (current.liked ? -1 : 1)),
          }));
        },
        // あとで見る解除（この画面の主操作）。再追加はこの画面では出さない。
        removeWatchLater: () => {
          updateVideoState(video, (current) => ({ ...current, watchLater: false }));
        },
        // AVP候補追加は別状態。あとで見るは解除しない。
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
        return {
          ...video,
          liked: snapshot.liked,
          like_count: snapshot.likeCount,
          watch_later: snapshot.watchLater,
        };
      }),
    [stateById, videos],
  );

  return { videos: videosWithState, getCardState };
}
