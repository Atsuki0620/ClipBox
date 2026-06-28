// 統合 Variant K あとで見る 共有: セクション分類・ステータス文言・付与理由（純関数）。
// 【役割】あとで見る画面の3セクション（未処理／確認・見直し／処理済み候補）の分類と、
//   Tier1/Tier2 を混同しないステータス文言・付与理由メモを副作用なしで導出する。
// 【設計制約】
//   - API/DB/localStorage/sessionStorage に触れない。純関数・定数のみ。
//   - セクション分類は「最終再生（last_played_at）」を /stats/last-viewed 相当のモックとして使う。
//   - 解除ルール自体（自動解除条件）は本体仕様を実装しない。見せ方のみは page 側 Tooltip に集約。
// 【依存関係】_data/variantKMock（VariantKVideo 型・tier1Label/tier2Label）。

import { tier1Label, tier2Label, type VariantKVideo } from "../_data/variantKMock";

export type WatchLaterSection = "unprocessed" | "review" | "doneCandidate";

export const WATCH_LATER_SECTIONS: { key: WatchLaterSection; title: string; description: string }[] = [
  {
    key: "unprocessed",
    title: "未処理",
    description: "Tier1 未判定・Tier2 未選別。判定/選別を済ませると自動解除される想定。",
  },
  {
    key: "review",
    title: "確認・見直し",
    description: "処理済みだが、まだアプリ再生のないあとで見る。見直して残すか解除するか決める。",
  },
  {
    key: "doneCandidate",
    title: "処理済み候補",
    description: "処理済み・アプリ再生済みのあとで見る。いいねやレベル変更で解除候補になる想定。",
  },
];

// Tier2 対象かどうか（"none" は Tier1 のみの動画）。
export function isTier2Target(video: VariantKVideo): boolean {
  return video.tier2_status !== "none";
}

// 未処理かどうか：Tier2 対象は未選別、それ以外は Tier1 未判定。
export function isUnprocessed(video: VariantKVideo): boolean {
  if (isTier2Target(video)) return video.tier2_status === "unselected";
  return video.tier1_status === -1;
}

// あとで見る中の動画だけを抽出（watch_later 相当のライブ状態は呼び出し側が投影済み）。
export function watchLaterVideos(videos: VariantKVideo[]): VariantKVideo[] {
  return videos.filter((video) => video.watch_later);
}

// 3セクションのどれに属するかを判定する。
export function classifyWatchLater(video: VariantKVideo): WatchLaterSection {
  if (isUnprocessed(video)) return "unprocessed";
  // 処理済み（Tier1 判定済み / Tier2 選別済み）。最終再生の有無で確認・見直し / 処理済み候補に分ける。
  return video.last_played_at ? "doneCandidate" : "review";
}

// セクション別にまとめる（視聴日数の多い順・同値は id 昇順）。
export function groupWatchLater(videos: VariantKVideo[]): Record<WatchLaterSection, VariantKVideo[]> {
  const groups: Record<WatchLaterSection, VariantKVideo[]> = {
    unprocessed: [],
    review: [],
    doneCandidate: [],
  };
  for (const video of watchLaterVideos(videos)) {
    groups[classifyWatchLater(video)].push(video);
  }
  for (const key of Object.keys(groups) as WatchLaterSection[]) {
    groups[key].sort((a, b) => (b.view_days - a.view_days) || (a.id - b.id));
  }
  return groups;
}

// Tier1/Tier2 を混同しないステータス文言（例: "Tier1 未判定" / "Tier1 Lv3" / "Tier2 未選別" / "Tier2 Lv2"）。
export function watchLaterStatusLabel(video: VariantKVideo): string {
  if (isTier2Target(video)) return `Tier2 ${tier2Label(video.tier2_status)}`;
  return `Tier1 ${tier1Label(video.tier1_status)}`;
}

// カードに小さく出す付与理由メモ（長文の解除ルールは出さず、状態から短く導出する）。
export function watchLaterReason(video: VariantKVideo): string {
  switch (classifyWatchLater(video)) {
    case "unprocessed":
      return isTier2Target(video) ? "未選別のまま保留中" : "未判定のまま保留中";
    case "review":
      return "処理済み・未再生で保留中";
    case "doneCandidate":
      return "処理済み・再生済みで保留中";
  }
}
