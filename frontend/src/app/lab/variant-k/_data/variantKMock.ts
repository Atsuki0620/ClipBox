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

// 合成のプレースホルダ動画。Tier1/Tier2 状態・利用可否・あとで見る・いいねに変化を持たせる。
// ids 13..17 は段階5（あとで見る/AVP）で 未処理／確認・見直し／処理済み候補 の3セクションと
// 利用不可×あとで見る・いいね済み×あとで見るのバリエーションを見せるために追加した。
export const VARIANT_K_VIDEOS: VariantKVideo[] = [
  { id: 1, title: "sample_clip_001", storage: "C_DRIVE", file_created_at: "2026-04-12", tier1_status: 4, tier2_status: 3, view_days: 12, liked: true, like_count: 7, watch_later: false, available: true, score: 128.4, rank: 1, last_played_at: "2026-05-30", judged_at: "2026-04-15", selected_at: "2026-04-20" },
  { id: 2, title: "demo_video_alpha", storage: "EXTERNAL_HDD", file_created_at: "2026-03-02", tier1_status: 3, tier2_status: "unselected", view_days: 9, liked: false, like_count: 4, watch_later: true, available: true, score: 96.1, rank: 2, last_played_at: "2026-05-18", judged_at: "2026-03-08", selected_at: null },
  { id: 3, title: "placeholder_reel_07", storage: "C_DRIVE", file_created_at: "2026-06-01", tier1_status: -1, tier2_status: "none", view_days: 0, liked: false, like_count: 0, watch_later: false, available: true, score: 0, rank: 8, last_played_at: null, judged_at: null, selected_at: null },
  { id: 4, title: "test_footage_b2", storage: "EXTERNAL_HDD", file_created_at: "2026-01-19", tier1_status: 2, tier2_status: 1, view_days: 6, liked: false, like_count: 2, watch_later: false, available: false, score: 54.2, rank: 5, last_played_at: "2026-04-22", judged_at: "2026-01-22", selected_at: "2026-02-01" },
  { id: 5, title: "mock_sample_012", storage: "C_DRIVE", file_created_at: "2026-05-20", tier1_status: 1, tier2_status: "none", view_days: 3, liked: true, like_count: 1, watch_later: false, available: true, score: 41.0, rank: 6, last_played_at: "2026-05-29", judged_at: "2026-05-22", selected_at: null },
  { id: 6, title: "dummy_clip_aa9", storage: "EXTERNAL_HDD", file_created_at: "2026-02-08", tier1_status: 4, tier2_status: 4, view_days: 15, liked: true, like_count: 12, watch_later: true, available: true, score: 142.7, rank: 1, last_played_at: "2026-06-10", judged_at: "2026-02-12", selected_at: "2026-02-18" },
  { id: 7, title: "placeholder_reel_08", storage: "C_DRIVE", file_created_at: "2026-06-09", tier1_status: -1, tier2_status: "none", view_days: 0, liked: false, like_count: 0, watch_later: true, available: true, score: 0, rank: 8, last_played_at: null, judged_at: null, selected_at: null },
  { id: 8, title: "test_footage_c5", storage: "EXTERNAL_HDD", file_created_at: "2025-12-30", tier1_status: 2, tier2_status: "unselected", view_days: 5, liked: false, like_count: 3, watch_later: false, available: false, score: 58.9, rank: 4, last_played_at: "2026-04-01", judged_at: "2026-01-03", selected_at: null },
  { id: 9, title: "mock_sample_013", storage: "C_DRIVE", file_created_at: "2026-06-15", tier1_status: -1, tier2_status: "none", view_days: 0, liked: false, like_count: 0, watch_later: true, available: true, score: 0, rank: 9, last_played_at: null, judged_at: null, selected_at: null },
  { id: 10, title: "dummy_clip_bb3", storage: "EXTERNAL_HDD", file_created_at: "2026-02-25", tier1_status: 0, tier2_status: "none", view_days: 2, liked: false, like_count: 0, watch_later: false, available: true, score: 22.5, rank: 7, last_played_at: "2026-05-04", judged_at: "2026-03-01", selected_at: null },
  { id: 11, title: "sample_clip_004", storage: "C_DRIVE", file_created_at: "2026-05-28", tier1_status: -1, tier2_status: "none", view_days: 1, liked: false, like_count: 0, watch_later: false, available: false, score: 0, rank: 9, last_played_at: "2026-06-02", judged_at: null, selected_at: null },
  { id: 12, title: "demo_video_delta", storage: "EXTERNAL_HDD", file_created_at: "2026-03-19", tier1_status: 3, tier2_status: "none", view_days: 8, liked: true, like_count: 5, watch_later: true, available: true, score: 88.3, rank: 3, last_played_at: "2026-05-25", judged_at: "2026-03-24", selected_at: null },
  // --- 段階5 追加（あとで見る 3セクション・AVP バリエーション用） ---
  // 確認・見直し：Tier1 判定済み × あとで見る × 最終再生なし。
  { id: 13, title: "mock_sample_021", storage: "C_DRIVE", file_created_at: "2026-05-11", tier1_status: 2, tier2_status: "none", view_days: 4, liked: false, like_count: 1, watch_later: true, available: true, score: 47.5, rank: 6, last_played_at: null, judged_at: "2026-05-14", selected_at: null },
  // 確認・見直し：Tier2 選別済み × あとで見る × 最終再生なし。
  { id: 14, title: "demo_video_epsilon", storage: "EXTERNAL_HDD", file_created_at: "2026-04-02", tier1_status: 3, tier2_status: 2, view_days: 7, liked: false, like_count: 2, watch_later: true, available: true, score: 71.0, rank: 4, last_played_at: null, judged_at: "2026-04-05", selected_at: "2026-04-09" },
  // 確認・見直し：Tier1 判定済み × いいね済み × あとで見る × 最終再生なし。
  { id: 15, title: "dummy_clip_cc1", storage: "C_DRIVE", file_created_at: "2026-05-30", tier1_status: 1, tier2_status: "none", view_days: 3, liked: true, like_count: 3, watch_later: true, available: true, score: 38.6, rank: 7, last_played_at: null, judged_at: "2026-06-02", selected_at: null },
  // 未処理：Tier2 未選別 × あとで見る（Tier1/Tier2 を混同しない表示確認用）。
  { id: 16, title: "placeholder_reel_11", storage: "EXTERNAL_HDD", file_created_at: "2026-06-12", tier1_status: 2, tier2_status: "unselected", view_days: 1, liked: false, like_count: 0, watch_later: true, available: true, score: 18.0, rank: 8, last_played_at: null, judged_at: "2026-06-14", selected_at: null },
  // 処理済み候補：Tier1 判定済み × あとで見る × 最終再生あり × 利用不可（利用不可×あとで見る確認用）。
  { id: 17, title: "test_footage_d8", storage: "EXTERNAL_HDD", file_created_at: "2026-01-08", tier1_status: 4, tier2_status: "none", view_days: 11, liked: true, like_count: 6, watch_later: true, available: false, score: 102.4, rank: 2, last_played_at: "2026-05-12", judged_at: "2026-01-12", selected_at: null },
];

