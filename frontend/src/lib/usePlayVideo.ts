"use client";

// 単体再生の共通フック。再生成功で「再生中（単体）」をセットし、
// 共通キー（kpi/likes/view-counts）と画面別 invalidateKeys を無効化する。
// VideoCard・運命の1本（app/page.tsx / app/tier2/page.tsx）の全 playVideo 経路で
// これを使い、再生中ハイライトの配線漏れを防ぐ（R4）。

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { playVideo } from "@/lib/api";
import { usePlaybackStore } from "@/lib/store";

export function usePlayVideo(invalidateKeys: QueryKey[] = []) {
  const qc = useQueryClient();
  const setSinglePlaying = usePlaybackStore((state) => state.setSinglePlaying);

  return useMutation({
    mutationFn: (id: number) => playVideo(id),
    onSuccess: (_data, id) => setSinglePlaying(id),
    onSettled: () => {
      // 共通キー（件数のみ更新でリストの顔ぶれは変えない）。
      qc.invalidateQueries({ queryKey: ["kpi"] });
      qc.invalidateQueries({ queryKey: ["likes"] });
      qc.invalidateQueries({ queryKey: ["view-counts"] });
      qc.invalidateQueries({ queryKey: ["last-viewed"] });
      // 画面別リストキー。ランダム/運命は [] を渡し再抽選を防ぐ。
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}
