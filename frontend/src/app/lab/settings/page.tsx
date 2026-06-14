// UIラボ 設定画面 索引 → /lab/settings
// 【役割】設定メニュー画面の UI 改善案（現状 Variant J のみ）への入口。狙いとモック専用の注意を示す。
//   ラボのハブ（/lab）配下の機能スコープ。tier1-library と同じ2層構成。
// 【設計制約】本体ルートからはリンクしない（URL 直打ち専用）。API/DB に接続しない。モック専用。
// 【依存関係】next/link と lucide のみ。

import Link from "next/link";
import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";

const VARIANTS = [
  {
    href: "/lab/settings/variant-j",
    badge: "J",
    title: "設定コンソール",
    summary:
      "ライブラリ J と同テイスト（寒色・モダンコンソール・helper text 重視）で設定画面を再設計。現行機能を落とさず、左カテゴリレール＋右フォームに再編。",
    points: [
      "左カテゴリレール（基本/ライブラリ/スキャン/表示/AVP/バックアップ/Runtime/危険操作）",
      "状態サマリーを KPI でコンパクト表示",
      "危険操作と日常操作を分離（Runtime/履歴/danger は UI 検討と明記）",
    ],
  },
];

export default function SettingsIndexPage() {
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
          <h1 className="text-2xl font-semibold">設定画面</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          設定メニューを「迷わない・目的ごとにまとまる・危険と日常が分かれる」モダン UI に再設計する案を、
          モックデータだけで見るための実験ページです。実 DB / API には一切接続しません。本体画面には影響しません。
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
        これは見た目比較用のサンプルです。表示データはすべてモックで、保存 / スキャン / バックアップ / 停止 /
        リセットの操作は画面内のローカル状態だけが変化します（実 DB / API / localStorage には接続しません）。
      </div>
    </div>
  );
}
