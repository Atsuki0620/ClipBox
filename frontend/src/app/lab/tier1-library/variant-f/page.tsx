// UIラボ Variant F「ドック推奨ベースライン」 → /lab/tier1-library/variant-f
// 【役割】参考ドック「ClipBox UI方向性 検討」の推奨ベースライン(案B 標準改善)を忠実に再現した比較用モック。
//   暖色ペーパー＋インディゴ・アクセント、タイトル主役・メタ1行ミュート・日付ラベル・アクション分離・
//   統計はコンパクトなサマリーバー。状態の二重表示なし（レベルはプルダウン、AVP はチェックボックスのみ）。
// 【設計制約】API/DB に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css は変更しない）。
//   サムネイル/画像枠/16:9 は作らない。重複バッジは出さない。
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

// 暖色ペーパー（ストーン/トープ）＋純黒抑制のインクグレー＋インディゴ・アクセント(#4f46e5)。
const THEME: CSSProperties = {
  "--background": "oklch(0.975 0.006 70)",
  "--foreground": "oklch(0.28 0.008 60)",
  "--card": "oklch(0.995 0.003 78)",
  "--card-foreground": "oklch(0.28 0.008 60)",
  "--popover": "oklch(0.995 0.003 78)",
  "--popover-foreground": "oklch(0.28 0.008 60)",
  "--primary": "oklch(0.51 0.205 274)",
  "--primary-foreground": "oklch(0.99 0.006 280)",
  "--secondary": "oklch(0.95 0.008 70)",
  "--secondary-foreground": "oklch(0.34 0.01 62)",
  "--muted": "oklch(0.955 0.006 70)",
  "--muted-foreground": "oklch(0.47 0.012 62)",
  "--accent": "oklch(0.945 0.014 278)",
  "--accent-foreground": "oklch(0.36 0.04 278)",
  "--border": "oklch(0.90 0.006 68)",
  "--input": "oklch(0.90 0.006 68)",
  "--ring": "oklch(0.62 0.16 274)",
  "--radius": "0.65rem",
  "--sidebar": "oklch(0.965 0.008 68)",
  "--sidebar-foreground": "oklch(0.30 0.01 60)",
  "--sidebar-accent": "oklch(0.945 0.016 278)",
  "--sidebar-border": "oklch(0.90 0.008 68)",
} as CSSProperties;

export default function VariantFPage() {
  return (
    <LabFrame active="f" title="ドック推奨ベースライン">
      <div style={THEME} className="flex min-h-[36rem] bg-background text-foreground">
        <MockSidebar active="Tier 1" />
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <h1 className="text-xl font-semibold tracking-tight">Tier 1 ライブラリ</h1>

          <SummaryBar />

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
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

// 統計を1本のコンパクトなサマリーバーに集約（区切り線で4項目）。
function SummaryBar() {
  const items: { label: string; value: string | number; accent?: boolean }[] = [
    { label: "未判定", value: LAB_KPI.unrated_count, accent: true },
    { label: "判定済み", value: LAB_KPI.judged_count.toLocaleString() },
    { label: "判定率", value: `${LAB_KPI.judged_rate.toFixed(1)}%` },
    { label: "本日の判定", value: LAB_KPI.today_judged_count },
  ];
  return (
    <div className="flex flex-wrap items-stretch divide-x divide-border overflow-hidden rounded-lg border bg-card">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-[8rem] flex-1 flex-col gap-0.5 px-4 py-2.5">
          <span className="text-[0.6875rem] text-muted-foreground">{item.label}</span>
          <span
            className={cn("text-lg leading-none font-semibold tabular-nums", item.accent && "text-primary")}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function VideoInfoCard({ video }: { video: LabVideo }) {
  const card = useMockCard(video);
  return (
    <Card
      className={cn(
        "gap-0 py-0 shadow-sm transition-shadow hover:shadow-md",
        !video.is_available && "opacity-60",
      )}
    >
      <CardContent className="flex flex-col gap-2.5 p-4">
        {/* タイトル主役 */}
        <div
          className="line-clamp-2 text-[0.95rem] leading-snug font-semibold break-all"
          title={video.essential_filename}
        >
          {video.essential_filename}
        </div>

        {/* メタ1行（ミュート）: 同系色レベルドット + 視聴 + サイズ + 保存先 */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: levelColor(card.level) }} />
            {levelName(card.level)}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>視聴 {video.view_count}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{formatFileSize(video.file_size)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{storageLabel(video.storage_location)}</span>
          {!video.is_available && (
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[0.6875rem] font-medium text-destructive">
              利用不可
            </span>
          )}
        </div>

        {/* 日付ラベル付き */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
          <span>最終再生 {formatDate(video.last_viewed)}</span>
          <span>更新 {formatDate(video.last_file_modified)}</span>
        </div>

        {/* アクション分離 */}
        <div className="mt-0.5 flex flex-wrap items-center gap-2 border-t pt-3">
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
          <label className="flex items-center gap-1.5 text-xs" title="AVPで再生する候補に追加">
            <Checkbox checked={card.avp} onCheckedChange={card.toggleAvp} disabled={!video.is_available} />
            <span>AVP</span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}
