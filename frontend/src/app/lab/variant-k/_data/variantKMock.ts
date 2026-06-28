// 統合 Variant K 専用のモックデータ。
// 【役割】統合 Variant K（全画面整合モック）の各画面が段階3以降で使う合成データの土台。
//   全画面共通の主役指標「視聴日数」や、作成日／判定日／選別日／総合スコア／総合順位など、
//   カード・テーブル双方で必要になるフィールドを 1 つの行に同梱する（段階3以降で参照する前提）。
// 【設計制約】
//   - API・DB・localStorage・実データに一切触れない（純粋な定数のみ）。
//   - フィールド名は実 API に合わせ snake_case。タイトルは明らかに合成のダミー名にする。
//   - サムネイル／画像 URL は持たない（サムネなし方針）。
//   - icon 付きナビ定義はここに置かない（_components/navItems.ts）。_data は依存なしを維持。
// 【依存関係】どのモジュールにも依存しない。

// Tier1 状態：未判定 or レベル（0..4）。-1 = 未判定。
// Tier2 状態：対象外（null）／未選別（"unselected"）／選別済み（レベル 0..4）。
export type Tier1Status = number; // -1=未判定, 0..4=判定済みレベル
export type Tier2Status = "none" | "unselected" | number; // none=対象外, unselected=未選別, 0..4=選別済み

export interface VariantKVideo {
  id: number;
  title: string; // ダミータイトル
  storage: string; // C_DRIVE | EXTERNAL_HDD
  file_created_at: string | null; // 動画ファイルの作成日（ISO）。登録日 created_at とは別。
  tier1_status: Tier1Status;
  tier2_status: Tier2Status;
  view_days: number; // 視聴日数（全画面共通の主役指標）
  liked: boolean; // いいね済みか
  like_count: number; // いいね数
  watch_later: boolean; // あとで見る（DB 相当・モック）
  available: boolean; // 利用可否
  score: number; // 総合スコア（モック・本体計算式は不変）
  rank: number; // 総合順位（モック）
  last_played_at: string | null; // 最終再生日（ISO）
  judged_at: string | null; // 判定日（Tier1・ISO）
  selected_at: string | null; // 選別日（Tier2・ISO）
}

// 合成のプレースホルダ動画（8件）。Tier1/Tier2 状態・利用可否・あとで見る・いいねに変化を持たせる。
export const VARIANT_K_VIDEOS: VariantKVideo[] = [
  { id: 1, title: "sample_clip_001", storage: "C_DRIVE", file_created_at: "2026-04-12", tier1_status: 4, tier2_status: 3, view_days: 12, liked: true, like_count: 7, watch_later: false, available: true, score: 128.4, rank: 1, last_played_at: "2026-05-30", judged_at: "2026-04-15", selected_at: "2026-04-20" },
  { id: 2, title: "demo_video_alpha", storage: "EXTERNAL_HDD", file_created_at: "2026-03-02", tier1_status: 3, tier2_status: "unselected", view_days: 9, liked: false, like_count: 4, watch_later: true, available: true, score: 96.1, rank: 2, last_played_at: "2026-05-18", judged_at: "2026-03-08", selected_at: null },
  { id: 3, title: "placeholder_reel_07", storage: "C_DRIVE", file_created_at: "2026-06-01", tier1_status: -1, tier2_status: "none", view_days: 0, liked: false, like_count: 0, watch_later: false, available: true, score: 0, rank: 8, last_played_at: null, judged_at: null, selected_at: null },
  { id: 4, title: "test_footage_b2", storage: "EXTERNAL_HDD", file_created_at: "2026-01-19", tier1_status: 2, tier2_status: 1, view_days: 6, liked: false, like_count: 2, watch_later: false, available: false, score: 54.2, rank: 5, last_played_at: "2026-04-22", judged_at: "2026-01-22", selected_at: "2026-02-01" },
  { id: 5, title: "mock_sample_012", storage: "C_DRIVE", file_created_at: "2026-05-20", tier1_status: 1, tier2_status: "none", view_days: 3, liked: true, like_count: 1, watch_later: false, available: true, score: 41.0, rank: 6, last_played_at: "2026-05-29", judged_at: "2026-05-22", selected_at: null },
  { id: 6, title: "dummy_clip_aa9", storage: "EXTERNAL_HDD", file_created_at: "2026-02-08", tier1_status: 4, tier2_status: 4, view_days: 15, liked: true, like_count: 12, watch_later: true, available: true, score: 142.7, rank: 1, last_played_at: "2026-06-10", judged_at: "2026-02-12", selected_at: "2026-02-18" },
  { id: 7, title: "placeholder_reel_08", storage: "C_DRIVE", file_created_at: "2026-06-09", tier1_status: -1, tier2_status: "none", view_days: 0, liked: false, like_count: 0, watch_later: true, available: true, score: 0, rank: 8, last_played_at: null, judged_at: null, selected_at: null },
  { id: 8, title: "test_footage_c5", storage: "EXTERNAL_HDD", file_created_at: "2025-12-30", tier1_status: 2, tier2_status: "unselected", view_days: 5, liked: false, like_count: 3, watch_later: false, available: false, score: 58.9, rank: 4, last_played_at: "2026-04-01", judged_at: "2026-01-03", selected_at: null },
];

// Runtime control のモック（FastAPI / Next.js のみ。Streamlit は表示しない）。
export type RuntimeService = {
  name: "fastapi" | "nextjs";
  label: string;
  port: number;
  status: "running" | "stopped" | "unknown";
  last_checked: string; // 表示用の文字列（モック）
};

export const VARIANT_K_RUNTIME_MOCK: RuntimeService[] = [
  { name: "fastapi", label: "FastAPI", port: 8000, status: "running", last_checked: "12:34:56" },
  { name: "nextjs", label: "Next.js", port: 3000, status: "running", last_checked: "12:34:56" },
];

// 表示用フォーマッタ。
export function formatVariantKDate(iso: string | null): string {
  if (!iso) return "-";
  return iso.substring(0, 10).replace(/-/g, "/");
}

export function tier1Label(status: Tier1Status): string {
  return status === -1 ? "未判定" : `Lv${status}`;
}

export function tier2Label(status: Tier2Status): string {
  if (status === "none") return "—";
  if (status === "unselected") return "未選別";
  return `Lv${status}`;
}
