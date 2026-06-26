// UIラボ「ランキング画面」案A/C 用の順位カード行（順位セル＋情報カード）。
// 【役割】左に「#順位・スコア・レベル」の順位セル、右に共通 ConsoleCard を並べる（実 /ranking と同じ構図）。
//   ランキングは順序が情報そのものなので、#番号を構造装置として明示する。
// 【設計制約】API/DB に触れない。ConsoleCard は read-only 流用（改造しない）。色はトークン継承。
// 【依存関係】../../_components/ConsoleCard, _data/rankingMock（型/スコア/レベル名）, lib/utils(cn)。

"use client";

import { cn } from "@/lib/utils";
import { ConsoleCard } from "../../_components/ConsoleCard";
import {
  type RankedVideo,
  type RankingType,
  scoreOf,
  SCORE_SUFFIX,
  levelName,
} from "../_data/rankingMock";

export function RankingRow({
  video,
  type,
  featured = false,
}: {
  video: RankedVideo;
  type: RankingType;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[3.75rem_minmax(0,1fr)] items-start gap-3 rounded-lg border bg-card/40 p-2 sm:grid-cols-[4.25rem_minmax(0,1fr)]",
        featured && "ring-1 ring-primary/30",
      )}
    >
      <div className="flex min-h-28 flex-col items-center justify-start rounded-md bg-muted/60 px-1.5 py-2.5 text-center">
        <div className="text-[10px] text-muted-foreground">順位</div>
        <div
          className={cn(
            "mt-0.5 font-semibold tabular-nums leading-none",
            video.rank <= 3 ? "text-2xl text-primary" : "text-xl",
          )}
        >
          #{video.rank}
        </div>
        <div className="mt-2 text-[13px] font-medium tabular-nums">
          {scoreOf(video, type)}
          {SCORE_SUFFIX[type]}
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">{levelName(video.current_favorite_level)}</div>
      </div>

      <ConsoleCard video={video} />
    </div>
  );
}
