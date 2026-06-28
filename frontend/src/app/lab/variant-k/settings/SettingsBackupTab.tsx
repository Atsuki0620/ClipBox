// 統合 Variant K 設定: バックアップタブ。
// 【役割】スキャン前の自動バックアップを中心に説明し、バックアップ履歴をモック表示する。手動バックアップは控えめに置く。
// 【設計制約】
//   - 表示と委譲のみ（実 API/DB/ファイルに触れない）。履歴・サイズはダミー値。
//   - 自動バックアップが主役。手動バックアップは主役にしない（控えめな secondary ボタン）。
//   - 自動保存のため保存ボタンは置かない。
// 【依存関係】lucide, shadcn(button), _components(ActionTable)。

"use client";

import { ShieldCheck, Download, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  VariantKActionTable,
  type VariantKColumn,
} from "../_components/VariantKActionTable";

type BackupRow = { at: string; size: string; trigger: string };

// 匿名化したモック履歴（実バックアップではない）。
const BACKUP_HISTORY: BackupRow[] = [
  { at: "2026/06/28 12:32", size: "4.2 MB", trigger: "スキャン前（自動）" },
  { at: "2026/06/27 09:15", size: "4.1 MB", trigger: "スキャン前（自動）" },
  { at: "2026/06/25 21:48", size: "4.1 MB", trigger: "手動" },
  { at: "2026/06/24 08:03", size: "4.0 MB", trigger: "スキャン前（自動）" },
];

export function SettingsBackupTab() {
  const columns: VariantKColumn<BackupRow>[] = [
    { key: "at", header: "日時", render: (row) => <span className="text-foreground">{row.at}</span> },
    { key: "size", header: "サイズ", align: "right", render: (row) => row.size },
    { key: "trigger", header: "契機", align: "center", render: (row) => row.trigger },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 自動バックアップ（主役） */}
      <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">スキャン前に自動バックアップ</h2>
          <p className="text-[12px] text-muted-foreground">
            スキャンを実行すると、最初に DB のバックアップを自動取得します。通常は手動操作は不要です。
            バックアップは世代管理され、古いものは自動的に整理されます（モック）。
          </p>
        </div>
      </div>

      {/* 履歴 */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">バックアップ履歴</h2>
        </div>
        <VariantKActionTable<BackupRow> columns={columns} rows={BACKUP_HISTORY} rowKey={(row) => row.at} />
      </section>

      {/* 手動バックアップ（控えめ） */}
      <div className="flex items-center justify-between gap-3 rounded-md border border-dashed bg-muted/20 px-3 py-2">
        <span className="text-[12px] text-muted-foreground">
          必要なときだけ、手動でもバックアップを取得できます（通常はスキャン前自動で十分です）。
        </span>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[11px]" title="手動バックアップを取得（モック）">
          <Download className="size-3.5" />
          手動バックアップ
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        この画面は見た目のモックです（実際のバックアップ取得・削除はしていません）。
      </p>
    </div>
  );
}
