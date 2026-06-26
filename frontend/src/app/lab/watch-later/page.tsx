// UIラボ「あとで見る」エリア索引 → /lab/watch-later
// 【役割】あとで見る画面の UI 改善案（A/B/C の3案）への入口。狙いとモック専用の注意を示す。
//   ラボのハブ（/lab）配下の機能スコープ。tier1-* / settings と同じ2層構成。
// 【設計制約】本体ルートからはリンクしない（URL 直打ち専用）。API/DB/localStorage に接続しない。モック専用。
// 【依存関係】next/link と lucide のみ。

import Link from "next/link";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";

const VARIANTS = [
  {
    href: "/lab/watch-later/variant-a",
    badge: "A",
    title: "3セクション維持・現行改善",
    summary:
      "現行の3セクション（未処理 / 確認・見直し / 処理済み候補）を最も素直に保ったまま、余白・見出し・件数バッジを整えてモダンに。移行時に迷いにくい安心の案。",
    points: ["セクション見出しに色アクセント", "処理済み候補に一括解除", "本体カードと同じ情報量"],
  },
  {
    href: "/lab/watch-later/variant-b",
    badge: "B",
    title: "付与理由・状態説明強化",
    summary:
      "各カードに「なぜ残っているか（Tier1/Tier2 由来・未判定/判定済み・未選別/選別済み）」を表示。AVP再生でも自動解除しない方針を画面上で自然に説明する。",
    points: ["付与理由バッジ", "AVP再生済みでも継続の補助文", "方針の説明バナー"],
  },
  {
    href: "/lab/watch-later/variant-c",
    badge: "C",
    title: "作業台型",
    summary:
      "後回しにした動画を処理する「作業台」。上部に状態サマリー＋推奨アクション、未処理を最優先で目立たせ、処理済み候補の一括解除を独立バーで強調。",
    points: ["状態サマリー（件数）", "未処理を最優先ブロック化", "一括解除を目立つバーに"],
  },
];

export default function WatchLaterLabIndexPage() {
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
          <h1 className="text-2xl font-semibold">あとで見る画面</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          「あとで見る」画面の UI 改善案を、モックデータだけで見比べるための実験ページです。3セクション構成は維持します。
          実 DB / API / localStorage には一切接続しません。本体画面には影響しません。
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
        これは見た目比較用のサンプルです。表示データはすべてモックで、再生 / レベル / いいね / あとで見る解除 / AVP
        の操作は画面内のローカル状態だけが変化します（保存されません）。あとで見る=DB、AVP候補=localStorage の境界は変更しません。
      </div>
    </div>
  );
}
