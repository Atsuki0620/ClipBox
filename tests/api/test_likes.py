"""
ClipBox API - いいねエンドポイントのテスト。
"""

from core.database import get_db_connection


def _insert(essential, path):
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (essential_filename, current_full_path, current_favorite_level,
                                storage_location, is_available, is_deleted)
            VALUES (?, ?, 1, 'C_DRIVE', 1, 0)
            """,
            (essential, path),
        )
        return conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", (essential,)
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
