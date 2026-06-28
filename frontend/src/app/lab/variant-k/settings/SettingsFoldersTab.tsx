// 統合 Variant K 設定: フォルダタブ。
// 【役割】スキャン対象フォルダの表示名「Tier1フォルダ」「Tier2フォルダ」を匿名化モックパスで提示する。
//   Tier2フォルダ未設定はスキャンでスキップされる旨を示し、設定/解除の見た目を切り替える。
// 【設計制約】
//   - 表示と委譲のみ（実 API/DB/設定ファイルに触れない）。パスはすべて匿名化したダミー。
//   - 内部 config キー（Tier1=library_roots / Tier2=selection_folder）は変更しない（表示名だけ整える）。
//   - 「ライブラリ」の語はフォルダ概念に使わない（Tier1/Tier2 のタブ名に予約）。
// 【依存関係】lucide, shadcn(button), ./useSettingsMockState。

"use client";

import { Folder, FolderPlus, FolderX, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SettingsMockController } from "./useSettingsMockState";

// 匿名化したモックパス（実パスではない）。Tier1=library_roots 相当（複数）。
const TIER1_FOLDERS = [
  { path: "C:\\…\\videos\\tier1", storage: "Cドライブ" },
  { path: "E:\\…\\archive\\tier1", storage: "外付けHDD" },
];
// Tier2=selection_folder 相当（単一）。
const TIER2_FOLDER = { path: "E:\\…\\selection", storage: "外付けHDD" };

function FolderRow({ path, storage }: { path: string; storage: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        <Folder className="size-4 shrink-0 text-muted-foreground" />
        <code className="truncate text-[12px]">{path}</code>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
        <HardDrive className="size-3.5" />
        {storage}
      </span>
    </div>
  );
}

export function SettingsFoldersTab({ controller }: { controller: SettingsMockController }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Tier1フォルダ（複数・内部キー library_roots） */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">Tier1フォルダ</h2>
            <p className="text-[12px] text-muted-foreground">Tier1 判定対象のスキャン先（複数指定可）。</p>
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[11px]" title="フォルダを追加（モック）">
            <FolderPlus className="size-3.5" />
            フォルダを追加
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {TIER1_FOLDERS.map((f) => (
            <FolderRow key={f.path} path={f.path} storage={f.storage} />
          ))}
        </div>
      </section>

      {/* Tier2フォルダ（単一・内部キー selection_folder） */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">Tier2フォルダ</h2>
            <p className="text-[12px] text-muted-foreground">
              Tier2 選別対象のスキャン先（単一）。未設定のときはスキャンでスキップされます。
            </p>
          </div>
          {controller.tier2Configured ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-[11px]"
              onClick={() => controller.setTier2Configured(false)}
              title="Tier2フォルダを未設定に戻す（モック）"
            >
              <FolderX className="size-3.5" />
              未設定に戻す
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-[11px]"
              onClick={() => controller.setTier2Configured(true)}
              title="Tier2フォルダを設定（モック）"
            >
              <FolderPlus className="size-3.5" />
              フォルダを設定
            </Button>
          )}
        </div>
        {controller.tier2Configured ? (
          <FolderRow path={TIER2_FOLDER.path} storage={TIER2_FOLDER.storage} />
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-3 text-[12px] text-muted-foreground">
            <FolderX className="size-4" />
            Tier2フォルダは未設定です。スキャン時は「Tier2未設定のためスキップ」されます。
          </div>
        )}
      </section>

      <p className="text-[11px] text-muted-foreground">
        パスは匿名化したモックです（実フォルダは変更しません）。設定は自動保存（保存ボタンはありません）。
      </p>
    </div>
  );
}
