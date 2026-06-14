// UIラボ 共通: 設定フォームの1フィールド（ラベル＋helper text＋入力欄）。
// 【役割】設定コンソール（Variant J テイスト）のフォーム行。ラベル・補助説明・入力欄を縦に組み、
//   必須印（required）と「UI検討」等の小バッジ（badge）を添えられる。helper text を重視する設計。
// 【設計制約】API/DB に触れない（純粋な表示部品）。色はトークン継承。<img> 不使用。children に入力欄を差す。
// 【依存関係】lib/utils（cn）のみ。

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsField({
  label,
  hint,
  htmlFor,
  required,
  badge,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium">
          {label}
          {required && <span className="ml-1 text-primary">*</span>}
        </label>
        {badge}
      </div>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

// 「UI検討」などの小バッジ（設定画面で現行機能の有無を明示するために使う）。
export function LabBadge({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "current" | "danger";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide",
        tone === "info" && "border-primary/30 bg-primary/5 text-primary",
        tone === "current" && "border-border bg-muted text-muted-foreground",
        tone === "danger" && "border-destructive/30 bg-destructive/5 text-destructive",
        className,
      )}
    >
      {children}
    </span>
  );
}
