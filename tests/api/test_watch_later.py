"""
ClipBox API - あとで見る（watch_later）エンドポイントのテスト。

POST /videos/{id}/watch-later/toggle でフラグを反転し、
GET /videos?watch_later=true で絞り込みできることを検証する。
"""

from core.database import get_db_connection


def _insert(essential, path, level=-1, *, watch_later=0):
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (essential_filename, current_full_path, current_favorite_level,
                                storage_location, is_available, is_deleted, watch_later)
            VALUES (?, ?, ?, 'C_DRIVE', 1, 0, ?)
            """,
            (essential, path, level, watch_later),
        )
        return conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", (essential,)
        ).fetchone()[0]


def test_toggle_sets_watch_later(client):
    """watch_later=0 の動画をトグルすると True になる。"""
    vid = _insert("movie.mp4", "/fake/movie.mp4")

    response = client.post(f"/api/videos/{vid}/watch-later/toggle")

    assert response.status_code == 200
    body = response.json()
    assert body["watch_later"] is True
    assert body["status"] == "success"
    with get_db_connection() as conn:
        val = conn.execute("SELECT watch_later FROM videos WHERE id = ?", (vid,)).fetchone()[0]
    assert val == 1


def test_toggle_unsets_watch_later(client):
    """watch_later=1 の動画をトグルすると False になる。"""
    vid = _insert("movie2.mp4", "/fake/movie2.mp4", watch_later=1)

    response = client.post(f"/api/videos/{vid}/watch-later/toggle")

    assert response.status_code == 200
    assert response.json()["watch_later"] is False
    with get_db_connection() as conn:
        val = conn.execute("SELECT watch_later FROM videos WHERE id = ?", (vid,)).fetchone()[0]
    assert val == 0


def test_toggle_unknown_video_returns_404(client):
    """存在しない動画IDは 404。"""
    response = client.post("/api/videos/999999/watch-later/toggle")
    assert response.status_code == 404


def test_filter_returns_only_watch_later_videos(client):
    """GET /videos?watch_later=true は watch_later=1 の動画のみ返す。"""
    vid_wl = _insert("wl.mp4", "/fake/wl.mp4", watch_later=1)
    _insert("normal.mp4", "/fake/normal.mp4", watch_later=0)

    response = client.get("/api/videos?watch_later=true")

    assert response.status_code == 200
    items = response.json()["items"]
    ids = [item["id"] for item in items]
    assert vid_wl in ids
    assert all(item["watch_later"] is True for item in items)


def test_watch_later_auto_cleared_on_level_set(client, tmp_path):
    """判定変更時に watch_later が自動解除される。"""
    file_path = tmp_path / "auto.mp4"
    file_path.write_text("x", encoding="utf-8")
    vid = _insert("auto.mp4", str(file_path), level=-1, watch_later=1)

    response = client.put(f"/api/videos/{vid}/level", json={"level": 3})

    assert response.status_code == 200
    with get_db_connection() as conn:
        val = conn.execute("SELECT watch_later FROM videos WHERE id = ?", (vid,)).fetchone()[0]
    assert val == 0
