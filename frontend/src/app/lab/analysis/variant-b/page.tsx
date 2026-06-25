// UIラボ「分析画面」案B: 期間推移・グラフ重視型 → /lab/analysis/variant-b
// 【役割】期間フィルタを中心にした分析ツール寄りの画面。メイン時系列（4指標）＋サブグラフ＋読み取りコメント＋空状態例。
// 【設計制約】API/DB/localStorage に接続しない。グラフはダミー（本体の分析ロジック・集計SQL・APP_PLAYBACK 計算は不変）。
//   フィルタは見た目のみ（期間切替で時系列の点数だけ変える）。テーマはルート div の CSS 変数上書きのみ。サムネ不使用。
// 【依存関係】LabFrame, ModernSidebar, AnalysisCharts, ANALYSIS_THEME, _data/analysisMock, shadcn(Select/Switch)。

"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LabFrame } from "../../_components/LabFrame";
import { ModernSidebar } from "../../_components/ModernSidebar";
import { ANALYSIS_THEME, CHART_COLORS } from "../_components/theme";
import {
  ChartPanel,
  MultiLineTrendChart,
  LineTrendChart,
  BarValueChart,
  ProportionBar,
  EmptyMini,
} from "../_components/AnalysisCharts";
import {
  ANALYSIS_AREA_VARIANTS,
  LEVEL_DISTRIBUTION,
  TIER_BREAKDOWN,
  PERIOD_TABS,
  trendSeries,
} from "../_data/analysisMock";

const SERIES = [
  { dataKey: "app_plays", color: CHART_COLORS.primary, name: "APP再生数" },
  { dataKey: "view_days", color: CHART_COLORS.cyan, name: "視聴日数" },
  { dataKey: "judgments", color: CHART_COLORS.indigo, name: "判定数" },
  { dataKey: "selections", color: CHART_COLORS.teal, name: "選別数" },
];

export default function AnalysisVariantBPage() {
  const [periodKey, setPeriodKey] = useState<string>("30");
  const [tier, setTier] = useState<string>("すべて");
  const [level, setLevel] = useState<string>("制限なし");
  const [availableOnly, setAvailableOnly] = useState(false);
  const days = PERIOD_TABS.find((p) => p.key === periodKey)?.days ?? 30;
  const series = trendSeries(days);

  return (
    <LabFrame active="b" title="分析・期間推移" variants={ANALYSIS_AREA_VARIANTS} indexHref="/lab/analysis">
      <div style={ANALYSIS_THEME} className="flex min-h-[36rem] bg-background text-[13px] text-foreground">
        <ModernSidebar active="分析" />
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">分析 ・ 期間推移</h1>
              <p className="text-xs text-muted-foreground">期間フィルタ中心で視聴・判定・選別の変化を時系列で見る</p>
            </div>
            <span className="text-[11px] text-muted-foreground">モック・保存されません</span>
          </div>

          {/* 大きめ期間フィルタ */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-lg border bg-card p-3">
            <Select value={periodKey} onValueChange={(v) => setPeriodKey(v ?? periodKey)}>
              <SelectTrigger className="w-28" size="sm">
                <span className="flex flex-1 text-left">{PERIOD_TABS.find((p) => p.key === periodKey)?.label}</span>
              </SelectTrigger>
              <SelectContent>
                {PERIOD_TABS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tier} onValueChange={(v) => setTier(v ?? tier)}>
              <SelectTrigger className="w-28" size="sm">
                <span className="flex flex-1 text-left">{tier}</span>
              </SelectTrigger>
              <SelectContent>
                {["すべて", "Tier1", "Tier2"].map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={level} onValueChange={(v) => setLevel(v ?? level)}>
              <SelectTrigger className="w-32" size="sm">
                <span className="flex flex-1 text-left">{level}</span>
              </SelectTrigger>
              <SelectContent>
                {["制限なし", "Lv3以上", "Lv4のみ"].map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={availableOnly} onCheckedChange={(v) => setAvailableOnly(Boolean(v))} />
              <span>{availableOnly ? "再生可能だけ" : "全動画"}</span>
            </label>
          </div>

          {/* メイン時系列（4指標） */}
          <ChartPanel title="期間推移（APP再生 / 視聴日数 / 判定 / 選別）" hint={`直近${days}日・ダミー`}>
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              {SERIES.map((s) => (
                <span key={s.dataKey} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
              ))}
            </div>
            <MultiLineTrendChart data={series} series={SERIES} />
          </ChartPanel>

          {/* 読み取りコメント */}
          <div className="flex flex-col gap-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[12px]">
            <div className="flex items-center gap-1.5 font-medium text-primary">
              <Lightbulb className="size-3.5" />
              読み取りコメント（ダミー）
            </div>
            <ul className="ml-5 list-disc text-muted-foreground">
              <li>直近{days}日は Lv3 以上の APP 再生が多め。</li>
              <li>未判定がやや増加傾向（判定が再生に追いついていない）。</li>
            </ul>
          </div>

          {/* サブグラフ */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <ChartPanel title="レベル分布">
              <BarValueChart data={LEVEL_DISTRIBUTION} dataKey="count" color={CHART_COLORS.violet} height="h-44" />
            </ChartPanel>
            <ChartPanel title="Tier1 / Tier2 比率">
              <div className="flex h-44 flex-col justify-center">
                <ProportionBar segments={TIER_BREAKDOWN} />
              </div>
            </ChartPanel>
            <ChartPanel title="あとで見る推移">
              <LineTrendChart data={series} dataKey="watch_later" color={CHART_COLORS.sky} height="h-44" />
            </ChartPanel>
            <ChartPanel title="選別履歴（データ不足の例）" hint="空状態">
              <EmptyMini height="h-44">
                この期間の選別履歴がまだありません。期間を広げるか、Tier2 の選別を進めてください。
              </EmptyMini>
            </ChartPanel>
          </div>
        </main>
      </div>
    </LabFrame>
  );
}
