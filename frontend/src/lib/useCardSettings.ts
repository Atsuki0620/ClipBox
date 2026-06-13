// 動画カードの表示設定を useQuery(["config"]) から取得するフック。
// 複数 VideoCard インスタンスで呼んでもキャッシュを共有するためネットワーク1リクエスト。
import { useQuery } from "@tanstack/react-query";
import { getConfig } from "@/lib/api";

export interface CardSettings {
  card_show_storage: boolean;
  card_show_file_size: boolean;
  card_show_last_viewed: boolean;
  card_show_file_modified: boolean;
  card_title_max_length: number;
}

const DEFAULTS: CardSettings = {
  card_show_storage: true,
  card_show_file_size: false,
  card_show_last_viewed: false,
  card_show_file_modified: false,
  card_title_max_length: 0,
};

export function useCardSettings(): CardSettings {
  const { data } = useQuery({ queryKey: ["config"], queryFn: getConfig });
  if (!data) return DEFAULTS;
  return {
    card_show_storage: data.card_show_storage ?? DEFAULTS.card_show_storage,
    card_show_file_size: data.card_show_file_size ?? DEFAULTS.card_show_file_size,
    card_show_last_viewed: data.card_show_last_viewed ?? DEFAULTS.card_show_last_viewed,
    card_show_file_modified: data.card_show_file_modified ?? DEFAULTS.card_show_file_modified,
    card_title_max_length: data.card_title_max_length ?? DEFAULTS.card_title_max_length,
  };
}
