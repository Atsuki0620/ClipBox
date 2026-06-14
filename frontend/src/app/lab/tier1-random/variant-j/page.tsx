// UIラボ Variant J「ランダム・コンソール」 → /lab/tier1-random/variant-j
// 【役割】Tier1「ランダム」タブを Variant J テイストで再設計。ライブラリ J と同じカード表現・数値レベルボタン・
//   寒色・高密度を保ちつつ、「引く（シャッフル）／候補を入れ替える／見て判定する」主導線を前面に出す。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css 非変更）。サムネ無し。
//   状態はすべてコンポーネント内ローカル（条件/本数/トークン/候補ID）。乱数不使用＝トークン回転（ハイドレーション安全）。
// 【依存関係】Modern 共通（ModernSidebar/ConsoleKpi/ConsoleCard）, 本variant の RandomControls/shared, _data/labMock。

"use client";

import { useState, type CSSProperties } from "react";
import { RefreshCw } from "lucide-react";
import { LAB_VIDEOS, LAB_KPI } from "../../_data/labMock";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ConsoleKpi } from "../../_components/ConsoleKpi";
import { ConsoleCard } from "../../_components/ConsoleCard";
import { RandomControls } from "./RandomControls";
import {
  DEFAULT_CONDITIONS,
  pickCandidates,
  nextPoolId,
  type RandomConditions,
} from "./shared";

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

const AREA_VARIANTS = [{ key: "j", href: "/lab/tier1-random/variant-j", label: "J ランダム" }];

const INITIAL_COUNT = 10;

export default function RandomVariantJPage() {
  const [conditions, setConditions] = useState<RandomConditions>(DEFAULT_CONDITIONS);
  const [count, setCount] = useState(INITIAL_COUNT);
  const [token, setToken] = useState(0);
  const [candidateIds, setCandidateIds] = useState<number[]>(() =>
    pickCandidates(LAB_VIDEOS, DEFAULT_CONDITIONS, INITIAL_COUNT, 0),
  );

  const reselect = (c: RandomConditions, n: number, t: number) =>
    setCandidateIds(pickCandidates(LAB_VIDEOS, c, n, t));

  const handleShuffle = () => {
    const t = token + 1;
    setToken(t);
    reselect(conditions, count, t);
  };
  const handleConditions = (c: RandomConditions) => {
    setConditions(c);
    reselect(c, count, token);
  };
  const handleCount = (n: number) => {
    setCount(n);
    reselect(conditions, n, token);
  };
  const handleSwap = (index: number) => {
    const nid = nextPoolId(LAB_VIDEOS, conditions, candidateIds);
    if (nid === null) return;
    setCandidateIds((ids) => ids.map((id, i) => (i === index ? nid : id)));
  };

  const candidates = candidateIds
    .map((id) => LAB_VIDEOS.find((v) => v.id === id))
    .filter((v): v is (typeof LAB_VIDEOS)[number] => Boolean(v));
  const playablePool = LAB_VIDEOS.filter((v) => v.is_available).length;

  return (
    <LabFrame
      active="j"
      title="ランダム・コンソール"
      variants={AREA_VARIANTS}
      indexHref="/lab/tier1-random"
    >
      <div style={THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="Tier 1" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Tier 1 ランダム</h1>
            <p className="text-xs text-muted-foreground">ランダムに引く・見る・判定する</p>
          </div>

          <ConsoleKpi
            cells={[
              { label: "未判定", value: LAB_KPI.unrated_count, accent: true },
              { label: "候補プール（再生可）", value: playablePool },
              { label: "本日の判定", value: LAB_KPI.today_judged_count },
            ]}
          />

          <RandomControls
            count={count}
            onCount={handleCount}
            onShuffle={handleShuffle}
            conditions={conditions}
            onConditions={handleConditions}
          />

          {/* 今回の候補 */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold">
              今回の候補
              <span className="ml-1.5 text-muted-foreground tabular-nums">{candidates.length}本</span>
            </h2>
            <span className="text-[11px] text-muted-foreground">
              気になる1枠は <RefreshCw className="inline size-3 align-[-1px]" /> で入れ替え／全体は「シャッフル」で引き直し
            </span>
          </div>

          {candidates.length === 0 ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              条件に合う候補がありません。条件をゆるめてシャッフルしてください。
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {candidates.map((video, index) => (
                <ConsoleCard
                  key={video.id}
                  video={video}
                  corner={
                    <button
                      type="button"
                      onClick={() => handleSwap(index)}
                      title="この候補を入れ替える"
                      aria-label="この候補を入れ替える"
                      className="inline-flex size-6 items-center justify-center rounded-md border bg-card/80 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <RefreshCw className="size-3" />
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </LabFrame>
  );
}
