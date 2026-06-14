// UIラボ 共通: Tier1 のタブ群（ライブラリ / ランダム / 運命の1本）をセグメントで再現。
// 【役割】Variant J の JToolbar 内 TabsList の見た目を、ラボ・エリア間ナビとして素の要素で再現。
//   active は塗りつぶしの強調セグメント、非アクティブは各エリアの variant-j への next/link（ラボ内回遊用）。
// 【設計制約】本体ルートには遷移しない（/lab 配下のみ）。API/DB に触れない。色はトークン継承。
// 【依存関係】next/link, lucide(Library/Shuffle/Dices), lib/utils（cn）。

"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { Library, Shuffle, Dices } from "lucide-react";
import { cn } from "@/lib/utils";

type AreaKey = "library" | "random" | "fate";

const TABS: { key: AreaKey; href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "library", href: "/lab/tier1-library/variant-j", label: "ライブラリ", icon: Library },
  { key: "random", href: "/lab/tier1-random/variant-j", label: "ランダム", icon: Shuffle },
  { key: "fate", href: "/lab/tier1-fate/variant-j", label: "運命の1本", icon: Dices },
];

export function Tier1AreaTabs({ active }: { active: AreaKey }) {
  return (
    <div className="inline-flex h-8 items-center gap-1 rounded-lg bg-muted/50 p-0.5">
      {TABS.map(({ key, href, label, icon: Icon }) => {
        const isActive = key === active;
        const className = cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors",
          isActive
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        );
        if (isActive) {
          return (
            <span key={key} className={className} aria-current="page">
              <Icon className="size-3.5" />
              {label}
            </span>
          );
        }
        return (
          <Link key={key} href={href} className={className}>
            <Icon className="size-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
