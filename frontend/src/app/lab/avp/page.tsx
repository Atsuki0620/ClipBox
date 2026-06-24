// UIラボ「AVP画面」エリア索引 → /lab/avp
// 【役割】AVP画面の UI 改善案（A/B/C/D の4案）への入口。狙いとモック専用の注意を示す。
//   ラボのハブ（/lab）配下の機能スコープ。tier1-* / settings / watch-later と同じ2層構成。
// 【設計制約】本体ルートからはリンクしない（URL 直打ち専用）。API/DB/localStorage に接続しない。モック専用。
// 【依存関係】next/link と lucide のみ。

import Link from "next/link";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";

const VARIANTS = [
  {
    href: "/lab/avp/variant-a",
    badge: "A",
    title: "左右分割型",
    summary:
      "左に AVP候補一覧、右に「今回再生する最大4本」の枠。候補管理と再生対象管理の違いを一目で分け、4枠の埋まり/空きで 0〜4 と満杯を示す。",
    points: ["左=候補 / 右=再生対象4枠", "空き枠を点線で可視化", "満杯時は追加を無効化"],
  },
  {
    href: "/lab/avp/variant-b",
    badge: "B",
    title: "上下分割型",
    summary:
      "上部に「今回再生するセット」をコックピット風に大きく表示し、下部に候補一覧。再生セットを主役にし、横幅に依存しない上→下の流れ。",
    points: ["上=再生対象4枠 / 下=候補", "再生セットを主役に", "候補側にも再生対象済みを表示"],
  },
  {
    href: "/lab/avp/variant-c",
    badge: "C",
    title: "タブ分離型",
    summary:
      "候補管理と再生対象をタブで分け、上部に状態サマリー（候補 / 再生対象 / 再生中）。情報密度を抑え、候補が多くても破綻しにくい。",
    points: ["タブ: 候補管理 / 再生対象", "状態サマリー（KPI）", "全候補クリアと再生対象クリアを分離"],
  },
  {
    href: "/lab/avp/variant-d",
    badge: "D",
    title: "上下分割型（候補=上 / 再生セット=下・リッチカード）",
    summary:
      "案Bの上下を入れ替え、上=候補一覧（再生対象にするか選ぶボタン操作がメイン）、下=今回再生する最大4本を他画面と同じ動画カードで表示。下のカード内でレベル判定・いいね・あとで見る・再生ができる。",
    points: ["上=候補（選択ボタン中心）", "下=再生セット（リッチカード）", "カード内で判定/いいね/あとで見る"],
  },
];

export default function AvpLabIndexPage() {
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
          <h1 className="text-2xl font-semibold">AVP画面</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          AVP（並列再生）画面の UI 改善案を、モックデータだけで見比べるための実験ページです。候補管理と再生対象選択（最大4本）の
          見せ方を4案で比較します。実 DB / API / localStorage には一切接続しません。本体画面には影響しません。
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
        これは見た目比較用のサンプルです。表示データはすべてモックで、再生対象の追加/解除・全候補クリア・AVP起動の操作は
        画面内のローカル状態だけが変化します（保存されません）。AVP候補/再生対象=localStorage、あとで見る=DB
        の境界は変更しません。
      </div>
    </div>
  );
}
