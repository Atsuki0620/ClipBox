// 統合 Variant K 設定 プレースホルダー → /lab/variant-k/settings
// 【役割】段階6で作り込む 設定（scan-first 上部タブ）の設計メモ表示。
// 【設計制約】段階2は土台のみ。詳細 UI は段階6。API/DB・設定ファイルに触れない。
//   Runtime control は設定に置かない（サイドバー下部）。内部 config キーは変更しない。
// 【依存関係】VariantKPlaceholder。

import { VariantKPlaceholder } from "../_components/VariantKPlaceholder";

export default function VariantKSettingsPage() {
  return (
    <VariantKPlaceholder
      screen="設定"
      purpose="スキャン中心の運用画面。scan-first 上部タブ・自動保存（保存ボタンなし）。"
      stage="段階6"
      layout="カード＋テーブル"
      hero={["スキャン主操作", "進捗/経過/所要時間"]}
      hidden={["手動バックアップボタン", "Runtime control（サイドバー下部に置く）"]}
      nextSteps={[
        "スキャン3段（自動バックアップ→Tier1→Tier2、未設定スキップ）",
        "表示名「Tier1フォルダ/Tier2フォルダ」（内部キー不変）",
        "カード表示設定をメタ項目/バッジ項目に分離",
        "レベル表示対象=該当Tierのみ既定・オプションでTier1・Tier2を両方表示",
      ]}
    />
  );
}
