// 統合 Variant K Tier1 カードのローカルモック状態フック。
// 【役割】Tier1 のカード1枚分のモック操作状態（判定レベル・いいね・あとで見る・AVP候補）を保持する。
//   段階3では Tier1 に閉じた実装にする（Tier2/あとで見るにも要ると確定したら段階4以降で共通化）。
// 【設計制約】
//   - メモリのみ（永続しない）。実 localStorage / sessionStorage / DB / API には触れない。
//   - あとで見る（DB相当）と AVP候補（localStorage相当）は別々の状態として持ち、混同しない。
//   - 判定レベルは 0..4 を設定する操作のみ（未判定へ戻す操作は段階3では出さない）。
// 【依存関係】react, _data/variantKMock（VariantKVideo 型）。

"use client";

import { useState } from "react";
import type { VariantKVideo } from "../_data/variantKMock";

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
};

export function useTier1MockCardState(video: VariantKVideo): Tier1MockCardState {
  const [level, setLevel] = useState<number>(video.tier1_status);
  const [liked, setLiked] = useState<boolean>(video.liked);
  const [likeCount, setLikeCount] = useState<number>(video.like_count);
  const [watchLater, setWatchLater] = useState<boolean>(video.watch_later);
  const [avpCandidate, setAvpCandidate] = useState<boolean>(false);

  return {
    level,
    setLevel,
    liked,
    likeCount,
    toggleLike: () => {
      setLiked((prev) => {
        setLikeCount((c) => c + (prev ? -1 : 1));
        return !prev;
      });
    },
    watchLater,
    toggleWatchLater: () => setWatchLater((prev) => !prev),
    avpCandidate,
    toggleAvpCandidate: () => setAvpCandidate((prev) => !prev),
  };
}
