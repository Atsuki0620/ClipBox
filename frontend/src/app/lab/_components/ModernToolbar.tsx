// UIラボ Modern 共通: タブ＋フィルタを1段に統合したツールバー。
// 【役割】縦スペース節約のため、Tier1タブ（ライブラリ/ランダム/運命の1本）と検索/フィルタ/ソートを1バンドに収める。
//   フィルタ7項目（キーワード/レベル/保存先/並び替え/昇順降順/再生可/あとで見る）を担保。見た目専用（実フィルタなし）。
// 【設計制約】<TabsList> を含むため、呼び出し側の <Tabs> 配下に置くこと。API には触れない。
// 【依存関係】shadcn UI（Tabs/Input/Select/Switch/Button）, lucide, lib/utils, _data/labMock（並び替え選択肢）。

"use client";

import { useState } from "react";
import { Bookmark, ChevronDown, Library, Shuffle, Dices, Search } from "lucide-react";
import { LAB_SORT_OPTIONS } from "../_data/labMock";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function FilterButton({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
      {label}
      <ChevronDown className="size-3 text-muted-foreground" />
    </Button>
  );
}

export function ModernToolbar({
  facet = false,
  heroSearch = false,
}: {
  // facet: I（テーブル）向けにレベル/保存先/状態のファセット表示。
  // heroSearch: H 向けにキーワードはヘッダーのヒーロー検索へ集約（ツールバーからは省略）。
  facet?: boolean;
  heroSearch?: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("favorite_level");
  const [order, setOrder] = useState("desc");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [watchLater, setWatchLater] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-1.5">
      <TabsList variant="line" className="h-7">
        <TabsTrigger value="library" className="text-[13px]">
          <Library className="size-3.5" />
          ライブラリ
        </TabsTrigger>
        <TabsTrigger value="random" className="text-[13px]">
          <Shuffle className="size-3.5" />
          ランダム
        </TabsTrigger>
        <TabsTrigger value="fate" className="text-[13px]">
          <Dices className="size-3.5" />
          運命の1本
        </TabsTrigger>
      </TabsList>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {!heroSearch && (
          <div className="relative">
            <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="キーワード検索"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="h-7 w-44 pl-7 text-[12px]"
            />
          </div>
        )}

        <FilterButton label="レベル" />
        <FilterButton label="保存先" />
        {facet && <FilterButton label="状態" />}

        <Select value={sort} onValueChange={(value) => setSort(value ?? sort)}>
          <SelectTrigger size="sm" className="h-7 w-32 text-[12px]">
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
          <SelectTrigger size="sm" className="h-7 w-20 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">降順</SelectItem>
            <SelectItem value="asc">昇順</SelectItem>
          </SelectContent>
        </Select>

        <label className="flex items-center gap-1.5 text-[12px]">
          <Switch checked={availableOnly} onCheckedChange={(value) => setAvailableOnly(Boolean(value))} />
          再生可
        </label>

        <Button
          size="sm"
          variant={watchLater ? "default" : "outline"}
          className="h-7 text-[11px]"
          onClick={() => setWatchLater((value) => !value)}
        >
          <Bookmark className="size-3.5" />
          あとで見る
        </Button>
      </div>
    </div>
  );
}
