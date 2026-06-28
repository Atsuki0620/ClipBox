// 統合 Variant K 設定 ページ内のローカルモック状態フック。
// 【役割】設定タブ・カード表示設定（メタ項目/バッジ項目）・レベル表示対象・Tier2設定有無・
//   スキャン進捗（idle/running/done＋経過/所要/結果）・詳細折りたたみ をページ内メモリに保持する。
// 【設計制約】
//   - メモリのみ（永続しない）。実 API/DB/設定ファイル/localStorage に触れない（自動保存の「見た目」だけ）。
//   - スキャンは setInterval のモック進捗（実スキャンなし）。effect で必ずクリーンアップする。
//   - 内部 config キー（card_show_* / library_roots / selection_folder）は変えない（表示名だけ整える）。
// 【依存関係】react のみ。

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SettingsTab = "scan" | "display" | "folders" | "backup";

// カード メタ項目（card_show_* 相当・内部キーは不変）。初期 ON は storage/view_days/created。
export type MetaKey = "storage" | "view_days" | "created" | "judged_selected" | "size" | "last_played";
// カード バッジ項目。初期 ON は tier/watch_later/unavailable。avp_candidate は初期 OFF。
export type BadgeKey = "tier" | "watch_later" | "unavailable" | "avp_candidate" | "playing";
export type LevelTarget = "current" | "both";

export const META_ITEMS: { key: MetaKey; label: string; note?: string }[] = [
  { key: "storage", label: "ストレージ（保存先）" },
  { key: "view_days", label: "視聴日数（主役指標）" },
  { key: "created", label: "作成日" },
  { key: "judged_selected", label: "判定日・選別日" },
  { key: "size", label: "ファイルサイズ" },
  { key: "last_played", label: "最終再生日" },
];

export const BADGE_ITEMS: { key: BadgeKey; label: string; note?: string }[] = [
  { key: "tier", label: "該当Tier（Tier1 / Tier2）" },
  { key: "watch_later", label: "あとで見る" },
  { key: "unavailable", label: "利用不可" },
  { key: "avp_candidate", label: "AVP候補" },
  { key: "playing", label: "再生中", note: "再生中はハイライト優先（バッジは補助）。" },
];

export type ScanStatus = "idle" | "running" | "done";

export type ScanResult = {
  durationSec: number;
  total: number;
  added: number;
  updated: number;
  removed: number; // 利用不可扱い（論理削除はしない）
  skipped: number;
  errors: number;
};

const MOCK_SCAN_RESULT: ScanResult = {
  durationSec: 133, // 2分13秒
  total: 1800,
  added: 12,
  updated: 47,
  removed: 5,
  skipped: 3,
  errors: 0,
};

export type SettingsMockController = {
  tab: SettingsTab;
  setTab: (tab: SettingsTab) => void;
  meta: Record<MetaKey, boolean>;
  toggleMeta: (key: MetaKey) => void;
  badge: Record<BadgeKey, boolean>;
  toggleBadge: (key: BadgeKey) => void;
  levelTarget: LevelTarget;
  setLevelTarget: (target: LevelTarget) => void;
  tier2Configured: boolean;
  setTier2Configured: (configured: boolean) => void;
  scanStatus: ScanStatus;
  scanProgress: number; // 0..100
  scanElapsedSec: number;
  scanResult: ScanResult | null;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
  startScan: () => void;
  resetScan: () => void;
};

export function useSettingsMockState(): SettingsMockController {
  const [tab, setTab] = useState<SettingsTab>("scan");
  const [meta, setMeta] = useState<Record<MetaKey, boolean>>({
    storage: true,
    view_days: true,
    created: true,
    judged_selected: false,
    size: false,
    last_played: false,
  });
  const [badge, setBadge] = useState<Record<BadgeKey, boolean>>({
    tier: true,
    watch_later: true,
    unavailable: true,
    avp_candidate: false,
    playing: true,
  });
  const [levelTarget, setLevelTarget] = useState<LevelTarget>("current");
  const [tier2Configured, setTier2Configured] = useState(true);

  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanElapsedSec, setScanElapsedSec] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // running の間だけモック進捗を進める（実スキャンなし）。完了で done＋結果サマリーを出す。
  useEffect(() => {
    if (scanStatus !== "running") return;
    timerRef.current = setInterval(() => {
      const next = Math.min(100, progressRef.current + 4);
      progressRef.current = next;
      setScanProgress(next);
      if (next >= 100) {
        clearTimer();
        setScanStatus("done");
        setScanElapsedSec(MOCK_SCAN_RESULT.durationSec);
        setScanResult(MOCK_SCAN_RESULT);
        return;
      }
      setScanElapsedSec((prev) => prev + 5);
    }, 120);
    return clearTimer;
  }, [scanStatus, clearTimer]);

  // アンマウント時の保険クリーンアップ。
  useEffect(() => clearTimer, [clearTimer]);

  const startScan = useCallback(() => {
    clearTimer();
    progressRef.current = 0;
    setScanProgress(0);
    setScanElapsedSec(0);
    setScanResult(null);
    setDetailOpen(false);
    setScanStatus("running");
  }, [clearTimer]);

  const resetScan = useCallback(() => {
    clearTimer();
    progressRef.current = 0;
    setScanStatus("idle");
    setScanProgress(0);
    setScanElapsedSec(0);
    setScanResult(null);
    setDetailOpen(false);
  }, [clearTimer]);

  const toggleMeta = useCallback((key: MetaKey) => setMeta((prev) => ({ ...prev, [key]: !prev[key] })), []);
  const toggleBadge = useCallback((key: BadgeKey) => setBadge((prev) => ({ ...prev, [key]: !prev[key] })), []);

  return {
    tab,
    setTab,
    meta,
    toggleMeta,
    badge,
    toggleBadge,
    levelTarget,
    setLevelTarget,
    tier2Configured,
    setTier2Configured,
    scanStatus,
    scanProgress,
    scanElapsedSec,
    scanResult,
    detailOpen,
    setDetailOpen,
    startScan,
    resetScan,
  };
}
