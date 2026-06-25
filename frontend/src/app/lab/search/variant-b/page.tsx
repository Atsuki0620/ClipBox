// UIラボ「検索画面」案B: Tier1・Tier2 カード整合 → /lab/search/variant-b
// 【役割】Tier 横断の検索結果でも「どの Tier の何の状態か」が分かるよう、各カードに Tier/状態キャプションを付け、
//   本体カードの見え方に揃える案。Tier1/Tier2 の区切り見出しでグルーピングも示す。
// 【設計制約】API/DB/localStorage に接続しない。検索結果を別状態として永続化しない。サムネ不使用。
//   本体 /search・VideoCard は変更しない。判定済み/未判定・選別済み/未選別を混同しない。
// 【依存関係】LabFrame, ModernSidebar, SearchResultCard, SearchFilterPanel, SEARCH_THEME, _data/searchMock。

"use client";

import { useState } from "react";
import { SearchX } from "lucide-react";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { SEARCH_THEME } from "../_components/theme";
import { SearchFilterPanel } from "../_components/SearchFilterPanel";
import { SearchResultCard } from "../_components/SearchResultCard";
import { DEFAULT_QUERY, searchByKeyword, SEARCH_AREA_VARIANTS } from "../_data/searchMock";

export default function SearchVariantBPage() {
  const [keyword, setKeyword] = useState(DEFAULT_QUERY);
  const results = searchByKeyword(keyword);
  const tier1 = results.filter((v) => v.tier === "Tier1");
  const tier2 = results.filter((v) => v.tier === "Tier2");
  const empty = keyword.trim().length === 0;

  return (
    <LabFrame active="b" title="検索・Tier整合" variants={SEARCH_AREA_VARIANTS} indexHref="/lab/search">
      <div style={SEARCH_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="検索" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">検索 ・ Tier整合</h1>
              <p className="text-xs text-muted-foreground">結果に Tier/状態キャプションを付け、Tier 別に見分けやすくする</p>
            </div>
            <span className="text-[11px] text-muted-foreground">モック・保存されません</span>
          </div>

          <SearchFilterPanel keyword={keyword} onKeyword={setKeyword} mode="basic" />

          {empty || results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
              <SearchX className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">{empty ? "キーワードを入力してください" : "一致する動画がありません"}</p>
              <p className="text-xs text-muted-foreground">
                {empty ? "ファイル名の一部で検索できます（例: sample / clip / demo）。" : "別のキーワードを試してください。"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-muted-foreground tabular-nums">
                「{keyword}」の検索結果 <span className="font-medium text-foreground">{results.length}</span> 件
                （Tier1 {tier1.length} ／ Tier2 {tier2.length}）
              </div>

              {tier1.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h2 className="flex items-center gap-2 text-[12px] font-semibold">
                    <span className="rounded border px-1.5 py-0.5 text-[11px]">Tier1</span>
                    <span className="text-muted-foreground">判定（未判定 / Lv0–4）</span>
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tier1.map((v) => (
                      <SearchResultCard key={v.id} video={v} />
                    ))}
                  </div>
                </section>
              )}

              {tier2.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h2 className="flex items-center gap-2 text-[12px] font-semibold">
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] text-accent-foreground">Tier2</span>
                    <span className="text-muted-foreground">選別（未選別 / 選別済み）</span>
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tier2.map((v) => (
                      <SearchResultCard key={v.id} video={v} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </LabFrame>
  );
}
