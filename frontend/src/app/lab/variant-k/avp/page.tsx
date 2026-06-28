// 統合 Variant K AVP → /lab/variant-k/avp
// 【役割】AVP候補と2×2再生セットを扱う画面。上段＝候補テーブル、下段＝再生セット（最大4本）のモック。
// 【設計制約】
//   - UI LAB モック。API/DB/localStorage/sessionStorage 本体仕様に触れない（状態はページ内メモリ）。
//   - 候補は上限なし、再生対象は最大4本、利用不可は再生対象に追加不可、再生後クリアは想定文言で表現。
//   - AVP候補（localStorage相当）と あとで見る（DB相当）を混同しない。AVP再生であとで見るを自動解除しない。
//   - displayContext は avp（第4値を足さない）。
// 【依存関係】_data/variantKMock, _components/VariantKTooltipLabel, ./useAvpMockState, ./AvpCandidateTable, ./AvpPlaySet。

"use client";

import { VARIANT_K_VIDEOS } from "../_data/variantKMock";
import { VariantKTooltipLabel } from "../_components/VariantKTooltipLabel";
import { useAvpMockStates } from "./useAvpMockState";
import { AvpCandidateTable } from "./AvpCandidateTable";
import { AvpPlaySet } from "./AvpPlaySet";

export default function VariantKAvpPage() {
  const controller = useAvpMockStates(VARIANT_K_VIDEOS);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <VariantKTooltipLabel
          className="text-xl font-semibold tracking-tight"
          label={<h1>AVP</h1>}
          tooltip={
            <div className="flex max-w-xs flex-col gap-1 text-[11px] leading-relaxed">
              <p>AVP候補（localStorage相当）は一時的なプールで、上限はありません。</p>
              <p>再生対象は最大4本です。利用不可の動画は再生対象に追加できません。</p>
              <p>AVPで再生すると再生中ハイライトが付き、再生後は再生対象がクリアされる想定です。</p>
              <p className="font-medium text-foreground">AVP再生でも、あとで見るは自動解除しません。</p>
              <p>AVP候補と あとで見る（DB相当）は別物です。混同しません。</p>
            </div>
          }
        />
        <p className="text-[12px] text-muted-foreground">
          上段の候補から最大4本を再生対象に選び、下段の2×2セットで並列再生（モック）します。
        </p>
      </div>

      <AvpCandidateTable controller={controller} />
      <AvpPlaySet controller={controller} />
    </div>
  );
}
