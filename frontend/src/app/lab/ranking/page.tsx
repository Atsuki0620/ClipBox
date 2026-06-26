// UIラボ「ランキング画面」エリア索引 → /lab/ranking
// 【役割】ランキング画面の UI 改善案（A/B/C の3案）への入口。狙いとモック専用の注意を示す。
//   ラボのハブ（/lab）配下の機能スコープ。tier1-* / avp / search と同じ2層構成。
// 【設計制約】本体ルートからはリンクしない（URL 直打ち専用）。API/DB/localStorage に接続しない。モック専用。
//   本体ランキングのスコア式・APP_PLAYBACK 基準・タイブレークは変更しない（見た目のみの比較）。
// 【依存関係】next/link と lucide のみ。

import Link from "next/link";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";

const VARIANTS = [
  {
    href: "/lab/ranking/variant-a",
    badge: "A",
    title: "カードランキング",
    summary:
      "順位セル（#順位・スコア・レベル）＋情報カードを縦に並べる現行寄せの案。順位が情報そのものなので #番号を主役にする。",
    points: ["左=順位セル / 右=情報カード", "上位3はカードを強調", "カード操作（再生/レベル/いいね/あとで/AVP）は流用"],
  },
  {
    href: "/lab/ranking/variant-b",
    badge: "B",
    title: "テーブル",
    summary:
      "総合 / 視聴 / 視聴日数 / いいね を列で並べ、数値を直接比較しやすくする案。選択中の種別の列を強調する。",
    points: ["指標を列で横並び比較", "選択種別の列をハイライト", "情報密度が高く件数を一望"],
  },
  {
    href: "/lab/ranking/variant-c",
    badge: "C",
    title: "上位カード＋下位テーブル",
    summary:
      "上位3本を大きめカードで主役化し、4位以降はコンパクトなテーブルで一覧する折衷案。目立たせと数値比較を両立。",
    points: ["上位3=カード / 4位以降=テーブル", "上位の視認性が高い", "下位は数値で追える"],
  },
];

export default function RankingLabIndexPage() {
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
          <h1 className="text-2xl font-semibold">ランキング画面</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          ランキング画面の UI 改善案を、モックデータだけで見比べるための実験ページです。順位と指標の見せ方を3案で比較します。
          実 DB / API には一切接続しません。本体画面・ランキング計算には影響しません。
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
        これは見た目比較用のサンプルです。表示データはすべてモックで、順位・スコアは UI 確認用のダミーです（本体の
        APP_PLAYBACK ベース総合ランキング計算式ではありません）。本体のランキング仕様・スコア式・タイブレークは変更しません。
      </div>
    </div>
  );
}
