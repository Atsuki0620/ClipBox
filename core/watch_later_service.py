"""
ClipBox - あとで見る状態の共通更新サービス。

役割:
    watch_later の一括解除と、判定済み/選別済み動画に対する条件付き自動解除を提供する。

【設計制約】
- DB 接続は呼び出し元のトランザクションを受け取るか、get_db_connection() 経由で作成する。
- `needs_selection=1` の Tier2 未選別は、レベル値が 0..4 でも処理済み扱いにしない。
- API/画面の状態永続先は変更しない。watch_later は DB 永続。

【依存関係】
core.watch_later_service → core.database.get_db_connection
"""

from __future__ import annotations

from typing import Iterable

from core.database import get_db_connection


PROCESSED_WATCH_LATER_WHERE = """
(
    (current_favorite_level >= 0 AND COALESCE(needs_selection, 0) = 0)
    OR COALESCE(is_selection_completed, 0) = 1
)
"""


def normalize_video_ids(video_ids: Iterable[int]) -> list[int]:
    """正の整数 ID だけを入力順に重複排除する。"""
    normalized: list[int] = []
    seen: set[int] = set()
    for raw_id in video_ids:
        try:
            video_id = int(raw_id)
        except (TypeError, ValueError):
            continue
        if video_id <= 0 or video_id in seen:
            continue
        normalized.append(video_id)
        seen.add(video_id)
    return normalized


def clear_watch_later_for_ids(video_ids: Iterable[int]) -> int:
    """指定 ID の watch_later を解除する。削除済み・存在しない ID は無視する。"""
    ids = normalize_video_ids(video_ids)
    if not ids:
        return 0

    placeholders = ",".join("?" for _ in ids)
    with get_db_connection() as conn:
        cursor = conn.execute(
            f"""
            UPDATE videos
               SET watch_later = 0
             WHERE id IN ({placeholders})
               AND is_deleted = 0
               AND watch_later = 1
            """,
            ids,
        )
        return cursor.rowcount


def clear_processed_watch_later(conn, video_ids: Iterable[int]) -> int:
    """処理済み条件を満たす動画だけ watch_later を解除する。同一トランザクション内で使う。"""
    ids = normalize_video_ids(video_ids)
    if not ids:
        return 0

    placeholders = ",".join("?" for _ in ids)
    cursor = conn.execute(
        f"""
        UPDATE videos
           SET watch_later = 0
         WHERE id IN ({placeholders})
           AND is_deleted = 0
           AND watch_later = 1
           AND {PROCESSED_WATCH_LATER_WHERE}
        """,
        ids,
    )
    return cursor.rowcount
