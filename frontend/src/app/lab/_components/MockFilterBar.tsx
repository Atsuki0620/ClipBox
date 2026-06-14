// UIラボのモックフィルタバー。
// 【役割】フィルタ群の見た目比較（キーワード/レベル/保存先/並び替え/昇順降順/再生可/あとで見る）。
// 【設計制約】見た目専用。実際の絞り込みはしない（ローカル state は表示反映のみ）。色はトークン継承で Variant 追従。
// 【依存関係】shadcn UI プリミティブ（Input/Select/Button/Switch）と lucide のみ。API には触れない。

"use client";

import { useState } from "react";
import { Bookmark, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LAB_SORT_OPTIONS } from "../_data/labMock";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// レベル/保存先は本体では MultiSelect。ラボでは押下できる「ドロップダウン風ボタン」で見た目だけ再現する。
function MultiSelectMock({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm" className="gap-1.5">
      {label}
      <ChevronDown className="size-3.5 text-muted-foreground" />
    </Button>
  );
}

export function MockFilterBar({ density = "comfortable" }: { density?: "comfortable" | "compact" }) {
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("favorite_level");
  const [order, setOrder] = useState("desc");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [watchLater, setWatchLater] = useState(false);
  const compact = density === "compact";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center rounded-lg border bg-card",
        compact ? "gap-2 p-2" : "gap-3 p-3",
      )}
    >
      <Input
        placeholder="キーワード検索"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        className={compact ? "h-7 w-48" : "w-64"}
      />

      <MultiSelectMock label="レベル" />
      <MultiSelectMock label="保存先" />

      <Select value={sort} onValueChange={(value) => setSort(value ?? sort)}>
        <SelectTrigger className="w-36" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LAB_SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={order} onValueChange={(value) => setOrder(value ?? order)}>
        <SelectTrigger className="w-24" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">降順</SelectItem>
          <SelectItem value="asc">昇順</SelectItem>
        </SelectContent>
      </Select>

      <label className="flex items-center gap-2 text-sm">
        <Switch checked={availableOnly} onCheckedChange={(value) => setAvailableOnly(Boolean(value))} />
        <span>再生可のみ</span>
      </label>

      <Button
        size="sm"
        variant={watchLater ? "default" : "outline"}
        onClick={() => setWatchLater((value) => !value)}
      >
        <Bookmark className="size-4" />
        あとで見る
      </Button>
    </div>
  );
}
