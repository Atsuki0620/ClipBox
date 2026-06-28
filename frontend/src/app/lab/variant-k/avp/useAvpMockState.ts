// 統合 Variant K AVP ページ内のローカルモック状態フック。
// 【役割】AVP候補・再生対象・いいね・再生中ハイライトを video id 単位でページ内メモリに保持する。
// 【設計制約】
//   - メモリのみ（永続しない）。実 localStorage / sessionStorage / DB / API には触れない。
//   - 候補は上限なし。再生対象は最大4本（MAX_AVP_PLAY_TARGET）。利用不可は再生対象に追加しない。
//   - どの操作でも あとで見る（watch_later）を解除しない（AVP再生でも自動解除しない方針）。
//   - 「AVPで再生」は実再生をせず、再生対象を再生中ハイライトにするだけ（再生後クリアは想定文言で表現）。
// 【依存関係】react, _data/variantKMock（VariantKVideo 型）, ./shared（MAX_AVP_PLAY_TARGET）。

"use client";

import { useCallback, useMemo, useState } from "react";
import type { VariantKVideo } from "../_data/variantKMock";
import { MAX_AVP_PLAY_TARGET } from "./shared";

// 初期 AVP候補（localStorage 相当だが本段階はメモリのみ）。利用不可(4)を含め追加不可の見た目を確認できるようにする。
const INITIAL_CANDIDATE_IDS = [6, 1, 2, 12, 14, 4];

type LikeOverride = { liked: boolean; likeCount: number };

export type AvpMockController = {
  videos: VariantKVideo[]; // いいねのライブ状態を投影済み
  candidateIds: number[];
  playTargetIds: number[];
  playingIds: number[];
  isPlayTarget: (id: number) => boolean;
  isPlaying: (id: number) => boolean;
  canAddPlayTarget: boolean;
  addToPlayTarget: (video: VariantKVideo) => void;
  removeFromPlayTarget: (id: number) => void;
  removeCandidate: (id: number) => void;
  toggleLike: (id: number) => void;
  likeAllInPlaySet: () => void;
  clearPlayTarget: () => void;
  clearAllCandidates: () => void;
  playAvp: () => void;
};

export function useAvpMockStates(videos: VariantKVideo[]): AvpMockController {
  const [candidateIds, setCandidateIds] = useState<number[]>(INITIAL_CANDIDATE_IDS);
  const [playTargetIds, setPlayTargetIds] = useState<number[]>([]);
  const [playingIds, setPlayingIds] = useState<number[]>([]);
  const [likeOverrides, setLikeOverrides] = useState<Record<number, LikeOverride>>({});

  const byId = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);

  const addToPlayTarget = useCallback((video: VariantKVideo) => {
    if (!video.available) return; // 利用不可は再生対象に追加しない
    setPlayTargetIds((prev) => {
      if (prev.includes(video.id)) return prev;
      if (prev.length >= MAX_AVP_PLAY_TARGET) return prev; // 最大4本
      return [...prev, video.id];
    });
  }, []);

  const removeFromPlayTarget = useCallback((id: number) => {
    setPlayTargetIds((prev) => prev.filter((x) => x !== id));
    setPlayingIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const removeCandidate = useCallback((id: number) => {
    setCandidateIds((prev) => prev.filter((x) => x !== id));
    setPlayTargetIds((prev) => prev.filter((x) => x !== id));
    setPlayingIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const toggleLike = useCallback(
    (id: number) => {
      setLikeOverrides((prev) => {
        const base = byId.get(id);
        const current = prev[id] ?? { liked: base?.liked ?? false, likeCount: base?.like_count ?? 0 };
        return {
          ...prev,
          [id]: {
            liked: !current.liked,
            likeCount: Math.max(0, current.likeCount + (current.liked ? -1 : 1)),
          },
        };
      });
    },
    [byId],
  );

  // 一括いいね：未いいねのみ ON にする（いいね済みは解除しない）。
  const likeAllInPlaySet = useCallback(() => {
    setLikeOverrides((prev) => {
      const next = { ...prev };
      for (const id of playTargetIds) {
        const base = byId.get(id);
        const current = next[id] ?? { liked: base?.liked ?? false, likeCount: base?.like_count ?? 0 };
        if (!current.liked) {
          next[id] = { liked: true, likeCount: current.likeCount + 1 };
        }
      }
      return next;
    });
  }, [byId, playTargetIds]);

  const clearPlayTarget = useCallback(() => {
    setPlayTargetIds([]);
    setPlayingIds([]);
  }, []);

  const clearAllCandidates = useCallback(() => {
    setCandidateIds([]);
    setPlayTargetIds([]);
    setPlayingIds([]);
  }, []);

  // AVPで再生（モック）：再生対象を再生中ハイライトにする。実再生・クリアはしない（再生後クリアは想定文言）。
  const playAvp = useCallback(() => {
    setPlayingIds(playTargetIds);
  }, [playTargetIds]);

  const projectedVideos = useMemo(
    () =>
      videos.map((video) => {
        const override = likeOverrides[video.id];
        return override ? { ...video, liked: override.liked, like_count: override.likeCount } : video;
      }),
    [videos, likeOverrides],
  );

  const isPlayTarget = useCallback((id: number) => playTargetIds.includes(id), [playTargetIds]);
  const isPlaying = useCallback((id: number) => playingIds.includes(id), [playingIds]);

  return {
    videos: projectedVideos,
    candidateIds,
    playTargetIds,
    playingIds,
    isPlayTarget,
    isPlaying,
    canAddPlayTarget: playTargetIds.length < MAX_AVP_PLAY_TARGET,
    addToPlayTarget,
    removeFromPlayTarget,
    removeCandidate,
    toggleLike,
    likeAllInPlaySet,
    clearPlayTarget,
    clearAllCandidates,
    playAvp,
  };
}
