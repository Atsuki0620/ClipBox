// 統合 Variant K 設定: 表示タブ（カード表示設定）。
// 【役割】カードに出すメタ項目／バッジ項目の ON/OFF、レベル表示対象（該当Tierのみ / Tier1・Tier2を両方表示）、
//   カード列数（Tier1 のカードグリッド列数）を切り替える。
// 【設計制約】
//   - 見た目だけの自動保存モック（実 API/DB/設定ファイル/card_show_* キーに触れない・キー名は不変）。
//   - 視聴回数/更新日/登録日は UI から恒久的に除外（項目に出さず、注記で明示）。
//   - 「全Tier」という表現は使わない（Tier1・Tier2を両方表示 と書く）。
//   - カード列数は VariantKDisplayPrefs（メモリ共有・永続しない）に書き、Tier1 のカードグリッドへ即時反映する。
// 【依存関係】lib/utils（cn）, shadcn(switch), _components(VariantKDisplayPrefs), ./useSettingsMockState。

"use client";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  CARD_COLUMN_VALUES,
  useVariantKDisplayPrefs,
} from "../_components/VariantKDisplayPrefs";
import {
  BADGE_ITEMS,
  META_ITEMS,
  type LevelTarget,
  type SettingsMockController,
} from "./useSettingsMockState";

const LEVEL_TARGET_OPTIONS: { value: LevelTarget; label: string }[] = [
  { value: "current", label: "該当Tierのみ" },
  { value: "both", label: "Tier1・Tier2を両方表示" },
];

function ToggleRow({
  label,
  note,
  checked,
  onToggle,
}: {
  label: string;
  note?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
      <span className="flex flex-col">
        <span className="text-[13px]">{label}</span>
        {note ? <span className="text-[11px] text-muted-foreground">{note}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </label>
  );
}

export function SettingsDisplayTab({ controller }: { controller: SettingsMockController }) {
  const { cardColumns, setCardColumns } = useVariantKDisplayPrefs();
  return (
    <div className="flex flex-col gap-5">
      {/* メタ項目 */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">メタ項目</h2>
          <p className="text-[12px] text-muted-foreground">カードに出す情報。主役指標は視聴日数です。</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {META_ITEMS.map((item) => (
            <ToggleRow
              key={item.key}
              label={item.label}
              checked={controller.meta[item.key]}
              onToggle={() => controller.toggleMeta(item.key)}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          視聴回数・更新日・登録日は UI から除外しています（設定項目にも出しません）。
        </p>
      </section>

      {/* バッジ項目 */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">バッジ項目</h2>
          <p className="text-[12px] text-muted-foreground">カードに出す状態バッジ。AVP候補は初期 OFF です。</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {BADGE_ITEMS.map((item) => (
            <ToggleRow
              key={item.key}
              label={item.label}
              note={item.note}
              checked={controller.badge[item.key]}
              onToggle={() => controller.toggleBadge(item.key)}
            />
          ))}
        </div>
      </section>

      {/* レベル表示対象 */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">レベル表示対象</h2>
          <p className="text-[12px] text-muted-foreground">
            カードに出すレベルの範囲。既定は該当Tierのみ（Tier1動画は Tier1、Tier2対象は Tier2）。
          </p>
        </div>
        <div className="inline-flex w-fit rounded-md border bg-muted/50 p-0.5">
          {LEVEL_TARGET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => controller.setLevelTarget(opt.value)}
              className={cn(
                "rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors",
                controller.levelTarget === opt.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* カード列数（Tier1 のカードグリッドに反映） */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">カード列数</h2>
          <p className="text-[12px] text-muted-foreground">
            Tier1（ライブラリ/ランダム/運命の1本）のカード表示の列数。Tier1 のカードグリッドに反映します。
          </p>
        </div>
        <div className="inline-flex w-fit rounded-md border bg-muted/50 p-0.5">
          {CARD_COLUMN_VALUES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCardColumns(n)}
              className={cn(
                "rounded-[5px] px-3 py-1 text-[12px] font-medium tabular-nums transition-colors",
                cardColumns === n
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {n}列
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          列数はモックの共有設定で、永続しません（フルリロードで既定の5列に戻ります）。内部の設定キーは変更していません。
        </p>
      </section>

      <p className="text-[11px] text-muted-foreground">
        この画面は見た目のモックです。設定は自動保存（保存ボタンはありません）。内部の設定キーは変更していません。
      </p>
    </div>
  );
}
