"use client";

// App Router の実ルーティング。実装済み画面は <Link>、未実装はクリック不可プレースホルダ。

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Film,
  Search,
  Layers,
  BarChart3,
  LineChart,
  Settings,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
};

// Streamlit のサイドバー順に合わせる（AVP再生は本フェーズ対象外のため非掲載）。
const ITEMS: Item[] = [
  { href: "/", label: "Tier 1", icon: Film, enabled: true },
  { href: "/tier2", label: "Tier 2 セレクション", icon: Layers, enabled: true },
  { href: "/ranking", label: "ランキング", icon: BarChart3, enabled: true },
  { href: "/analysis", label: "分析", icon: LineChart, enabled: false },
  { href: "/search", label: "検索", icon: Search, enabled: true },
  { href: "/settings", label: "設定", icon: Settings, enabled: false },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r bg-muted/30 p-3">
      <div className="mb-4 px-2 text-lg font-semibold">ClipBox</div>
      <nav className="flex flex-col gap-1">
        {ITEMS.map(({ href, label, icon: Icon, enabled }) => {
          const active = pathname === href;
          const base = "flex items-center gap-2 rounded-md px-3 py-2 text-sm";

          if (!enabled) {
            return (
              <div
                key={href}
                className={`${base} cursor-not-allowed text-muted-foreground opacity-60`}
                title="後続フェーズで実装"
              >
                <Icon className="size-4" />
                {label}
              </div>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={`${base} ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
