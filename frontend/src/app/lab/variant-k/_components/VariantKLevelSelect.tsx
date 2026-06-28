// 統合 Variant K テーブル行内のレベル選択プルダウン（ランキング/検索の Tier1・Tier2 列で共有）。
// 【役割】行内で Tier1（未判定/Lv0〜Lv4）・Tier2（未選別/Lv0〜Lv4）のレベルを変更する小型 Select。
//   値は文字列でやり取りし、呼び出し側が number / union へ変換する。
// 【設計制約】
//   - 表示と委譲のみ（実 API/DB に触れない）。状態は呼び出し側の controller（ページ内メモリ）。
//   - 変更しても行は即時除去せず値だけ更新する想定（呼び出し側で行順を固定）。
// 【依存関係】shadcn(select), lib/utils（cn）。
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function VariantKLevelSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={(v) => onChange((v ?? value) as string)}>
      <SelectTrigger size="sm" aria-label={ariaLabel} className={cn("h-7 w-[5.75rem]", className)}>
        <span className="flex flex-1 text-left text-[11px]">{current?.label ?? "—"}</span>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[12px]">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
