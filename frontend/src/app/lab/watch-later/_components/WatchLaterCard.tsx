// UIラボ「あとで見る」共通カード（サムネなし情報カード）。
// 【役割】3案（A/B/C）で共有する1枚のカード。タイトル → 状態キャプション → メタ/バッジ → （任意）付与理由 →
//   操作（再生 / レベル / いいね / あとで見る解除 / AVP候補）。props で付与理由行と作業台強調を出し分ける。
// 【設計制約】API/DB/localStorage に触れない（ローカル state のみ）。サムネ/画像枠を作らない（<img> 不使用）。
//   あとで見る=DB / AVP候補=localStorage の境界は文言・操作で混同しない。色は包む側の THEME を継承。
// 【依存関係】shadcn(Button), lucide, lib/levels(levelColor), lib/utils(cn), _data/watchLaterMock。

"use client";

import { useState } from "react";
import { Play, Heart, BookmarkX, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { levelColor } from "@/lib/levels";
import { Button } from "@/components/ui/button";
import { LevelButtons } from "../../_components/LevelButtons";
import {
  type WatchLaterVideo,
  statusLabel,
  reasonLabel,
  formatLastViewed,
  storageLabel,
} from "../_data/watchLaterMock";

export function WatchLaterCard({
  video,
  showReason = false,
  workbench = false,
}: {
  video: WatchLaterVideo;
  showReason?: boolean;
  workbench?: boolean;
}) {
  const [level, setLevel] = useState(video.current_favorite_level);
  const [likeCount, setLikeCount] = useState(video.like_count);
  const [kept, setKept] = useState(true); // あとで見るに残っているか（初期 true）
  const [avp, setAvp] = useState(video.avp_candidate);

  const unavailable = !video.is_available;
  const judged = level !== -1;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1.5 rounded-lg border bg-card p-2.5 transition-all",
        workbench ? "p-3" : "hover:-translate-y-0.5 hover:shadow-sm",
        unavailable && "opacity-60",
        !kept && "border-dashed opacity-50",
      )}
    >
      {/* 状態キャプション（Tier1/Tier2 + 状態 ＋ 最終再生） */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded border px-1.5 py-0.5 font-medium text-foreground">
          {statusLabel(video)}
        </span>
        <span className="text-muted-foreground tabular-nums">
          最終再生 {formatLastViewed(video.last_viewed)}
        </span>
        {unavailable && (
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
            利用不可
          </span>
        )}
      </div>

      {/* タイトル（2行まで） */}
      <div
        className="line-clamp-2 break-all text-[13px] leading-snug font-semibold"
        title={video.essential_filename}
      >
        {video.essential_filename}
      </div>

      {/* メタ/バッジ（レベル色・ストレージ・視聴・AVP候補） */}
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
          {storageLabel(video.storage_location)}
        </span>
        <span className="rounded border px-1.5 py-0.5 text-muted-foreground tabular-nums">
          視聴 {video.view_count}
        </span>
        {avp && (
          <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
            AVP候補
          </span>
        )}
      </div>

      {/* 付与理由（案B/C）。なぜ「あとで見る」に残っているかを説明 */}
      {showReason && (
        <div className="flex flex-col gap-0.5 rounded-md bg-muted/60 px-2 py-1.5 text-[11px]">
          <span className="text-muted-foreground">
            付与理由: <span className="font-medium text-foreground">{reasonLabel(video)}</span>
          </span>
          {video.avp_played && (
            <span className="text-muted-foreground">
              AVP再生済み・<span className="font-medium text-foreground">あとで見るは継続</span>
              （自動解除しない方針）
            </span>
          )}
        </div>
      )}

      {/* レベル（数値ボタン＝判定/選別の単一表現） */}
      <LevelButtons value={level} onChange={setLevel} disabled={unavailable} className="w-full" />

      {/* 操作（再生 / いいね / あとで見る解除 / AVP候補） */}
      <div className="flex items-stretch gap-1">
        <Button size="sm" className="h-7 flex-[1.4] px-1" disabled={unavailable}>
          <Play className="size-3.5" />
          再生
        </Button>
        <button
          type="button"
          onClick={() => setLikeCount((c) => c + 1)}
          title="いいね"
          className="inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Heart className="size-3.5" />
          <span className="tabular-nums">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setAvp((v) => !v)}
          disabled={unavailable}
          title="AVPで再生する候補に追加（localStorage・あとで見るとは別物）"
          className={cn(
            "inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-1 text-[11px] transition-colors disabled:opacity-40",
            avp
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {avp ? <span className="size-3 rounded-[3px] bg-primary-foreground" /> : <span className="size-3 rounded-[3px] border" />}
          AVP
        </button>
        <button
          type="button"
          onClick={() => setKept((v) => !v)}
          title={kept ? "あとで見るを解除" : "あとで見るに戻す"}
          className={cn(
            "inline-flex h-7 items-center justify-center gap-1 rounded-md border px-2 text-[11px] transition-colors",
            workbench ? "flex-[1.4]" : "flex-1",
            kept
              ? "border-destructive/40 text-destructive hover:bg-destructive/10"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {kept ? <BookmarkX className="size-3.5" /> : <RotateCcw className="size-3.5" />}
          {kept ? "解除" : "戻す"}
        </button>
      </div>
    </div>
  );
}
