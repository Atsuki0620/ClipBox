// UIラボ「ランキング画面」専用のモックデータ＋派生ヘルパ。
// 【役割】/lab/ranking の3案（A/B/C）で共有する固定サンプル。種別ごとの並びと順位を純関数で表現する。
// 【設計制約】API/DB/localStorage に一切接続しない（純粋な定数とフォーマッタのみ）。
//   ★合成スコアは「UI表示確認用のダミー」であり、本体の APP_PLAYBACK ベース総合ランキング計算式ではない。
//     本体のランキング仕様・スコア式・タイブレークは一切変更しない。ここで `id ASC` を同点タイブレークに
//     使うのも、本体ロジックの再実装ではなく「本体と同じ見え方」を再現するモックである。
//   ファイル名は明らかに合成のプレースホルダ（実在名・実パス・個人情報を置かない）。API 風フィールドは snake_case。
// 【依存関係】../../_data/labMock（LAB_VIDEOS 等）, @/lib/levels（levelName / storageLabel）。lib/types とは独立。

import { LAB_VIDEOS, type LabVideo, formatDate, formatFileSize } from "../../_data/labMock";
import { levelName, storageLabel } from "@/lib/levels";

export type RankingType = "view_count" | "view_days" | "likes" | "composite";

// 実 /ranking の RANKING_LABELS / SCORE_SUFFIX と同じ文言（見た目整合用）。
export const RANKING_LABELS: Record<RankingType, string> = {
  view_count: "視聴回数",
  view_days: "視聴日数",
  likes: "いいね数",
  composite: "総合",
};
export const SCORE_SUFFIX: Record<RankingType, string> = {
  view_count: "回",
  view_days: "日",
  likes: "個",
  composite: "pt",
};

// フィルタバー（モック・表示専用）の選択肢。実 /ranking と同じ並び。
export const PERIOD_OPTIONS = ["180日", "1年", "全期間"] as const;
export const AVAILABILITY_OPTIONS = ["再生可能だけ", "全動画"] as const;
export const TOP_N_OPTIONS = [10, 20, 50] as const;
export const MIN_LEVEL_OPTIONS = [
  { value: "none", label: "制限なし" },
  { value: "3", label: "Lv3以上" },
  { value: "4", label: "Lv4のみ" },
] as const;

// 各 Variant 切替（LabFrame に渡す）。
export const RANKING_AREA_VARIANTS = [
  { key: "a", href: "/lab/ranking/variant-a", label: "A カード" },
  { key: "b", href: "/lab/ranking/variant-b", label: "B テーブル" },
  { key: "c", href: "/lab/ranking/variant-c", label: "C 上位+下位" },
];

// 視聴「日数」（合成。view_count を超えない範囲でばらつかせる）。本体集計ではない。
const VIEW_DAYS: Record<number, number> = {
  1: 9, 2: 7, 3: 0, 4: 4, 5: 2, 6: 13, 7: 1, 8: 6, 9: 0, 10: 4, 11: 11, 12: 2, 13: 8, 14: 1, 15: 3,
};

export interface RankedVideo extends LabVideo {
  view_days: number; // 合成: 視聴した日数
  score_composite: number; // ★ダミー総合スコア（pt）。本体 APP_PLAYBACK 総合式ではない。
  rank: number; // 表示順位（選択中の種別で算出）
}

// ★ダミー総合スコア（UI表示確認用）。重みは説明のための例示で、本体式とは無関係。
function dummyComposite(v: LabVideo, viewDays: number): number {
  return v.view_count * 2 + viewDays * 3 + v.like_count * 4 + (v.current_favorite_level + 1);
}

// 全件にダミースコアを付与（順位は rankBy で種別ごとに算出）。
const SCORED: RankedVideo[] = LAB_VIDEOS.map((v) => {
  const view_days = VIEW_DAYS[v.id] ?? 0;
  return { ...v, view_days, score_composite: dummyComposite(v, view_days), rank: 0 };
});

export function scoreOf(v: RankedVideo, type: RankingType): number {
  switch (type) {
    case "view_count":
      return v.view_count;
    case "view_days":
      return v.view_days;
    case "likes":
      return v.like_count;
    case "composite":
      return v.score_composite;
  }
}

// 選択中の種別で降順ソートし、同点は id 昇順（本体タイブレークと同じ“見え方”のモック）。順位を振り直す。
export function rankBy(type: RankingType): RankedVideo[] {
  return [...SCORED]
    .sort((a, b) => scoreOf(b, type) - scoreOf(a, type) || a.id - b.id)
    .map((v, i) => ({ ...v, rank: i + 1 }));
}

export { levelName, storageLabel, formatDate, formatFileSize, type LabVideo };
