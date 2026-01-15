"""
ClipBox - KPI表示コンポーネント
"""

from __future__ import annotations

from typing import Dict
from sqlite3 import Connection

import streamlit as st


def render_kpi_cards(
    unrated_count: int,
    judged_count: int,
    judged_rate: float,
    today_judged_count: int,
) -> None:
    """
    KPIカードを横並びで表示する。
    """
    cols = st.columns(4)

    with cols[0]:
        st.metric(
            label="📋 未判定",
            value=f"{unrated_count}本",
            help="レベル-1かつ利用可能・未削除の動画数",
        )

    with cols[1]:
        st.metric(
            label="✅ 判定済み",
            value=f"{judged_count}本",
            help="判定済み動画数（レベル0以上）",
        )

    with cols[2]:
        st.metric(
            label="📊 判定率",
            value=f"{judged_rate:.1f}%",
            help="利用可能かつ未削除の動画に対する判定済みの割合",
        )

    with cols[3]:
        st.metric(
            label="📅 本日の判定",
            value=f"{today_judged_count}本",
            help="今日0:00以降に判定した動画数（重複なし）",
        )


def get_kpi_stats(conn: Connection) -> Dict[str, float]:
    """
    KPI統計を取得する。
    """
    # 未判定数（レベル-1、利用可能、未削除）
    unrated_count = conn.execute(
        """
        SELECT COUNT(*)
          FROM videos
         WHERE current_favorite_level = -1
           AND is_available = 1
           AND is_deleted = 0
        """
    ).fetchone()[0]

    # 判定済み数（レベル0以上、利用可能、未削除）
    judged_count = conn.execute(
        """
        SELECT COUNT(*)
          FROM videos
         WHERE current_favorite_level >= 0
           AND is_available = 1
           AND is_deleted = 0
        """
    ).fetchone()[0]

    total = unrated_count + judged_count
    judged_rate = (judged_count / total * 100) if total else 0.0

    # 本日の判定数（judgment_history が無い場合は 0 とする）
    try:
        today_judged_count = conn.execute(
            """
            SELECT COUNT(DISTINCT video_id)
              FROM judgment_history
             WHERE DATE(judged_at) = DATE('now','localtime')
            """
        ).fetchone()[0]
    except Exception:
        today_judged_count = 0

    return {
        "unrated_count": int(unrated_count),
        "judged_count": int(judged_count),
        "judged_rate": float(judged_rate),
        "today_judged_count": int(today_judged_count),
    }
