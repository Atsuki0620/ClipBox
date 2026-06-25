// UIラボ「検索画面」案A: 現状改善 → /lab/search/variant-a
// 【役割】現行の「キーワード＋保存場所＋カードグリッド」を踏襲しつつ、件数表示・空状態・ページャ footer を整える案。
// 【設計制約】API/DB/localStorage に接続しない。検索結果を別状態として永続化しない。サムネ不使用。
//   本体 /search・VideoCard は変更しない。テーマはルート div の CSS 変数上書きのみ。
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

export default function SearchVariantAPage() {
  const [keyword, setKeyword] = useState(DEFAULT_QUERY);
  const results = searchByKeyword(keyword);
  const empty = keyword.trim().length === 0;

  return (
    <LabFrame active="a" title="検索・現状改善" variants={SEARCH_AREA_VARIANTS} indexHref="/lab/search">
      <div style={SEARCH_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="検索" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">検索 ・ 現状改善</h1>
              <p className="text-xs text-muted-foreground">キーワード＋保存場所のシンプル検索。件数・空状態・ページャを整える</p>
            </div>
            <span className="text-[11px] text-muted-foreground">モック・保存されません</span>
          </div>

          <SearchFilterPanel keyword={keyword} onKeyword={setKeyword} mode="basic" />

          {empty ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
              <SearchX className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">キーワードを入力してください</p>
              <p className="text-xs text-muted-foreground">ファイル名の一部で検索できます（例: sample / clip / demo）。</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
              <SearchX className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">一致する動画がありません</p>
              <p className="text-xs text-muted-foreground">別のキーワードを試すか、保存場所の絞り込みを外してください。</p>
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
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-[11px] text-muted-foreground">
                <span className="tabular-nums">全 {results.length} 件</span>
                <span>1ページあたり 50 件</span>
                <span className="tabular-nums">‹ 1 / 1 ›</span>
              </div>
            </>
          )}
        </main>
      </div>
    </LabFrame>
  );
}
