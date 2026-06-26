// UIラボ「AVP画面」共通: 候補プールと再生対象（最大4本）の選択ロジック（モック）。
// 【役割】3案（A/B/C）で同じ挙動を共有する。本体 store.ts の不変点を見た目で再現する:
//   候補=上限なし / 再生対象=最大4本（追加は満杯で no-op）/ 候補から外すと再生対象からも外れる /
//   全候補クリアは候補と再生対象の両方を空にする。再生対象は選択順を保持する。
// 【設計制約】localStorage/DB/API に触れない（ページ内 useState のみ・保存しない）。
// 【依存関係】react, _data/avpMock。

"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AVP_VIDEOS,
  INITIAL_PLAY_TARGET_IDS,
  MAX_AVP_PLAY_TARGET,
  isTargetFull,
  type AvpVideo,
} from "../_data/avpMock";

export function usePlayTargets() {
  const [candidateIds, setCandidateIds] = useState<number[]>(() => AVP_VIDEOS.map((v) => v.id));
  const [targetIds, setTargetIds] = useState<number[]>(() => [...INITIAL_PLAY_TARGET_IDS]);

  const byId = useMemo(() => new Map(AVP_VIDEOS.map((v) => [v.id, v] as const)), []);

  const candidates = useMemo<AvpVideo[]>(
    () => candidateIds.map((id) => byId.get(id)).filter((v): v is AvpVideo => Boolean(v)),
    [candidateIds, byId],
  );
  // 再生対象は選択順を保持する（4枠の並びに使う）。
  const targets = useMemo<AvpVideo[]>(
    () => targetIds.map((id) => byId.get(id)).filter((v): v is AvpVideo => Boolean(v)),
    [targetIds, byId],
  );

  const full = isTargetFull(targetIds.length);

  const isTarget = useCallback((id: number) => targetIds.includes(id), [targetIds]);

  // 再生対象トグル。追加は満杯（4本）で no-op、利用不可は追加不可。
  const toggleTarget = useCallback(
    (id: number) => {
      setTargetIds((prev) => {
        if (prev.includes(id)) return prev.filter((v) => v !== id);
        if (prev.length >= MAX_AVP_PLAY_TARGET) return prev;
        if (byId.get(id)?.is_available === false) return prev;
        return [...prev, id];
      });
    },
    [byId],
  );

  // 候補から外す（再生対象からも外れる＝本体 removeAvpCandidateId 相当）。
  const removeCandidate = useCallback((id: number) => {
    setCandidateIds((prev) => prev.filter((v) => v !== id));
    setTargetIds((prev) => prev.filter((v) => v !== id));
  }, []);

  // 全候補クリア（候補と再生対象の両方を空に＝本体 clearAvpCandidateIds 相当）。
  const clearCandidates = useCallback(() => {
    setCandidateIds([]);
    setTargetIds([]);
  }, []);

  // 再生対象だけクリア（候補は残す＝本体 clearAvpPlayTargetIds 相当）。
  const clearTargets = useCallback(() => setTargetIds([]), []);

  return {
    candidates,
    targets,
    targetIds,
    candidateCount: candidateIds.length,
    isTarget,
    toggleTarget,
    removeCandidate,
    clearCandidates,
    clearTargets,
    full,
    max: MAX_AVP_PLAY_TARGET,
  };
}
