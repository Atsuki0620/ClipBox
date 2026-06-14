// UIラボ Variant E「ボールド・エディトリアル」 → /lab/tier1-library/variant-e
// 【役割】B(暖色)を発展させ、雑誌のような強いタイポ階層とテラコッタ1アクセントで本体と別物に見せる比較用モック。
// 【設計制約】API/DB に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css は変更しない）。
//   サムネイル/画像枠/16:9 は作らない。カード上端の「カラーバンド」は無地の色帯（画像ではない）。
//   フォントは追加読込せず、システムのセリフ/明朝スタックで見出しに編集的な表情を与える（globals.css 非変更）。
// 【依存関係】shadcn UI プリミティブ・lib/levels・ラボ内 _components/_data。

"use client";

import type { CSSProperties } from "react";
import { Play, Heart, Bookmark, Library, Shuffle, Dices } from "lucide-react";
import { cn } from "@/lib/utils";
import { levelName, storageLabel, LEVEL_OPTIONS } from "@/lib/levels";
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

// 暖色エディトリアル: クリーム背景・暖色ダークグレー前景（純黒禁止）・テラコッタ1アクセント・角丸大。
const THEME: CSSProperties = {
  "--background": "oklch(0.985 0.014 70)",
  "--foreground": "oklch(0.30 0.022 45)",
  "--card": "oklch(0.997 0.006 80)",
  "--card-foreground": "oklch(0.30 0.022 45)",
  "--popover": "oklch(0.997 0.006 80)",
  "--popover-foreground": "oklch(0.30 0.022 45)",
  "--primary": "oklch(0.62 0.165 34)",
  "--primary-foreground": "oklch(0.99 0.012 80)",
  "--secondary": "oklch(0.95 0.02 60)",
  "--secondary-foreground": "oklch(0.36 0.025 45)",
  "--muted": "oklch(0.95 0.016 62)",
  "--muted-foreground": "oklch(0.52 0.03 48)",
  "--accent": "oklch(0.92 0.035 48)",
  "--accent-foreground": "oklch(0.34 0.025 42)",
  "--border": "oklch(0.89 0.022 58)",
  "--input": "oklch(0.89 0.022 58)",
  "--ring": "oklch(0.68 0.13 36)",
  "--radius": "1rem",
  "--sidebar": "oklch(0.965 0.02 64)",
  "--sidebar-foreground": "oklch(0.34 0.025 44)",
  "--sidebar-accent": "oklch(0.92 0.04 50)",
  "--sidebar-border": "oklch(0.88 0.024 58)",
} as CSSProperties;

// 見出し用のセリフ/明朝スタック（追加読込なし）。日本語は Yu Mincho 等にフォールバックして編集的な表情を出す。
const DISPLAY = '"Yu Mincho", YuMincho, "Hiragino Mincho ProN", Georgia, "Times New Roman", serif';

// レベルを暖色1色のスケールで帯にする（青系の levelColor だと暖色テーマに衝突するため）。
// 高レベルほど深いテラコッタ。未判定は淡い中立で「未着手」を示す。
const LEVEL_BAND: Record<number, string> = {
  4: "oklch(0.55 0.17 32)",
  3: "oklch(0.63 0.155 38)",
  2: "oklch(0.72 0.12 45)",
  1: "oklch(0.82 0.085 55)",
  0: "oklch(0.88 0.045 62)",
  [-1]: "oklch(0.91 0.018 64)",
};
function bandColor(level: number): string {
  return LEVEL_BAND[level] ?? LEVEL_BAND[-1];
}

export default function VariantEPage() {
  return (
    <LabFrame active="e" title="ボールド・エディトリアル">
      <div style={THEME} className="flex min-h-[36rem] bg-background text-foreground">
        <MockSidebar active="Tier 1" />
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-6">
          <header className="flex flex-wrap items-end justify-between gap-5 border-b border-foreground/15 pb-5">
            <div className="flex flex-col gap-1">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-primary">
                Library
              </span>
              <h1 className="text-3xl leading-none font-semibold tracking-tight" style={{ fontFamily: DISPLAY }}>
                Tier 1 ライブラリ
              </h1>
            </div>
            <div className="flex flex-wrap items-end gap-x-7 gap-y-3">
              <EditStat label="未判定" value={LAB_KPI.unrated_count} accent />
              <EditStat label="判定済み" value={LAB_KPI.judged_count.toLocaleString()} />
              <EditStat label="判定率" value={`${LAB_KPI.judged_rate.toFixed(1)}%`} />
              <EditStat label="本日の判定" value={LAB_KPI.today_judged_count} />
            </div>
          </header>

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

            <TabsContent value="library" className="flex flex-col gap-5">
              <MockFilterBar />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

function EditStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn("text-2xl leading-none tabular-nums", accent && "text-primary")}
        style={{ fontFamily: DISPLAY }}
      >
        {value}
      </span>
    </div>
  );
}

function VideoInfoCard({ video }: { video: LabVideo }) {
  const card = useMockCard(video);
  return (
    <Card
      className={cn(
        "group gap-0 overflow-hidden rounded-2xl py-0 shadow-sm ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md",
        !video.is_available && "opacity-60",
      )}
    >
      {/* レベル色の無地カラーバンド（画像枠ではない） */}
      <div className="h-2.5 w-full" style={{ backgroundColor: bandColor(card.level) }} />

      <CardContent className="flex flex-col gap-3 p-4">
        <div
          className="line-clamp-2 text-[0.95rem] leading-snug font-bold break-all"
          title={video.essential_filename}
        >
          {video.essential_filename}
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-foreground/10 pt-3">
          <EditMeta label="Level" value={levelName(card.level)} />
          <EditMeta label="Storage" value={storageLabel(video.storage_location)} />
          <EditMeta label="Views" value={video.view_count} />
          <EditMeta label="Size" value={formatFileSize(video.file_size)} />
          <EditMeta label="Played" value={formatDate(video.last_viewed)} />
          <EditMeta label="Updated" value={formatDate(video.last_file_modified)} />
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

function EditMeta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}
