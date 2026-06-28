// 統合 Variant K サイドバーのナビ定義。
// 【役割】統合シェルの左サイドバーに並べる 8 画面（Tier1/Tier2/あとで見る/AVP/ランキング/検索/設定/analysis）の
//   href・ラベル・アイコンを定義する。Runtime control はナビ項目ではないためここに含めない。
// 【設計制約】
//   - lucide-react の icon を import するため _data ではなく _components に置く（_data は依存なしの純定数を維持）。
//   - 遷移先はすべて /lab/variant-k 配下のモックルート。本体ルートには遷移しない。
// 【依存関係】lucide-react のみ。

import type { ComponentType } from "react";
import {
  Film,
  Layers,
  Bookmark,
  MonitorPlay,
  BarChart3,
  Search,
  Settings,
  LineChart,
} from "lucide-react";

export type VariantKNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  // analysis は採用判断対象外（仮ページ）。バッジで明示する。
  note?: string;
};

export type VariantKNavGroup = { heading: string; items: VariantKNavItem[] };

// 見出しは視覚的グルーピングのみ（既存 ModernSidebar の思想を踏襲）。
export const VARIANT_K_NAV: VariantKNavGroup[] = [
  {
    heading: "判定",
    items: [
      { href: "/lab/variant-k/tier1", label: "Tier1", icon: Film },
      { href: "/lab/variant-k/tier2", label: "Tier2", icon: Layers },
    ],
  },
  {
    heading: "消化・再生",
    items: [
      { href: "/lab/variant-k/watch-later", label: "あとで見る", icon: Bookmark },
      { href: "/lab/variant-k/avp", label: "AVP", icon: MonitorPlay },
    ],
  },
  {
    heading: "探す・俯瞰",
    items: [
      { href: "/lab/variant-k/ranking", label: "ランキング", icon: BarChart3 },
      { href: "/lab/variant-k/search", label: "検索", icon: Search },
      { href: "/lab/variant-k/analysis", label: "analysis", icon: LineChart, note: "仮" },
    ],
  },
  {
    heading: "システム",
    items: [{ href: "/lab/variant-k/settings", label: "設定", icon: Settings }],
  },
];
