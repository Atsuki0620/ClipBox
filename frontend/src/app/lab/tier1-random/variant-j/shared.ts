// UIラボ Tier1 ランダム Variant J 共有: 条件型・決定論的なモック候補選定。
// 【役割】ランダムタブの「条件」と、条件＋本数＋トークンから候補IDを選ぶ純関数。
//   実際の乱数は使わず、トークンによる回転で「引き直し」を表現（SSR/CSR で初期値が一致＝ハイドレーション安全）。
// 【設計制約】API/DB/localStorage に触れない。副作用なしの純関数・定数のみ。
// 【依存関係】_data/labMock（LabVideo 型）のみ。

import type { LabVideo } from "../../_data/labMock";

export interface RandomConditions {
  unratedFirst: boolean; // 未判定優先
  levels: number[]; // 空 = すべて
  storages: string[]; // 空 = すべて
  availableOnly: boolean; // 再生可のみ
  includeWatchLater: boolean; // あとで見る対象も候補に含める
}

export const DEFAULT_CONDITIONS: RandomConditions = {
  unratedFirst: true,
  levels: [],
  storages: [],
  availableOnly: true,
  includeWatchLater: false,
};

// 「条件」バッジ用：既定から変化したグループ数。
export function activeConditionCount(c: RandomConditions): number {
  let n = 0;
  if (!c.unratedFirst) n += 1;
  if (c.levels.length) n += 1;
  if (c.storages.length) n += 1;
  if (!c.availableOnly) n += 1;
  if (c.includeWatchLater) n += 1;
  return n;
}

function filterPool(pool: LabVideo[], c: RandomConditions): LabVideo[] {
  return pool.filter((v) => {
    if (c.availableOnly && !v.is_available) return false;
    if (c.levels.length && !c.levels.includes(v.current_favorite_level)) return false;
    if (c.storages.length && !c.storages.includes(v.storage_location)) return false;
    if (!c.includeWatchLater && v.watch_later) return false;
    return true;
  });
}

function ordered(pool: LabVideo[], c: RandomConditions): LabVideo[] {
  const filtered = filterPool(pool, c);
  if (!c.unratedFirst) return filtered;
  // 未判定（-1）を先頭へ安定ソート。
  return [...filtered].sort((a, b) => {
    const au = a.current_favorite_level === -1 ? 0 : 1;
    const bu = b.current_favorite_level === -1 ? 0 : 1;
    return au - bu;
  });
}

// 条件＋本数＋トークンから候補IDを選ぶ（トークンで回転＝引き直し）。
export function pickCandidates(
  pool: LabVideo[],
  c: RandomConditions,
  count: number,
  token: number,
): number[] {
  const list = ordered(pool, c);
  if (list.length === 0) return [];
  const offset = ((token % list.length) + list.length) % list.length;
  const rotated = [...list.slice(offset), ...list.slice(0, offset)];
  return rotated.slice(0, Math.min(count, rotated.length)).map((v) => v.id);
}

// 個別「入れ替え」用：現在表示していないプール内の次のID。なければ null。
export function nextPoolId(
  pool: LabVideo[],
  c: RandomConditions,
  currentIds: number[],
): number | null {
  const list = ordered(pool, c);
  const next = list.find((v) => !currentIds.includes(v.id));
  return next ? next.id : null;
}
