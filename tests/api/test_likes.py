"""
ClipBox API - いいねエンドポイントのテスト。
"""

from core.database import get_db_connection


def _insert(
    essential,
    path,
    *,
    level=1,
    watch_later=0,
    needs_selection=0,
    is_selection_completed=0,
):
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (essential_filename, current_full_path, current_favorite_level,
                                storage_location, is_available, is_deleted, watch_later,
                                needs_selection, is_selection_completed)
            VALUES (?, ?, ?, 'C_DRIVE', 1, 0, ?, ?, ?)
            """,
            (essential, path, level, watch_later, needs_selection, is_selection_completed),
        )
        return conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", (essential,)
        ).fetchone()[0]


def _watch_later_value(video_id):
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT watch_later FROM videos WHERE id = ?", (video_id,)
        ).fetchone()[0]


def test_add_like_increments(client):
    """いいね追加で件数が増える。"""
    vid = _insert("a.mp4", "C:/x/a.mp4")

    first = client.post(f"/api/videos/{vid}/like").json()
    assert first == {"video_id": vid, "like_count": 1}

    second = client.post(f"/api/videos/{vid}/like").json()
    assert second["like_count"] == 2


def test_add_like_404_for_missing_video(client):
    """存在しない動画へのいいねは 404（FK 500 にしない）。"""
    assert client.post("/api/videos/999999/like").status_code == 404


def test_get_likes_batch(client):
    """複数動画のいいね数を一括取得（いいねなしは 0）。"""
    a = _insert("a.mp4", "C:/x/a.mp4")
    b = _insert("b.mp4", "C:/x/b.mp4")
    client.post(f"/api/videos/{a}/like")

    body = client.get("/api/likes", params={"video_ids": f"{a},{b}"}).json()
    assert body[str(a)] == 1
    assert body[str(b)] == 0


def test_add_like_clears_watch_later_for_judged_video(client):
    """判定済み通常動画へのいいねは watch_later を解除する。"""
    vid = _insert("judged.mp4", "C:/x/judged.mp4", level=2, watch_later=1)

    response = client.post(f"/api/videos/{vid}/like")

    assert response.status_code == 200
    assert _watch_later_value(vid) == 0


def test_add_like_keeps_watch_later_for_unrated_video(client):
    """未判定通常動画へのいいねは watch_later を解除しない。"""
    vid = _insert("unrated.mp4", "C:/x/unrated.mp4", level=-1, watch_later=1)

    response = client.post(f"/api/videos/{vid}/like")

    assert response.status_code == 200
    assert _watch_later_value(vid) == 1


def test_add_like_clears_watch_later_for_completed_selection(client):
    """選別済み動画へのいいねは watch_later を解除する。"""
    vid = _insert(
        "completed.mp4",
        "C:/x/+###_completed.mp4",
        level=3,
        watch_later=1,
        is_selection_completed=1,
    )

    response = client.post(f"/api/videos/{vid}/like")

    assert response.status_code == 200
    assert _watch_later_value(vid) == 0


def test_add_like_keeps_watch_later_for_unselected_even_when_level_set(client):
    """needs_selection=1 の未選別動画は Lv0..4 でも watch_later を解除しない。"""
    vid = _insert(
        "unselected.mp4",
        "C:/x/!###_unselected.mp4",
        level=3,
        watch_later=1,
        needs_selection=1,
    )

    response = client.post(f"/api/videos/{vid}/like")

    assert response.status_code == 200
    assert _watch_later_value(vid) == 1
