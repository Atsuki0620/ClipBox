// UIラボ 共通: 設定フォームのセクション枠（見出し＋説明＋本文）。
// 【役割】設定コンソール（Variant J テイスト）のカテゴリ内セクション。見出し・説明文・本文枠を持ち、
//   右上に actions スロット（セクション内の保存ボタン等）、見出し脇に badge（UI検討/現行）を置ける。
//   設定画面はライブラリより余白を広めにする方針で p を大きめに取る。
// 【設計制約】API/DB に触れない（純粋な表示部品）。色はトークン継承。<img> 不使用。
// 【依存関係】lib/utils（cn）のみ。

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsSection({
  id,
  title,
  description,
  badge,
  actions,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="text-[12px] leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
