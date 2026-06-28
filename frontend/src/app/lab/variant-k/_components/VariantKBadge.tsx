// 統合 Variant K 状態バッジ。
// 【役割】全画面で共通の状態バッジ（該当Tier=Tier1/Tier2・あとで見る・利用不可・AVP候補）を kind で出し分ける土台。
//   該当Tierバッジは Tier 名のみ表示（Lv・未判定/未選別は書かない）。
// 【設計制約】
//   - 色は theme.ts の暫定トークン（最終決定ではない）。
//   - AVP候補バッジは初期OFF運用（部品としては用意）。再生中はバッジではなくハイライト（theme.PLAYING_HIGHLIGHT_CLASS）。
//   - API/DB に触れない。表示のみ。
// 【依存関係】lib/utils（cn）, theme（BADGE_CLASS/BADGE_LABEL/BadgeKind）。

import { cn } from "@/lib/utils";
import { BADGE_CLASS, BADGE_LABEL, type BadgeKind } from "./theme";

export function VariantKBadge({
  kind,
  className,
}: {
  kind: BadgeKind;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center rounded-full border px-2 text-[11px] font-medium",
        BADGE_CLASS[kind],
        className,
      )}
    >
      {BADGE_LABEL[kind]}
    </span>
  );
}
