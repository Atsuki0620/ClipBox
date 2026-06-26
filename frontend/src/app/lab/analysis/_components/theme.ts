// UIラボ「分析画面」共通テーマ（寒色モダンコンソール＝Variant J と同一値）。
// 【役割】3案（A/B/C）のルート div に当てる CSS 変数上書きを一元化し、見た目比較の前提を揃える。
// 【設計制約】globals.css は変更しない。ルート要素の style にのみ適用する。既存 AVP_THEME と同一の寒色トークン。
// 【依存関係】React の CSSProperties 型のみ。

import type { CSSProperties } from "react";

// クールニュートラル＋寒色アクセント（lab/avp・ranking・search と同一 THEME）。
export const ANALYSIS_THEME: CSSProperties = {
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

// チャート用の寒色系パレット（Recharts の stroke/fill 用 hex）。本体 /analysis の配色感に合わせた寒色寄り。
export const CHART_COLORS = {
  primary: "#2563eb", // APP再生
  teal: "#0d9488", // 選別
  cyan: "#0891b2", // 視聴日数
  indigo: "#4f46e5", // 判定
  violet: "#6d51d6", // レベル分布
  sky: "#0ea5e9", // あとで見る
  slate: "#64748b", // 補助
} as const;
