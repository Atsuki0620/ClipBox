// 統合 Variant K の統合シェル。
// 【役割】全画面を包む寒色モダンのシェル。左サイドバー（遷移）＋メイン領域＋「UI LAB モック」バナーを描く。
//   テーマ（CSS 変数）はこの root div に当てる。Runtime control はサイドバー下部に内包される。
// 【設計制約】
//   - globals.css は変更しない。テーマは root div の CSS 変数上書きのみ（lab 流儀）。
//   - 本体画面ではないこと（モック・サンプルDB接続前）が分かる表示を必ず置く。
//   - TooltipProvider は root の app/providers で全体に入っているため再ラップしない。
// 【依存関係】lib/utils（cn）, theme（VARIANT_K_THEME）, VariantKSidebar, lucide。

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { VARIANT_K_THEME } from "./theme";
import { VariantKMobileNav, VariantKSidebar } from "./VariantKSidebar";

export function VariantKShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {/* ラボ用クローム：本体ではなくモックである事を枠で明示 */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-primary" />
          <span className="text-sm font-semibold">UI Lab</span>
          <span className="text-sm text-muted-foreground">統合 Variant K（全画面整合モック）</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-900">
            サンプルDB接続前・本体ではない
          </span>
          <Link
            href="/lab"
            className="shrink-0 rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            一覧
          </Link>
        </div>
      </header>

      <div
        style={VARIANT_K_THEME}
        className="flex min-h-[40rem] overflow-hidden rounded-xl border bg-background text-[13px] text-foreground shadow-sm"
      >
        <VariantKSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <VariantKMobileNav />
          <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
