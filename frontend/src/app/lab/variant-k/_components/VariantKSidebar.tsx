// 統合 Variant K の左サイドバー（遷移する）。
// 【役割】統合シェルのナビ。8画面を next/link で遷移可能にし、usePathname で現在画面を強調する。
//   ブランドマーク＋サブタイトルなし（variant-k 仕様）。下部に Runtime control モックを差す。
// 【設計制約】
//   - 既存の共有 ModernSidebar（視覚専用・非遷移）は変更せず、variant-k 専用にフォークした実装。
//   - 遷移先はすべて /lab/variant-k 配下のモックルート。本体ルートには遷移しない。
//   - Runtime control はナビ項目に含めない（下部の独立領域）。
// 【依存関係】next/link, next/navigation（usePathname）, lib/utils（cn）, navItems, VariantKRuntimeControl, lucide。

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { VARIANT_K_NAV } from "./navItems";
import { VariantKRuntimeControl } from "./VariantKRuntimeControl";

export function VariantKSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2 px-2 pt-1">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <FlaskConical className="size-3.5" />
        </span>
        <span className="text-base font-semibold tracking-tight">ClipBox</span>
      </div>

      {VARIANT_K_NAV.map((group) => (
        <nav key={group.heading} className="flex flex-col gap-0.5">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {group.heading}
          </div>
          {group.items.map(({ href, label, icon: Icon, note }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                  isActive
                    ? "bg-foreground font-medium text-background"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {note ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[9px]",
                      isActive ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {note}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      ))}

      <VariantKRuntimeControl />
    </aside>
  );
}
