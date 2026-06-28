// 統合 Variant K テーブル行の共有ローカルモック状態フック（ランキング/検索が各自インスタンス化）。
// 【役割】行操作（いいね・あとで見る・AVP候補・再生中ハイライト）の状態を video id 単位でページ内メモリに保持する。
//   あとで見る/AVP の hook と同型。getRowState(video) で操作クロージャを返し、videos にいいね/あとで見るを投影する。
// 【設計制約】
//   - メモリのみ（永続しない）。実 localStorage / sessionStorage / DB / API には触れない。
//   - あとで見る（DB相当）と AVP候補（localStorage相当）は別状態で持ち、混同しない。
//   - ランキングと検索は別インスタンスを持ち、画面間で状態同期しない（永続境界を越えない）。
//   - 再生は再生中ハイライト（playingId）にするだけ（実再生はしない）。
// 【依存関係】react, _data/variantKMock（VariantKVideo 型）。

"use client";

import { useCallback, useMemo, useState } from "react";
import type { VariantKVideo } from "../_data/variantKMock";

type RowSnapshot = {
  liked: boolean;
  likeCount: number;
  watchLater: boolean; // DB相当（モック）
  avpCandidate: boolean; // localStorage相当（メモリのみ）
};

export type VariantKRowState = {
  liked: boolean;
  likeCount: number;
  toggleLike: () => void;
  watchLater: boolean;
  toggleWatchLater: () => void;
  avpCandidate: boolean;
  toggleAvpCandidate: () => void;
};

type RowStateById = Record<number, RowSnapshot>;

export type VariantKRowStateController = {
  videos: VariantKVideo[]; // いいね/あとで見るのライブ状態を投影済み
  getRowState: (video: VariantKVideo) => VariantKRowState;
  playingId: number | null;
  setPlaying: (id: number | null) => void;
};

function snapshotFromVideo(video: VariantKVideo): RowSnapshot {
  return {
    liked: video.liked,
    likeCount: video.like_count,
    watchLater: video.watch_later,
    avpCandidate: false,
  };
}

function initialStateById(videos: VariantKVideo[]): RowStateById {
  return Object.fromEntries(videos.map((video) => [video.id, snapshotFromVideo(video)]));
}

export function useVariantKRowStates(videos: VariantKVideo[]): VariantKRowStateController {
  const [stateById, setStateById] = useState<RowStateById>(() => initialStateById(videos));
  const [playingId, setPlaying] = useState<number | null>(null);

  const updateVideoState = useCallback(
    (video: VariantKVideo, updater: (current: RowSnapshot) => RowSnapshot) => {
      setStateById((currentById) => {
        const current = currentById[video.id] ?? snapshotFromVideo(video);
        return { ...currentById, [video.id]: updater(current) };
      });
    },
    [],
  );

  const getRowState = useCallback(
    (video: VariantKVideo): VariantKRowState => {
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
        // あとで見るのトグル（DB相当）。AVP候補とは別物。
        toggleWatchLater: () => {
          updateVideoState(video, (current) => ({ ...current, watchLater: !current.watchLater }));
        },
        // AVP候補トグル（別状態）。あとで見るは解除しない。
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

  return { videos: videosWithState, getRowState, playingId, setPlaying };
}
