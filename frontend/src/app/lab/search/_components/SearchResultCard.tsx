// UIラボ「検索画面」案B 用のカード（Tier/状態キャプション付き・本体カードと整合）。
// 【役割】検索結果1件を、Tier1/Tier2 と判定/選別状態のキャプション付きで見せる。Tier 横断の検索結果でも
//   「どの Tier の何の状態か」が分かるようにし、本体カードの見え方に揃える。
// 【設計制約】API/DB/localStorage に触れない（ローカル state のみ）。サムネ/画像枠を作らない（<img> 不使用）。
//   保存場所は匿名化分類のみ（実パス・実フォルダ名を出さない）。判定済み/未判定・選別済み/未選別を混同しない。
// 【依存関係】shadcn(Button), lucide, lib/levels(levelColor), lib/utils(cn), LevelButtons, _data/searchMock。

"use client";

import { useState } from "react";
import { Play, Heart, Bookmark, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LevelButtons } from "../../_components/LevelButtons";
import {
  type SearchVideo,
  searchStatusLabel,
  storageCategory,
  levelColor,
} from "../_data/searchMock";

const toggleBtn =
  "inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-md border px-1 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40";

export function SearchResultCard({ video }: { video: SearchVideo }) {
  const [level, setLevel] = useState(video.current_favorite_level);
  const [likeCount, setLikeCount] = useState(video.like_count);
  const [watchLater, setWatchLater] = useState(video.watch_later);
  const [avp, setAvp] = useState(false);

  const unavailable = !video.is_available;
  const judged = level !== -1;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border bg-card p-2.5 transition-all",
        unavailable ? "opacity-60" : "hover:-translate-y-0.5 hover:shadow-sm",
      )}
    >
      {/* 状態キャプション（Tier1/Tier2 ＋ 状態） */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-medium",
            video.tier === "Tier2"
              ? "bg-accent text-accent-foreground"
              : "border text-foreground",
          )}
        >
          {searchStatusLabel(video)}
        </span>
        {unavailable && (
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">利用不可</span>
        )}
      </div>

      {/* タイトル（2行まで） */}
      <div
        className="line-clamp-2 break-all text-[13px] leading-snug font-semibold"
        title={video.essential_filename}
      >
        {video.essential_filename}
      </div>

      {/* メタ/バッジ（レベル色・保存場所＝匿名化・視聴） */}
      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        {judged && (
          <span
            className="rounded px-1.5 py-0.5 font-medium text-white"
            style={{ backgroundColor: levelColor(level) }}
          >
            Lv{level}
          </span>
        )}
        <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">
          {storageCategory(video.storage_location)}
        </span>
        <span className="rounded border px-1.5 py-0.5 text-muted-foreground tabular-nums">
          視聴 {video.view_count}
        </span>
      </div>

      {/* レベル（数値ボタン＝判定/選別の単一表現） */}
      <LevelButtons value={level} onChange={setLevel} disabled={unavailable} className="w-full" />

      {/* 操作（再生 / いいね / あとで / AVP） */}
      <div className="flex items-stretch gap-1">
        <Button size="sm" className="h-7 flex-[1.6] px-1" disabled={unavailable}>
          <Play className="size-3.5" />
          再生
        </Button>
        <button type="button" onClick={() => setLikeCount((c) => c + 1)} className={toggleBtn} title="いいね">
          <Heart className="size-3.5" />
          <span className="tabular-nums">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setWatchLater((v) => !v)}
          title="あとで見る"
          className={cn(
            toggleBtn,
            watchLater
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Bookmark className="size-3.5" />
          あとで
        </button>
        <button
          type="button"
          onClick={() => setAvp((v) => !v)}
          disabled={unavailable}
          title="AVPで再生する候補に追加"
          className={cn(
            toggleBtn,
            avp
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {avp ? <Check className="size-3.5" /> : <span className="size-3.5 rounded-[3px] border" />}
          AVP
        </button>
      </div>
    </div>
  );
}
