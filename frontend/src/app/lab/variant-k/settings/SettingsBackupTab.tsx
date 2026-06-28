// 統合 Variant K 設定: バックアップタブ。
// 【役割】スキャン前の自動バックアップを中心に説明し、バックアップ履歴をモック表示する。
// 【設計制約】
//   - 表示のみ（実 API/DB/ファイルに触れない）。履歴・サイズはダミー値。
//   - 自動バックアップが主役。手動バックアップボタンは置かない（scan-first 方針・フィードバック §1-E）。
//   - 自動保存のため保存ボタンは置かない。
// 【依存関係】lucide, _components(ActionTable)。
"use client";

import { ShieldCheck, Database } from "lucide-react";
import {
  VariantKActionTable,
  type VariantKColumn,
} from "../_components/VariantKActionTable";

type BackupRow = { at: string; size: string; trigger: string };

// 匿名化したモック履歴（実バックアップではない）。すべてスキャン前の自動取得。
const BACKUP_HISTORY: BackupRow[] = [
  { at: "2026/06/28 12:32", size: "4.2 MB", trigger: "スキャン前（自動）" },
  { at: "2026/06/27 09:15", size: "4.1 MB", trigger: "スキャン前（自動）" },
  { at: "2026/06/25 21:48", size: "4.1 MB", trigger: "スキャン前（自動）" },
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
            スキャンを実行すると、最初に DB のバックアップを自動取得します。手動バックアップボタンは置きません
            （スキャン前自動で十分なため）。バックアップは世代管理され、古いものは自動的に整理されます（モック）。
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

      <p className="text-[11px] text-muted-foreground">
        この画面は見た目のモックです（実際のバックアップ取得・削除はしていません）。
      </p>
    </div>
  );
}
