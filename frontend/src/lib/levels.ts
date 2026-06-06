// お気に入りレベルの表示・色（config.py FAVORITE_LEVEL_NAMES / video_card.py に対応）。

export const LEVEL_NAMES: Record<number, string> = {
  [-1]: "未判定",
  0: "Lv0",
  1: "Lv1",
  2: "Lv2",
  3: "Lv3",
  4: "Lv4",
};

export const LEVEL_COLORS: Record<number, string> = {
  4: "#1d4ed8",
  3: "#2563eb",
  2: "#3b82f6",
  1: "#93c5fd",
  0: "#d1d5db",
  [-1]: "#94a3b8",
};

export function levelName(level: number): string {
  return LEVEL_NAMES[level] ?? "未判定";
}

export function levelColor(level: number): string {
  return LEVEL_COLORS[level] ?? "#94a3b8";
}

// 判定用 select の選択肢（未判定 + Lv0..Lv4）。
export const LEVEL_OPTIONS: number[] = [-1, 0, 1, 2, 3, 4];

export function storageLabel(storage: string): string {
  return storage === "C_DRIVE" ? "C" : storage === "EXTERNAL_HDD" ? "HDD" : storage;
}
