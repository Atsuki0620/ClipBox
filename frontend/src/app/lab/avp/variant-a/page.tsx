// UIラボ Variant A「左右分割型」 → /lab/avp/variant-a
// 【役割】左に AVP候補一覧、右に「今回再生する最大4本」の枠を置き、候補管理と再生対象管理の違いを
//   一目で分かるようにする案。4枠の埋まり/空きで 0〜4 の状態を示し、満杯時の追加不可も視覚化する。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css 非変更）。
//   サムネ不使用。選択状態はページ内ローカルのみ。本体 /avp・store.ts の挙動は変更しない。
// 【依存関係】LabFrame, ModernSidebar, AvpCard, PlayTargetSlot, usePlayTargets, theme, _data/avpMock。

"use client";

import { MonitorPlay, Trash2, Info } from "lucide-react";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { AvpCard } from "../_components/AvpCard";
import { FilledSlot, EmptySlot } from "../_components/PlayTargetSlot";
import { usePlayTargets } from "../_components/usePlayTargets";
import { AVP_THEME } from "../_components/theme";

const AREA_VARIANTS = [
  { key: "a", href: "/lab/avp/variant-a", label: "A 左右分割" },
  { key: "b", href: "/lab/avp/variant-b", label: "B 上下分割" },
  { key: "c", href: "/lab/avp/variant-c", label: "C タブ分離" },
  { key: "d", href: "/lab/avp/variant-d", label: "D 上下(候補上)" },
];

export default function AvpVariantAPage() {
  const t = usePlayTargets();

  return (
    <LabFrame active="a" title="AVP・左右分割" variants={AREA_VARIANTS} indexHref="/lab/avp">
      <div style={AVP_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="AVP" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">AVP再生 ・ 左右分割</h1>
              <p className="text-xs text-muted-foreground">
                左で候補を管理し、右の4枠に「今回再生する動画」を入れる
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground tabular-nums">
              候補 {t.candidateCount}（上限なし） ／ 再生対象 {t.targetIds.length}/{t.max}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
            <Info className="size-4 shrink-0" />
            <span>
              AVP は FastAPI が動いている PC 上で起動し、再生すると視聴履歴が記録されます。候補・再生対象は
              localStorage（このブラウザのみ）。あとで見る（DB）とは別物です。
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_19rem]">
            {/* 左: 候補一覧 */}
            <section className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">候補一覧</h2>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground tabular-nums">
                    {t.candidateCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground">上限なし</span>
                </div>
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
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

            {/* 右: 再生対象4枠 */}
            <aside className="flex h-fit flex-col gap-2 rounded-xl border bg-card/60 p-3 lg:sticky lg:top-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">今回再生する4枠</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary tabular-nums">
                  {t.targetIds.length}/{t.max}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({ length: t.max }).map((_, i) => {
                  const v = t.targets[i];
                  return v ? (
                    <FilledSlot key={v.id} index={i} video={v} onRemove={() => t.toggleTarget(v.id)} />
                  ) : (
                    <EmptySlot key={`empty-${i}`} index={i} />
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t.full
                  ? "4本に達しました。入れ替えるには、どれかを外してください。"
                  : `あと ${t.max - t.targetIds.length} 本まで選べます。`}
              </p>
              <button
                type="button"
                disabled={t.targetIds.length === 0}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                <MonitorPlay className="size-4" />
                AVPで再生（{t.targetIds.length}本）
              </button>
            </aside>
          </div>
        </main>
      </div>
    </LabFrame>
  );
}
