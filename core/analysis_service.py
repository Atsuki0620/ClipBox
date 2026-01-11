"""
Analytics support functions for the Analysis tab.

This module stays UI-agnostic: it provides data loading, filtering,
period conversion, and ranking helpers that can be reused from Streamlit
components without embedding any rendering logic.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterable, Literal, Optional, Sequence, Tuple

import pandas as pd

from core.database import get_db_connection

AvailabilityFilter = Literal["利用可能のみ", "利用不可のみ", "すべて"]
PeriodPreset = Literal["全期間", "直近7日", "直近30日", "直近90日", "直近180日", "カスタム"]


def load_analysis_data(is_deleted_filter: Optional[int]) -> pd.DataFrame:
    """
    videos と viewing_history を結合し、累計視聴回数付きの DataFrame を返す。

    Args:
        is_deleted_filter: 0 を指定すると削除済みを除外、None なら全件を対象。

    Returns:
        pandas.DataFrame: 動画行＋ total_view_count / last_viewed_at 付き
    """
    query = """
    SELECT
        v.*,
        COALESCE(COUNT(vh.id), 0) AS total_view_count,
        MAX(vh.viewed_at) AS last_viewed_at
      FROM videos v
      LEFT JOIN viewing_history vh ON v.id = vh.video_id
    """
    params: list = []

    if is_deleted_filter is not None:
        query += " WHERE v.is_deleted = ?"
        params.append(is_deleted_filter)

    query += " GROUP BY v.id"

    with get_db_connection() as conn:
        df = pd.read_sql_query(query, conn, params=params)

    if df.empty:
        return df

    # 型を明示しておくと後段のフィルタがシンプルになる
    for col in ("is_available", "is_deleted", "total_view_count"):
        if col in df.columns:
            df[col] = df[col].fillna(0).astype(int)

    return df


def apply_scope_filter(df: pd.DataFrame, availability_filter: AvailabilityFilter) -> pd.DataFrame:
    """is_available に基づくスコープフィルタを適用する。"""
    if df.empty:
        return df

    if availability_filter == "利用可能のみ":
        return df[df["is_available"] == 1]
    if availability_filter == "利用不可のみ":
        return df[df["is_available"] == 0]
    return df


def convert_period_filter(
    period_preset: PeriodPreset,
    custom_range: Optional[Tuple[date, date]] = None,
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """
    プリセット/カスタムの期間指定を datetime 範囲に変換する。

    Returns:
        (period_start, period_end) 両方 None なら全期間。
    Raises:
        ValueError: 未知のプリセット、またはカスタム範囲が逆転している場合。
    """
    if period_preset == "全期間":
        return None, None

    if period_preset == "カスタム":
        if custom_range is None or len(custom_range) != 2:
            return None, None
        start_date, end_date = custom_range
        if start_date > end_date:
            raise ValueError("開始日は終了日以前で指定してください。")
        period_start = datetime.combine(start_date, datetime.min.time())
        period_end = datetime.combine(end_date, datetime.max.time())
        return period_start, period_end

    days_map = {
        "直近7日": 7,
        "直近30日": 30,
        "直近90日": 90,
        "直近180日": 180,
    }
    if period_preset not in days_map:
        raise ValueError(f"未知の期間プリセットです: {period_preset}")

    period_end = datetime.now()
    period_start = period_end - timedelta(days=days_map[period_preset])
    return period_start, period_end


def calculate_period_view_count(
    df: pd.DataFrame,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
) -> pd.DataFrame:
    """
    期間内視聴回数 (period_view_count) を付与した DataFrame を返す。
    全期間指定なら total_view_count をそのまま使用する。
    """
    df_result = df.copy()

    if df_result.empty:
        df_result["period_view_count"] = 0
        return df_result

    if period_start is None and period_end is None:
        df_result["period_view_count"] = df_result["total_view_count"].fillna(0).astype(int)
        return df_result

    video_ids: list[int] = df_result["id"].tolist()
    if not video_ids:
        df_result["period_view_count"] = 0
        return df_result

    placeholders = ",".join("?" * len(video_ids))
    query = f"""
        SELECT video_id, COUNT(*) AS period_view_count
          FROM viewing_history
         WHERE viewed_at BETWEEN ? AND ?
           AND video_id IN ({placeholders})
         GROUP BY video_id
    """

    with get_db_connection() as conn:
        df_period = pd.read_sql_query(
            query,
            conn,
            params=[period_start, period_end, *video_ids],
        )

    df_result = df_result.merge(df_period, left_on="id", right_on="video_id", how="left")
    df_result["period_view_count"] = df_result["period_view_count"].fillna(0).astype(int)
    if "video_id" in df_result.columns:
        df_result = df_result.drop(columns=["video_id"])

    return df_result


def get_viewing_history(
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    video_ids: Sequence[int],
) -> pd.DataFrame:
    """期間・対象動画で絞った viewing_history を返す。"""
    if not video_ids:
        return pd.DataFrame(columns=["video_id", "viewed_at"])

    query = "SELECT video_id, viewed_at FROM viewing_history WHERE 1=1"
    params: list = []

    if period_start is not None:
        query += " AND viewed_at >= ?"
        params.append(period_start)
    if period_end is not None:
        query += " AND viewed_at <= ?"
        params.append(period_end)

    placeholders = ",".join("?" * len(video_ids))
    query += f" AND video_id IN ({placeholders}) ORDER BY viewed_at"
    params.extend(video_ids)

    with get_db_connection() as conn:
        return pd.read_sql_query(query, conn, params=params)


def get_view_count_ranking(df_filtered: pd.DataFrame, top_n: int = 50) -> pd.DataFrame:
    """period_view_count を用いたランキング DataFrame を返す。"""
    if df_filtered.empty:
        return pd.DataFrame(
            columns=["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "視聴回数"]
        )

    ranking = df_filtered.nlargest(top_n, "period_view_count").copy()
    ranking.insert(0, "順位", range(1, len(ranking) + 1))

    def _display_name(row) -> str:
        if row.get("current_full_path"):
            return Path(row["current_full_path"]).name
        return row.get("essential_filename", "")

    ranking["ファイル名"] = ranking.apply(_display_name, axis=1)
    availability_series = ranking.get("is_available", pd.Series([None] * len(ranking)))
    ranking["利用可否"] = availability_series.map({1: "利用可", 0: "利用不可"}).fillna("不明")

    storage_series = ranking.get("storage_location", pd.Series([None] * len(ranking)))
    ranking["保存場所"] = storage_series.fillna("")

    created_series = ranking.get("file_created_at", pd.Series([None] * len(ranking)))
    ranking["ファイル作成日"] = (
        pd.to_datetime(created_series, errors="coerce").dt.strftime("%Y-%m-%d").fillna("-")
    )
    ranking["お気に入りレベル"] = ranking["current_favorite_level"]
    ranking["視聴回数"] = ranking["period_view_count"]

    return ranking[
        ["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "視聴回数"]
    ]
