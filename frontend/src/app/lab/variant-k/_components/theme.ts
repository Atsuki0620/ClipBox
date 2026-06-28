// 統合 Variant K 共通テーマ・状態色トークン。
// 【役割】統合 Variant K（全画面整合モック）のシェルが当てる寒色モダンの CSS 変数と、
//   状態バッジ／再生中ハイライトの暫定色トークンを 1 箇所に集約する。
// 【設計制約】
//   - globals.css は変更しない。テーマはシェル root div の CSS 変数上書きでのみ当てる（lab 流儀）。
//   - 色はすべて統合 Variant K の「暫定値」。最終決定ではない（理由は _review メモ参照）。
//   - API/DB/localStorage に触れない。純粋な定数のみ。
// 【依存関係】react（CSSProperties 型）のみ。

import type { CSSProperties } from "react";

// 寒色モダン（Variant J 系 THEME を流用基準）。クールニュートラル＋寒色アクセント。
export const VARIANT_K_THEME: CSSProperties = {
  "--background": "oklch(0.985 0.003 250)",
  "--foreground": "oklch(0.21 0.015 258)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.21 0.015 258)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.21 0.015 258)",
  "--primary": "oklch(0.55 0.16 256)",
  "--primary-foreground": "oklch(0.99 0.005 250)",
  "--secondary": "oklch(0.96 0.005 250)",
  "--secondary-foreground": "oklch(0.30 0.015 258)",
  "--muted": "oklch(0.965 0.004 250)",
  "--muted-foreground": "oklch(0.47 0.015 258)",
  "--accent": "oklch(0.94 0.012 256)",
  "--accent-foreground": "oklch(0.28 0.015 258)",
  "--border": "oklch(0.91 0.005 250)",
  "--input": "oklch(0.91 0.005 250)",
  "--ring": "oklch(0.62 0.12 256)",
  "--radius": "0.5rem",
  "--sidebar": "oklch(0.98 0.003 250)",
  "--sidebar-foreground": "oklch(0.24 0.015 258)",
  "--sidebar-accent": "oklch(0.94 0.012 256)",
  "--sidebar-border": "oklch(0.91 0.005 250)",
} as CSSProperties;

// 状態バッジ／ハイライトの暫定色（Tailwind ユーティリティで表現）。
// kind ごとに「枠線＋背景＋文字」のクラスを持つ。最終色は未決（_review メモに理由）。
export type BadgeKind =
  | "tier1" // 該当Tier=Tier1：青系
  | "tier2" // 該当Tier=Tier2：シアン／ティール系
  | "watch_later" // あとで見る：中立トーンの控えめなアウトライン
  | "unavailable" // 利用不可：低彩度
  | "avp_candidate"; // AVP候補：初期OFF運用（部品としては用意）

export const BADGE_CLASS: Record<BadgeKind, string> = {
  tier1: "border-blue-300 bg-blue-50 text-blue-700",
  tier2: "border-teal-300 bg-teal-50 text-teal-700",
  watch_later: "border-slate-300 bg-transparent text-slate-600",
  unavailable: "border-zinc-300 bg-zinc-100 text-zinc-500",
  avp_candidate: "border-indigo-300 bg-indigo-50 text-indigo-700",
};

export const BADGE_LABEL: Record<BadgeKind, string> = {
  tier1: "Tier1",
  tier2: "Tier2",
  watch_later: "あとで見る",
  unavailable: "利用不可",
  avp_candidate: "AVP候補",
};

// 再生中ハイライト（バッジではなくカード／行のハイライト）。amber 系を暫定値とする。
export const PLAYING_HIGHLIGHT_CLASS = "ring-2 ring-amber-400/70 bg-amber-50/60";
