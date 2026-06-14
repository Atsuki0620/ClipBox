// UIラボの共通フレーム。
// 【役割】各 Variant プレビューを包む「ラボ用クローム」。上部に Variant 切替リンクと一覧への戻りを置き、
//   本体ではなくモックである事を枠で明示する。
//   既定は Tier1 ライブラリタブの A〜J 切替（後方互換）。他エリア（ランダム/運命の1本）は
//   variants/indexHref を渡して、そのエリアの Variant 群・索引へリンクを差し替える。
// 【設計制約】このフレーム自体は既定テーマ（globals.css の :root）のまま。配下の children が独自テーマを当てる。
// 【依存関係】next/link と cn のみ。API には触れない。

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type LabVariantLink = { key: string; href: string; label: string };

// 既定（Tier1 ライブラリタブ）の Variant 切替。
const TIER1_LIBRARY_VARIANTS: LabVariantLink[] = [
  { key: "a", href: "/lab/tier1-library/variant-a", label: "A 現行寄せ" },
  { key: "b", href: "/lab/tier1-library/variant-b", label: "B 暖色" },
  { key: "c", href: "/lab/tier1-library/variant-c", label: "C 高密度" },
  { key: "d", href: "/lab/tier1-library/variant-d", label: "D ワークベンチ" },
  { key: "e", href: "/lab/tier1-library/variant-e", label: "E エディトリアル" },
  { key: "f", href: "/lab/tier1-library/variant-f", label: "F 推奨ベース" },
  { key: "g", href: "/lab/tier1-library/variant-g", label: "G Console" },
  { key: "i", href: "/lab/tier1-library/variant-i", label: "I テーブル" },
  { key: "h", href: "/lab/tier1-library/variant-h", label: "H ライブラリ" },
  { key: "j", href: "/lab/tier1-library/variant-j", label: "J 統合" },
];

export function LabFrame({
  active,
  title,
  children,
  variants = TIER1_LIBRARY_VARIANTS,
  indexHref = "/lab/tier1-library",
  indexLabel = "一覧",
}: {
  active: string;
  title: string;
  children: ReactNode;
  variants?: LabVariantLink[];
  indexHref?: string;
  indexLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-semibold">UI Lab</span>
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            {variants.map((variant) => (
              <Link
                key={variant.key}
                href={variant.href}
                className={cn(
                  "rounded-md px-2.5 py-1 text-sm transition-colors",
                  variant.key === active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {variant.label}
              </Link>
            ))}
          </div>
          <Link
            href={indexHref}
            className="rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {indexLabel}
          </Link>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border shadow-sm">{children}</div>
    </div>
  );
}
