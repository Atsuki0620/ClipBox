// 統合 Variant K の表示プリファレンス共有 context（メモリのみ）。
// 【役割】カード表示の列数（cardColumns）を /lab/variant-k 配下の永続レイアウト全体で共有する。
//   設定 表示タブで増減した列数を Tier1（ライブラリ/ランダム/運命の1本）のカードグリッドに即時反映する。
// 【設計制約】
//   - メモリのみ（永続しない）。実 API/DB/設定ファイル/localStorage/sessionStorage・内部 config キーに触れない。
//   - VariantKShell（永続レイアウト）で Provider を張るため、ナビゲーション間は保持・フルリロードで既定に戻る（モック妥当）。
// 【依存関係】react のみ。
"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// カード列数の許容範囲（設定 表示タブのセグメントと共有）。既定は 5 列。
export const CARD_COLUMN_MIN = 3;
export const CARD_COLUMN_MAX = 6;
export const CARD_COLUMN_DEFAULT = 5;
export const CARD_COLUMN_VALUES = [3, 4, 5, 6] as const;

type VariantKDisplayPrefs = {
  cardColumns: number;
  setCardColumns: (n: number) => void;
};

const VariantKDisplayPrefsContext = createContext<VariantKDisplayPrefs | null>(null);

export function VariantKDisplayPrefsProvider({ children }: { children: ReactNode }) {
  const [cardColumns, setCardColumnsRaw] = useState(CARD_COLUMN_DEFAULT);

  const value = useMemo<VariantKDisplayPrefs>(
    () => ({
      cardColumns,
      // 範囲外は丸めて保持（モック）。
      setCardColumns: (n) => setCardColumnsRaw(Math.min(CARD_COLUMN_MAX, Math.max(CARD_COLUMN_MIN, n))),
    }),
    [cardColumns],
  );

  return (
    <VariantKDisplayPrefsContext.Provider value={value}>{children}</VariantKDisplayPrefsContext.Provider>
  );
}

export function useVariantKDisplayPrefs(): VariantKDisplayPrefs {
  const ctx = useContext(VariantKDisplayPrefsContext);
  if (!ctx) {
    // Provider 外でも安全に既定値で動く（モック・テスト容易化）。
    return { cardColumns: CARD_COLUMN_DEFAULT, setCardColumns: () => {} };
  }
  return ctx;
}