// Tier1 KPI（モック固定値・見た目確認用。Recharts 等は使わず軽量表示に留める）。
export const VARIANT_K_TIER1_KPI = {
  unrated_count: 312,
  judged_count: 1488,
  judged_rate: 82.7,
  today_target: 24, // 今日の処理目安
};

// 本日の判定（直近30日・軽量 SVG スパークライン用のモック）。末尾が「本日」。
export const TIER1_TODAY_TREND: number[] = [
  8, 11, 6, 9, 13, 7, 10, 5, 12, 9, 14, 11, 8, 16, 12, 10, 18, 13, 9, 15, 19, 14, 11, 17, 20, 16, 13, 21, 18, 24,
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

// 行内レベル選択（ランキング/検索の Tier 列プルダウン）の選択肢と文字列⇔値の変換。
// 値は Select 用に文字列で扱う（未判定=-1, 未選別=unselected, 0..4）。
export const TIER1_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: "-1", label: "未判定" },
  { value: "0", label: "Lv0" },
  { value: "1", label: "Lv1" },
  { value: "2", label: "Lv2" },
  { value: "3", label: "Lv3" },
  { value: "4", label: "Lv4" },
];

export const TIER2_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: "unselected", label: "未選別" },
  { value: "0", label: "Lv0" },
  { value: "1", label: "Lv1" },
  { value: "2", label: "Lv2" },
  { value: "3", label: "Lv3" },
  { value: "4", label: "Lv4" },
];

export function tier1ToSelectValue(status: Tier1Status): string {
  return String(status);
}

export function selectValueToTier1(value: string): Tier1Status {
  return Number(value);
}

export function tier2ToSelectValue(status: Tier2Status): string {
  return status === "unselected" ? "unselected" : String(status);
}

export function selectValueToTier2(value: string): Tier2Status {
  return value === "unselected" ? "unselected" : Number(value);
}
