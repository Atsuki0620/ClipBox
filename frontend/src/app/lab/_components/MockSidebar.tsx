// UIラボのモックサイドバー。
// 【役割】各 Variant のナビ見た目を比較するための非機能サイドバー（Tier1/Tier2/ランキング/分析/検索/AVP/設定）。
// 【設計制約】リンク遷移しない（本体ルートへ飛ばさない）。色はトークン（--sidebar 系）を継承し Variant ごとに自動追従。
// 【依存関係】lucide-react のアイコンと cn のみ。API には触れない。

"use client";

import type { ComponentType } from "react";
import {
  BarChart3,
  Film,
  Layers,
  LineChart,
  MonitorPlay,
  Search,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Tier 1", icon: Film },
  { label: "Tier 2", icon: Layers },
  { label: "ランキング", icon: BarChart3 },
  { label: "分析", icon: LineChart },
  { label: "検索", icon: Search },
  { label: "AVP", icon: MonitorPlay, badge: "3" },
  { label: "設定", icon: Settings },
];

export function MockSidebar({
  active = "Tier 1",
  density = "comfortable",
}: {
  active?: string;
  density?: "comfortable" | "compact";
}) {
  const compact = density === "compact";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        compact ? "w-52 gap-0.5 p-2" : "w-60 gap-1 p-3",
      )}
    >
      <div
        className={cn(
          "rounded-xl border border-sidebar-border bg-sidebar-accent/40",
          compact ? "mb-2 px-2.5 py-2" : "mb-3 px-3 py-3",
        )}
      >
        <div className={cn("font-semibold tracking-tight", compact ? "text-base" : "text-lg")}>
          ClipBox
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">ローカル動画判定パネル</div>
      </div>

      <nav className={cn("flex flex-col", compact ? "gap-0.5" : "gap-1")}>
        {NAV_ITEMS.map(({ label, icon: Icon, badge }) => {
          const isActive = label === active;
          return (
            <div
              key={label}
              className={cn(
                "flex items-center gap-2 rounded-xl text-sm transition-colors",
                compact ? "px-2.5 py-1.5" : "px-3 py-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/70",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
