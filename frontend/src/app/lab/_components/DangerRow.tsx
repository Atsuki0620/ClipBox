// UIラボ 共通: 危険操作（danger zone）の1行。
// 【役割】設定コンソールの「危険操作」カテゴリで、説明＋誤操作防止文＋destructive ボタンを1行にまとめる。
//   通常操作と視覚的に分離するため赤系の枠（border-destructive/30）で囲む。
// 【設計制約】API/DB に触れない（onAction は呼び出し側のローカル処理＝モックで実際には何もしない）。
//   色はトークン継承。<img> 不使用。
// 【依存関係】shadcn Button, lib/utils（cn）。

"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DangerRow({
  title,
  description,
  actionLabel,
  icon,
  onAction,
  className,
}: {
  title: string;
  description: ReactNode;
  actionLabel: string;
  icon?: ReactNode;
  onAction: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="text-[13px] font-medium text-destructive">{title}</div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Button variant="destructive" size="sm" onClick={onAction} className="shrink-0">
        {icon}
        {actionLabel}
      </Button>
    </div>
  );
}
