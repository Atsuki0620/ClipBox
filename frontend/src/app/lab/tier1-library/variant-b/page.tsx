// UIラボ Variant B「暖色ニュートラル / C案_v2寄せ」 → /lab/tier1-library/variant-b
// 【役割】暖色・低コントラスト・純黒を抑えた配色で、統計をコンパクト化し 5 列カードで長時間でも疲れにくい比較用モック。
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

// 暖色ニュートラル: 背景は温かいオフホワイト、前景は純黒でなく暖色ダークグレー、アクセントはアンバー/クレイ系。
const THEME: CSSProperties = {
  "--background": "oklch(0.985 0.012 75)",
  "--foreground": "oklch(0.33 0.018 60)",
  "--card": "oklch(0.995 0.008 82)",
  "--card-foreground": "oklch(0.33 0.018 60)",
  "--popover": "oklch(0.995 0.008 82)",
  "--popover-foreground": "oklch(0.33 0.018 60)",
  "--primary": "oklch(0.62 0.11 55)",
  "--primary-foreground": "oklch(0.99 0.012 85)",
  "--secondary": "oklch(0.95 0.015 75)",
  "--secondary-foreground": "oklch(0.37 0.02 60)",
  "--muted": "oklch(0.95 0.012 75)",
  "--muted-foreground": "oklch(0.52 0.025 62)",
  "--accent": "oklch(0.93 0.022 70)",
  "--accent-foreground": "oklch(0.35 0.02 60)",
  "--border": "oklch(0.90 0.016 70)",
  "--input": "oklch(0.90 0.016 70)",
  "--ring": "oklch(0.70 0.06 62)",
  "--radius": "0.9rem",
  "--sidebar": "oklch(0.96 0.018 72)",
  "--sidebar-foreground": "oklch(0.35 0.02 60)",
  "--sidebar-accent": "oklch(0.93 0.024 70)",
  "--sidebar-border": "oklch(0.89 0.018 70)",
} as CSSProperties;

export default function VariantBPage() {
  return (
    <LabFrame active="b" title="暖色ニュートラル">
      <div style={THEME} className="flex min-h-[36rem] bg-background text-foreground">
        <MockSidebar active="Tier 1" />
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">Tier 1 ライブラリ</h1>
            <div className="flex flex-wrap gap-2">
              <StatChip label="未判定" value={LAB_KPI.unrated_count} />
              <StatChip label="判定済み" value={LAB_KPI.judged_count.toLocaleString()} />
              <StatChip label="判定率" value={`${LAB_KPI.judged_rate.toFixed(1)}%`} />
              <StatChip label="本日の判定" value={LAB_KPI.today_judged_count} />
            </div>
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

            <TabsContent value="library" className="flex flex-col gap-4">
              <MockFilterBar />
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-2 rounded-full border bg-card px-3.5 py-1.5 shadow-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function VideoInfoCard({ video }: { video: LabVideo }) {
  const card = useMockCard(video);
  return (
    <Card className={cn("flex flex-col shadow-sm", !video.is_available && "opacity-60")}>
      <CardContent className="flex flex-col gap-2.5 py-3.5">
        <div className="line-clamp-2 break-all text-sm font-medium" title={video.essential_filename}>
          {video.essential_filename}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {card.level !== -1 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: levelColor(card.level) }} />
              {levelName(card.level)}
            </span>
          )}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {storageLabel(video.storage_location)}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            視聴 {video.view_count}
          </span>
          {!video.is_available && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
              利用不可
            </span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <Meta label="サイズ" value={formatFileSize(video.file_size)} />
          <Meta label="最終再生" value={formatDate(video.last_viewed)} />
          <Meta label="更新" value={formatDate(video.last_file_modified)} />
        </dl>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Button size="sm" disabled={!video.is_available}>
            <Play className="size-4" />
            再生
          </Button>
          <Select value={String(card.level)} onValueChange={(value) => card.setLevel(Number(value))}>
            <SelectTrigger size="sm" className="w-24">
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
          <Button size="sm" variant="outline" onClick={card.like}>
            <Heart className="size-4" />
            {card.likeCount}
          </Button>
          <Button
            size="sm"
            variant={card.watchLater ? "default" : "outline"}
            onClick={card.toggleWatchLater}
            title="あとで見る"
          >
            <Bookmark className="size-4" />
          </Button>
          <label className="flex items-center gap-1.5 text-xs">
            <Checkbox checked={card.avp} onCheckedChange={card.toggleAvp} disabled={!video.is_available} />
            <span>AVP</span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt>{label}</dt>
      <dd className="tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}
