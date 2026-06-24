// UIラボ「AVP画面」案D 専用: 「DB相当」の編集可能状態（レベル/いいね/あとで見る/選別）のモック保持。
// 【役割】案D の下部リッチカードでレベル判定・いいね・あとで見るを操作したとき、その結果を
//   ページ内で保持し、上部の候補カードのバッジにも反映させる「単一ソース」。AVP_VIDEOS に
//   差分（overrides）を重ねた“現在の動画”を返す。本体 VideoCard の mutation の見た目だけを再現する。
// 【設計制約】localStorage/DB/API に一切接続しない（ページ内 useState の overrides のみ・保存しない）。
//   本体 store.ts / @/lib/api には触れない。AVP候補/再生対象=localStorage、あとで見る=DB の
//   永続境界は「概念」であり、ここでは実保存をしない（モックの編集はメモリ上のみ）。
// 【依存関係】react, _data/avpMock（AVP_VIDEOS / AvpVideo）。
"use client";

import { useCallback, useMemo, useState } from "react";
import { AVP_VIDEOS, type AvpVideo } from "../_data/avpMock";

// 編集できるのは DB 由来の項目だけ（レベル/いいね数/あとで見る/未選別）。
type Editable = Pick<
  AvpVideo,
  "current_favorite_level" | "like_count" | "watch_later" | "needs_selection" | "is_selection_completed"
>;

export function useAvpLibrary() {
  const [overrides, setOverrides] = useState<Record<number, Partial<Editable>>>({});

  const baseById = useMemo(() => new Map(AVP_VIDEOS.map((v) => [v.id, v] as const)), []);

  // AVP_VIDEOS に overrides を重ねた“現在の動画”を返す。
  const get = useCallback(
    (id: number): AvpVideo => {
      const base = baseById.get(id)!;
      const ov = overrides[id];
      return ov ? { ...base, ...ov } : base;
    },
    [baseById, overrides],
  );

  const patch = useCallback((id: number, next: Partial<Editable>) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
  }, []);

  // レベル判定（-1=未判定）。判定したら未選別は解除（本体の Tier2 挙動を見た目で踏襲）。
  const setLevel = useCallback(
    (id: number, level: number) => patch(id, { current_favorite_level: level, needs_selection: false }),
    [patch],
  );

  // 未選別に戻す（Tier2）。
  const unselect = useCallback(
    (id: number) => patch(id, { needs_selection: true, is_selection_completed: false }),
    [patch],
  );

  // いいね（+1。モックなので単純加算）。
  const like = useCallback(
    (id: number) => patch(id, { like_count: get(id).like_count + 1 }),
    [patch, get],
  );

  // あとで見る（DB相当）のトグル。
  const toggleWatchLater = useCallback(
    (id: number) => patch(id, { watch_later: !get(id).watch_later }),
    [patch, get],
  );

  return { get, setLevel, unselect, like, toggleWatchLater };
}
