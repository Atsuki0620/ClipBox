// UIラボ Variant G「Modern Console」 → /lab/tier1-library/variant-g
// 【役割】寒色・高密度・横長カードのモダン本命。上部ヘッダー＋目立つKPI(判定率バー)＋1段ツールバー＋
//   D流カード（数値レベルボタン/再生/その他の3グループ）。判定済みは薄く。出荷狙いの基準案。
// 【設計制約】API/DB に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css 非変更）。サムネ無し。
// 【依存関係】Modern 共通部品（ModernSidebar/ModernToolbar/KpiBar/ModernCard）, shadcn Tabs, _data/labMock。

"use client";

import { useState, type CSSProperties } from "react";
import { LAB_VIDEOS } from "../../_data/labMock";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ModernToolbar } from "../../_components/ModernToolbar";
import { KpiBar } from "../../_components/KpiBar";
import { ModernCard } from "../../_components/ModernCard";
import { Tabs, TabsContent } from "@/components/ui/tabs";

// クールニュートラル＋寒色アクセント（色合いは後調整可）。角丸やや小＝高密度。
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

export default function VariantGPage() {
  const [tab, setTab] = useState("library");
  return (
    <LabFrame active="g" title="Modern Console">
      <div style={THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="Tier 1" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Tier 1 ライブラリ</h1>
            <p className="text-xs text-muted-foreground">未判定をさばく</p>
          </div>

          <KpiBar variant="prominent" />

          <Tabs value={tab} onValueChange={(value) => setTab(value as string)} className="gap-3">
            <ModernToolbar />
            <TabsContent value="library">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {LAB_VIDEOS.map((video) => (
                  <ModernCard key={video.id} video={video} />
                ))}
              </div>
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
