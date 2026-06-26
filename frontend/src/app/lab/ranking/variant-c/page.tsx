// UIラボ「ランキング画面」案C: 上位カード＋下位テーブル → /lab/ranking/variant-c
// 【役割】上位3本を大きめカードで主役化し、4位以降はコンパクトなテーブルで一覧する折衷案。
//   「目立たせたい上位」と「数値で追いたい下位」を1画面で両立する。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ。サムネ不使用。
//   本体 /ranking・VideoCard・store.ts は変更しない。順位/スコアはモック（本体ランキング式ではない）。
// 【依存関係】LabFrame, ModernSidebar, RankingFilterBar, ConsoleCard, RankingTable, RANKING_THEME, _data/rankingMock。

"use client";

import { useState } from "react";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ConsoleCard } from "../../_components/ConsoleCard";
import { RANKING_THEME } from "../_components/theme";
import { RankingFilterBar } from "../_components/RankingFilterBar";
import { RankingTable } from "../_components/RankingTable";
import { rankBy, scoreOf, SCORE_SUFFIX, RANKING_AREA_VARIANTS, type RankingType } from "../_data/rankingMock";

export default function RankingVariantCPage() {
  const [type, setType] = useState<RankingType>("composite");
  const items = rankBy(type);
  const top = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <LabFrame active="c" title="ランキング・上位+下位" variants={RANKING_AREA_VARIANTS} indexHref="/lab/ranking">
      <div style={RANKING_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="ランキング" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">ランキング ・ 上位+下位</h1>
              <p className="text-xs text-muted-foreground">上位3はカードで主役に、4位以降はテーブルで数値比較</p>
            </div>
            <span className="text-[11px] text-muted-foreground">モック・保存されません</span>
          </div>

          <RankingFilterBar type={type} onType={setType} />

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((v) => (
              <div key={v.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between px-0.5">
                  <span className="text-xl font-semibold tabular-nums text-primary">#{v.rank}</span>
                  <span className="text-[12px] font-medium tabular-nums">
                    {scoreOf(v, type)}
                    {SCORE_SUFFIX[type]}
                  </span>
                </div>
                <ConsoleCard
                  video={v}
                  featured
                  corner={
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
                      {v.rank}
                    </span>
                  }
                />
              </div>
            ))}
          </div>

          <div className="mt-1 flex flex-col gap-1.5">
            <h2 className="text-[12px] font-semibold text-muted-foreground">4位以降</h2>
            <RankingTable items={rest} type={type} startRank={4} />
          </div>
        </main>
      </div>
    </LabFrame>
  );
}
