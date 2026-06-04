"""
ClipBox API - 再生・判定 mutation エンドポイントのテスト。

再生は subprocess.Popen を monkeypatch して実プレイヤー起動を防ぐ。
HTTP マッピング（404 / 409 / 200）を検証する。
"""

import subprocess

from core.database import get_db_connection


def _insert(essential, path, level, *, available=1):
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (essential_filename, current_full_path, current_favorite_level,
                                storage_location, is_available, is_deleted)
            VALUES (?, ?, ?, 'C_DRIVE', ?, 0)
            """,
            (essential, path, level, available),
        )
        return conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", (essential,)
        ).fetchone()[0]


def test_play_success_records_history(client, tmp_path, monkeypatch):
    """実在ファイルの再生は 200 + 視聴履歴を1件記録する。"""
    f = tmp_path / "movie.mp4"
    f.write_text("x")
    vid = _insert("movie.mp4", str(f), 3)
    monkeypatch.setattr(subprocess, "Popen", lambda *a, **k: None)

    r = client.post(f"/api/videos/{vid}/play")
    assert r.status_code == 200
    assert r.json()["status"] == "success"

    with get_db_connection() as conn:
        cnt = conn.execute(
            "SELECT COUNT(*) FROM viewing_history WHERE video_id = ?", (vid,)
        ).fetchone()[0]
    assert cnt == 1


def test_play_file_missing_returns_409_and_marks_unavailable(client, tmp_path):
    """ファイル不在は 409 + is_available=0。"""
    vid = _insert("gone.mp4", str(tmp_path / "gone.mp4"), 3)  # ファイル未作成

    r = client.post(f"/api/videos/{vid}/play")
    assert r.status_code == 409

    with get_db_connection() as conn:
        avail = conn.execute("SELECT is_available FROM videos WHERE id = ?", (vid,)).fetchone()[0]
    assert avail == 0


def test_play_404(client):
    """存在しないIDの再生は 404。"""
    assert client.post("/api/videos/999999/play").status_code == 404


def test_set_level_success_renames_and_logs(client, tmp_path):
    """判定成功でリネーム・レベル更新・判定履歴記録。"""
    f = tmp_path / "_clip.mp4"
    f.write_text("x")
    vid = _insert("clip.mp4", str(f), 0)

    r = client.put(f"/api/videos/{vid}/level", json={"level": -1})
    assert r.status_code == 200
    assert (tmp_path / "clip.mp4").exists()
    assert not f.exists()

    with get_db_connection() as conn:
        level = conn.execute(
            "SELECT current_favorite_level FROM videos WHERE id = ?", (vid,)
        ).fetchone()[0]
        hist = conn.execute(
            "SELECT COUNT(*) FROM judgment_history WHERE video_id = ?", (vid,)
        ).fetchone()[0]
    assert level == -1
    assert hist == 1


def test_set_level_file_missing_409_leaves_db_unchanged(client, tmp_path):
    """判定対象が不在なら 409、レベルは不変・is_available=0。"""
    vid = _insert("nofile.mp4", str(tmp_path / "_nofile.mp4"), 0)  # ファイル未作成

    r = client.put(f"/api/videos/{vid}/level", json={"level": 3})
    assert r.status_code == 409

    with get_db_connection() as conn:
        level, avail = conn.execute(
            "SELECT current_favorite_level, is_available FROM videos WHERE id = ?", (vid,)
        ).fetchone()
    assert level == 0   # レベル不変
    assert avail == 0   # is_available=0


def test_set_level_404(client):
    """存在しないIDの判定は 404。"""
    assert client.put("/api/videos/999999/level", json={"level": 1}).status_code == 404


def test_set_level_out_of_range_422(client):
    """level が null / -1..4 の範囲外は 422（body 検証が先なので id 存在不要）。"""
    assert client.put("/api/videos/1/level", json={"level": 999}).status_code == 422
    assert client.put("/api/videos/1/level", json={"level": -2}).status_code == 422
