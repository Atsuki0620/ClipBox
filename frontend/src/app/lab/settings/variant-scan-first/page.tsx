// UIラボ Variant scan-first（単一カラム）「スキャン中心設定」 → /lab/settings/variant-scan-first
// 【役割】スキャンを主役に、情報量を絞った設定画面のモック。上=高頻度（スキャン→バックアップ履歴）、
//   下=低頻度（フォルダ・再生／カード表示／保守情報）の折りたたみ。保存ボタンなしの自動保存。
//   セクション部品・状態・テーマ・サンプルカードは _components/scanFirstShared.tsx を共有（カテゴリレール版と同一）。
// 【設計制約】API/DB/localStorage 非接続。テーマは div の CSS 変数のみ。サムネ/<img> 不使用。
// 【依存関係】LabFrame/ModernSidebar（既存）, scanFirstShared（共有）, shadcn Tooltip(Provider)。

"use client";

import { FolderOpen, LayoutGrid, HardDrive } from "lucide-react";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  SETTINGS_THEME,
  useScanFirstState,
  AutoSaveStatus,
  ScanCard,
  BackupHistory,
  CollapsibleSection,
  FolderPlaybackSection,
  CardDisplaySection,
  MaintenanceSection,
} from "../_components/scanFirstShared";

// 設定エリアの Variant 切替（J / scan-first / scan-rail。J 本体は変更しない）。
const AREA_VARIANTS = [
  { key: "j", href: "/lab/settings/variant-j", label: "J 設定コンソール" },
  { key: "scan-first", href: "/lab/settings/variant-scan-first", label: "スキャン中心" },
  { key: "scan-rail", href: "/lab/settings/variant-scan-rail", label: "スキャン＋レール" },
  { key: "scan-tabs", href: "/lab/settings/variant-scan-tabs", label: "スキャン＋タブ" },
];

export default function SettingsScanFirstPage() {
  const s = useScanFirstState();

  return (
    <LabFrame active="scan-first" title="スキャン中心設定" variants={AREA_VARIANTS} indexHref="/lab/settings">
      <TooltipProvider delay={200}>
        <div style={SETTINGS_THEME} className="flex min-h-[40rem] bg-background text-[13px] text-foreground">
          <ModernSidebar active="設定" />
          <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 p-5">
            {/* ヘッダ：タイトル＋自動保存ステータス（保存ボタンなし） */}
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-lg font-semibold tracking-tight">設定</h1>
                <p className="text-xs text-muted-foreground">
                  よく使う「スキャン」を中心に、必要な設定だけまとめた画面です。
                </p>
              </div>
              <AutoSaveStatus state={s.saveState} />
            </header>

            {/* ① スキャンカード（最上部・主操作） */}
            <ScanCard
              scanning={s.scanning}
              steps={s.displaySteps}
              lastScanAt={s.lastScanAt}
              lastScanResult={s.lastScanResult}
              lastBackupAt={s.lastBackupAt}
              onRun={s.runScan}
            />

            {/* ② バックアップ履歴（スキャン直下） */}
            <BackupHistory
              rows={s.visibleBackups}
              total={s.totalBackups}
              showAll={s.showAllBackups}
              onToggle={s.toggleShowAllBackups}
            />

            {/* ③ 低頻度設定は折りたたみ（既定は閉じる） */}
            <CollapsibleSection icon={FolderOpen} title="フォルダ・再生設定" description="スキャン対象フォルダと再生ツールのパス。">
              <FolderPlaybackSection form={s.form} errors={s.errors} onChange={s.updateForm} />
            </CollapsibleSection>

            <CollapsibleSection
              icon={LayoutGrid}
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
            </CollapsibleSection>

            <CollapsibleSection icon={HardDrive} title="保守情報" description="トラブル時に確認する情報。操作ボタンは置きません。">
              <MaintenanceSection />
            </CollapsibleSection>

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
