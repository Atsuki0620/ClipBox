// UIラボ Variant C「高密度寄せ」 → /lab/tier1-library/variant-c
// 【役割】横5列を強く維持し一覧性を重視。メタ情報を整理して詰め、ランキング/大量確認向けの密度を出す比較用モック。
// 【設計制約】API/DB に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css は変更しない）。
//   サムネイル/画像枠は作らない（情報カード方式）。
// 【依存関係】shadcn UI プリミティブ・lib/levels・ラボ内 _components/_data。

"use client";

import type { CSSProperties } from "react";
import { Play, Heart, Bookmark, Library, Shuffle, Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { levelColor, levelName, storageLabel, LEVEL_OPTIONS } from "@/lib/levels";
import { LAB_VIDEOS, LAB_KPI, formatFileSize, formatDate, type LabVideo } from "../../_data/labMock";
import { useMockCard } from "../../_components/useMockCard";
import { MockSidebar } from "../../_components/MockSidebar";
import { MockFilterBar } from "../../_components/MockFilterBar";
import { LabFrame } from "../../_components/LabFrame";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

// 高密度: クールニュートラルで装飾より機能。角丸を小さく、密度はクラスで詰める。
const THEME: CSSProperties = {
  "--background": "oklch(0.985 0.002 250)",
  "--foreground": "oklch(0.22 0.01 258)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.22 0.01 258)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.22 0.01 258)",
  "--primary": "oklch(0.45 0.10 252)",
  "--primary-foreground": "oklch(0.99 0.005 250)",
  "--secondary": "oklch(0.95 0.004 250)",
  "--secondary-foreground": "oklch(0.30 0.01 258)",
  "--muted": "oklch(0.965 0.003 250)",
  "--muted-foreground": "oklch(0.48 0.012 258)",
  "--accent": "oklch(0.95 0.006 252)",
  "--accent-foreground": "oklch(0.28 0.01 258)",
  "--border": "oklch(0.90 0.004 250)",
  "--input": "oklch(0.90 0.004 250)",
  "--ring": "oklch(0.60 0.07 252)",
  "--radius": "0.4rem",
  "--sidebar": "oklch(0.98 0.002 250)",
  "--sidebar-foreground": "oklch(0.25 0.01 258)",
  "--sidebar-accent": "oklch(0.95 0.006 252)",
  "--sidebar-border": "oklch(0.90 0.004 250)",
} as CSSProperties;

export default function VariantCPage() {
  return (
    <LabFrame active="c" title="高密度">
      <div style={THEME} className="flex min-h-[36rem] bg-background text-foreground">
        <MockSidebar active="Tier 1" density="compact" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">Tier 1 ライブラリ</h1>
            <StatStrip />
          </div>

          <Tabs defaultValue="library">
            <TabsList>
              <TabsTrigger value="library">
                <Library className="size-4" />
                ライブラリ
              </TabsTrigger>
              <TabsTrigger value="random">
                <Shuffle className="size-4" />
                ランダム
              </TabsTrigger>
              <TabsTrigger value="fate">
                <Dices className="size-4" />
                運命の1本
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="flex flex-col gap-2.5">
              <MockFilterBar density="compact" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
                {LAB_VIDEOS.map((video) => (
                  <VideoInfoCard key={video.id} video={video} />
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

function StatStrip() {
  const items: { label: string; value: string | number }[] = [
    { label: "未判定", value: LAB_KPI.unrated_count },
    { label: "判定済み", value: LAB_KPI.judged_count.toLocaleString() },
    { label: "判定率", value: `${LAB_KPI.judged_rate.toFixed(1)}%` },
    { label: "本日の判定", value: LAB_KPI.today_judged_count },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-card px-3 py-1.5 text-sm">
      {items.map((item, index) => (
        <span key={item.label} className="flex items-baseline gap-1.5">
          {index > 0 && <span className="mr-2.5 text-muted-foreground/40">·</span>}
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-semibold tabular-nums">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function VideoInfoCard({ video }: { video: LabVideo }) {
  const card = useMockCard(video);
  return (
    <Card className={cn("gap-0 py-0", !video.is_available && "opacity-60")}>
      <CardContent className="flex flex-col gap-1 p-2">
        <div className="flex items-start gap-1.5">
          <span
            className="mt-0.5 size-3 shrink-0 rounded-[3px]"
            style={{ backgroundColor: levelColor(card.level) }}
            title={levelName(card.level)}
          />
          <span
            className="line-clamp-1 break-all text-xs font-medium"
            title={video.essential_filename}
          >
            {video.essential_filename}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground tabular-nums">
          <span>{storageLabel(video.storage_location)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{formatFileSize(video.file_size)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>視聴 {video.view_count}</span>
          {!video.is_available && <span className="text-destructive">利用不可</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground tabular-nums">
          <span>再生 {formatDate(video.last_viewed)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>更新 {formatDate(video.last_file_modified)}</span>
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          <Button size="icon-sm" disabled={!video.is_available} title="再生">
            <Play className="size-3.5" />
          </Button>
          <Select value={String(card.level)} onValueChange={(value) => card.setLevel(Number(value))}>
            <SelectTrigger size="sm" className="h-7 w-[4.5rem] px-2 text-xs">
              <span>{levelName(card.level)}</span>
            </SelectTrigger>
            <SelectContent>
              {LEVEL_OPTIONS.map((level) => (
                <SelectItem key={level} value={String(level)}>
                  {levelName(level)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="px-1.5" onClick={card.like} title="いいね">
            <Heart className="size-3.5" />
            <span className="tabular-nums">{card.likeCount}</span>
          </Button>
          <Button
            size="icon-sm"
            variant={card.watchLater ? "default" : "outline"}
            onClick={card.toggleWatchLater}
            title="あとで見る"
          >
            <Bookmark className="size-3.5" />
          </Button>
          <label className="ml-0.5 flex items-center" title="AVP候補に追加">
            <Checkbox checked={card.avp} onCheckedChange={card.toggleAvp} disabled={!video.is_available} />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">{children}</div>
  );
}
