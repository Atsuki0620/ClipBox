// UIラボ専用の設定画面モックデータ。
// 【役割】設定コンソール（/lab/settings/variant-j）で表示する固定データ。実 DB/API/localStorage には一切接続しない。
//   現行設定の合成値（パス・プレイヤー等）と、状態サマリー、UI検討用のバックアップ/スキャン履歴・Runtime 状態を持つ。
// 【設計制約】
//   - API・DB・localStorage に触れない（純粋な定数とフォーマッタのみ）。
//   - パス・ファイル名は明らかに合成のプレースホルダにする（実在パス/個人情報は置かない）。
//   - すべて決定論的（乱数・実時刻に依存しない＝ハイドレーション安全）。
// 【依存関係】どのモジュールにも依存しない。

// 現行設定の合成初期値（実在パスは置かない）。
export const SETTINGS_DEFAULTS = {
  library_roots: ["D:\\Library\\sample-root-a", "E:\\Media\\sample-root-b"],
  selection_folder: "D:\\Library\\selection-sample",
  default_player: "C:\\Apps\\SamplePlayer\\player.exe",
  avp_exe_path: "C:\\Apps\\AVP\\avp.exe",
  db_path: "D:\\ClipBox\\data\\videos.db",
  card_show_storage: true,
  card_show_file_size: false,
  card_show_last_viewed: false,
  card_show_file_modified: false,
};

// 保存先（ライブラリルートの所在）を C/HDD に振り分けた合成一覧。
export type StoragePathRow = {
  path: string;
  storage: "C_DRIVE" | "EXTERNAL_HDD";
  videoCount: number;
  available: boolean;
};

export const SETTINGS_STORAGE_PATHS: StoragePathRow[] = [
  { path: "D:\\Library\\sample-root-a", storage: "EXTERNAL_HDD", videoCount: 1180, available: true },
  { path: "E:\\Media\\sample-root-b", storage: "EXTERNAL_HDD", videoCount: 524, available: true },
  { path: "C:\\ClipBox\\sample", storage: "C_DRIVE", videoCount: 96, available: true },
];

// 状態サマリー（KPI）用の合成値。
export const SETTINGS_SUMMARY = {
  library_video_count: 1800,
  last_scan_at: "2026-06-13 22:10",
  last_backup_at: "2026-06-14 09:02",
  config_updated_at: "2026-06-14 09:05",
};

// 【UI検討】バックアップ履歴（現行機能なし＝モック表現）。
export type BackupRow = { filename: string; size_bytes: number; created_at: string };

const GB = 1024 ** 3;
export const SETTINGS_BACKUP_HISTORY: BackupRow[] = [
  { filename: "videos_20260614.db", size_bytes: Math.round(0.42 * GB), created_at: "2026-06-14 09:02" },
  { filename: "videos_20260612.db", size_bytes: Math.round(0.41 * GB), created_at: "2026-06-12 21:48" },
  { filename: "videos_20260609.db", size_bytes: Math.round(0.41 * GB), created_at: "2026-06-09 08:31" },
  { filename: "videos_20260603.db", size_bytes: Math.round(0.40 * GB), created_at: "2026-06-03 19:12" },
];

// 【UI検討】スキャン履歴・状態（現行機能なし＝モック表現）。
export type ScanRow = {
  kind: "ライブラリ" | "セレクション";
  result: "成功" | "失敗";
  found_count: number;
  ran_at: string;
};

export const SETTINGS_SCAN_HISTORY: ScanRow[] = [
  { kind: "ライブラリ", result: "成功", found_count: 1800, ran_at: "2026-06-13 22:10" },
  { kind: "セレクション", result: "成功", found_count: 64, ran_at: "2026-06-12 20:33" },
  { kind: "ライブラリ", result: "失敗", found_count: 0, ran_at: "2026-06-08 07:55" },
];

// 【UI検討】Runtime 状態（現行は SidebarNav に実在。設定画面へ転用表示）。
export type RuntimeStatus = "running" | "stopped";
export type RuntimeRow = { name: string; label: string; status: RuntimeStatus; port: number };

