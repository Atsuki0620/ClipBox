"""
ClipBox API - あとで見る（watch_later）エンドポイントのテスト。

POST /videos/{id}/watch-later/toggle でフラグを反転し、
GET /videos?watch_later=true で絞り込みできることを検証する。
"""

import subprocess

from core.database import get_db_connection


def _insert(
    essential,
    path,
    level=-1,
    *,
    watch_later=0,
    needs_selection=0,
    is_selection_completed=0,
    is_deleted=0,
):
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (essential_filename, current_full_path, current_favorite_level,
                                storage_location, is_available, is_deleted, watch_later,
                                needs_selection, is_selection_completed)
            VALUES (?, ?, ?, 'C_DRIVE', 1, ?, ?, ?, ?)
            """,
            (essential, path, level, is_deleted, watch_later, needs_selection, is_selection_completed),
        )
        return conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", (essential,)
        ).fetchone()[0]


def _watch_later_value(video_id):
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT watch_later FROM videos WHERE id = ?", (video_id,)
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


def test_watch_later_auto_cleared_on_selection_completed(client, tmp_path):
    """Tier2 選別完了時に watch_later が自動解除される。"""
    file_path = tmp_path / "!###_select.mp4"
    file_path.write_text("x", encoding="utf-8")
    vid = _insert(
        "select.mp4",
        str(file_path),
        level=3,
        watch_later=1,
        needs_selection=1,
    )

    response = client.put(f"/api/videos/{vid}/level", json={"level": 3})

    assert response.status_code == 200
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT watch_later, needs_selection, is_selection_completed FROM videos WHERE id = ?",
            (vid,),
        ).fetchone()
    assert row["watch_later"] == 0
    assert row["needs_selection"] == 0
    assert row["is_selection_completed"] == 1


def test_watch_later_not_cleared_on_normal_play(client, tmp_path, monkeypatch):
    """通常再生だけでは watch_later を解除しない。"""
    file_path = tmp_path / "play.mp4"
    file_path.write_text("x", encoding="utf-8")
    vid = _insert("play.mp4", str(file_path), level=3, watch_later=1)
    monkeypatch.setattr(subprocess, "Popen", lambda *a, **k: None)

    response = client.post(f"/api/videos/{vid}/play")

    assert response.status_code == 200
    assert _watch_later_value(vid) == 1


def test_bulk_clear_watch_later_updates_existing_non_deleted_only(client):
    """一括解除は重複・不正ID・存在しないID・削除済みを安全に無視する。"""
    target_a = _insert("bulk-a.mp4", "/fake/bulk-a.mp4", watch_later=1)
    target_b = _insert("bulk-b.mp4", "/fake/bulk-b.mp4", watch_later=1)
    already_off = _insert("bulk-off.mp4", "/fake/bulk-off.mp4", watch_later=0)
    deleted = _insert("bulk-deleted.mp4", "/fake/bulk-deleted.mp4", watch_later=1, is_deleted=1)

    response = client.post(
        "/api/videos/watch-later/bulk-clear",
        json={"video_ids": [target_a, target_a, target_b, already_off, deleted, -1, 999999]},
    )

    assert response.status_code == 200
    assert response.json()["updated_count"] == 2
    assert _watch_later_value(target_a) == 0
    assert _watch_later_value(target_b) == 0
    assert _watch_later_value(already_off) == 0
    assert _watch_later_value(deleted) == 1


def test_bulk_clear_watch_later_chunks_large_id_list(client):
    """一括解除は SQLite の変数上限を避けるため大量 ID をチャンク処理する。"""
    rows = [
        (f"bulk-large-{index}.mp4", f"/fake/bulk-large-{index}.mp4")
        for index in range(905)
    ]
    with get_db_connection() as conn:
        conn.executemany(
            """
            INSERT INTO videos (essential_filename, current_full_path, current_favorite_level,
                                storage_location, is_available, is_deleted, watch_later,
                                needs_selection, is_selection_completed)
            VALUES (?, ?, -1, 'C_DRIVE', 1, 0, 1, 0, 0)
            """,
            rows,
        )
        ids = [
            row["id"]
            for row in conn.execute(
                "SELECT id FROM videos WHERE essential_filename LIKE 'bulk-large-%' ORDER BY id"
            ).fetchall()
        ]

    response = client.post(
        "/api/videos/watch-later/bulk-clear",
        json={"video_ids": ids},
    )

    assert response.status_code == 200
    assert response.json()["updated_count"] == len(ids)
    with get_db_connection() as conn:
        remaining = conn.execute(
            "SELECT COUNT(*) FROM videos WHERE essential_filename LIKE 'bulk-large-%' AND watch_later = 1"
        ).fetchone()[0]
    assert remaining == 0


def test_bulk_clear_watch_later_empty_array_succeeds(client):
    """空配列は0件更新で成功する。"""
    response = client.post("/api/videos/watch-later/bulk-clear", json={"video_ids": []})

    assert response.status_code == 200
    assert response.json()["updated_count"] == 0
