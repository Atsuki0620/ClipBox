// 統合 Variant K の動画カード土台（サムネなし）。
// 【役割】カード優先画面（Tier1/Tier2/あとで見る/AVP再生セット）で共有するカードの骨格。
//   2行タイトル（2行分の min-height 確保）＋メタ（ストレージ/視聴日数/作成日）＋バッジ列＋操作スロット。
//   layout="wide" では全幅でバッジ→タイトル→メタ→操作の順に分け、余白と読みやすさを優先する（運命の1本で使用）。
// 【設計制約】
//   - サムネイル／画像枠は持たない（サムネなし方針）。
//   - 視聴回数・更新日・登録日は出さない。日付は作成日（file_created_at）を既定表示。
//   - 利用不可は薄表示＋バッジ。再生中はハイライト（theme.PLAYING_HIGHLIGHT_CLASS）。
//   - props は最小。画面別の操作は actions スロットで段階3以降に注入する。
//   - 表示項目とボタンは vertical / wide で共通（並べ方だけが異なる）。
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

// メタ行の1項目。label 省略時は値のみを表示する（例: 「視聴12日」）。
export type VariantKMetaItem = { label?: string; value: string };

export function VariantKVideoCard({
  video,
  // 該当Tierバッジ：tier1 画面では "tier1"、tier2 画面では "tier2" を渡す（既定は tier1）。
  tierBadge = "tier1",
  showWatchLaterBadge = true,
  watchLater,
  playing = false,
  // 判定済みを薄くする等、利用不可とは別理由での薄表示。
  dimmed = false,
  // 未判定カードの識別：左端にテーマカラー（--primary）のアクセントバーを出す。
  accent = false,
  // 状態メタ行：Tier1 では「判定」、Tier2 では「選別」を既定表示（"Tier" 表記は避ける）。
  // 明示指定で上書き可。既定は tierBadge から導出（後方互換）。
  statusLabel,
  statusValue,
  // 日付メタ：判定日（Tier1）/選別日（Tier2）。既定は tierBadge から導出。
  dateLabel,
  dateValue,
  // メタ行の上書き：指定時は既定（ストレージ/視聴日数/作成日/日付/状態）を使わず、
  // 渡された項目だけを1行（flex-wrap）で表示する。label 省略時は値のみ（例: 「視聴12日」）。
  metaItems: metaItemsProp,
  // "vertical"=既定の縦カード, "wide"=全幅・メタ一段・操作一段の横長カード。
  layout = "vertical",
  actions,
  className,
}: {
  video: VariantKVideo;
  tierBadge?: "tier1" | "tier2";
  showWatchLaterBadge?: boolean;
  watchLater?: boolean;
  playing?: boolean;
  dimmed?: boolean;
  accent?: boolean;
  statusLabel?: string;
  statusValue?: string;
  dateLabel?: string;
  dateValue?: string;
  metaItems?: VariantKMetaItem[];
  layout?: "vertical" | "wide";
  actions?: ReactNode;
  className?: string;
}) {
  const dim = !video.available;
  // 未判定の識別：左端にテーマカラーのアクセントバー（パディング内左端・本文と非干渉）。
  const accentBar =
    "relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-primary before:content-['']";
  const isTier1 = tierBadge === "tier1";
  const resolvedStatusLabel = statusLabel ?? (isTier1 ? "判定" : "選別");
  const resolvedStatusValue =
    statusValue ?? (isTier1 ? tier1Label(video.tier1_status) : tier2Label(video.tier2_status));
  const resolvedDateLabel = dateLabel ?? (isTier1 ? "判定日" : "選別日");
  const resolvedDateValue =
    dateValue ?? formatVariantKDate(isTier1 ? video.judged_at : video.selected_at);
  const resolvedWatchLater = watchLater ?? video.watch_later;

  const badges = (
    <div className="flex flex-wrap items-center gap-1.5">
      <VariantKBadge kind={tierBadge} />
      {showWatchLaterBadge && resolvedWatchLater ? <VariantKBadge kind="watch_later" /> : null}
      {!video.available ? <VariantKBadge kind="unavailable" /> : null}
    </div>
  );

  // メタ項目（vertical=2列グリッド / wide=横一列）。表示項目は共通。
  // metaItems を渡した画面（Tier1）は既定を使わず、その項目だけを1行で表示する。
  const defaultMetaItems: VariantKMetaItem[] = [
    { label: "ストレージ", value: STORAGE_LABEL[video.storage] ?? video.storage },
    { label: "視聴日数", value: `${video.view_days}日` },
    { label: "作成日", value: formatVariantKDate(video.file_created_at) },
    { label: resolvedDateLabel, value: resolvedDateValue },
    { label: resolvedStatusLabel, value: resolvedStatusValue },
  ];
  const metaIsCustom = metaItemsProp != null;
  const metaItems = metaItemsProp ?? defaultMetaItems;

  if (layout === "wide") {
    return (
      <article
        className={cn(
          "flex w-full flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm",
          (dim || dimmed) && "opacity-50",
          accent && accentBar,
          playing && PLAYING_HIGHLIGHT_CLASS,
          className,
        )}
      >
        {/* 1段目：バッジ */}
        {badges}

        {/* 2段目：タイトル */}
        <h3 className="text-base font-semibold leading-snug" title={video.title}>
          {video.title}
        </h3>

        {/* 3段目：メタ情報 */}
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:flex-nowrap">
          {metaItems.map((m) => (
            <div key={m.label ?? m.value} className="inline-flex min-w-0 items-baseline gap-1.5">
              {m.label ? <dt className="shrink-0">{m.label}</dt> : null}
              <dd className="truncate text-foreground tabular-nums">{m.value}</dd>
            </div>
          ))}
        </dl>

        {/* 4段目：操作 */}
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </article>
    );
  }

  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border bg-card p-3 text-card-foreground shadow-sm",
        (dim || dimmed) && "opacity-50",
        accent && accentBar,
        playing && PLAYING_HIGHLIGHT_CLASS,
        className,
      )}
    >
      {/* バッジ列：該当Tier（初期ON）／あとで見る（初期ON）／利用不可（初期ON） */}
      {badges}

      {/* 2行タイトル（2行分の最小高さを確保） */}
      <h3 className="line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-tight">
        {video.title}
      </h3>

      {/* メタ：metaItems 上書き時は1行（flex-wrap）でシンプル表示。既定は2列グリッド。 */}
      {metaIsCustom ? (
        <dl className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {metaItems.map((m) => (
            <div key={m.label ?? m.value} className="inline-flex min-w-0 items-baseline gap-1">
              {m.label ? <dt className="shrink-0">{m.label}</dt> : null}
              <dd className="truncate text-foreground tabular-nums">{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {metaItems.map((m, i) => (
            <div
              key={m.label ?? m.value}
              className={cn("flex justify-between gap-2", i === metaItems.length - 1 && "col-span-2")}
            >
              <dt>{m.label}</dt>
              <dd className="text-foreground tabular-nums">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
    </article>
  );
}
