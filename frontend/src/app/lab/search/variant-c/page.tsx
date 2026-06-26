// UIラボ「検索画面」案C: 高機能フィルタ → /lab/search/variant-c
// 【役割】キーワードに加え、レベル / 保存場所 / 利用可否 / 並び替えを増設した高機能フィルタ案。結果はカードグリッド。
// 【設計制約】API/DB/localStorage に接続しない。★高機能フィルタは見た目提案であり、検索結果を別状態として永続化しない
//   （仕様変更可能性=中）。サムネ不使用。本体 /search・VideoCard は変更しない。
// 【依存関係】LabFrame, ModernSidebar, ConsoleCard, SearchFilterPanel, SEARCH_THEME, _data/searchMock。

"use client";

import { useState } from "react";
import { SearchX } from "lucide-react";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ConsoleCard } from "../../_components/ConsoleCard";
import { SEARCH_THEME } from "../_components/theme";
import { SearchFilterPanel } from "../_components/SearchFilterPanel";
import { DEFAULT_QUERY, searchByKeyword, SEARCH_AREA_VARIANTS } from "../_data/searchMock";

export default function SearchVariantCPage() {
  const [keyword, setKeyword] = useState(DEFAULT_QUERY);
  const results = searchByKeyword(keyword);
  const empty = keyword.trim().length === 0;

  return (
    <LabFrame active="c" title="検索・高機能フィルタ" variants={SEARCH_AREA_VARIANTS} indexHref="/lab/search">
      <div style={SEARCH_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="検索" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">検索 ・ 高機能フィルタ</h1>
              <p className="text-xs text-muted-foreground">レベル/保存場所/利用可否/並び替えを増設（結果は永続化しない）</p>
            </div>
            <span className="text-[11px] text-muted-foreground">モック・保存されません</span>
          </div>

          <SearchFilterPanel keyword={keyword} onKeyword={setKeyword} mode="advanced" />

          {empty || results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
              <SearchX className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">{empty ? "キーワードを入力してください" : "一致する動画がありません"}</p>
              <p className="text-xs text-muted-foreground">
                {empty ? "ファイル名の一部で検索できます（例: sample / clip / demo）。" : "条件を緩めて再検索してください。"}
              </p>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground tabular-nums">
                「{keyword}」の検索結果 <span className="font-medium text-foreground">{results.length}</span> 件
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((v) => (
                  <ConsoleCard key={v.id} video={v} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </LabFrame>
  );
}
