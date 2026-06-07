"use client";

import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export function VideoSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-40" />
      ))}
    </div>
  );
}

export function EmptyBox({ children }: { children: ReactNode }) {
  return <div className="rounded-md border p-8 text-center text-muted-foreground">{children}</div>;
}

export function ErrorBox({
  error,
  hint,
}: {
  error: unknown;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-destructive p-4 text-sm text-destructive">
      読み込みに失敗しました: {error instanceof Error ? error.message : "不明なエラー"}
      {hint ? <div className="mt-1 text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
