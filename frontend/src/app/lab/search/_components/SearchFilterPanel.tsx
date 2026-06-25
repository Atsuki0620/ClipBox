// UIラボ「検索画面」モックの検索ツールバー（表示専用・controlled keyword）。
// 【役割】キーワード入力を上位ページへ伝える（onKeyword）。mode="advanced" でレベル/並び替え/再生可のみを増設し、
//   案C「高機能フィルタ」を表現する。キーワード以外の絞り込みは見た目のみ（計算しない）。
// 【設計制約】API/DB に触れない。検索結果を別状態として永続化しない。色はトークン継承。
//   ローカル部品（search 配下）。既存共通部品は改造しない。
// 【依存関係】shadcn(Input/Button/Switch/Select), lucide, lib/utils(cn)。

"use client";

import { useState } from "react";
import { Search as SearchIcon, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

// 本体では MultiSelect。ラボでは押下できる「ドロップダウン風ボタン」で見た目だけ再現する。
function DropdownMock({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm" className="gap-1.5">
      {label}
      <ChevronDown className="size-3.5 text-muted-foreground" />
    </Button>
  );
}

export function SearchFilterPanel({
  keyword,
  onKeyword,
  mode = "basic",
}: {
  keyword: string;
  onKeyword: (value: string) => void;
  mode?: "basic" | "advanced";
}) {
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState("関連度");

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-lg border bg-card p-3">
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="キーワード検索（ファイル名）"
          value={keyword}
          onChange={(event) => onKeyword(event.target.value)}
          className="w-64 pl-8"
        />
      </div>

      <DropdownMock label="保存場所" />

      {mode === "advanced" && (
        <>
          <DropdownMock label="レベル" />
          <DropdownMock label="利用可否" />
          <Select value={sort} onValueChange={(v) => setSort(v ?? sort)}>
            <SelectTrigger className="w-32" size="sm">
              <span className="flex flex-1 text-left">{sort}</span>
            </SelectTrigger>
            <SelectContent>
              {["関連度", "レベル", "視聴回数", "最終視聴"].map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={availableOnly} onCheckedChange={(v) => setAvailableOnly(Boolean(v))} />
            <span>再生可のみ</span>
          </label>
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground",
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            高機能フィルタ
          </span>
        </>
      )}
    </div>
  );
}
