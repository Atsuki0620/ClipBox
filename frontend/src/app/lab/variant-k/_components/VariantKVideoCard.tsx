// 統合 Variant K の動画カード土台（サムネなし）。
// 【役割】カード優先画面（Tier1/Tier2/あとで見る/AVP再生セット）で共有するカードの骨格。
//   2行タイトル（2行分の min-height 確保）＋メタ（ストレージ/視聴日数/作成日）＋バッジ列＋操作スロット。
// 【設計制約】
//   - サムネイル／画像枠は持たない（サムネなし方針）。
//   - 視聴回数・更新日・登録日は出さない。日付は作成日（file_created_at）を既定表示。
//   - 利用不可は薄表示＋バッジ。再生中はハイライト（theme.PLAYING_HIGHLIGHT_CLASS）。
//   - props は最小。画面別の操作は actions スロットで段階3以降に注入する。
// 【依存関係】lib/utils（cn）, theme, VariantKBadge, _data/variantKMock（型・フォーマッタ・ラベル）。

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PLAYING_HIGHLIGHT_CLASS } from "./theme";
import { VariantKBadge } from "./VariantKBadge";
import {
  formatVariantKDate,
  tier1Label,
  tier2Label,
  type VariantKVideo,
} from "../_data/variantKMock";

const STORAGE_LABEL: Record<string, string> = {
  C_DRIVE: "Cドライブ",
  EXTERNAL_HDD: "外付けHDD",
};

export function VariantKVideoCard({
  video,
  // 該当Tierバッジ：tier1 画面では "tier1"、tier2 画面では "tier2" を渡す（既定は tier1）。
  tierBadge = "tier1",
  showWatchLaterBadge = true,
  playing = false,
  actions,
  className,
}: {
  video: VariantKVideo;
  tierBadge?: "tier1" | "tier2";
  showWatchLaterBadge?: boolean;
  playing?: boolean;
  actions?: ReactNode;
  className?: string;
}) {
  const dim = !video.available;

  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border bg-card p-3 text-card-foreground shadow-sm",
        dim && "opacity-50",
        playing && PLAYING_HIGHLIGHT_CLASS,
        className,
      )}
    >
      {/* バッジ列：該当Tier（初期ON）／あとで見る（初期ON）／利用不可（初期ON） */}
      <div className="flex flex-wrap items-center gap-1.5">
        <VariantKBadge kind={tierBadge} />
        {showWatchLaterBadge && video.watch_later ? <VariantKBadge kind="watch_later" /> : null}
        {!video.available ? <VariantKBadge kind="unavailable" /> : null}
      </div>

      {/* 2行タイトル（2行分の最小高さを確保） */}
      <h3 className="line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-tight">
        {video.title}
      </h3>

      {/* メタ：ストレージ / 視聴日数 / 作成日（視聴回数・更新日・登録日は出さない） */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <div className="flex justify-between gap-2">
          <dt>ストレージ</dt>
          <dd className="text-foreground">{STORAGE_LABEL[video.storage] ?? video.storage}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>視聴日数</dt>
          <dd className="text-foreground tabular-nums">{video.view_days}日</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>作成日</dt>
          <dd className="text-foreground tabular-nums">{formatVariantKDate(video.file_created_at)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Tier</dt>
          <dd className="text-foreground tabular-nums">
            {tierBadge === "tier1" ? tier1Label(video.tier1_status) : tier2Label(video.tier2_status)}
          </dd>
        </div>
      </dl>

      {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
    </article>
  );
}
