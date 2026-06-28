// 統合 Variant K Tier1 ページ内のローカルモック状態フック。
// 【役割】Tier1 のカード操作状態（判定レベル・いいね・あとで見る・AVP候補）を video id 単位で保持する。
//   ライブラリ/ランダム/運命の1本で同じ動画の状態が矛盾しないよう、ページ内で共有する。
// 【設計制約】
//   - メモリのみ（永続しない）。実 localStorage / sessionStorage / DB / API には触れない。
//   - あとで見る（DB相当）と AVP候補（localStorage相当）は別々の状態として持ち、混同しない。
//   - 判定レベルは 0..4 を設定する操作のみ。設定時は判定済み化・判定日更新・あとで見る自動解除をモックで表現する。
// 【依存関係】react, _data/variantKMock（VariantKVideo 型）。

"use client";

import { useCallback, useMemo, useState } from "react";
import type { VariantKVideo } from "../_data/variantKMock";

type Tier1MockCardSnapshot = {
  level: number; // -1=未判定, 0..4
  liked: boolean;
  likeCount: number;
  watchLater: boolean; // DB相当（モック）
  avpCandidate: boolean; // localStorage相当（メモリのみ）
  judgedAt: string | null;
};

export type Tier1MockCardState = {
  level: number; // -1=未判定, 0..4
  setLevel: (level: number) => void;
  liked: boolean;
  likeCount: number;
  toggleLike: () => void;
  watchLater: boolean; // DB相当（モック）
  toggleWatchLater: () => void;
  avpCandidate: boolean; // localStorage相当（メモリのみ）
  toggleAvpCandidate: () => void;
  judgedAt: string | null;
};

type Tier1MockCardStateById = Record<number, Tier1MockCardSnapshot>;

export type Tier1MockCardStateController = {
  videos: VariantKVideo[];
  getCardState: (video: VariantKVideo) => Tier1MockCardState;
};

function snapshotFromVideo(video: VariantKVideo): Tier1MockCardSnapshot {
  return {
    level: video.tier1_status,
    liked: video.liked,
    likeCount: video.like_count,
    watchLater: video.watch_later,
    avpCandidate: false,
    judgedAt: video.judged_at,
  };
}

function initialStateById(videos: VariantKVideo[]): Tier1MockCardStateById {
  return Object.fromEntries(videos.map((video) => [video.id, snapshotFromVideo(video)]));
}

function todayIsoDate(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export function useTier1MockCardStates(videos: VariantKVideo[]): Tier1MockCardStateController {
  const [stateById, setStateById] = useState<Tier1MockCardStateById>(() => initialStateById(videos));

  const updateVideoState = useCallback(
    (video: VariantKVideo, updater: (current: Tier1MockCardSnapshot) => Tier1MockCardSnapshot) => {
      setStateById((currentById) => {
        const current = currentById[video.id] ?? snapshotFromVideo(video);
        return { ...currentById, [video.id]: updater(current) };
      });
    },
    [],
  );

  const getCardState = useCallback(
    (video: VariantKVideo): Tier1MockCardState => {
      const snapshot = stateById[video.id] ?? snapshotFromVideo(video);

      return {
        ...snapshot,
        setLevel: (level) => {
          updateVideoState(video, (current) => ({
            ...current,
            level,
            judgedAt: todayIsoDate(),
            watchLater: false,
          }));
        },
        toggleLike: () => {
          updateVideoState(video, (current) => ({
            ...current,
            liked: !current.liked,
            likeCount: Math.max(0, current.likeCount + (current.liked ? -1 : 1)),
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
        return {
          ...video,
          tier1_status: snapshot.level,
          liked: snapshot.liked,
          like_count: snapshot.likeCount,
          watch_later: snapshot.watchLater,
          judged_at: snapshot.judgedAt,
        };
      }),
    [stateById, videos],
  );

  return { videos: videosWithState, getCardState };
}
