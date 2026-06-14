// UIラボ Tier1 ライブラリタブ 索引 → /lab/tier1-library
// 【役割】Tier1 ライブラリタブの UI 改善案（Variant A〜I）への入口。各案の狙いと、モック専用である旨の注意を示す。
//   ラボのハブ（/lab）配下の機能スコープ。将来は他タブ/メニューが /lab 配下に並ぶ。
// 【設計制約】本体ルートからはリンクしない（URL 直打ち専用）。API/DB に接続しない。
// 【依存関係】next/link と lucide のみ。

import Link from "next/link";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";

const VARIANTS = [
  {
    href: "/lab/tier1-library/variant-a",
    badge: "A",
    title: "現行寄せ",
    summary: "現行構成をほぼ維持し、色・余白・バッジ・日付ラベルだけを洗練。",
    points: ["移行コスト最小", "現行ユーザーが迷わない", "改善幅は控えめ"],
  },
  {
    href: "/lab/tier1-library/variant-b",
    badge: "B",
    title: "暖色ニュートラル",
    summary: "暖色・低コントラスト・純黒を抑制。統計をコンパクト化し 5 列カードで長時間でも疲れにくく。",
    points: ["長時間の判定作業向き", "やわらかい印象", "情報密度は中程度"],
  },
  {
    href: "/lab/tier1-library/variant-c",
    badge: "C",
    title: "高密度",
    summary: "横 5〜6 列を強く維持し一覧性重視。メタ情報を整理して詰め、大量確認・ランキング向けの密度。",
    points: ["一覧性が最大", "スクロール量を削減", "1枚あたりの余白は最小"],
  },
  {
    href: "/lab/tier1-library/variant-d",
    badge: "D",
    title: "判定ワークベンチ",
    summary: "判定作業に全振り。レベルをカード上の大セグメントで1クリック判定し、判定状態でカードを色分け（未判定を前面化）。",
    points: ["未判定が一目で分かる", "1クリックで判定", "本体と明確に別物"],
  },
  {
    href: "/lab/tier1-library/variant-e",
    badge: "E",
    title: "ボールド・エディトリアル",
    summary: "暖色を発展させ、雑誌風の強いタイポ階層とテラコッタ1アクセント。カード上端のレベル色帯が主役。",
    points: ["見た目で本体と別物", "上質だが実用的", "密度はやや控えめ"],
  },
  {
    href: "/lab/tier1-library/variant-f",
    badge: "F",
    title: "推奨ベースライン",
    summary: "参考ドックの推奨案（標準改善）を再現。暖色ペーパー＋インディゴ、タイトル主役・メタ1行・アクション分離・統計サマリーバー。",
    points: ["実際に出荷しそうな堅実版", "学習コスト低め", "派手さより安定"],
  },
  {
    href: "/lab/tier1-library/variant-g",
    badge: "G",
    title: "Modern Console",
    summary: "寒色・高密度・横長カードのモダン本命。目立つKPI(判定率バー)＋タブ/フィルタ1段＋数値レベルボタン。判定済みは薄く。",
    points: ["モダン×高密度の本命", "数値ボタンで1クリック判定", "5列・縦に詰めた短いカード"],
  },
  {
    href: "/lab/tier1-library/variant-i",
    badge: "I",
    title: "Data Table Console",
    summary: "一覧を高機能テーブル化。行選択・行内レベル・行メニュー・ページネーション。最大密度でランキング/大量確認向け。",
    points: ["1画面の情報量が最大", "テーブルで一括処理", "数値が揃って走査が速い"],
  },
  {
    href: "/lab/tier1-library/variant-h",
    badge: "H",
    title: "Library / Bookmark",
    summary: "検索を主役化した「探す」体験。ヒーロー検索＋フィルタchip＋高密度カード。再発見の手掛かりを前面に。",
    points: ["探す・再発見に強い", "検索ファースト", "G と同じ高密度カード"],
  },
  {
    href: "/lab/tier1-library/variant-j",
    badge: "J",
    title: "ライブラリ・コンソール（統合）",
    summary: "G/I/H レビュー反映の最終統合。KPI(率=右バー/本日=折れ線)＋タブ強調1段＋検索=虫眼鏡/フィルタ=漏斗Popover/2段並び替え＋カード⇄テーブル切替。",
    points: ["G主軸＋Iを表示モード内包", "フィルタはPopoverに集約", "判定済み/利用不可をしっかり薄く"],
  },
];

export default function LabIndexPage() {
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
          <h1 className="text-2xl font-semibold">Tier1 ライブラリタブ</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          動画情報カード（サムネなし）と周辺 UI の改善案を、モックデータだけで見比べるための実験ページです。
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
        これは見た目比較用のサンプルです。表示データはすべてモックで、再生 / レベル / いいね /
        あとで見る / AVP の操作は画面内のローカル状態だけが変化します（保存されません）。
      </div>
    </div>
  );
}
