// グラフパネルの枠（タイトル＋任意注記付き section ラッパ）。
// 【設計制約】サーバーコンポーネント対応（"use client" なし）。注記は混在/集計制約のラベルに使う。
// 【依存関係】なし。

export function ChartPanel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border p-3">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      {children}
    </section>
  );
}
