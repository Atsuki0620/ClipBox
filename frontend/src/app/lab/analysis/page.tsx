// UIラボ「分析画面」エリア索引 → /lab/analysis
// 【役割】分析画面の UI 改善案（A/B/C の3案）への入口。狙いとモック専用の注意を示す。
//   ラボのハブ（/lab）配下の機能スコープ。tier1-* / avp / ranking / search と同じ2層構成。
// 【設計制約】本体ルートからはリンクしない（URL 直打ち専用）。API/DB/localStorage に接続しない。モック専用。
//   グラフ・KPI はダミー。本体の分析ロジック・集計SQL・APP_PLAYBACK 計算は変更しない。
// 【依存関係】next/link と lucide のみ。

import Link from "next/link";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";

const VARIANTS = [
  {
    href: "/lab/analysis/variant-a",
    badge: "A",
    title: "概況ダッシュボード型",
    summary:
      "開いた瞬間に ClipBox 全体の状態を把握できる KPI 中心の画面。KPIカード6枚＋APP再生推移＋Tier内訳＋洞察カードでまとめる。",
    points: ["KPIカード6枚で全体像", "APP再生推移＋Tier内訳", "次に確認したい候補へつなぐ"],
  },
  {
    href: "/lab/analysis/variant-b",
    badge: "B",
    title: "期間推移・グラフ重視型",
    summary:
      "期間フィルタを中心にした分析ツール寄りの画面。メイン時系列（APP再生/視聴日数/判定/選別）＋サブグラフ＋読み取りコメント＋空状態。",
    points: ["大きめ期間フィルタ", "4指標の時系列を1枚に", "読み取りコメント・空状態例"],
  },
  {
    href: "/lab/analysis/variant-c",
    badge: "C",
    title: "進捗・偏り・次アクション型",
    summary:
      "数字だけでなく「次に何をするか」につながる運用ダッシュボード。進捗バー・偏りカード・次アクション・小ランキング連動。",
    points: ["判定/選別の進捗バー", "偏り（Lv0/再生/HDD）", "次アクション導線＋ランキング連動"],
  },
];

export default function AnalysisLabIndexPage() {
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
          <h1 className="text-2xl font-semibold">分析画面</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          分析画面の UI 改善案を、モックデータだけで見比べるための実験ページです。KPI・グラフ・次アクションの比重を変えた3案を比較します。
          実 DB / API には一切接続しません。本体画面・分析ロジック・集計には影響しません。
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
        これは見た目比較用のサンプルです。表示データ・グラフ・KPI はすべて UI 確認用のダミーで、本体の分析ロジック・集計SQL・
        APP_PLAYBACK 計算式ではありません。保存場所は匿名化分類（内蔵ドライブ相当 / 外付けHDD相当）で表示しています。
      </div>
    </div>
  );
}
