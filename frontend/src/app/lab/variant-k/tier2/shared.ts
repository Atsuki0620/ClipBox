// 統合 Variant K Tier2 共有: 型・文言・フィルタ/ソート・抽選ピック（純関数）。
// 【役割】Tier2 の3タブが共有する型、案1/案2の文言、合成データ向けの副作用なし処理を持つ。
// 【設計制約】API/DB/localStorage/sessionStorage に触れない。Tier1 hook との共通化はしない。
// 【依存関係】_data/variantKMock（VariantKVideo 型）のみ。

import type { VariantKVideo } from "../_data/variantKMock";

export type Tier2SelectionValue = "unselected" | 0 | 1 | 2 | 3 | 4;
export type Tier2StatusFilter = "all" | "unselected" | "completed";
export type Tier2Sort = "view_days" | "creation_date" | "selected_at";
export type Tier2CopyVariant = "reuse" | "selection";

export const TIER2_LEVELS: readonly Tier2SelectionValue[] = ["unselected", 0, 1, 2, 3, 4];

export const TIER2_STATUS_OPTIONS: { value: Tier2StatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "unselected", label: "未選別" },
  { value: "completed", label: "選別済み" },
];

export const TIER2_SORT_OPTIONS: { value: Tier2Sort; label: string }[] = [
  { value: "view_days", label: "視聴日数順" },
  { value: "creation_date", label: "作成日順" },
  { value: "selected_at", label: "選別日順" },
];

export interface Tier2Filters {
  status: Tier2StatusFilter;
  availableOnly: boolean;
  sort: Tier2Sort;
}

export const DEFAULT_TIER2_FILTERS: Tier2Filters = {
  status: "all",
  availableOnly: false,
  sort: "view_days",
};

export const TIER2_COPY: Record<
  Tier2CopyVariant,
  {
    pageDescription: string;
    libraryDescription: string;
    randomDescription: string;
    fateDescription: string;
    fixedConditionLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    noCandidateTitle: string;
    noCandidateDescription: string;
    fateIdleText: string;
    holdDescription: string;
  }
> = {
  reuse: {
    pageDescription:
      "Tier1 と近い操作感で、セレクション対象をカードから選別します。操作とカード構造は共通です。",
    libraryDescription: "Tier2対象を一覧で確認し、未選別/Lv0..Lv4・いいね・あとで見る・AVP候補を操作します。",
    randomDescription: "Tier2対象から1本を代表表示します。",
    fateDescription: "ボタンを押すと運命の1本を1本だけ引きます。",
    fixedConditionLabel: "対象: Tier2対象・再生可能・未選別優先（固定）",
    emptyTitle: "条件に一致する動画がありません",
    emptyDescription: "フィルタを見直してください。フィルタ条件は保存されません。",
    noCandidateTitle: "対象の動画がありません",
    noCandidateDescription: "Tier2対象かつ再生可能な動画がない状態です。",
    fateIdleText: "まだ引いていません。「運命の1本を引く」を押してください。",
    holdDescription:
      "引いた1本はこのタブのセッション中だけ保持されます（タブを閉じると消えます）。履歴は残しません。",
  },
  selection: {
    pageDescription:
      "一次評価済みのセレクションを、二次選別として見直すための画面です。文言だけを Tier2 寄りにしています。",
    libraryDescription:
      "セレクション対象だけを並べ、未選別のまま残すか Lv0..Lv4 で選別済みにするかを決めます。",
    randomDescription: "未選別を優先しながら、セレクション対象から確認用の1本を表示します。",
    fateDescription: "二次選別で迷ったときに、今見る1本だけを引きます。",
    fixedConditionLabel: "固定条件: セレクション対象・再生可能・未選別を優先",
    emptyTitle: "二次選別の対象がありません",
    emptyDescription: "状態フィルタか再生可否の条件を見直してください。この条件は保存されません。",
    noCandidateTitle: "引けるセレクション対象がありません",
    noCandidateDescription: "再生可能な Tier2対象がない状態です。未選別がなければ選別済みから代表表示します。",
    fateIdleText: "まだ引いていません。二次選別する1本を引いてください。",
    holdDescription:
      "引いた1本はこのタブを開いている間だけ保持する想定です。実 sessionStorage には触れていません。",
  },
};

export type Tier2Copy = (typeof TIER2_COPY)[Tier2CopyVariant];

export function isTier2Target(video: VariantKVideo): boolean {
  return video.tier2_status !== "none";
}

export function isTier2Unselected(video: VariantKVideo): boolean {
  return video.tier2_status === "unselected";
}

export function isTier2Completed(video: VariantKVideo): boolean {
  return typeof video.tier2_status === "number";
}

export function applyTier2Filters(videos: VariantKVideo[], filters: Tier2Filters): VariantKVideo[] {
  return videos.filter((video) => {
    if (!isTier2Target(video)) return false;
    if (filters.status === "unselected" && !isTier2Unselected(video)) return false;
    if (filters.status === "completed" && !isTier2Completed(video)) return false;
    if (filters.availableOnly && !video.available) return false;
    return true;
  });
}

function sortKey(video: VariantKVideo, sort: Tier2Sort): number | string {
  switch (sort) {
    case "view_days":
      return video.view_days;
    case "creation_date":
      return video.file_created_at ?? "";
    case "selected_at":
      return video.selected_at ?? "";
  }
}

export function sortTier2(videos: VariantKVideo[], sort: Tier2Sort): VariantKVideo[] {
  return [...videos].sort((a, b) => {
    const av = sortKey(a, sort);
    const bv = sortKey(b, sort);
    if (av < bv) return 1;
    if (av > bv) return -1;
    return a.id - b.id;
  });
}

export function drawableTier2Candidates(videos: VariantKVideo[]): VariantKVideo[] {
  return [...videos]
    .filter((video) => isTier2Target(video) && video.available)
    .sort((a, b) => {
      if (isTier2Unselected(a) !== isTier2Unselected(b)) return isTier2Unselected(a) ? -1 : 1;
      if (a.view_days !== b.view_days) return b.view_days - a.view_days;
      return a.id - b.id;
    });
}

export function recentlyUnwatchedFirst(videos: VariantKVideo[]): VariantKVideo[] {
  return [...videos].sort((a, b) => {
    const av = a.last_played_at ?? "";
    const bv = b.last_played_at ?? "";
    if (av < bv) return -1;
    if (av > bv) return 1;
    return a.id - b.id;
  });
}
