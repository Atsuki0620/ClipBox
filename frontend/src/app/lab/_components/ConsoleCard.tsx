// UIラボ 共通: Variant J テイストのサムネなし情報カード（ライブラリ J の JCard を抽出・汎用化）。
// 【役割】タイトル2行 → メタ1行 → 数値レベルボタン → 操作1行（再生 / ♡ / あとで / AVP）。
//   ライブラリ/ランダム/運命の1本 の各 Variant J ページで共有する。あとで・AVP は等幅・あとで=「あとで」ラベル。
//   featured で運命の主役カード（控えめな特別感: ring＋上アクセント帯・やや大きい題字）。corner/footer は拡張スロット。
// 【設計制約】API/DB/localStorage に触れない（useMockCard のローカル状態のみ）。サムネ/画像枠を作らない（<img> 不使用）。
//   色はトークン継承（包む側の THEME を継承）。判定済み=dimJudged 連動で薄く・利用不可=常時薄く＋操作 disabled。
// 【依存関係】shadcn(Button), lucide, lib/levels(storageLabel), lib/utils(cn),
//   _data/labMock(型/フォーマッタ), useMockCard, LevelButtons。

"use client";

import type { ReactNode } from "react";
import { Play, Heart, Bookmark, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { storageLabel } from "@/lib/levels";
import { formatFileSize, formatDate, type LabVideo } from "../_data/labMock";
import { useMockCard } from "./useMockCard";
import { LevelButtons } from "./LevelButtons";
import { Button } from "@/components/ui/button";

// あとで / AVP の共通スタイル（同サイズ＝flex-1 で等幅）。JContent の toggleBtn と同一。
const toggleBtn =
  "inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-md border px-1 text-[11px] whitespace-nowrap transition-colors disabled:opacity-40";

export function ConsoleCard({
  video,
  dimJudged = false,
  featured = false,
  corner,
  footer,
}: {
  video: LabVideo;
  dimJudged?: boolean;
  featured?: boolean;
  corner?: ReactNode;
  footer?: ReactNode;
}) {
  const card = useMockCard(video);
  const unavailable = !video.is_available;
  const judged = card.level !== -1;
  const dim = unavailable || (judged && dimJudged);

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1.5 rounded-lg border bg-card p-2 transition-all",
        featured
          ? "gap-2 p-3 ring-1 ring-primary/30"
          : "hover:-translate-y-0.5 hover:shadow-sm",
        dim && "opacity-45",
      )}
    >
      {/* featured の控えめな特別感: 上端の細いアクセント帯のみ（サムネ・大画像なし） */}
      {featured && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-primary"
        />
      )}

      {/* 右上スロット（ランダムの「入れ替え」など） */}
      {corner && <div className="absolute top-1.5 right-1.5">{corner}</div>}

      {/* タイトル（2行まで・短い） */}
      <div
        className={cn(
          "break-all font-semibold",
          corner && "pr-7",
          featured ? "text-sm leading-snug" : "line-clamp-2 text-xs leading-snug",
        )}
        title={video.essential_filename}
      >
        {video.essential_filename}
      </div>

      {/* メタ（1行に詰める） */}
      <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground tabular-nums">
        <span>{storageLabel(video.storage_location)}</span>
        <span className="opacity-40">·</span>
        <span>視聴 {video.view_count}</span>
        <span className="opacity-40">·</span>
        <span>{formatFileSize(video.file_size)}</span>
        <span className="opacity-40">·</span>
        <span>{formatDate(video.last_viewed)}</span>
        {unavailable && <span className="text-destructive">利用不可</span>}
      </div>

      {/* レベル（数値ボタンの単一表現） */}
      <LevelButtons value={card.level} onChange={card.setLevel} disabled={unavailable} className="w-full" />

      {/* 操作（1行：再生 / ♡ / あとで / AVP。あとでとAVPは等幅） */}
      <div className="flex items-stretch gap-1">
        <Button size="sm" className="h-7 flex-[1.6] px-1" disabled={unavailable}>
          <Play className="size-3.5" />
          再生
        </Button>
        <button type="button" onClick={card.like} className={toggleBtn} title="いいね">
          <Heart className="size-3.5" />
          <span className="tabular-nums">{card.likeCount}</span>
        </button>
        <button
          type="button"
          onClick={card.toggleWatchLater}
          title="あとで見る"
          className={cn(
            toggleBtn,
            card.watchLater
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Bookmark className="size-3.5" />
          あとで
        </button>
        <button
          type="button"
          onClick={card.toggleAvp}
          disabled={unavailable}
          title="AVPで再生する候補に追加"
          className={cn(
            toggleBtn,
            card.avp
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {card.avp ? <Check className="size-3.5" /> : <span className="size-3.5 rounded-[3px] border" />}
          AVP
        </button>
      </div>

      {/* 下部拡張スロット（運命の「選出理由」など） */}
      {footer}
    </div>
  );
}
