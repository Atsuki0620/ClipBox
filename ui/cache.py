"""
UI キャッシュ層

@st.cache_data を使用する関数をここに集約する。
core/ モジュールはこのファイルを import しないこと（レイヤー方向: UI → core）。
"""

import streamlit as st

from core import database
from core.database import get_db_connection


@st.cache_data(ttl=30)
def get_filter_options() -> tuple[list[int], list[str], list[str]]:
    """フィルタオプションを取得（お気に入り、登場人物、保存場所）
    30秒間キャッシュしてDBクエリを削減
    """
    with get_db_connection() as conn:
        favorite_levels = database.get_distinct_favorite_levels(conn)
        performers = database.get_distinct_performers(conn)
        storage_locations = database.get_distinct_storage_locations(conn)
    return favorite_levels, performers, storage_locations


@st.cache_data(ttl=10)
def get_view_counts_and_last_viewed() -> tuple[dict, dict]:
    """視聴回数と最終視聴日時のマップを返す
    10秒間キャッシュしてDBクエリを削減
    """
    with get_db_connection() as conn:
        view_counts = database.get_view_counts_map(conn)
        last_viewed = database.get_last_viewed_map(conn)
    return view_counts, last_viewed


@st.cache_data(ttl=30)
def get_metrics() -> tuple[int, int]:
    """総動画数と総視聴回数を返す
    30秒間キャッシュしてDBクエリを削減
    """
    with get_db_connection() as conn:
        total_videos = database.get_total_videos_count(conn)
        total_views = database.get_total_views_count(conn)
    return total_videos, total_views


@st.cache_data(ttl=10)
def get_kpi_stats_cached() -> dict:
    """KPI統計を取得（10秒間キャッシュ）"""
    from ui.components.kpi_display import get_kpi_stats
    with get_db_connection() as conn:
        return get_kpi_stats(conn)
