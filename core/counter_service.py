"""
Counter management for viewing counts (A/B/C).
"""

from datetime import datetime
from typing import List, Dict, Optional

from core.database import get_db_connection


COUNTER_IDS = ["A", "B", "C"]


def _fetch_start_times(conn) -> Dict[str, Optional[datetime]]:
    rows = conn.execute("SELECT counter_id, start_time FROM counters").fetchall()
    return {row["counter_id"]: row["start_time"] for row in rows}


def auto_start_counters(event_time: datetime):
    """
    初回視聴時に全カウンタを同時開始する。
    すでに1つでも start_time が入っていれば何もしない。
    """
    with get_db_connection() as conn:
        starts = _fetch_start_times(conn)
        if not starts or all(starts.get(cid) is None for cid in COUNTER_IDS):
            for cid in COUNTER_IDS:
                conn.execute(
                    "UPDATE counters SET start_time = ? WHERE counter_id = ?",
                    (event_time, cid),
                )


def reset_counter(counter_id: str, start_time: Optional[datetime] = None):
    """
    指定カウンタをリセット（開始時刻を現在に更新）。
    """
    if counter_id not in COUNTER_IDS:
        raise ValueError("Unknown counter id")
    start_time = start_time or datetime.now()
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE counters SET start_time = ? WHERE counter_id = ?",
            (start_time, counter_id),
        )


def get_counters_with_counts() -> List[Dict]:
    """
    カウンタ情報と現在のカウントを返す。
    """
    with get_db_connection() as conn:
        starts = _fetch_start_times(conn)
        results = []
        for cid in COUNTER_IDS:
            start_time = starts.get(cid)
            if start_time is None:
                count = 0
            else:
                count = conn.execute(
                    "SELECT COUNT(*) FROM viewing_history WHERE viewed_at >= ?",
                    (start_time,),
                ).fetchone()[0]
            results.append({"counter_id": cid, "start_time": start_time, "count": count})
        return results
