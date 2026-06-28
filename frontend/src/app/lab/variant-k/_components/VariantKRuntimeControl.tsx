// 統合 Variant K サイドバー下部の Runtime control モック。
// 【役割】開発支援（アプリ停止）の見た目を、サイドバー下部にコンパクトに表示するモック。
//   FastAPI / Next.js を個別表示（状態ランプ／状態テキスト／ポート／最終確認時刻）し、
//   停止は「アプリを停止」1ボタンにまとめる。専用ページは作らない。
// 【設計制約】
//   - Streamlit は表示しない。
//   - 停止ボタンは disabled の純モック。クリックで状態を変える fake 挙動は持たせない（本体に接続しない）。
//   - 本体 Runtime control 仕様・既定無効（CLIPBOX_ENABLE_RUNTIME_CONTROL）は変更しない。
//   - 本段階2で作る。計画書の「段階6でRuntime control実装」は段階2版の確認/微修正に読み替える。
// 【依存関係】lucide-react, lib/utils（cn）, _data/variantKMock（RuntimeService）, shadcn button。

"use client";

import { Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VARIANT_K_RUNTIME_MOCK, type RuntimeService } from "../_data/variantKMock";

const LAMP_CLASS: Record<RuntimeService["status"], string> = {
  running: "bg-emerald-500",
  stopped: "bg-zinc-400",
  unknown: "bg-amber-400",
};

const STATUS_TEXT: Record<RuntimeService["status"], string> = {
  running: "起動中",
  stopped: "停止",
  unknown: "不明",
};

export function VariantKRuntimeControl({
  services = VARIANT_K_RUNTIME_MOCK,
}: {
  services?: RuntimeService[];
}) {
  return (
    <div className="mt-auto flex flex-col gap-2 border-t border-sidebar-border px-2 pt-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Runtime control
        </span>
        <span className="rounded-full border px-1.5 py-0.5 text-[9px] text-muted-foreground">
          モック
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {services.map((svc) => (
          <li
            key={svc.name}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[11px]"
          >
            <span className={cn("size-2 shrink-0 rounded-full", LAMP_CLASS[svc.status])} />
            <span className="font-medium">{svc.label}</span>
            <span className="text-muted-foreground">:{svc.port}</span>
            <span className="ml-auto text-muted-foreground">{STATUS_TEXT[svc.status]}</span>
          </li>
        ))}
      </ul>

      <div className="px-1 text-[9px] text-muted-foreground">最終確認 {services[0]?.last_checked ?? "-"}</div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className="h-7 w-full justify-center gap-1.5 text-[11px]"
        title="モック表示です（本体には接続しません）"
      >
        <Power className="size-3.5" />
        アプリを停止
      </Button>
    </div>
  );
}
