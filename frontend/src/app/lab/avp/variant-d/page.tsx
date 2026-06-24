// UIラボ Variant D「上下分割型（候補=上 / 再生セット=下・リッチカード）」 → /lab/avp/variant-d
// 【役割】案B の上下を入れ替えた案。上＝候補一覧（再生対象にするかを選ぶボタン操作がメイン）、
//   下＝今回再生する最大4本の「再生セット」を、他画面と同じ動画カード（レベル/いいね/あとで見る/再生が
//   できるリッチカード）で見せる。「貯めた候補から4本を選び、その4本を仕上げてから再生」する流れ。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css 非変更）。
//   サムネ不使用。選択状態・カードの編集はページ内ローカルのみ（保存しない）。本体 /avp・store.ts・VideoCard は変更しない。
//   再生対象=最大4本 / 候補=上限なし / 再生対象は候補の部分集合、の不変点を見た目で踏襲する。
// 【依存関係】LabFrame, ModernSidebar, AvpCard, AvpRichCard, PlayTargetSlot(EmptySlot),
//   usePlayTargets, useAvpLibrary, theme, _data/avpMock。
"use client";

import { MonitorPlay, Trash2, Info } from "lucide-react";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { AvpCard } from "../_components/AvpCard";
import { AvpRichCard } from "../_components/AvpRichCard";
import { EmptySlot } from "../_components/PlayTargetSlot";
import { usePlayTargets } from "../_components/usePlayTargets";
import { useAvpLibrary } from "../_components/useAvpLibrary";
import { AVP_THEME } from "../_components/theme";

const AREA_VARIANTS = [
  { key: "a", href: "/lab/avp/variant-a", label: "A 左右分割" },
  { key: "b", href: "/lab/avp/variant-b", label: "B 上下分割" },
  { key: "c", href: "/lab/avp/variant-c", label: "C タブ分離" },
  { key: "d", href: "/lab/avp/variant-d", label: "D 上下(候補上)" },
];

export default function AvpVariantDPage() {
  const t = usePlayTargets();
  const lib = useAvpLibrary();

  return (
    <LabFrame active="d" title="AVP・上下分割（候補=上）" variants={AREA_VARIANTS} indexHref="/lab/avp">
      <div style={AVP_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="AVP" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">AVP再生 ・ 上下分割（候補=上）</h1>
              <p className="text-xs text-muted-foreground">
                上の候補から4本を選び、下の「再生セット」でレベル・いいね・あとで見るを整えてから再生する
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground tabular-nums">
              候補 {t.candidateCount}（上限なし） ／ 再生対象 {t.targetIds.length}/{t.max}
            </div>
          </div>

          {/* 上部: 候補一覧（再生対象にするか選ぶボタン操作がメイン） */}
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">候補一覧</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground tabular-nums">
                  {t.candidateCount}
                </span>
                <span className="text-[11px] text-muted-foreground">上限なし ・「再生対象に追加」で下のセットへ</span>
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {t.candidates.map((v) => {
                const cur = lib.get(v.id);
                return (
                  <AvpCard
                    key={cur.id}
                    video={cur}
                    playTarget={t.isTarget(cur.id)}
                    targetDisabled={!cur.is_available || (t.full && !t.isTarget(cur.id))}
                    onToggleTarget={() => t.toggleTarget(cur.id)}
                    onRemove={() => t.removeCandidate(cur.id)}
                    playing={cur.avp_playing}
                    compact
                  />
                );
              })}
              {t.candidateCount === 0 && (
                <div className="col-span-full rounded-md border border-dashed p-8 text-center text-[12px] text-muted-foreground">
                  候補がありません。動画一覧の「AVP候補」から追加してください。
                </div>
              )}
            </div>
          </section>

          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
            <Info className="size-4 shrink-0" />
            <span>
              AVP は FastAPI が動いている PC 上で起動し、再生すると視聴履歴が記録されます。候補・再生対象は
              localStorage（このブラウザのみ）。あとで見る（DB）とは別物です。
            </span>
          </div>

          {/* 下部: 再生セット（最大4本・リッチカード） */}
          <section className="flex flex-col gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MonitorPlay className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">再生セット（最大{t.max}本）</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary tabular-nums">
                  {t.targetIds.length}/{t.max}
                </span>
                <span className="text-[11px] text-muted-foreground">カード内でレベル・いいね・あとで見るを編集できます</span>
              </div>
              <button
                type="button"
                disabled={t.targetIds.length === 0}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                <MonitorPlay className="size-4" />
                AVPで再生（{t.targetIds.length}本）
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {Array.from({ length: t.max }).map((_, i) => {
                const target = t.targets[i];
                if (!target) return <EmptySlot key={`empty-${i}`} index={i} />;
                const cur = lib.get(target.id);
                return (
                  <AvpRichCard
                    key={cur.id}
                    video={cur}
                    index={i}
                    onSetLevel={(level) => lib.setLevel(cur.id, level)}
                    onToggleLike={() => lib.like(cur.id)}
                    onToggleWatchLater={() => lib.toggleWatchLater(cur.id)}
                    onPlay={() => {}}
                    onRemoveTarget={() => t.toggleTarget(cur.id)}
                  />
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t.full
                ? "4本に達しました。入れ替えるには、どれかを再生対象から外してください。"
                : `あと ${t.max - t.targetIds.length} 本まで、上の候補から選べます。`}
            </p>
          </section>
        </main>
      </div>
    </LabFrame>
  );
}
