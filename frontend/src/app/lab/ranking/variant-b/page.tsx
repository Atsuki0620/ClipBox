// UIラボ「ランキング画面」案B: テーブル → /lab/ranking/variant-b
// 【役割】指標を列で並べ、数値を直接比較しやすくするテーブル案。総合/視聴/視聴日数/いいねを横並びで読む。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ。サムネ不使用。
//   本体 /ranking・VideoCard・store.ts は変更しない。順位/スコアはモック（本体ランキング式ではない）。
// 【依存関係】LabFrame, ModernSidebar, RankingFilterBar, RankingTable, RANKING_THEME, _data/rankingMock。

"use client";

import { useState } from "react";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { RANKING_THEME } from "../_components/theme";
import { RankingFilterBar } from "../_components/RankingFilterBar";
import { RankingTable } from "../_components/RankingTable";
import { rankBy, RANKING_AREA_VARIANTS, RANKING_LABELS, type RankingType } from "../_data/rankingMock";

export default function RankingVariantBPage() {
  const [type, setType] = useState<RankingType>("composite");
  const items = rankBy(type);

  return (
    <LabFrame active="b" title="ランキング・テーブル" variants={RANKING_AREA_VARIANTS} indexHref="/lab/ranking">
      <div style={RANKING_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="ランキング" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">ランキング ・ テーブル</h1>
              <p className="text-xs text-muted-foreground">
                指標を列で比較する。選択中の種別「{RANKING_LABELS[type]}」列を強調表示
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground">モック・保存されません</span>
          </div>

          <RankingFilterBar type={type} onType={setType} />

          <RankingTable items={items} type={type} />
        </main>
      </div>
    </LabFrame>
  );
}
