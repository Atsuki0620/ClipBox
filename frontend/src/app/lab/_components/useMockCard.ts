// UIラボのカード用ローカル状態フック。
// 【役割】各 Variant の動画カードに「触れる」操作感を与える（レベル変更・いいね・あとで見る・AVP候補）。
// 【設計制約】すべてコンポーネント内のローカル state。API/DB/localStorage には一切書き込まない。
// 【依存関係】React のみ。LabVideo を初期値として受け取る。

"use client";

import { useState } from "react";
import type { LabVideo } from "../_data/labMock";

export function useMockCard(video: LabVideo) {
  const [level, setLevel] = useState(video.current_favorite_level);
  const [likeCount, setLikeCount] = useState(video.like_count);
  const [watchLater, setWatchLater] = useState(video.watch_later);
  const [avp, setAvp] = useState(false);

  return {
    level,
    setLevel,
    likeCount,
    like: () => setLikeCount((count) => count + 1),
    watchLater,
    toggleWatchLater: () => setWatchLater((value) => !value),
    avp,
    toggleAvp: () => setAvp((value) => !value),
  };
}
