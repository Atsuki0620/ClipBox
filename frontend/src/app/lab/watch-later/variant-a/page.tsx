// UIラボ Variant A「3セクション維持・現行改善型」 → /lab/watch-later/variant-a
// 【役割】本体 /watch-later の3セクション構造（未処理 / 確認・見直し / 処理済み候補）を最も素直に踏襲し、
//   余白・セクション見出し・件数バッジを整えてモダンに見せる。現行からの変化を最小にする案。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css 非変更）。
//   サムネ不使用。状態はカード内ローカルのみ。本体挙動は変更しない。
// 【依存関係】LabFrame, ModernSidebar, WatchLaterCard, _data/watchLaterMock, theme。

"use client";

import { BookmarkX } from "lucide-react";
import { cn } from "@/lib/utils";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { WatchLaterCard } from "../_components/WatchLaterCard";
import { WATCH_LATER_THEME } from "../_components/theme";
import {
  WATCH_LATER_VIDEOS,
  groupBySection,
  SECTION_META,
  type WatchLaterSectionKey,
} from "../_data/watchLaterMock";

const AREA_VARIANTS = [
  { key: "a", href: "/lab/watch-later/variant-a", label: "A 現行改善" },
  { key: "b", href: "/lab/watch-later/variant-b", label: "B 付与理由" },
  { key: "c", href: "/lab/watch-later/variant-c", label: "C 作業台" },
];

const SECTION_ORDER: WatchLaterSectionKey[] = ["unprocessed", "review", "processed"];

const ACCENT: Record<WatchLaterSectionKey, string> = {
  unprocessed: "before:bg-primary",
  review: "before:bg-amber-400",
  processed: "before:bg-emerald-500",
};

export default function WatchLaterVariantAPage() {
  const groups = groupBySection(WATCH_LATER_VIDEOS);

  return (
    <LabFrame active="a" title="あとで見る・現行改善" variants={AREA_VARIANTS} indexHref="/lab/watch-later">
      <div style={WATCH_LATER_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="あとで見る" />
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">あとで見る</h1>
            <p className="text-xs text-muted-foreground">
              合計 {WATCH_LATER_VIDEOS.length} 本 ・ 判定/選別を先延ばしした動画（DB 永続・全端末共通）
            </p>
          </div>

          {SECTION_ORDER.map((key) => {
            const list = groups[key];
            const meta = SECTION_META[key];
            return (
              <section key={key} className="flex flex-col gap-2">
                <div
                  className={cn(
                    "relative flex flex-wrap items-center gap-2 pl-3",
                    "before:absolute before:top-0.5 before:bottom-0.5 before:left-0 before:w-1 before:rounded-full",
                    ACCENT[key],
                  )}
                >
                  <h2 className="text-[13px] font-semibold">{meta.title}</h2>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground tabular-nums">
                    {list.length}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{meta.hint}</span>
                  {key === "processed" && list.length > 0 && (
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <BookmarkX className="size-3.5" />
                      一括解除
                    </button>
                  )}
                </div>

                {list.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    このセクションに該当する動画はありません。
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {list.map((video) => (
                      <WatchLaterCard key={video.id} video={video} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </main>
      </div>
    </LabFrame>
  );
}
