// 統合 Variant K 各画面のプレースホルダー。
// 【役割】段階2では各画面の本格実装をせず、段階3以降の作業内容が分かる「設計メモ表示」を置く。
//   画面名／目的／作り込み段階／カードorテーブル／主役にする情報／出さない情報／次段階メモ を表示する。
// 【設計制約】表示のみ。API/DB に触れない。各画面の詳細 UI は段階3以降。
// 【依存関係】lib/utils（cn）, VariantKSectionHeader。

import type { ReactNode } from "react";
import { VariantKSectionHeader } from "./VariantKSectionHeader";

export type VariantKPlaceholderProps = {
  screen: string; // 画面名
  purpose: string; // この画面の目的
  stage: string; // 何段階で作り込むか
  layout: "カード優先" | "テーブル優先" | "カード＋テーブル";
  hero: string[]; // 主役にする情報
  hidden: string[]; // 出さない情報
  nextSteps: string[]; // 次段階の作業メモ
  extra?: ReactNode; // 画面固有の補足（任意）
};

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px]">
          {item}
        </span>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-3 py-2">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="text-[12px]">{children}</dd>
    </div>
  );
}

export function VariantKPlaceholder({
  screen,
  purpose,
  stage,
  layout,
  hero,
  hidden,
  nextSteps,
  extra,
}: VariantKPlaceholderProps) {
  return (
    <div className="flex flex-col gap-4">
      <VariantKSectionHeader
        title={screen}
        description={purpose}
        actions={
          <span className="rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
            {stage}で作り込み
          </span>
        }
      />

      <div className="rounded-lg border border-dashed bg-muted/20 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          段階2プレースホルダー（土台のみ・詳細は次段階）
        </p>
        <dl className="divide-y">
          <Row label="表示形式">{layout}</Row>
          <Row label="主役の情報">
            <Chips items={hero} />
          </Row>
          <Row label="出さない情報">
            <Chips items={hidden} />
          </Row>
          <Row label="次段階の作業">
            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
              {nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </Row>
        </dl>
      </div>

      {extra}
    </div>
  );
}
