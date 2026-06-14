// UIラボ Modern 共通: グルーピング・サイドバー。
// 【役割】G/I/H 用のモダンなナビ。7項目（Tier1/Tier2/ランキング/分析/検索/AVP/設定）をセクション見出しでグルーピング（視覚のみ・項目と順序は不変）。
// 【設計制約】リンク遷移しない。色はトークン（--sidebar 系）継承。アクティブは塗りピル（near-black）。API には触れない。
// 【依存関係】lucide-react, lib/utils（cn）。

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

type NavItem = { label: string; icon: ComponentType<{ className?: string }>; badge?: string };
type NavGroup = { heading: string; items: NavItem[] };

// 7項目・順序は維持。見出しは視覚的グルーピングのみ。
const GROUPS: NavGroup[] = [
  { heading: "判定", items: [{ label: "Tier 1", icon: Film }, { label: "Tier 2", icon: Layers }] },
  {
    heading: "分析",
    items: [
      { label: "ランキング", icon: BarChart3 },
      { label: "分析", icon: LineChart },
      { label: "検索", icon: Search },
    ],
  },
  { heading: "システム", items: [{ label: "AVP", icon: MonitorPlay, badge: "3" }, { label: "設定", icon: Settings }] },
];

export function ModernSidebar({
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
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex",
        compact ? "w-52 gap-3 p-2.5" : "w-56 gap-4 p-3",
      )}
    >
      <div className="px-2 pt-1">
        <div className="text-base font-semibold tracking-tight">ClipBox</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">ローカル動画判定パネル</div>
      </div>

      {GROUPS.map((group) => (
        <nav key={group.heading} className="flex flex-col gap-0.5">
          <div className="px-2 pb-1 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {group.heading}
          </div>
          {group.items.map(({ label, icon: Icon, badge }) => {
            const isActive = label === active;
            return (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
                  compact ? "py-1.5" : "py-2",
                  isActive
                    ? "bg-foreground font-medium text-background"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {badge ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] tabular-nums",
                      isActive ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </div>
            );
          })}
        </nav>
      ))}
    </aside>
  );
}