export const SETTINGS_RUNTIME: RuntimeRow[] = [
  { name: "next", label: "Next.js（Web UI）", status: "running", port: 3000 },
  { name: "fastapi", label: "FastAPI（API）", status: "running", port: 8000 },
  { name: "streamlit", label: "Streamlit（旧 UI）", status: "stopped", port: 8501 },
];

// バックアップ等のサイズ表記（設定画面 page.tsx の formatBytes と同等の軽量版）。
export function formatBytes(value: number): string {
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

// ストレージ表示ラベル。
export function storageLabel(storage: string): string {
  return storage === "C_DRIVE" ? "C ドライブ" : "外付け HDD";
}

// ───────────────────────── scan-first Variant 用（追記・既存は不変） ─────────────────────────
// 【役割】/lab/settings/variant-scan-first 専用の合成データ。スキャン中心 UI（スキャン状態・自動バックアップ履歴・
//   保守情報・サンプルカード）に必要な値を持つ。Variant J 用の既存エクスポートには一切触れていない。
// 【設計制約】上記同様: API/DB/localStorage 非接続・決定論的（ハイドレーション安全）・合成プレースホルダのみ。

// スキャンカードの状態表示。日時は yyyy/mm/dd hh:mm（カードの日付表記方針に合わせる）。
export const SETTINGS_SCAN_STATUS = {
  last_scan_at: "2026/06/15 22:10",
  last_scan_result: "成功" as "成功" | "失敗" | "未実行",
  last_scan_found: 1800, // 検出件数
  last_backup_at: "2026/06/15 22:09",
};

// バックアップ履歴（作成契機つき）。スキャン前に自動作成される運用を表現。
// 最新3件＋「さらに表示」で残りを見せるため、あえて5件持つ。
export type BackupDetailRow = {
  filename: string;
  size_bytes: number;
  created_at: string; // yyyy/mm/dd hh:mm
  trigger: "スキャン前自動";
};

export const SETTINGS_BACKUP_HISTORY_DETAILED: BackupDetailRow[] = [
  { filename: "videos_20260615_2209.db", size_bytes: Math.round(0.42 * GB), created_at: "2026/06/15 22:09", trigger: "スキャン前自動" },
  { filename: "videos_20260612_2147.db", size_bytes: Math.round(0.41 * GB), created_at: "2026/06/12 21:47", trigger: "スキャン前自動" },
  { filename: "videos_20260609_0830.db", size_bytes: Math.round(0.41 * GB), created_at: "2026/06/09 08:30", trigger: "スキャン前自動" },
  { filename: "videos_20260603_1911.db", size_bytes: Math.round(0.40 * GB), created_at: "2026/06/03 19:11", trigger: "スキャン前自動" },
  { filename: "videos_20260528_0742.db", size_bytes: Math.round(0.40 * GB), created_at: "2026/05/28 07:42", trigger: "スキャン前自動" },
];

// 保守情報（トラブル時に確認する読み取り専用の情報。Runtime 操作は持たない）。
export const SETTINGS_MAINTENANCE = {
  db_path: SETTINGS_DEFAULTS.db_path,
  config_path: "C:\\ClipBox\\config\\user_config.json",
  system_info: "Windows 11 / Python 3.12 / Next.js 16",
  app_version: "ClipBox v1.0.0",
  api_status: "接続OK" as "接続OK" | "未接続",
};

// 動画カード表示設定のサンプルカード（合成1件。トグルで表示/非表示を切り替えて反映を見せる）。
// tier1-library の ConsoleCard と同テイストで描くため、useMockCard（_components）用の like/あとで/利用可否も持つ。
export const SAMPLE_CARD = {
  title: "sample-clip-20260615.mp4",
  level: 3, // levelName/levelColor（lib/levels）で表示
  tier: 1 as 1 | 2, // 「レベル表示対象＝該当Tierのみ」の判定に使う
  storage: "EXTERNAL_HDD",
  view_count: 12,
  file_size_bytes: Math.round(1.8 * GB),
  created_at: "2026/06/15", // 作成
  modified_at: "2026/06/15", // 更新
  last_viewed_at: "2026/06/15", // 再生
  judged_at: "2026/06/15", // 判定
  like_count: 6, // ♡（useMockCard 初期値）
  watch_later: false, // あとで（useMockCard 初期値）
  is_available: true, // 利用可否（操作の有効/無効）
};
