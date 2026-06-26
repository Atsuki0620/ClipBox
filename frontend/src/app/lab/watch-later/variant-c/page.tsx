// UIラボ Variant C「作業台型」 → /lab/watch-later/variant-c
// 【役割】あとで見るを単なる一覧ではなく「後回しにした動画を処理する作業台」として見せる案。
//   上部に状態サマリー（未処理/確認・見直し/処理済み候補の件数）＋推奨アクション、未処理を最も目立たせ、
//   処理済み候補の一括解除を独立バーで強調する。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css 非変更）。
//   サムネ不使用。状態はカード内ローカルのみ。本体挙動は変更しない。
// 【依存関係】LabFrame, ModernSidebar, ConsoleKpi, WatchLaterCard, _data/watchLaterMock, theme。

"use client";

import { BookmarkX, Sparkles } from "lucide-react";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ConsoleKpi } from "../../_components/ConsoleKpi";
import { WatchLaterCard } from "../_components/WatchLaterCard";
import { WATCH_LATER_THEME } from "../_components/theme";
import { WATCH_LATER_VIDEOS, groupBySection, SECTION_META } from "../_data/watchLaterMock";

const AREA_VARIANTS = [
  { key: "a", href: "/lab/watch-later/variant-a", label: "A 現行改善" },
  { key: "b", href: "/lab/watch-later/variant-b", label: "B 付与理由" },
  { key: "c", href: "/lab/watch-later/variant-c", label: "C 作業台" },
];

export default function WatchLaterVariantCPage() {
  const groups = groupBySection(WATCH_LATER_VIDEOS);
  const unprocessed = groups.unprocessed;
  const review = groups.review;
  const processed = groups.processed;

  return (
    <LabFrame active="c" title="あとで見る・作業台" variants={AREA_VARIANTS} indexHref="/lab/watch-later">
      <div style={WATCH_LATER_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="あとで見る" />
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">あとで見る ・ 作業台</h1>
            <p className="text-xs text-muted-foreground">後回しにした {WATCH_LATER_VIDEOS.length} 本をさばく</p>
          </div>

          {/* 状態サマリー */}
          <ConsoleKpi
            cells={[
              { label: "未処理", value: unprocessed.length, accent: true },
              { label: "確認・見直し", value: review.length },
              { label: "処理済み候補", value: processed.length },
            ]}
          />

          {/* 推奨アクション */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[12px]">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <span>
              今日は <span className="font-semibold text-primary">未処理 {unprocessed.length} 本</span>{" "}
              の判定/選別を進め、<span className="font-semibold">処理済み候補 {processed.length} 本</span>{" "}
              を一括解除して整理しましょう。
            </span>
          </div>

          {/* 未処理（最も目立たせる） */}
          <section className="flex flex-col gap-2 rounded-xl border-2 border-primary/40 bg-primary/5 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                最優先
              </span>
              <h2 className="text-sm font-semibold">{SECTION_META.unprocessed.title}</h2>
              <span className="rounded-full bg-card px-2 py-0.5 text-[11px] tabular-nums">
                {unprocessed.length}
              </span>
              <span className="text-[11px] text-muted-foreground">{SECTION_META.unprocessed.hint}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unprocessed.map((video) => (
                <WatchLaterCard key={video.id} video={video} showReason workbench />
              ))}
            </div>
          </section>

          {/* 確認・見直し */}
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[13px] font-semibold">{SECTION_META.review.title}</h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground tabular-nums">
                {review.length}
              </span>
              <span className="text-[11px] text-muted-foreground">{SECTION_META.review.hint}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {review.map((video) => (
                <WatchLaterCard key={video.id} video={video} />
              ))}
            </div>
          </section>

          {/* 処理済み候補（一括解除を独立バーで強調） */}
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[13px] font-semibold">{SECTION_META.processed.title}</h2>
                <span className="rounded-full bg-card px-2 py-0.5 text-[11px] tabular-nums">
                  {processed.length}
                </span>
                <span className="text-[11px] text-muted-foreground">{SECTION_META.processed.hint}</span>
              </div>
              {processed.length > 0 && (
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <BookmarkX className="size-3.5" />
                  {processed.length} 本を一括解除
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {processed.map((video) => (
                <WatchLaterCard key={video.id} video={video} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </LabFrame>
  );
}
