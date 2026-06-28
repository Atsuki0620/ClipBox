// 統合 Variant K 設定: スキャンタブ（scan-first の主操作）。
// 【役割】スキャンを主操作（大型ボタン）に据え、流れ（自動バックアップ→Tier1→Tier2→結果確認）と
//   進捗（進捗バー/現在処理/経過）・結果サマリー（完了/エラー/所要時間/総件数）＋詳細折りたたみを見せる。
// 【設計制約】
//   - 実スキャンはしない（進捗は setInterval のモック）。API/DB/設定ファイルに触れない。
//   - Tier2 未設定のときは Tier2 ステップを「Tier2未設定のためスキップ」と表示する。
//   - 自動保存のため保存ボタンは置かない。Runtime control はここに置かない。
// 【依存関係】lucide, lib/utils（cn）, shadcn(button), ./useSettingsMockState。

"use client";

import { Play, RotateCcw, Check, ChevronDown, ChevronRight, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { SettingsMockController } from "./useSettingsMockState";

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

// 進捗からステップ状態を導く（pending/active/done）。Tier2 未設定は skipped。
type StepStatus = "pending" | "active" | "done" | "skipped";

export function SettingsScanTab({ controller }: { controller: SettingsMockController }) {
  const { scanStatus, scanProgress, scanElapsedSec, scanResult, detailOpen, tier2Configured } = controller;
  const running = scanStatus === "running";
  const done = scanStatus === "done";

  const stepStatus = (start: number, end: number): StepStatus => {
    if (done) return "done";
    if (!running) return "pending";
    if (scanProgress >= end) return "done";
    if (scanProgress >= start) return "active";
    return "pending";
  };

  const steps: { label: string; status: StepStatus }[] = [
    { label: "自動バックアップ", status: stepStatus(0, 15) },
    { label: "Tier1スキャン", status: stepStatus(15, 55) },
    {
      label: "Tier2スキャン",
      status: tier2Configured ? stepStatus(55, 100) : "skipped",
    },
    { label: "結果確認", status: done ? "done" : "pending" },
  ];

  const currentPhase = !running
    ? done
      ? "完了"
      : "待機中"
    : scanProgress < 15
      ? "自動バックアップ中…"
      : scanProgress < 55
        ? "Tier1スキャン中…"
        : tier2Configured
          ? "Tier2スキャン中…"
          : "結果集計中…";

  return (
    <div className="flex flex-col gap-4">
      {/* 主操作 */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">スキャンを実行</h2>
            <p className="text-[12px] text-muted-foreground">
              スキャン前に自動バックアップを取り、Tier1（必要なら Tier2）を更新します。設定は自動保存（保存ボタンはありません）。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="lg" className="gap-2" onClick={controller.startScan} disabled={running}>
              <Play className="size-4" />
              {running ? "スキャン中…" : done ? "もう一度スキャン" : "スキャン開始"}
            </Button>
            {(running || done) && (
              <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={controller.resetScan} disabled={running}>
                <RotateCcw className="size-3.5" />
                リセット
              </Button>
            )}
          </div>
        </div>

        {/* 流れ（4ステップ） */}
        <div className="flex flex-wrap items-center gap-1.5">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]",
                  step.status === "done" && "border-emerald-300 bg-emerald-50 text-emerald-700",
                  step.status === "active" && "border-amber-300 bg-amber-50 text-amber-700",
                  step.status === "pending" && "bg-card text-muted-foreground",
                  step.status === "skipped" && "border-dashed text-muted-foreground",
                )}
              >
                {step.status === "done" && <Check className="size-3" />}
                {step.label}
                {step.status === "skipped" && "（Tier2未設定のためスキップ）"}
              </span>
              {i < steps.length - 1 && <ChevronRight className="size-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* 進捗（running / done のとき） */}
      {(running || done) && (
        <div className="flex flex-col gap-2 rounded-lg border bg-card px-4 py-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium">{currentPhase}</span>
            <span className="tabular-nums text-muted-foreground">
              経過 {formatClock(scanElapsedSec)}
              {done && scanResult ? `（所要 ${formatDuration(scanResult.durationSec)}）` : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", done ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 結果サマリー */}
      {done && scanResult && (
        <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-emerald-700">
            <Check className="size-4" />
            スキャン完了
            {scanResult.errors === 0 ? (
              <span className="text-muted-foreground">（エラーなし）</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-600">
                <CircleAlert className="size-3.5" />
                エラー {scanResult.errors} 件
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "総件数", value: scanResult.total.toLocaleString("en-US") },
              { label: "所要時間", value: formatDuration(scanResult.durationSec) },
              { label: "エラー", value: `${scanResult.errors} 件` },
              { label: "対象ストレージ", value: tier2Configured ? "C＋HDD" : "Cドライブ" },
            ].map((item) => (
              <div key={item.label} className="rounded-md border bg-muted/20 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">{item.label}</div>
                <div className="text-sm font-semibold tabular-nums">{item.value}</div>
              </div>
            ))}
          </div>

          {/* 詳細折りたたみ */}
          <button
            type="button"
            onClick={() => controller.setDetailOpen(!detailOpen)}
            className="inline-flex w-fit items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {detailOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            詳細（追加 / 更新 / 利用不可扱い / スキップ / エラー）
          </button>
          {detailOpen && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { label: "追加", value: scanResult.added },
                { label: "更新", value: scanResult.updated },
                { label: "利用不可扱い", value: scanResult.removed },
                { label: "スキップ", value: scanResult.skipped },
                { label: "エラー詳細", value: scanResult.errors },
              ].map((item) => (
                <div key={item.label} className="rounded-md border bg-card px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-semibold tabular-nums">{item.value}</div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            これは見た目のモックです（実際のスキャンはしていません）。利用不可扱いは論理削除ではありません。
          </p>
        </div>
      )}
    </div>
  );
}
