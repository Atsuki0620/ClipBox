// UIラボ Variant J「運命の1本・コンソール」 → /lab/tier1-fate/variant-j
// 【役割】Tier1「運命の1本」タブを Variant J テイストで再設計。1本を引く体験に、ライブラリより少しだけ
//   特別感（控えめ）を与えつつ、寒色・高密度・数値レベルボタン・サムネなし情報カードと整合させる。
//   「最近見てない優先」トグルの見え方と、引いた1本が画面を切り替えても消えない想定をモック UI 上で表現。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css 非変更）。サムネ無し。
//   状態はすべてコンポーネント内ローカル（優先トグル/選出ID/履歴）。乱数不使用＝順送り（ハイドレーション安全）。
// 【依存関係】Modern 共通（ModernSidebar/ConsoleKpi/ConsoleCard）, 本variant の FateControls/shared, _data/labMock。

"use client";

import { useState, type CSSProperties } from "react";
import { Sparkles, History } from "lucide-react";
import { LAB_VIDEOS, LAB_KPI, formatDate } from "../../_data/labMock";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ConsoleKpi } from "../../_components/ConsoleKpi";
import { ConsoleCard } from "../../_components/ConsoleCard";
import { FateControls } from "./FateControls";
import { orderedFatePool, fateReason, recentlyUnwatchedCandidates } from "./shared";

// クールニュートラル＋寒色アクセント（ライブラリ J と同一 THEME）。
const THEME: CSSProperties = {
  "--background": "oklch(0.985 0.003 250)",
  "--foreground": "oklch(0.21 0.015 258)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.21 0.015 258)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.21 0.015 258)",
  "--primary": "oklch(0.55 0.16 256)",
  "--primary-foreground": "oklch(0.99 0.005 250)",
  "--secondary": "oklch(0.96 0.005 250)",
  "--secondary-foreground": "oklch(0.30 0.015 258)",
  "--muted": "oklch(0.965 0.004 250)",
  "--muted-foreground": "oklch(0.47 0.015 258)",
  "--accent": "oklch(0.94 0.012 256)",
  "--accent-foreground": "oklch(0.28 0.015 258)",
  "--border": "oklch(0.91 0.005 250)",
  "--input": "oklch(0.91 0.005 250)",
  "--ring": "oklch(0.62 0.12 256)",
  "--radius": "0.5rem",
  "--sidebar": "oklch(0.98 0.003 250)",
  "--sidebar-foreground": "oklch(0.24 0.015 258)",
  "--sidebar-accent": "oklch(0.94 0.012 256)",
  "--sidebar-border": "oklch(0.91 0.005 250)",
} as CSSProperties;

const AREA_VARIANTS = [{ key: "j", href: "/lab/tier1-fate/variant-j", label: "J 運命の1本" }];

// 「最近見てない」= 未視聴 or 最終視聴が古い（モックの簡易しきい値）。
const RECENT_THRESHOLD = "2026-05-01";
const recentlyUnwatchedCount = LAB_VIDEOS.filter(
  (v) => v.is_available && (!v.last_viewed || v.last_viewed < RECENT_THRESHOLD),
).length;

// 初期は「最近見てない優先」ON で1本引かれた状態（前回引いた1本も残っている＝保持される想定の表現）。
const INITIAL_POOL = orderedFatePool(LAB_VIDEOS, true);
const INITIAL_PICKED_ID = INITIAL_POOL[0]?.id ?? null;
const INITIAL_HISTORY = [7, 14]; // 前回・前々回に引いた想定（合成データ）

