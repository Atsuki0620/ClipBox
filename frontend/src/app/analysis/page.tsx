"use client";
// 分析ページ — 4 タブシェル（旧分析 / 作業量・結果分布 / 視聴との関係 / 詰まり・次アクション）。
// 【設計制約】フィルタ state はここで一元管理しタブへ props 渡し。タブ間で同一クエリキーを共有しキャッシュ重複取得を防ぐ。
//   Stage C 相当: NextActionTab は read-only 候補一覧と既存画面への導線のみ。Stage D の操作実装は未着手。DB変更なし・VideoCard操作なし。
// 【依存関係】@/lib/types、@/components/ui/tabs、./_components/AnalysisFilterBar、./_tabs/ 配下。

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AnalysisAvailability,
  AnalysisBucket,
  AnalysisPeriodPreset,
} from "@/lib/types";
import { AnalysisFilterBar } from "./_components/AnalysisFilterBar";
import { LegacyAnalysisTab } from "./_tabs/LegacyAnalysisTab";
import { NextActionTab } from "./_tabs/NextActionTab";
import { ViewingRelationTab } from "./_tabs/ViewingRelationTab";
import { WorkloadDistributionTab } from "./_tabs/WorkloadDistributionTab";

export default function AnalysisPage() {
  const [period, setPeriod] = useState<AnalysisPeriodPreset>("全期間");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [availability, setAvailability] = useState<AnalysisAvailability>("すべて");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [topN, setTopN] = useState(20);
  const [bucket, setBucket] = useState<AnalysisBucket>("day");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">分析</h1>

      <AnalysisFilterBar
        period={period}
        customStart={customStart}
        customEnd={customEnd}
        availability={availability}
        includeDeleted={includeDeleted}
        topN={topN}
        bucket={bucket}
        onPeriod={setPeriod}
        onCustomStart={setCustomStart}
        onCustomEnd={setCustomEnd}
        onAvailability={setAvailability}
        onIncludeDeleted={setIncludeDeleted}
        onTopN={setTopN}
        onBucket={setBucket}
      />

      <Tabs defaultValue="legacy">
        <TabsList variant="line">
          <TabsTrigger value="legacy">旧分析</TabsTrigger>
          <TabsTrigger value="workload">作業量・結果分布</TabsTrigger>
          <TabsTrigger value="viewing">視聴との関係</TabsTrigger>
          <TabsTrigger value="next-action">詰まり・次アクション</TabsTrigger>
        </TabsList>

        <TabsContent value="legacy">
          <LegacyAnalysisTab
            period={period}
            customStart={customStart}
            customEnd={customEnd}
            availability={availability}
            includeDeleted={includeDeleted}
            topN={topN}
            bucket={bucket}
          />
        </TabsContent>

        <TabsContent value="workload">
          <WorkloadDistributionTab
            period={period}
            customStart={customStart}
            customEnd={customEnd}
            availability={availability}
            includeDeleted={includeDeleted}
            bucket={bucket}
          />
        </TabsContent>

        <TabsContent value="viewing">
          <ViewingRelationTab
            period={period}
            customStart={customStart}
            customEnd={customEnd}
            availability={availability}
            includeDeleted={includeDeleted}
            bucket={bucket}
          />
        </TabsContent>

        <TabsContent value="next-action">
          <NextActionTab
            period={period}
            customStart={customStart}
            customEnd={customEnd}
            availability={availability}
            includeDeleted={includeDeleted}
            topN={topN}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
