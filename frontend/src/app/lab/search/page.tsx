// UIラボ「検索画面」エリア索引 → /lab/search
// 【役割】検索画面の UI 改善案（A/B/C の3案）への入口。狙いとモック専用の注意を示す。
//   ラボのハブ（/lab）配下の機能スコープ。tier1-* / avp / ranking と同じ2層構成。
// 【設計制約】本体ルートからはリンクしない（URL 直打ち専用）。API/DB/localStorage に接続しない。モック専用。
//   検索結果を別状態として永続化しない（本体の検索仕様を変えない）。
// 【依存関係】next/link と lucide のみ。

import Link from "next/link";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";

const VARIANTS = [
  {
    href: "/lab/search/variant-a",
    badge: "A",
    title: "現状改善",
    summary:
      "現行の「キーワード＋保存場所＋カードグリッド」を踏襲しつつ、件数表示・空状態・ページャ footer を整える堅実案。",
    points: ["シンプルなキーワード検索", "件数と空状態を明確化", "ページャ footer を追加"],
  },
  {
    href: "/lab/search/variant-b",
    badge: "B",
    title: "Tier1・Tier2 カード整合",
    summary:
      "結果カードに Tier/状態キャプションを付け、Tier 横断でも「どの Tier の何の状態か」を分かりやすく。Tier 別の区切りで整理する。",
    points: ["カードに Tier/状態バッジ", "Tier1 / Tier2 で区切り表示", "本体カードの見え方に整合"],
  },
  {
    href: "/lab/search/variant-c",
    badge: "C",
    title: "高機能フィルタ",
    summary:
      "キーワードに加えてレベル / 保存場所 / 利用可否 / 並び替えを増設する案。結果は永続化しない（仕様変更可能性=中）。",
    points: ["多条件フィルタを増設", "並び替え・利用可否トグル", "結果は別状態として保存しない"],
  },
];

export default function SearchLabIndexPage() {
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
          <h1 className="text-2xl font-semibold">検索画面</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          検索画面の UI 改善案を、モックデータだけで見比べるための実験ページです。結果の見せ方と絞り込みの幅を3案で比較します。
          実 DB / API には一切接続しません。本体画面・検索仕様には影響しません。
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
        これは見た目比較用のサンプルです。表示データはすべてモックで、保存場所は匿名化分類（内蔵ドライブ相当 / 外付けHDD相当）です。
        操作は画面内のローカル状態だけが変化し、検索結果を別状態として保存しません。
      </div>
    </div>
  );
}
