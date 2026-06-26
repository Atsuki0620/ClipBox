"use client";
// 分析フィルタバー（期間/可用性/上位N/バケット/削除済み）。
// 【設計制約】フィルタ状態は page.tsx 側に保持。このコンポーネントは props を受け取るだけで内部 state を持たない。
// 【依存関係】@/lib/types、@/components/ui/select|input|switch。

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  AnalysisAvailability,
  AnalysisBucket,
  AnalysisPeriodPreset,
} from "@/lib/types";

const PERIODS: AnalysisPeriodPreset[] = [
  "全期間",
  "直近7日",
  "直近30日",
  "直近90日",
  "直近180日",
  "カスタム",
];
const AVAILABILITY_OPTIONS: AnalysisAvailability[] = [
  "すべて",
  "利用可能のみ",
  "利用不可のみ",
];
const TOP_N_OPTIONS = [10, 20, 50, 100];
const BUCKET_OPTIONS: { value: AnalysisBucket; label: string }[] = [
  { value: "day", label: "日" },
  { value: "week", label: "週" },
  { value: "month", label: "月" },
];

export function AnalysisFilterBar({
  period,
  customStart,
  customEnd,
  availability,
  includeDeleted,
  topN,
  bucket,
  onPeriod,
  onCustomStart,
  onCustomEnd,
  onAvailability,
  onIncludeDeleted,
  onTopN,
  onBucket,
}: {
  period: AnalysisPeriodPreset;
  customStart: string;
  customEnd: string;
  availability: AnalysisAvailability;
  includeDeleted: boolean;
  topN: number;
  bucket: AnalysisBucket;
  onPeriod: (value: AnalysisPeriodPreset) => void;
  onCustomStart: (value: string) => void;
  onCustomEnd: (value: string) => void;
  onAvailability: (value: AnalysisAvailability) => void;
  onIncludeDeleted: (value: boolean) => void;
  onTopN: (value: number) => void;
  onBucket: (value: AnalysisBucket) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border p-3 md:grid-cols-[repeat(6,minmax(0,1fr))]">
      <Select
        value={period}
        onValueChange={(value) => onPeriod(value as AnalysisPeriodPreset)}
      >
        <SelectTrigger className="w-full" size="sm">
          <span className="flex flex-1 text-left">{period}</span>
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={customStart}
        onChange={(event) => onCustomStart(event.target.value)}
        disabled={period !== "カスタム"}
        className="h-7"
        aria-label="開始日"
      />
      <Input
        type="date"
        value={customEnd}
        onChange={(event) => onCustomEnd(event.target.value)}
        disabled={period !== "カスタム"}
        className="h-7"
        aria-label="終了日"
      />

      <Select
        value={availability}
        onValueChange={(value) => onAvailability(value as AnalysisAvailability)}
      >
        <SelectTrigger className="w-full" size="sm">
          <span className="flex flex-1 text-left">{availability}</span>
        </SelectTrigger>
        <SelectContent>
          {AVAILABILITY_OPTIONS.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(topN)} onValueChange={(value) => onTopN(Number(value))}>
        <SelectTrigger className="w-full" size="sm">
          <span className="flex flex-1 text-left">上位 {topN}</span>
        </SelectTrigger>
        <SelectContent>
          {TOP_N_OPTIONS.map((value) => (
            <SelectItem key={value} value={String(value)}>
              上位 {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={bucket}
        onValueChange={(value) => onBucket(value as AnalysisBucket)}
      >
        <SelectTrigger className="w-full" size="sm">
          <span className="flex flex-1 text-left">
            {BUCKET_OPTIONS.find((option) => option.value === bucket)?.label}
          </span>
        </SelectTrigger>
        <SelectContent>
          {BUCKET_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <Switch checked={includeDeleted} onCheckedChange={onIncludeDeleted} />
        削除済みを含める
      </label>
    </div>
  );
}
