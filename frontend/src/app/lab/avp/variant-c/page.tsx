// UIラボ Variant C「タブ分離型」 → /lab/avp/variant-c
// 【役割】候補管理と再生対象をタブで分け、画面をすっきり見せる案。上部に概要＋状態サマリー（KPI）、
//   タブ1=候補管理（追加/解除/全候補クリア）、タブ2=再生対象（4枠＋AVP起動を強調）。候補多数でも破綻しにくい。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css 非変更）。
//   サムネ不使用。選択状態・タブはページ内ローカルのみ。本体 /avp・store.ts の挙動は変更しない。
// 【依存関係】LabFrame, ModernSidebar, ConsoleKpi, AvpCard, PlayTargetSlot, usePlayTargets, theme, _data/avpMock。

"use client";

import { useState } from "react";
import { MonitorPlay, Trash2, Info, Layers, ListVideo } from "lucide-react";
import { cn } from "@/lib/utils";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ConsoleKpi } from "../../_components/ConsoleKpi";
import { AvpCard } from "../_components/AvpCard";
import { FilledSlot, EmptySlot } from "../_components/PlayTargetSlot";
import { usePlayTargets } from "../_components/usePlayTargets";
import { AVP_THEME } from "../_components/theme";
import { PLAYING_COUNT } from "../_data/avpMock";

const AREA_VARIANTS = [
  { key: "a", href: "/lab/avp/variant-a", label: "A 左右分割" },
  { key: "b", href: "/lab/avp/variant-b", label: "B 上下分割" },
  { key: "c", href: "/lab/avp/variant-c", label: "C タブ分離" },
  { key: "d", href: "/lab/avp/variant-d", label: "D 上下(候補上)" },
];

type TabKey = "candidates" | "targets";

export default function AvpVariantCPage() {
  const t = usePlayTargets();
  const [tab, setTab] = useState<TabKey>("candidates");

  return (
    <LabFrame active="c" title="AVP・タブ分離" variants={AREA_VARIANTS} indexHref="/lab/avp">
      <div style={AVP_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="AVP" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">AVP再生 ・ タブ分離</h1>
            <p className="text-xs text-muted-foreground">
              候補管理と再生対象をタブで分け、情報量を抑える
            </p>
          </div>

          {/* 状態サマリー */}
          <ConsoleKpi
            cells={[
              { label: "候補（上限なし）", value: t.candidateCount },
              { label: "再生対象", value: `${t.targetIds.length}/${t.max}`, accent: true },
              { label: "再生中", value: PLAYING_COUNT },
            ]}
          />

          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
            <Info className="size-4 shrink-0" />
            <span>
              AVP は FastAPI が動いている PC 上で起動し、再生すると視聴履歴が記録されます。候補・再生対象は
              localStorage（このブラウザのみ）。あとで見る（DB）とは別物です。
            </span>
          </div>

          {/* タブ */}
          <div className="flex w-fit items-center gap-1 rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setTab("candidates")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                tab === "candidates"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <Layers className="size-3.5" />
              候補管理 {t.candidateCount}
            </button>
            <button
              type="button"
              onClick={() => setTab("targets")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                tab === "targets"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <ListVideo className="size-3.5" />
              再生対象 {t.targetIds.length}/{t.max}
            </button>
          </div>

          {/* 候補管理タブ */}
          {tab === "candidates" && (
            <section className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  候補から「再生対象に追加」で、再生対象タブの4枠に入ります。
                </span>
                <button
                  type="button"
                  onClick={t.clearCandidates}
                  disabled={t.candidateCount === 0}
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" />
                  全候補クリア
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {t.candidates.map((v) => (
                  <AvpCard
                    key={v.id}
                    video={v}
                    playTarget={t.isTarget(v.id)}
                    targetDisabled={!v.is_available || (t.full && !t.isTarget(v.id))}
                    onToggleTarget={() => t.toggleTarget(v.id)}
                    onRemove={() => t.removeCandidate(v.id)}
                    playing={v.avp_playing}
                  />
                ))}
                {t.candidateCount === 0 && (
                  <div className="col-span-full rounded-md border border-dashed p-8 text-center text-[12px] text-muted-foreground">
                    候補がありません。動画一覧の「AVP候補」から追加してください。
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 再生対象タブ */}
          {tab === "targets" && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <MonitorPlay className="size-4 text-primary" />
                  <span className="text-[12px] font-semibold">今回再生する最大{t.max}本</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary tabular-nums">
                    {t.targetIds.length}/{t.max}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={t.clearTargets}
                    disabled={t.targetIds.length === 0}
                    className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
                  >
                    再生対象をクリア
                  </button>
                  <button
                    type="button"
                    disabled={t.targetIds.length === 0}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                  >
                    <MonitorPlay className="size-4" />
                    AVPで再生（{t.targetIds.length}本）
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: t.max }).map((_, i) => {
                  const v = t.targets[i];
                  return v ? (
                    <FilledSlot key={v.id} index={i} video={v} onRemove={() => t.toggleTarget(v.id)} />
                  ) : (
                    <EmptySlot key={`empty-${i}`} index={i} />
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t.full
                  ? "4本に達しました。入れ替えるには、どれかを外してから候補管理タブで選び直してください。"
                  : `あと ${t.max - t.targetIds.length} 本選べます。候補管理タブで「再生対象に追加」してください。`}
              </p>
            </section>
          )}
        </main>
      </div>
    </LabFrame>
  );
}
