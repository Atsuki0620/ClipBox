// 空データ時の高さ固定プレースホルダ（グラフパネル内で使用）。
// 【設計制約】サーバーコンポーネント対応（"use client" なし）。
// 【依存関係】なし。

export function EmptyMini({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-md bg-muted/40 p-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
