// UIラボ Variant H「Library / Bookmark」 → /lab/tier1-library/variant-h
// 【役割】寒色・高密度だが「探す」体験を主役化。ヒーロー検索＋フィルタchip＋（4指標は compact KPI で担保）＋
//   1段ツールバー＋D流の高密度カード（数値レベル/再生/その他）。再発見の手掛かり（最終再生/更新）を活かす。
// 【設計制約】API/DB に接続しない。テーマはルート div の CSS 変数上書きのみ。サムネ無し。
// 【依存関係】Modern 共通部品（ModernSidebar/ModernToolbar/KpiBar/ModernCard）, shadcn(Tabs/Input/Button), lucide, _data/labMock。

"use client";

import { useState, type CSSProperties } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { LAB_VIDEOS } from "../../_data/labMock";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ModernToolbar } from "../../_components/ModernToolbar";
import { KpiBar } from "../../_components/KpiBar";
import { ModernCard } from "../../_components/ModernCard";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

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

const LEVEL_CHIPS = ["すべて", "未判定", "Lv4", "Lv3", "Lv2", "Lv1", "Lv0"];
const STORE_CHIPS = ["C", "HDD"];

export default function VariantHPage() {
  const [tab, setTab] = useState("library");
  const [activeChip, setActiveChip] = useState("すべて");
  return (
    <LabFrame active="h" title="Library / Bookmark">
      <div style={THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="Tier 1" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Tier 1 ライブラリ</h1>
            <p className="text-xs text-muted-foreground">探す・見つける</p>
          </div>

          {/* ヒーロー検索（主役） */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="キーワード検索（タイトル）…" className="h-10 pl-9 text-sm" />
          </div>

          {/* フィルタ chip（レベル/保存先） */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[...LEVEL_CHIPS, ...STORE_CHIPS].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setActiveChip(chip)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  activeChip === chip
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {chip}
              </button>
            ))}
          </div>

          <KpiBar variant="compact" />

          <Tabs value={tab} onValueChange={(value) => setTab(value as string)} className="gap-3">
            <ModernToolbar heroSearch />
            <TabsContent value="library">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
