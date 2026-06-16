// UIラボ Variant scan-rail「スキャン中心設定（カテゴリレール）」 → /lab/settings/variant-scan-rail
// 【役割】scan-first と同じ中身（スキャン/バックアップ履歴/フォルダ・再生/カード表示/保守情報）を、Variant J 風の
//   左カテゴリレールで切り替える案。単一カラム版（折りたたみ）との比較用。セクション部品・状態・テーマ・サンプルカードは
//   _components/scanFirstShared.tsx を共有。
// 【設計制約】API/DB/localStorage 非接続。テーマは div の CSS 変数のみ。サムネ/<img> 不使用。
// 【依存関係】LabFrame/ModernSidebar/SettingsSection（既存）, scanFirstShared（共有）, shadcn Tooltip(Provider), lucide。

"use client";

import { useState, type ComponentType } from "react";
import { RefreshCcw, DatabaseBackup, FolderOpen, LayoutGrid, HardDrive } from "lucide-react";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { SettingsSection } from "../../_components/SettingsSection";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  SETTINGS_THEME,
  useScanFirstState,
  AutoSaveStatus,
  ScanCard,
  BackupHistory,
  FolderPlaybackSection,
  CardDisplaySection,
  MaintenanceSection,
} from "../_components/scanFirstShared";

const AREA_VARIANTS = [
  { key: "j", href: "/lab/settings/variant-j", label: "J 設定コンソール" },
  { key: "scan-first", href: "/lab/settings/variant-scan-first", label: "スキャン中心" },
  { key: "scan-rail", href: "/lab/settings/variant-scan-rail", label: "スキャン＋レール" },
  { key: "scan-tabs", href: "/lab/settings/variant-scan-tabs", label: "スキャン＋タブ" },
];

type SectionKey = "scan" | "backup" | "folder" | "card" | "maintenance";

const SECTIONS: { key: SectionKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "scan", label: "スキャン", icon: RefreshCcw },
  { key: "backup", label: "バックアップ履歴", icon: DatabaseBackup },
  { key: "folder", label: "フォルダ・再生設定", icon: FolderOpen },
  { key: "card", label: "動画カード表示設定", icon: LayoutGrid },
  { key: "maintenance", label: "保守情報", icon: HardDrive },
];

export default function SettingsScanRailPage() {
  const s = useScanFirstState();
  const [active, setActive] = useState<SectionKey>("scan");

  return (
    <LabFrame active="scan-rail" title="スキャン中心設定（カテゴリレール）" variants={AREA_VARIANTS} indexHref="/lab/settings">
      <TooltipProvider delay={200}>
        <div style={SETTINGS_THEME} className="flex min-h-[40rem] bg-background text-[13px] text-foreground">
          <ModernSidebar active="設定" />
          <main className="flex min-w-0 flex-1 flex-col gap-4 p-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-lg font-semibold tracking-tight">設定</h1>
                <p className="text-xs text-muted-foreground">
                  スキャンを先頭に、カテゴリを左レールで切り替えます。
                </p>
              </div>
              <AutoSaveStatus state={s.saveState} />
            </header>

            <div className="flex flex-col gap-4 lg:flex-row">
              {/* 左カテゴリレール */}
              <nav className="flex shrink-0 flex-col gap-0.5 lg:w-52">
                {SECTIONS.map(({ key, label, icon: Icon }) => {
                  const isActive = key === active;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActive(key)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-[13px] transition-colors",
                        isActive
                          ? "border-primary/30 bg-primary/10 font-medium text-primary"
                          : "border-transparent text-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                      <span className="flex-1 truncate">{label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* 右：選択セクション */}
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                {active === "scan" && (
                  <ScanCard
                    scanning={s.scanning}
                    steps={s.displaySteps}
                    lastScanAt={s.lastScanAt}
                    lastScanResult={s.lastScanResult}
                    lastBackupAt={s.lastBackupAt}
                    onRun={s.runScan}
                  />
                )}
                {active === "backup" && (
                  <BackupHistory
                    rows={s.visibleBackups}
                    total={s.totalBackups}
                    showAll={s.showAllBackups}
                    onToggle={s.toggleShowAllBackups}
                  />
                )}
                {active === "folder" && (
                  <SettingsSection title="フォルダ・再生設定" description="スキャン対象フォルダと再生ツールのパス。">
                    <FolderPlaybackSection form={s.form} errors={s.errors} onChange={s.updateForm} />
                  </SettingsSection>
                )}
                {active === "card" && (
                  <SettingsSection
                    title="動画カード表示設定"
                    description="動画カードに出す項目。右のサンプルカードで反映後の見た目を確認できます。"
                  >
                    <CardDisplaySection
                      settings={s.cardSettings}
                      onChange={s.updateCard}
                      levelScope={s.levelScope}
                      onLevelScope={s.changeLevelScope}
                      sampleTier={s.sampleTier}
                      onSampleTier={s.setSampleTier}
                    />
                  </SettingsSection>
                )}
                {active === "maintenance" && (
                  <SettingsSection title="保守情報" description="トラブル時に確認する情報。操作ボタンは置きません。">
                    <MaintenanceSection />
                  </SettingsSection>
                )}
              </div>
            </div>

            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
              これは見た目比較用のモックです。スキャン・自動保存・バックアップ履歴はすべて画面内のローカル状態だけが
              変化します（実 DB / API / localStorage には接続しません）。
            </p>
          </main>
        </div>
      </TooltipProvider>
    </LabFrame>
  );
}
