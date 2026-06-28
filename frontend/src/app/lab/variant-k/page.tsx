// 統合 Variant K ランディング → /lab/variant-k
// 【役割】統合 Variant K の入口。各画面への導線カードと、本案の位置づけ（全画面整合モック・サンプルDB接続前・
//   本体ではない・段階実装中）を示す。自動リダイレクトはしない（スクショ対象になるよう中身を持たせる）。
// 【設計制約】API/DB に触れない。モック専用。サムネなし。
// 【依存関係】next/link, navItems, VariantKSectionHeader。

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VARIANT_K_NAV } from "./_components/navItems";
import { VariantKSectionHeader } from "./_components/VariantKSectionHeader";

const SUMMARY: Record<string, string> = {
  "/lab/variant-k/tier1": "未判定をさばく一次判定。段階3で作り込み。",
  "/lab/variant-k/tier2": "選別フォルダの二次判定。段階4で案1/案2トグル。",
  "/lab/variant-k/watch-later": "あとで見るの消化（3セクション）。段階5。",
  "/lab/variant-k/avp": "候補テーブル＋2×2再生セット。段階5。",
  "/lab/variant-k/ranking": "操作付きスコアテーブル。段階6。",
  "/lab/variant-k/search": "高機能フィルタ＋操作付きテーブル。段階6。",
  "/lab/variant-k/analysis": "採用判断対象外。仮ページのみ。",
  "/lab/variant-k/settings": "scan-first 設定。段階6。",
};

export default function VariantKLandingPage() {
  const items = VARIANT_K_NAV.flatMap((group) => group.items);

  return (
    <div className="flex flex-col gap-5">
      <VariantKSectionHeader
        title="統合 Variant K"
        description="画面別に決めた案を、ナビ・カード・余白・バッジ・テーブル/カードの使い分け・用語で揃えた全画面整合モック。"
      />

      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] text-amber-950">
        これはサンプルDB接続前の UI LAB モックです。表示データはすべて合成で、本体画面・実 DB / API には影響しません。
        各画面は段階的に作り込みます（段階2は統合シェル・共通部品の土台のみ）。
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(({ href, label, icon: Icon, note }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Icon className="size-4" />
              </span>
              <span className="text-[14px] font-semibold">{label}</span>
              {note ? (
                <span className="rounded-full bg-muted px-1.5 text-[9px] text-muted-foreground">{note}</span>
              ) : null}
              <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-[12px] text-muted-foreground">{SUMMARY[href] ?? ""}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
