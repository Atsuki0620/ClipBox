// UIラボ Variant A「現行寄せ」 → /lab/tier1-library/variant-a
// 【役割】現行構成をほぼ維持しつつ、色・余白・バッジ・日付ラベルだけ洗練した比較用モック。
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

// 現行のクール系を踏襲しつつ、primary を青へ・余白と角丸を少しだけ洗練。
const THEME: CSSProperties = {
  "--background": "oklch(0.99 0.002 250)",
  "--foreground": "oklch(0.20 0.02 260)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.20 0.02 260)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.20 0.02 260)",
  "--primary": "oklch(0.45 0.12 258)",
  "--primary-foreground": "oklch(0.99 0.005 250)",
  "--secondary": "oklch(0.96 0.006 250)",
  "--secondary-foreground": "oklch(0.30 0.02 260)",
  "--muted": "oklch(0.965 0.004 250)",
  "--muted-foreground": "oklch(0.48 0.015 260)",
  "--accent": "oklch(0.95 0.01 255)",
  "--accent-foreground": "oklch(0.28 0.02 260)",
  "--border": "oklch(0.91 0.005 250)",
  "--input": "oklch(0.91 0.005 250)",
  "--ring": "oklch(0.62 0.08 258)",
  "--radius": "0.7rem",
  "--sidebar": "oklch(0.985 0.003 250)",
  "--sidebar-foreground": "oklch(0.22 0.02 260)",
  "--sidebar-accent": "oklch(0.95 0.008 255)",
  "--sidebar-border": "oklch(0.91 0.005 250)",
} as CSSProperties;

export default function VariantAPage() {
  return (
    <LabFrame active="a" title="現行寄せ">
      <div style={THEME} className="flex min-h-[36rem] bg-background text-foreground">
        <MockSidebar active="Tier 1" />
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4">
          <h1 className="text-xl font-semibold">Tier 1 ライブラリ</h1>

          <div className="flex flex-wrap gap-3">
            <StatCard label="未判定" value={LAB_KPI.unrated_count} />
            <StatCard label="判定済み" value={LAB_KPI.judged_count.toLocaleString()} />
            <StatCard label="判定率" value={`${LAB_KPI.judged_rate.toFixed(1)}%`} />
            <StatCard label="本日の判定" value={LAB_KPI.today_judged_count} />
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

            <TabsContent value="library" className="flex flex-col gap-3">
              <MockFilterBar />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="flex-1">
      <CardContent className="py-3">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function VideoInfoCard({ video }: { video: LabVideo }) {
  const card = useMockCard(video);
  return (
    <Card className={cn("flex flex-col", !video.is_available && "opacity-60")}>
      <CardContent className="flex flex-col gap-2 py-3">
        <div className="line-clamp-2 break-all text-sm font-medium" title={video.essential_filename}>
          {video.essential_filename}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {card.level !== -1 && (
            <Badge style={{ backgroundColor: levelColor(card.level) }}>{levelName(card.level)}</Badge>
          )}
          <Badge variant="secondary">{storageLabel(video.storage_location)}</Badge>
          <Badge variant="outline">視聴 {video.view_count}</Badge>
          {!video.is_available && <Badge variant="destructive">利用不可</Badge>}
        </div>

        <dl className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <Meta label="サイズ" value={formatFileSize(video.file_size)} />
          <Meta label="最終再生" value={formatDate(video.last_viewed)} />
          <Meta label="更新" value={formatDate(video.last_file_modified)} />
        </dl>

        <div className="flex flex-wrap items-center gap-2 pt-1">
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
    <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}