export default function FateVariantJPage() {
  const [recentlyUnwatchedFirst, setRecentlyUnwatchedFirst] = useState(true);
  const [pickedId, setPickedId] = useState<number | null>(INITIAL_PICKED_ID);
  const [history, setHistory] = useState<number[]>(INITIAL_HISTORY);

  const handleDraw = () => {
    const pool = orderedFatePool(LAB_VIDEOS, recentlyUnwatchedFirst);
    if (pool.length === 0) return;
    let nextIdx = 0;
    if (pickedId !== null) {
      const cur = pool.findIndex((v) => v.id === pickedId);
      nextIdx = (cur + 1) % pool.length;
    }
    const nextId = pool[nextIdx].id;
    if (pickedId !== null) setHistory((h) => [pickedId, ...h.filter((x) => x !== pickedId)].slice(0, 3));
    setPickedId(nextId);
  };

  const handleClear = () => {
    setPickedId(null);
    setHistory([]);
  };

  const picked = pickedId !== null ? LAB_VIDEOS.find((v) => v.id === pickedId) ?? null : null;
  const historyVideos = history
    .map((id) => LAB_VIDEOS.find((v) => v.id === id))
    .filter((v): v is (typeof LAB_VIDEOS)[number] => Boolean(v));
  const recentList = recentlyUnwatchedCandidates(LAB_VIDEOS, pickedId, 3);
  const reason = fateReason(recentlyUnwatchedFirst);

  return (
    <LabFrame
      active="j"
      title="運命の1本・コンソール"
      variants={AREA_VARIANTS}
      indexHref="/lab/tier1-fate"
    >
      <div style={THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="Tier 1" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Tier 1 運命の1本</h1>
            <p className="text-xs text-muted-foreground">今日の1本を引いて、見て、判定する</p>
          </div>

          <ConsoleKpi
            cells={[
              { label: "未判定", value: LAB_KPI.unrated_count, accent: true },
              { label: "最近見てない候補", value: recentlyUnwatchedCount },
              { label: "本日の判定", value: LAB_KPI.today_judged_count },
            ]}
          />

          <FateControls
            recentlyUnwatchedFirst={recentlyUnwatchedFirst}
            onRecentlyUnwatchedFirst={setRecentlyUnwatchedFirst}
            onDraw={handleDraw}
            onClear={handleClear}
            canClear={picked !== null || history.length > 0}
          />

          {/* 主役（引いた1本）＋ 補助情報 */}
          <section className="grid gap-3 lg:grid-cols-[minmax(0,22rem)_1fr]">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">
                <Sparkles className="size-3.5" />
                今日の運命
              </div>
              {picked ? (
                <ConsoleCard
                  video={picked}
                  featured
                  footer={
                    <div className="flex items-center gap-1.5 border-t pt-2 text-[11px] text-muted-foreground">
                      <Sparkles className="size-3 text-primary" />
                      選出理由:
                      <span className="font-medium text-foreground">{reason}</span>
                    </div>
                  }
                />
              ) : (
                <div className="flex min-h-[10rem] flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <Sparkles className="size-5 text-muted-foreground/60" />
                  まだ引いていません。「運命の1本を引く」で1本選びます。
                </div>
              )}
            </div>

            {/* 補助情報（選出理由の説明＋最近見ていない候補） */}
            <aside className="flex flex-col gap-2 rounded-lg border bg-card/60 p-3">
              <div className="text-[12px] font-semibold">選出について</div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {recentlyUnwatchedFirst
                  ? "「最近見てない優先」が ON。長く見ていない（または未視聴の）動画から優先して1本を選びます。"
                  : "「最近見てない優先」が OFF。視聴歴に関係なく候補からランダムに1本を選びます。"}
              </p>
              <div className="mt-1 text-[11px] font-medium text-muted-foreground">最近見ていない候補</div>
              <ul className="flex flex-col divide-y">
                {recentList.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-2 py-1.5 text-[11px] opacity-80"
                  >
                    <span className="truncate font-medium" title={v.essential_filename}>
                      {v.essential_filename}
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      最終 {formatDate(v.last_viewed)}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          </section>

          {/* 前回引いた1本（画面を切り替えても保持される想定の表現） */}
          {historyVideos.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <History className="size-3.5 text-muted-foreground" />
                  前回引いた1本
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  別タブに切り替えても保持されます（モック表現）
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {historyVideos.map((video) => (
                  <div key={video.id} className="opacity-70">
                    <ConsoleCard video={video} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </LabFrame>
  );
}
