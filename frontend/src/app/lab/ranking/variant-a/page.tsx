// UIラボ「ランキング画面」案A: カードランキング → /lab/ranking/variant-a
// 【役割】順位バッジ付きの情報カード（順位セル＋ConsoleCard）を縦に並べる現行寄せの案。順位が情報そのもの。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ。サムネ不使用。
//   本体 /ranking・VideoCard・store.ts は変更しない。順位/スコアはモック（本体ランキング式ではない）。
// 【依存関係】LabFrame, ModernSidebar, RankingFilterBar, RankingRow, RANKING_THEME, _data/rankingMock。

"use client";

import { useState } from "react";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { RANKING_THEME } from "../_components/theme";
import { RankingFilterBar } from "../_components/RankingFilterBar";
import { RankingRow } from "../_components/RankingRow";
import { rankBy, RANKING_AREA_VARIANTS, type RankingType } from "../_data/rankingMock";

export default function RankingVariantAPage() {
  const [type, setType] = useState<RankingType>("composite");
  const items = rankBy(type);

  return (
    <LabFrame active="a" title="ランキング・カード" variants={RANKING_AREA_VARIANTS} indexHref="/lab/ranking">
      <div style={RANKING_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="ランキング" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">ランキング ・ カード</h1>
              <p className="text-xs text-muted-foreground">順位バッジ付きの情報カードで上位を見る（現行寄せ）</p>
            </div>
            <span className="text-[11px] text-muted-foreground">モック・保存されません</span>
          </div>

          <RankingFilterBar type={type} onType={setType} />

          <div className="flex flex-col gap-2">
            {items.map((v) => (
              <RankingRow key={v.id} video={v} type={type} featured={v.rank <= 3} />
            ))}
          </div>
        </main>
      </div>
    </LabFrame>
  );
}
