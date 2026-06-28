// 統合 Variant K の操作付きテーブル土台。
// 【役割】テーブル優先画面（ランキング/検索/AVP候補）で共有する汎用テーブルの骨格。
//   列定義（key/header/align/render）＋行データ（任意の型）を受け取って描画する。
//   ソート・操作列・詳細列の作り込みは段階6で各画面が拡張する前提（ここは骨格のみ）。
// 【設計制約】
//   - テーブルはバッジを避け、利用不可は行を薄く表示する（dimRow で判定）。再生中は行ハイライト。
//   - 表示のみ。API/DB に触れない。
// 【依存関係】lib/utils（cn）, theme（PLAYING_HIGHLIGHT_CLASS）。

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PLAYING_HIGHLIGHT_CLASS } from "./theme";

export type VariantKColumn<T> = {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => ReactNode;
};

export function VariantKActionTable<T>({
  columns,
  rows,
  rowKey,
  dimRow,
  playingRow,
  emptyState,
  className,
}: {
  columns: VariantKColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  dimRow?: (row: T) => boolean;
  playingRow?: (row: T) => boolean;
  emptyState?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const alignClass = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className={cn("overflow-x-auto rounded-lg border", className)}>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn("px-3 py-2 font-medium", alignClass(col.align), col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "border-b last:border-0 transition-colors hover:bg-muted/20",
                dimRow?.(row) && "opacity-50",
                playingRow?.(row) && PLAYING_HIGHLIGHT_CLASS,
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn("px-3 py-2 tabular-nums", alignClass(col.align), col.className)}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
