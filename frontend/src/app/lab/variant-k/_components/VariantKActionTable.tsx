// 統合 Variant K の操作付きテーブル土台。
// 【役割】テーブル優先画面（ランキング/検索/AVP候補）と Tier1 のテーブル表示で共有する汎用テーブルの骨格。
//   列定義（key/header/align/render）＋行データ（任意の型）を受け取って描画する。
//   resizable=true のとき各列幅をマウスドラッグで調整できる（既定 false・他画面は無影響）。
// 【設計制約】
//   - テーブルはバッジを避け、利用不可は行を薄く表示する（dimRow で判定）。再生中は行ハイライト。
//   - 表示のみ。API/DB に触れない。列幅はメモリのみ（永続しない）。
// 【依存関係】react, lib/utils（cn）, theme（PLAYING_HIGHLIGHT_CLASS）。

"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PLAYING_HIGHLIGHT_CLASS } from "./theme";

export type VariantKColumn<T> = {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  // resizable 時の初期列幅（px）。未指定の列は固定レイアウトで残り幅を等分する。
  width?: number;
  render: (row: T) => ReactNode;
};

const MIN_COL_WIDTH = 56;

export function VariantKActionTable<T>({
  columns,
  rows,
  rowKey,
  dimRow,
  playingRow,
  emptyState,
  resizable = false,
  className,
}: {
  columns: VariantKColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  dimRow?: (row: T) => boolean;
  playingRow?: (row: T) => boolean;
  emptyState?: ReactNode;
  resizable?: boolean;
  className?: string;
}) {
  // ユーザーがドラッグで上書きした列幅（px・メモリのみ）。未操作の列は col.width で固定。
  const [widths, setWidths] = useState<Record<string, number>>({});
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({});

  const colWidth = (col: VariantKColumn<T>): number | undefined => widths[col.key] ?? col.width;

  const startResize = (col: VariantKColumn<T>, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidth(col) ?? thRefs.current[col.key]?.offsetWidth ?? 120;
    const onMove = (ev: PointerEvent) => {
      const w = Math.max(MIN_COL_WIDTH, startW + (ev.clientX - startX));
      setWidths((prev) => ({ ...prev, [col.key]: w }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const alignClass = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className={cn("overflow-x-auto rounded-lg border", className)}>
      <table className={cn("w-full border-collapse text-[12px]", resizable && "table-fixed")}>
        {resizable && (
          <colgroup>
            {columns.map((col) => {
              const w = colWidth(col);
              return <col key={col.key} style={{ width: w ? `${w}px` : undefined }} />;
            })}
          </colgroup>
        )}
        <thead>
          <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
            {columns.map((col) => (
              <th
                key={col.key}
                ref={
                  resizable
                    ? (el) => {
                        thRefs.current[col.key] = el;
                      }
                    : undefined
                }
                className={cn(
                  "px-3 py-2 font-medium",
                  resizable && "relative",
                  alignClass(col.align),
                  col.className,
                )}
              >
                {col.header}
                {resizable && (
                  <span
                    onPointerDown={(e) => startResize(col, e)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-primary/40"
                    title="ドラッグで列幅を調整"
                    aria-hidden
                  />
                )}
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
                  className={cn(
                    "px-3 py-2 tabular-nums",
                    resizable && "overflow-hidden",
                    alignClass(col.align),
                    col.className,
                  )}
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
