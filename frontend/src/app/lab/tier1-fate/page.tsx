// UIラボ Tier1 運命の1本タブ 索引 → /lab/tier1-fate
// 【役割】Tier1「運命の1本」タブの UI 改善案（現状 Variant J のみ）への入口。狙いとモック専用の注意を示す。
//   ラボのハブ（/lab）配下の機能スコープ。tier1-library と同じ2層構成。
// 【設計制約】本体ルートからはリンクしない（URL 直打ち専用）。API/DB に接続しない。モック専用。
// 【依存関係】next/link と lucide のみ。

import Link from "next/link";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";

const VARIANTS = [
  {
    href: "/lab/tier1-fate/variant-j",
    badge: "J",
    title: "運命の1本・コンソール",
    summary:
      "ライブラリ J と同テイストのまま、1本を引く体験に控えめな特別感を付与。「最近見てない優先」トグル・選出理由・前回引いた1本（保持される想定）を整理して表示。",
    points: ["主役カードは控えめな特別感（ring＋上アクセント）", "最近見てない優先トグル＋選出理由", "前回引いた1本が残る表現"],
  },
];

export default function Tier1FateIndexPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-2">
        <Link
          href="/lab"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          UI Lab ハブ
        </Link>
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold">Tier1 運命の1本タブ</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          「1本を引く」体験の改善案を、モックデータだけで見るための実験ページです。
          実 DB / API には一切接続しません。本体画面には影響しません。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VARIANTS.map((variant) => (
          <Link
            key={variant.href}
            href={variant.href}
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                {variant.badge}
              </span>
              <span className="text-lg font-semibold">{variant.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{variant.summary}</p>
            <ul className="flex flex-col gap-1 text-sm">
              {variant.points.map((point) => (
                <li key={point} className="flex items-start gap-1.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
              プレビューを開く
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        これは見た目比較用のサンプルです。表示データはすべてモックで、引く / クリア / 再生 / レベル /
        いいね / あとで見る / AVP の操作は画面内のローカル状態だけが変化します（保存されません）。
      </div>
    </div>
  );
}
