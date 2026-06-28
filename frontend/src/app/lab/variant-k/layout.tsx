// 統合 Variant K の統合シェル・レイアウト（/lab/variant-k 配下を包む）。
// 【役割】全 screen ルートを統合シェル（VariantKShell）で包むだけのサーバーコンポーネント。
//   client 境界（usePathname 等）は VariantKShell / VariantKSidebar 側に寄せ、将来の metadata 追加余地を残す。
// 【設計制約】API/DB/localStorage に触れない。本体ルートではない（/lab 配下の URL 直打ち専用モック）。
// 【依存関係】_components/VariantKShell のみ。

import type { ReactNode } from "react";
import { VariantKShell } from "./_components/VariantKShell";

export default function VariantKLayout({ children }: { children: ReactNode }) {
  return <VariantKShell>{children}</VariantKShell>;
}
