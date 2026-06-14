// UIラボ Variant J「ライブラリ・コンソール（最終統合）」 → /lab/tier1-library/variant-j
// 【役割】G を主軸に I（テーブル）を表示モードとして内包し、H の chip 概念をフィルタへ畳んだ最終統合案。
//   KPI（率=右バー/本日=右スパークライン）＋タブ強調1段ツールバー（検索=虫眼鏡/フィルタ=漏斗Popover/2段並び替え/モード切替）＋
//   カード or テーブル（判定済み/利用不可は薄く）。
// 【設計制約】API/DB/localStorage に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css 非変更）。サムネ無し。
//   状態はすべてコンポーネント内ローカル（フィルタ/ソート/表示モード/薄表示）。共有 Modern* は変更しない。
// 【依存関係】Modern 共通（ModernSidebar）, 本variant の JKpiBar/JToolbar/JContent/shared, shadcn Tabs, _data/labMock。

"use client";

import { useState, type CSSProperties } from "react";
import { LAB_VIDEOS } from "../../_data/labMock";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { JKpiBar } from "./JKpiBar";
import { JToolbar } from "./JToolbar";
import { JContent } from "./JContent";
import {
  applyJFilters,
  sortJVideos,
  DEFAULT_FILTERS,
  type JFilters,
  type SortField,
  type SortOrder,
  type ViewMode,
} from "./shared";
import { Tabs, TabsContent } from "@/components/ui/tabs";

// クールニュートラル＋寒色アクセント（G 流用）。角丸やや小＝高密度。
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

export default function VariantJPage() {
  const [tab, setTab] = useState("library");
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<JFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<SortField>("favorite_level");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [dimJudged, setDimJudged] = useState(true);

  const visible = sortJVideos(applyJFilters(LAB_VIDEOS, filters, keyword), sortField, sortOrder);

  return (
    <LabFrame active="j" title="ライブラリ・コンソール（統合）">
      <div style={THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="Tier 1" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Tier 1 ライブラリ</h1>
            <p className="text-xs text-muted-foreground">未判定をさばく・探す</p>
          </div>

          <JKpiBar />

          <Tabs value={tab} onValueChange={(value) => setTab(value as string)} className="gap-3">
            <JToolbar
              keyword={keyword}
              onKeyword={setKeyword}
              filters={filters}
              onFilters={setFilters}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={(field, order) => {
                setSortField(field);
                setSortOrder(order);
              }}
              viewMode={viewMode}
              onViewMode={setViewMode}
              dimJudged={dimJudged}
              onDimJudged={setDimJudged}
            />
            <TabsContent value="library">
              <JContent videos={visible} viewMode={viewMode} dimJudged={dimJudged} />
            </TabsContent>
            <TabsContent value="random">
              <Placeholder>「シャッフル」で未判定動画をランダム表示します。</Placeholder>
            </TabsContent>
            <TabsContent value="fate">
              <Placeholder>ボタンを押すと運命の1本を引きます。</Placeholder>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </LabFrame>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}
