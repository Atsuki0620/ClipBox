// UIラボ「ランキング画面」モックのフィルタバー（表示専用）。
// 【役割】実 /ranking の絞り込み（種別 / 期間 / 最小レベル / 上位N / 利用可否）の見た目を再現する。
//   種別だけは上位ページに伝えて並べ替えを切替えられる（onType）。他は表示のみのローカル state。
// 【設計制約】API/DB に触れない。実際の絞り込み計算はしない（種別の並べ替え以外は見た目のみ）。色はトークン継承。
//   ローカル部品（ranking 配下）。既存共通部品は改造しない。
// 【依存関係】shadcn(Select), lucide, lib/utils(cn), _data/rankingMock の選択肢定数。

"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  RANKING_LABELS,
  PERIOD_OPTIONS,
  AVAILABILITY_OPTIONS,
  TOP_N_OPTIONS,
  MIN_LEVEL_OPTIONS,
  type RankingType,
} from "../_data/rankingMock";

export function RankingFilterBar({
  type,
  onType,
  className,
}: {
  type: RankingType;
  onType: (value: RankingType) => void;
  className?: string;
}) {
  const [period, setPeriod] = useState<string>("全期間");
  const [minLevel, setMinLevel] = useState<string>("none");
  const [topN, setTopN] = useState<string>("20");
  const [availability, setAvailability] = useState<string>("再生可能だけ");

  return (
    <div className={cn("flex flex-wrap items-center gap-2.5 rounded-lg border bg-card p-3", className)}>
      <Select value={type} onValueChange={(v) => onType((v ?? type) as RankingType)}>
        <SelectTrigger className="w-32" size="sm">
          <span className="flex flex-1 text-left">{RANKING_LABELS[type]}</span>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(RANKING_LABELS) as RankingType[]).map((key) => (
            <SelectItem key={key} value={key}>
              {RANKING_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={period} onValueChange={(v) => setPeriod(v ?? period)}>
        <SelectTrigger className="w-28" size="sm">
          <span className="flex flex-1 text-left">{period}</span>
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={minLevel} onValueChange={(v) => setMinLevel(v ?? minLevel)}>
        <SelectTrigger className="w-32" size="sm">
          <span className="flex flex-1 text-left">
            {MIN_LEVEL_OPTIONS.find((o) => o.value === minLevel)?.label ?? "制限なし"}
          </span>
        </SelectTrigger>
        <SelectContent>
          {MIN_LEVEL_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={topN} onValueChange={(v) => setTopN(v ?? topN)}>
        <SelectTrigger className="w-24" size="sm">
          <span className="flex flex-1 text-left">{topN} 件</span>
        </SelectTrigger>
        <SelectContent>
          {TOP_N_OPTIONS.map((v) => (
            <SelectItem key={v} value={String(v)}>
              {v} 件
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Select value={availability} onValueChange={(v) => setAvailability(v ?? availability)}>
          <SelectTrigger className="w-32" size="sm">
            <span className="flex flex-1 text-left">{availability}</span>
          </SelectTrigger>
          <SelectContent>
            {AVAILABILITY_OPTIONS.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span
          title="モック・表示専用。種別の並べ替え以外は絞り込み計算をしません。"
          className="inline-flex size-5 cursor-help items-center justify-center rounded-full border text-muted-foreground"
        >
          <Info className="size-3" />
        </span>
      </div>
    </div>
  );
}
