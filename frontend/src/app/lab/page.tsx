// UIラボ ハブ索引 → /lab
// 【役割】UI 検討の「探索エリア」への入口。エリアごとに機能スコープ（タブ/メニュー）を束ね、その配下に Variant を置く。
//   現在は Tier1 ライブラリタブのみ。今後は他タブ/メニューを AREAS に追加していく。
// 【設計制約】本体ルートからはリンクしない（URL 直打ち専用）。API/DB に接続しない。モック専用。
// 【依存関係】next/link と lucide のみ。

import Link from "next/link";
import { ArrowRight, FlaskConical, Library, Shuffle, Dices, Settings, Bookmark, MonitorPlay, BarChart3, Search, LineChart } from "lucide-react";

const AREAS = [
  {
    href: "/lab/tier1-library",
    icon: Library,
    title: "Tier1 ライブラリタブ",
    summary: "動画情報カード（サムネなし）と周辺 UI の改善案。Variant A〜J を見比べる。",
    status: "検討中",
  },
  {
    href: "/lab/tier1-random",
    icon: Shuffle,
    title: "Tier1 ランダムタブ",
    summary: "「引く（シャッフル）／入れ替える／判定する」の主導線。ライブラリ J と同テイストの Variant J。",
    status: "検討中",
  },
  {
    href: "/lab/tier1-fate",
    icon: Dices,
    title: "Tier1 運命の1本タブ",
    summary: "1本を引く体験＋「最近見てない優先」トグル・選出理由・前回引いた1本。Variant J。",
    status: "検討中",
  },
  {
    href: "/lab/settings",
    icon: Settings,
    title: "設定画面",
    summary:
      "設定メニューのモダン UI 案。スキャンを主役にした scan-first（単一カラム／カテゴリレール／上部タブ）と、左カテゴリレール＋右フォームの Variant J を見比べる。",
    status: "検討中",
  },
  {
    href: "/lab/watch-later",
    icon: Bookmark,
    title: "あとで見る画面",
    summary:
      "あとで見る（DB永続）の UI 改善案。3セクション維持の現行改善(A)・付与理由表示(B)・作業台型(C)を見比べる。サムネなし情報カード。",
    status: "検討中",
  },
  {
    href: "/lab/avp",
    icon: MonitorPlay,
    title: "AVP画面",
    summary:
      "AVP（並列再生・localStorage永続）の UI 改善案。候補管理と再生対象選択（最大4本）の見せ方を、左右分割(A)・上下分割(B)・タブ分離(C)・上下分割/候補上(D)で見比べる。",
    status: "検討中",
  },
  {
    href: "/lab/ranking",
    icon: BarChart3,
    title: "ランキング画面",
    summary:
      "ランキングの UI 改善案。順位と指標の見せ方を、カードランキング(A)・テーブル(B)・上位カード＋下位テーブル(C)で見比べる。順位/スコアは UI 確認用のモック（本体計算式は不変）。",
    status: "検討中",
  },
  {
    href: "/lab/search",
    icon: Search,
    title: "検索画面",
    summary:
      "検索の UI 改善案。結果の見せ方と絞り込みの幅を、現状改善(A)・Tier1/Tier2カード整合(B)・高機能フィルタ(C)で見比べる。検索結果は別状態として永続化しない。",
    status: "検討中",
  },
  {
    href: "/lab/analysis",
    icon: LineChart,
    title: "分析画面",
    summary:
      "分析の UI 改善案。KPI・グラフ・次アクションの比重を、概況ダッシュボード(A)・期間推移グラフ重視(B)・進捗/偏り/次アクション(C)で見比べる。グラフ・KPI は UI 確認用のダミー（本体集計は不変）。",
    status: "検討中",
  },
];

export default function LabHubPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold">UI Lab</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          UI 改善案をモックデータだけで見比べるための実験スペースです。機能（タブ/メニュー）ごとに探索エリアを分けています。
          実 DB / API には一切接続しません。本体画面には影響しません。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {AREAS.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <area.icon className="size-4" />
              </span>
              <span className="text-lg font-semibold">{area.title}</span>
              <span className="ml-auto rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                {area.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{area.summary}</p>
            <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
              エリアを開く
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        これは見た目比較用のサンプル置き場です。表示データはすべてモックで、各 Variant の操作は画面内のローカル状態だけが
        変化します（保存されません）。
      </div>
    </div>
  );
}
