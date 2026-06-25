// UIラボ「ランキング画面」案B/C 用のテーブル（数値比較を主役にした行）。
// 【役割】順位 / タイトル / 総合 / 視聴 / 視聴日数 / いいね / Lv / 保存先 / 状態 を列で並べ、指標を数値で比較しやすくする。
// 【設計制約】API/DB に触れない。サムネ/画像枠を作らない。利用不可は淡色＋バッジ。色はトークン継承。
//   ローカル部品（ranking 配下）。既存共通部品は改造しない。
// 【依存関係】_data/rankingMock（型/スコア/レベル名/保存先ラベル）, lib/utils(cn)。

"use client";

import { cn } from "@/lib/utils";
import {
  type RankedVideo,
  type RankingType,
  levelName,
  storageLabel,
} from "../_data/rankingMock";

export function RankingTable({
  items,
  type,
  startRank = 1,
}: {
  items: RankedVideo[];
  type: RankingType;
  startRank?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b bg-muted/50 text-[11px] text-muted-foreground">
            <th className="px-2 py-2 text-right font-medium tabular-nums">順位</th>
            <th className="px-2 py-2 text-left font-medium">タイトル</th>
            <th className="px-2 py-2 text-right font-medium">総合</th>
            <th className="px-2 py-2 text-right font-medium">視聴</th>
            <th className="px-2 py-2 text-right font-medium">日数</th>
            <th className="px-2 py-2 text-right font-medium">♡</th>
            <th className="px-2 py-2 text-center font-medium">Lv</th>
            <th className="px-2 py-2 text-left font-medium">保存先</th>
            <th className="px-2 py-2 text-left font-medium">状態</th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => {
            const unavailable = !v.is_available;
            const isScoreCol = (col: RankingType) => type === col;
            return (
              <tr
                key={v.id}
                className={cn(
                  "border-b last:border-b-0 transition-colors hover:bg-muted/30",
                  unavailable && "opacity-50",
                )}
              >
                <td className="px-2 py-1.5 text-right font-semibold tabular-nums">#{v.rank}</td>
                <td className="max-w-[16rem] truncate px-2 py-1.5 font-medium" title={v.essential_filename}>
                  {v.essential_filename}
                </td>
                <td className={cn("px-2 py-1.5 text-right tabular-nums", isScoreCol("composite") && "font-semibold text-primary")}>
                  {v.score_composite}
                </td>
                <td className={cn("px-2 py-1.5 text-right tabular-nums", isScoreCol("view_count") && "font-semibold text-primary")}>
                  {v.view_count}
                </td>
                <td className={cn("px-2 py-1.5 text-right tabular-nums", isScoreCol("view_days") && "font-semibold text-primary")}>
                  {v.view_days}
                </td>
                <td className={cn("px-2 py-1.5 text-right tabular-nums", isScoreCol("likes") && "font-semibold text-primary")}>
                  {v.like_count}
                </td>
                <td className="px-2 py-1.5 text-center tabular-nums">
                  {v.current_favorite_level === -1 ? "未" : v.current_favorite_level}
                </td>
                <td className="px-2 py-1.5 text-left text-muted-foreground">{storageLabel(v.storage_location)}</td>
                <td className="px-2 py-1.5 text-left">
                  {unavailable ? (
                    <span className="text-destructive">利用不可</span>
                  ) : (
                    <span className="text-muted-foreground">{levelName(v.current_favorite_level)}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t px-2 py-1.5 text-right text-[10px] text-muted-foreground tabular-nums">
        {startRank === 1 ? `全 ${items.length} 件（同点は id 昇順・モック）` : `#${startRank} 以降`}
      </div>
    </div>
  );
}
