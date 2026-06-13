"""
ClipBox - いいね機能サービス
動画への👍いいねの記録・取得を管理
"""

from datetime import datetime
from typing import Dict, List

from core.database import get_db_connection
from core.watch_later_service import clear_processed_watch_later


def add_like(video_id: int) -> int:
    """
    いいねを追加し、最新のいいね総数を返す

    Args:
        video_id: 動画ID

    Returns:
        int: 追加後のいいね総数
    """
    with get_db_connection() as conn:
        # いいねを追加
        conn.execute(
            "INSERT INTO likes (video_id, liked_at) VALUES (?, ?)",
            (video_id, datetime.now())
        )

        # 最新のいいね総数を取得
        cursor = conn.execute(
            "SELECT COUNT(*) FROM likes WHERE video_id = ?",
            (video_id,)
        )
        count = cursor.fetchone()[0]
        clear_processed_watch_later(conn, [video_id])

    return count


def get_like_counts(video_ids: List[int]) -> Dict[int, int]:
    """
    複数動画のいいね数を一括取得（N+1クエリ回避）

    Args:
        video_ids: 動画IDのリスト

    Returns:
        Dict[int, int]: {video_id: like_count} のマップ
    """
    if not video_ids:
        return {}

    with get_db_connection() as conn:
        placeholders = ",".join("?" * len(video_ids))
        cursor = conn.execute(
            f"""
            SELECT video_id, COUNT(*) as like_count
            FROM likes
            WHERE video_id IN ({placeholders})
            GROUP BY video_id
            """,
            video_ids
        )

        result = {row["video_id"]: row["like_count"] for row in cursor.fetchall()}

    # video_idsに含まれているがlikesテーブルにない動画は0を返す
    return {vid: result.get(vid, 0) for vid in video_ids}
