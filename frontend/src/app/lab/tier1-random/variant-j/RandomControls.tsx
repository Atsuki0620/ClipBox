// UIラボ Tier1 ランダム Variant J: 操作ツールバー（タブ＋本数＋シャッフル＋条件）。
// 【役割】ライブラリ J の JToolbar に対応するランダム版。左にエリアタブ（ランダム強調）、
//   右に「引く本数（5/10/15/20）」セグメント・主ボタン「シャッフル」・「条件」Popover（未判定優先/レベル/保存先/再生可のみ/あとで見るを含める）。
// 【設計制約】API/DB に触れない。状態は親が保持（controlled）。色はトークン継承。
// 【依存関係】shadcn(Popover/Switch/Button), lucide, lib/levels(levelName/storageLabel/LEVEL_OPTIONS),
//   lib/utils(cn), _data/labMock(LAB_STORAGES), ../../_components/Tier1AreaTabs, ./shared。

"use client";

import { Shuffle, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { levelName, storageLabel, LEVEL_OPTIONS } from "@/lib/levels";
import { LAB_STORAGES } from "../../_data/labMock";
import { Tier1AreaTabs } from "../../_components/Tier1AreaTabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  activeConditionCount,
  DEFAULT_CONDITIONS,
  type RandomConditions,
} from "./shared";

const triggerClass =
  "inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-[12px] text-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted";

const COUNTS = [5, 10, 15, 20];

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] tabular-nums transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

export function RandomControls({
  count,
  onCount,
  onShuffle,
  conditions,
  onConditions,
}: {
  count: number;
  onCount: (n: number) => void;
  onShuffle: () => void;
  conditions: RandomConditions;
  onConditions: (c: RandomConditions) => void;
}) {
  const condCount = activeConditionCount(conditions);

  const toggleLevel = (lv: number) =>
    onConditions({
      ...conditions,
      levels: conditions.levels.includes(lv)
        ? conditions.levels.filter((x) => x !== lv)
        : [...conditions.levels, lv],
    });
  const toggleStorage = (s: string) =>
    onConditions({
      ...conditions,
      storages: conditions.storages.includes(s)
        ? conditions.storages.filter((x) => x !== s)
        : [...conditions.storages, s],
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* タブ（左・ランダム強調） */}
      <Tier1AreaTabs active="random" />

      {/* 右クラスタ（本数・シャッフル・条件） */}
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {/* 引く本数 */}
        <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
          {COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onCount(n)}
              className={cn(
                "rounded-[5px] px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors",
                count === n
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {n}
            </button>
          ))}
          <span className="self-center pr-1 pl-0.5 text-[11px] text-muted-foreground">本</span>
        </div>

        {/* シャッフル（主操作＝引き直し） */}
        <Button size="sm" className="h-7 px-2.5" onClick={onShuffle}>
          <Shuffle className="size-3.5" />
          シャッフル
        </Button>

        {/* 条件（漏斗 → Popover） */}
        <Popover>
          <PopoverTrigger className={cn(triggerClass, condCount > 0 && "border-primary text-primary")}>
            <SlidersHorizontal className="size-3.5" />
            条件
            {condCount > 0 && (
              <span className="ml-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
                {condCount}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="flex w-72 flex-col gap-3 p-3">
            <label className="flex items-center justify-between gap-2 text-[12px]">
              <span>未判定を優先</span>
              <Switch
                checked={conditions.unratedFirst}
                onCheckedChange={(v) => onConditions({ ...conditions, unratedFirst: Boolean(v) })}
              />
            </label>

            <FilterSection label="レベル">
              {LEVEL_OPTIONS.map((lv) => (
                <Chip
                  key={lv}
                  active={conditions.levels.includes(lv)}
                  onClick={() => toggleLevel(lv)}
                  title={levelName(lv)}
                >
                  {lv === -1 ? "未" : lv}
                </Chip>
              ))}
            </FilterSection>

            <FilterSection label="保存先">
              {LAB_STORAGES.map((s) => (
                <Chip key={s} active={conditions.storages.includes(s)} onClick={() => toggleStorage(s)}>
                  {storageLabel(s)}
                </Chip>
              ))}
            </FilterSection>

            <label className="flex items-center justify-between gap-2 text-[12px]">
              <span>再生可のみ</span>
              <Switch
                checked={conditions.availableOnly}
                onCheckedChange={(v) => onConditions({ ...conditions, availableOnly: Boolean(v) })}
              />
            </label>

            <label className="flex items-center justify-between gap-2 text-[12px]">
              <span>あとで見るも含める</span>
              <Switch
                checked={conditions.includeWatchLater}
                onCheckedChange={(v) => onConditions({ ...conditions, includeWatchLater: Boolean(v) })}
              />
            </label>

            {condCount > 0 && (
              <button
                type="button"
                onClick={() => onConditions(DEFAULT_CONDITIONS)}
                className="self-start text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                条件をリセット
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
