// UIラボ Variant D「判定ワークベンチ」 → /lab/tier1-library/variant-d
// 【役割】Tier1 の中核タスク「未判定を大量にさばく」に全振りした作業画面。レベルをカード上の大セグメントで
//   1クリック判定し、判定状態でカードを色分け（ステータス・レーン）して「やる物」を一目で分かるようにする比較用モック。
// 【設計制約】API/DB に接続しない。テーマはルート div の CSS 変数上書きのみ（globals.css は変更しない）。
//   サムネイル/画像枠/16:9 は作らない。状態の重複バッジは足さない（枠/背景とセグメントの「未」で表現）。
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

// クールニュートラル（地味・長時間で疲れにくい）。角丸は中。
const THEME: CSSProperties = {
  "--background": "oklch(0.98 0.003 250)",
  "--foreground": "oklch(0.22 0.015 258)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.22 0.015 258)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.22 0.015 258)",
  "--primary": "oklch(0.48 0.13 256)",
  "--primary-foreground": "oklch(0.99 0.005 250)",
  "--secondary": "oklch(0.96 0.005 250)",
  "--secondary-foreground": "oklch(0.30 0.015 258)",
  "--muted": "oklch(0.965 0.004 250)",
  "--muted-foreground": "oklch(0.47 0.015 258)",
  "--accent": "oklch(0.94 0.012 256)",
  "--accent-foreground": "oklch(0.28 0.015 258)",
  "--border": "oklch(0.90 0.005 250)",
  "--input": "oklch(0.90 0.005 250)",
  "--ring": "oklch(0.60 0.10 256)",
  "--radius": "0.6rem",
  "--sidebar": "oklch(0.985 0.003 250)",
  "--sidebar-foreground": "oklch(0.24 0.015 258)",
  "--sidebar-accent": "oklch(0.94 0.012 256)",
  "--sidebar-border": "oklch(0.90 0.005 250)",
} as CSSProperties;

export default function VariantDPage() {
  return (
    <LabFrame active="d" title="判定ワークベンチ">
      <div style={THEME} className="flex min-h-[36rem] bg-background text-foreground">
        <MockSidebar active="Tier 1" />
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4">
          <h1 className="text-xl font-semibold">Tier 1 ライブラリ</h1>

          <ProgressStats />

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
                  <JudgeCard key={video.id} video={video} />
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

// 統計を「未判定 → 0 への進捗」として主役化（4項目は残す）。
function ProgressStats() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">未判定を 0 へ</span>
        <span className="text-xs text-muted-foreground">
          残り <span className="text-base font-semibold tabular-nums text-foreground">{LAB_KPI.unrated_count}</span> 件
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${LAB_KPI.judged_rate}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span>
          判定済み <span className="font-semibold tabular-nums text-foreground">{LAB_KPI.judged_count.toLocaleString()}</span>
        </span>
        <span>
          判定率 <span className="font-semibold tabular-nums text-foreground">{LAB_KPI.judged_rate.toFixed(1)}%</span>
        </span>
        <span>
          本日の判定 <span className="font-semibold tabular-nums text-foreground">{LAB_KPI.today_judged_count}</span>
        </span>
      </div>
    </div>
  );
}

function JudgeCard({ video }: { video: LabVideo }) {
  const card = useMockCard(video);
  const unavailable = !video.is_available;
  const unrated = card.level === -1;
  // ステータス・レーン: 利用不可=グレー&斜線 / 未判定=注意色で前面化 / 判定済み=レベル色の左帯。
  const highlightUnrated = unrated && !unavailable;
  const judged = !unrated;

  return (
    <Card
      className={cn(
        "relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md",
        unavailable && "opacity-60",
        highlightUnrated && "border-amber-400 bg-amber-50/70 ring-1 ring-amber-300/50",
      )}
    >
      {judged && (
        <div
          className="absolute top-0 left-0 h-full w-1.5"
          style={{ backgroundColor: levelColor(card.level) }}
        />
      )}
      {unavailable && (
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_7px,rgba(100,116,139,0.10)_7px,rgba(100,116,139,0.10)_14px)]" />
      )}

      <CardContent className="relative flex flex-col gap-2 p-3 pl-3.5">
        <div className="line-clamp-2 break-all text-sm font-semibold" title={video.essential_filename}>
          {video.essential_filename}
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
          <span>{storageLabel(video.storage_location)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{formatFileSize(video.file_size)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>視聴 {video.view_count}</span>
          {unavailable && <span className="font-medium text-destructive">利用不可</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground tabular-nums">
          <span>最終再生 {formatDate(video.last_viewed)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>更新 {formatDate(video.last_file_modified)}</span>
        </div>

        {/* 判定ブロック: レベルを大セグメントで1クリック判定 + 再生（主操作） */}
        <div className="mt-0.5 flex flex-col gap-1.5 rounded-md bg-muted/50 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
              判定
            </span>
            <span className={cn("text-[0.625rem]", unrated ? "font-medium text-amber-600" : "text-muted-foreground")}>
              {levelName(card.level)}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {LEVEL_OPTIONS.map((seg) => (
              <button
                key={seg}
                type="button"
                disabled={unavailable}
                onClick={() => card.setLevel(seg)}
                title={levelName(seg)}
                className={cn(
                  "h-7 rounded text-xs font-medium tabular-nums transition-colors disabled:opacity-50",
                  card.level === seg
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {seg === -1 ? "未" : seg}
              </button>
            ))}
          </div>
          <Button size="sm" className="w-full" disabled={unavailable}>
            <Play className="size-4" />
            再生
          </Button>
        </div>

        {/* 整理ブロック: 判定とは視覚的に分離した補助操作 */}
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="flex-1" onClick={card.like} title="いいね">
            <Heart className="size-3.5" />
            <span className="tabular-nums">{card.likeCount}</span>
          </Button>
          <Button
            size="sm"
            variant={card.watchLater ? "default" : "outline"}
            onClick={card.toggleWatchLater}
            title="あとで見る"
          >
            <Bookmark className="size-3.5" />
          </Button>
          <label className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs" title="AVP候補に追加">
            <Checkbox checked={card.avp} onCheckedChange={card.toggleAvp} disabled={unavailable} />
            <span>AVP</span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}
