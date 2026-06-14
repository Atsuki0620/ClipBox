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
