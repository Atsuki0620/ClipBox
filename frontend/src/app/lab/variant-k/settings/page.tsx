// 統合 Variant K 設定 → /lab/variant-k/settings
// 【役割】scan-first の運用画面。上部セグメントタブ（スキャン/表示/フォルダ/バックアップ・既定=スキャン）を切り替える。
// 【設計制約】
//   - UI LAB モック。API/DB/設定ファイル/localStorage 本体仕様に触れない（状態はページ内メモリ）。
//   - 自動保存の見た目（保存ボタンは置かない）。Runtime control はここに置かない（サイドバー下部のまま）。
//   - 内部 config キー（card_show_* / library_roots / selection_folder）は変えない（表示名だけ整える）。
// 【依存関係】lucide, lib/utils（cn）, _components(TooltipLabel), ./useSettingsMockState, ./Settings*Tab。

"use client";

import { ScanLine, LayoutGrid, FolderTree, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { VariantKTooltipLabel } from "../_components/VariantKTooltipLabel";
import { useSettingsMockState, type SettingsTab } from "./useSettingsMockState";
import { SettingsScanTab } from "./SettingsScanTab";
import { SettingsDisplayTab } from "./SettingsDisplayTab";
import { SettingsFoldersTab } from "./SettingsFoldersTab";
import { SettingsBackupTab } from "./SettingsBackupTab";

const TABS: { key: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "scan", label: "スキャン", icon: ScanLine },
  { key: "display", label: "表示", icon: LayoutGrid },
  { key: "folders", label: "フォルダ", icon: FolderTree },
  { key: "backup", label: "バックアップ", icon: ShieldCheck },
];

export default function VariantKSettingsPage() {
  const controller = useSettingsMockState();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          <VariantKTooltipLabel
            label="設定"
            tooltip={
              <div className="flex max-w-xs flex-col gap-1 text-[11px] leading-relaxed">
                <p>スキャン中心の運用画面です。スキャン前に自動でバックアップを取ります。</p>
                <p>設定は自動保存（保存ボタンはありません）。内部の設定キーは変更しません。</p>
                <p className="font-medium text-foreground">Runtime control はここには置きません（サイドバー下部のまま）。</p>
              </div>
            }
          />
        </h1>
        <p className="text-[12px] text-muted-foreground">
          スキャンを主操作に、カード表示・フォルダ・バックアップを切り替えて運用します（モック・自動保存）。
        </p>
      </div>

      {/* 上部セグメントタブ（既定=スキャン） */}
      <div className="inline-flex w-fit flex-wrap rounded-md border bg-muted/50 p-0.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => controller.setTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors",
                controller.tab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {controller.tab === "scan" && <SettingsScanTab controller={controller} />}
      {controller.tab === "display" && <SettingsDisplayTab controller={controller} />}
      {controller.tab === "folders" && <SettingsFoldersTab controller={controller} />}
      {controller.tab === "backup" && <SettingsBackupTab />}
    </div>
  );
}
