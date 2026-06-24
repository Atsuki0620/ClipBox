// UIラボ Variant B「付与理由・状態説明強化型」 → /lab/watch-later/variant-b
// 【役割】3セクションは維持しつつ、各カードに「付与理由」（Tier1/Tier2 由来・未判定/判定済み・未選別/選別済み）と
//   「AVP再生済みでもあとで見るは継続」の補助説明を加え、なぜ残っているかを分かりやすくする案。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css 非変更）。
//   サムネ不使用。状態はカード内ローカルのみ。本体挙動は変更しない（AVP非解除は将来方針の可視化のみ）。
// 【依存関係】LabFrame, ModernSidebar, WatchLaterCard, _data/watchLaterMock, theme。

"use client";

import { BookmarkX, Info } from "lucide-react";
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
  unprocessed: "border-l-primary",
  review: "border-l-amber-400",
  processed: "border-l-emerald-500",
};

export default function WatchLaterVariantBPage() {
  const groups = groupBySection(WATCH_LATER_VIDEOS);

  return (
    <LabFrame active="b" title="あとで見る・付与理由" variants={AREA_VARIANTS} indexHref="/lab/watch-later">
      <div style={WATCH_LATER_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="あとで見る" />
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">あとで見る</h1>
            <p className="text-xs text-muted-foreground">
              合計 {WATCH_LATER_VIDEOS.length} 本 ・ 各カードに「なぜ残っているか（付与理由）」を表示
            </p>
          </div>

          {/* 方針の説明バナー（AVP再生で自動解除しない／あとで見る=DB と AVP候補=localStorage は別物） */}
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[11px]">
            <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">あとで見る</span> は DB 永続（全端末共通）。
              <span className="font-medium text-foreground">AVP候補</span> はこのブラウザのみ（localStorage）で、別物です。
              AVP で再生しても、あとで見るからは自動解除されません（判定/選別の完了で解除）。
            </p>
          </div>

          {SECTION_ORDER.map((key) => {
            const list = groups[key];
            const meta = SECTION_META[key];
            return (
              <section
                key={key}
                className={cn("flex flex-col gap-2 rounded-lg border-l-4 bg-card/40 py-2 pr-2 pl-3", ACCENT[key])}
              >
                <div className="flex flex-wrap items-center gap-2">
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((video) => (
                      <WatchLaterCard key={video.id} video={video} showReason />
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
