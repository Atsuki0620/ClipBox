"""
ClipBox - VideoManagerのテスト
"""

from pathlib import Path

import config as config_module
import core.database as database
from core.video_manager import VideoManager


def test_video_manager_initialization():
    """VideoManagerの初期化テスト"""
    manager = VideoManager()
    assert manager is not None


def test_set_favorite_level_with_rename_logs_history(tmp_path, tmp_db, monkeypatch):
    """set_favorite_level_with_renameが履歴を記録しレベル-1へリネームする"""
    original_file = tmp_path / "_movie.mp4"
    original_file.write_text("dummy")

    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted
            ) VALUES (?, ?, ?, ?, 1, 0)
            """,
            ("movie.mp4", str(original_file), 0, "C_DRIVE"),
        )
        video_id = conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", ("movie.mp4",)
        ).fetchone()[0]

    manager = VideoManager()
    result = manager.set_favorite_level_with_rename(video_id, -1)

    assert result["status"] == "success"

    new_path = tmp_path / "movie.mp4"
    assert new_path.exists()
    assert not original_file.exists()

    with database.get_db_connection() as conn:
        row = conn.execute(
            "SELECT current_favorite_level, current_full_path FROM videos WHERE id = ?",
            (video_id,),
        ).fetchone()
        assert row["current_favorite_level"] == -1
        assert Path(row["current_full_path"]).name == "movie.mp4"

        history = conn.execute(
            "SELECT old_level, new_level, rename_duration_ms FROM judgment_history WHERE video_id = ?",
            (video_id,),
        ).fetchone()
        assert history is not None
        assert history["old_level"] == 0
        assert history["new_level"] == -1
        assert history["rename_duration_ms"] >= 0


def test_get_videos_filters_judging_only(tmp_path, tmp_db):
    """show_judging_only=Trueで判定中動画のみ返す"""

    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted, is_judging
            ) VALUES (?, ?, ?, ?, 1, 0, 1)
            """,
            ("judging.mp4", str(tmp_path / "judging.mp4"), -1, "C_DRIVE"),
        )
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted, is_judging
            ) VALUES (?, ?, ?, ?, 1, 0, 0)
            """,
            ("normal.mp4", str(tmp_path / "normal.mp4"), -1, "C_DRIVE"),
        )

    manager = VideoManager()
    videos = manager.get_videos(show_judging_only=True)

    assert len(videos) == 1
    assert videos[0].essential_filename == "judging.mp4"
    assert videos[0].is_judging is True
