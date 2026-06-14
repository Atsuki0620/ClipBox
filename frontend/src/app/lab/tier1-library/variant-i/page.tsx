// UIラボ Variant I「Data Table Console」 → /lab/tier1-library/variant-i
// 【役割】寒色・最大密度。一覧を高機能テーブル化（行選択/数値レベル/行hover/数値右寄せ/行メニュー/ページネーション）。
//   各カード項目を「列」として全表示。判定済み行は薄く。ランキング/大量確認/インライン判定向け。
// 【設計制約】API/DB に接続しない。テーマはルート div の CSS 変数上書きのみ。サムネ無し。
//   table プリミティブが無いため semantic <table>＋Tailwind、行メニューは Popover で代替。
// 【依存関係】Modern 共通部品（ModernSidebar/ModernToolbar/KpiBar/LevelButtons）, shadcn(Tabs/Button/Checkbox/Popover),
//   lib/levels(storageLabel), lib/utils(cn), _data/labMock, useMockCard。

"use client";

import { useState, type CSSProperties } from "react";
import { Play, Heart, Bookmark, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { storageLabel } from "@/lib/levels";
import { LAB_VIDEOS, formatFileSize, formatDate, type LabVideo } from "../../_data/labMock";
import { useMockCard } from "../../_components/useMockCard";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ModernToolbar } from "../../_components/ModernToolbar";
import { KpiBar } from "../../_components/KpiBar";
import { LevelButtons } from "../../_components/LevelButtons";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  "--radius": "0.4rem",
  "--sidebar": "oklch(0.98 0.003 250)",
  "--sidebar-foreground": "oklch(0.24 0.015 258)",
  "--sidebar-accent": "oklch(0.94 0.012 256)",
  "--sidebar-border": "oklch(0.91 0.005 250)",
} as CSSProperties;

export default function VariantIPage() {
  const [tab, setTab] = useState("library");
  return (
    <LabFrame active="i" title="Data Table Console">
      <div style={THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="Tier 1" density="compact" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Tier 1 ライブラリ</h1>
            <p className="text-xs text-muted-foreground">テーブルで大量にさばく</p>
          </div>

          <KpiBar variant="compact" />

          <Tabs value={tab} onValueChange={(value) => setTab(value as string)} className="gap-3">
            <ModernToolbar facet />
            <TabsContent value="library" className="flex flex-col gap-2">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10 bg-muted/70 text-muted-foreground backdrop-blur">
                    <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-medium">
                      <th className="w-8">
                        <Checkbox aria-label="全選択" />
                      </th>
                      <th>タイトル</th>
                      <th className="w-12">保存先</th>
                      <th className="w-12 text-right">視聴</th>
                      <th className="w-16 text-right">サイズ</th>
                      <th className="w-20">最終再生</th>
                      <th className="w-20">更新</th>
                      <th className="w-[9.5rem]">レベル</th>
                      <th className="w-[9rem]">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {LAB_VIDEOS.map((video) => (
                      <TableRow key={video.id} video={video} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ページネーション（モック） */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
                <span>全 {LAB_VIDEOS.length} 件</span>
                <div className="flex items-center gap-3">
                  <span>1ページあたり 50 件</span>
                  <div className="flex items-center gap-1">
                    <Button size="icon-sm" variant="outline" disabled>
                      ‹
                    </Button>
                    <span className="tabular-nums">1 / 1</span>
                    <Button size="icon-sm" variant="outline" disabled>
                      ›
                    </Button>
                  </div>
                </div>
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

function TableRow({ video }: { video: LabVideo }) {
  const card = useMockCard(video);
  const [selected, setSelected] = useState(false);
  const unavailable = !video.is_available;
  const judged = card.level !== -1;

  return (
    <tr
      className={cn(
        "[&>td]:px-2 [&>td]:py-1.5 hover:bg-muted/40",
        selected && "bg-primary/5",
        unavailable ? "opacity-50" : judged && "opacity-70",
      )}
    >
      <td>
        <Checkbox checked={selected} onCheckedChange={(value) => setSelected(Boolean(value))} aria-label="行を選択" />
      </td>
      <td>
        <div className="line-clamp-2 max-w-[18rem] break-all font-medium" title={video.essential_filename}>
          {video.essential_filename}
        </div>
        {unavailable && <span className="text-[10px] text-destructive">利用不可</span>}
      </td>
      <td>{storageLabel(video.storage_location)}</td>
      <td className="text-right tabular-nums">{video.view_count}</td>
      <td className="text-right tabular-nums">{formatFileSize(video.file_size)}</td>
      <td className="tabular-nums">{formatDate(video.last_viewed)}</td>
      <td className="tabular-nums">{formatDate(video.last_file_modified)}</td>
      <td>
        <LevelButtons value={card.level} onChange={card.setLevel} disabled={unavailable} size="xs" className="w-[9rem]" />
      </td>
      <td>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" disabled={unavailable} title="再生">
            <Play className="size-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-1.5" onClick={card.like} title="いいね">
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
          <label className="flex items-center" title="AVPで再生する候補に追加">
            <Checkbox checked={card.avp} onCheckedChange={card.toggleAvp} disabled={unavailable} aria-label="AVP候補" />
          </label>
          <Popover>
            <PopoverTrigger
              className="inline-flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted"
              title="その他"
            >
              <MoreHorizontal className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-36 gap-0.5 p-1">
              <MenuItem>詳細を開く</MenuItem>
              <MenuItem>パスをコピー</MenuItem>
              <MenuItem>選別へ送る</MenuItem>
            </PopoverContent>
          </Popover>
        </div>
      </td>
    </tr>
  );
}

function MenuItem({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="w-full rounded px-2 py-1.5 text-left text-[12px] hover:bg-muted"
    >
      {children}
    </button>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}
