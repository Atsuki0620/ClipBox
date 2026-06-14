// UIラボ Tier1 運命の1本 Variant J 共有: 候補プールの並び・選出ヘルパ（決定論的モック）。
// 【役割】「最近見てない優先」トグルに応じた候補の並びと、運命の1本を順送りで引くための純関数。
//   乱数は使わず順送り＝SSR/CSR で初期値が一致（ハイドレーション安全）。
// 【設計制約】API/DB/localStorage に触れない。副作用なしの純関数・定数のみ。
// 【依存関係】_data/labMock（LabVideo 型）のみ。

import type { LabVideo } from "../../_data/labMock";

// 「最近見てない優先」: 最終視聴が古い（未視聴=最優先）順。OFF: id 昇順の固定並び。
export function orderedFatePool(pool: LabVideo[], recentlyUnwatchedFirst: boolean): LabVideo[] {
  const playable = pool.filter((v) => v.is_available);
  if (!recentlyUnwatchedFirst) return [...playable].sort((a, b) => a.id - b.id);
  return [...playable].sort((a, b) => {
    // 未視聴（last_viewed=null）を最優先、その後は古い順。
    const av = a.last_viewed ?? "";
    const bv = b.last_viewed ?? "";
    if (av === bv) return a.id - b.id;
    return av < bv ? -1 : 1;
  });
}

// 選出理由の短いラベル。
export function fateReason(recentlyUnwatchedFirst: boolean): string {
  return recentlyUnwatchedFirst ? "最近見ていない" : "ランダム選出";
}

// 「最近見ていない候補」補助リスト（現在の1本を除く先頭 n 件）。
export function recentlyUnwatchedCandidates(
  pool: LabVideo[],
  excludeId: number | null,
  n: number,
): LabVideo[] {
  return orderedFatePool(pool, true)
    .filter((v) => v.id !== excludeId)
    .slice(0, n);
}
