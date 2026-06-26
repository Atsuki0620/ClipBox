// UIラボ「分析画面」洞察リストカード（サムネなし）。
// 【役割】「最近よく見た」「長く見ていない」「次に確認したい候補」などを、タイトル＋状態キャプション＋指標の行で見せる。
//   判定済み/未判定・選別済み/未選別を取り違えないよう状態キャプションを付ける。
// 【設計制約】API/DB/localStorage に触れない（表示のみ）。サムネ/画像枠を作らない（<img> 不使用）。
//   保存場所は匿名化分類のみ。色はトークン継承。ローカル部品（analysis 配下）。
// 【依存関係】lib/utils(cn), _data/analysisMock（型/statusCaption/storageCategory）。

"use client";

import { cn } from "@/lib/utils";
import { type AnalysisVideo, statusCaption, storageCategory } from "../_data/analysisMock";

export function AnalysisListCard({
  title,
  hint,
  videos,
  metric,
  emptyText = "該当なし",
}: {
  title: string;
  hint?: string;
  videos: AnalysisVideo[];
  metric: (video: AnalysisVideo) => string;
  emptyText?: string;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {videos.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-4 text-center text-[11px] text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col divide-y">
          {videos.map((v) => (
            <li
              key={v.id}
              className={cn("flex items-center gap-2 py-1.5", !v.is_available && "opacity-50")}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium" title={v.essential_filename}>
                  {v.essential_filename}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="rounded border px-1 py-0.5">{statusCaption(v)}</span>
                  <span>{storageCategory(v.storage_location)}</span>
                  {!v.is_available && <span className="font-medium text-destructive">利用不可</span>}
                </div>
              </div>
              <span className="shrink-0 text-[12px] font-medium tabular-nums text-primary">
                {metric(v)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
