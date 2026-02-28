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


def test_set_judging_state_start_and_finish(tmp_db):
    """set_judging_state: True→is_judging=1, False→is_judging=0"""
    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted
            ) VALUES (?, ?, ?, ?, 1, 0)
            """,
            ("judging_test.mp4", "/tmp/judging_test.mp4", -1, "C_DRIVE"),
        )
        video_id = conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", ("judging_test.mp4",)
        ).fetchone()[0]

    manager = VideoManager()

    result = manager.set_judging_state(video_id, True)
    assert result["status"] == "success"
    with database.get_db_connection() as conn:
        row = conn.execute("SELECT is_judging FROM videos WHERE id = ?", (video_id,)).fetchone()
        assert row["is_judging"] == 1

    result = manager.set_judging_state(video_id, False)
    assert result["status"] == "success"
    with database.get_db_connection() as conn:
        row = conn.execute("SELECT is_judging FROM videos WHERE id = ?", (video_id,)).fetchone()
        assert row["is_judging"] == 0


def test_set_favorite_level_file_not_found_leaves_db_unchanged(tmp_path, tmp_db):
    """ファイル不在時にDBの current_favorite_level が変更されない"""
    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted
            ) VALUES (?, ?, ?, ?, 0, 0)
            """,
            ("missing.mp4", str(tmp_path / "missing.mp4"), 2, "C_DRIVE"),
        )
        video_id = conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", ("missing.mp4",)
        ).fetchone()[0]

    manager = VideoManager()
    result = manager.set_favorite_level_with_rename(video_id, 3)

    assert result["status"] == "error"

    with database.get_db_connection() as conn:
        row = conn.execute(
            "SELECT current_favorite_level FROM videos WHERE id = ?", (video_id,)
        ).fetchone()
        assert row["current_favorite_level"] == 2


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


def test_get_unrated_random_videos_excludes_nonexistent_files(tmp_path, tmp_db):
    """get_unrated_random_videos は実在しないファイルの動画を除外する（外付けHDD未接続想定）"""
    existing_file = tmp_path / "exists.mp4"
    existing_file.touch()
    # missing_file は作成しない（外付けHDD未接続をシミュレート）
    missing_path = tmp_path / "missing.mp4"

    with database.get_db_connection() as conn:
        conn.execute(
            """INSERT INTO videos (essential_filename, current_full_path,
               current_favorite_level, storage_location, is_available, is_deleted)
               VALUES (?, ?, -1, 'C_DRIVE', 1, 0)""",
            ("exists.mp4", str(existing_file)),
        )
        conn.execute(
            """INSERT INTO videos (essential_filename, current_full_path,
               current_favorite_level, storage_location, is_available, is_deleted)
               VALUES (?, ?, -1, 'EXTERNAL_HDD', 1, 0)""",
            ("missing.mp4", str(missing_path)),
        )

    manager = VideoManager()
    videos = manager.get_unrated_random_videos(10)

    filenames = [v.essential_filename for v in videos]
    assert "exists.mp4" in filenames, "実在ファイルは表示される"
    assert "missing.mp4" not in filenames, "不在ファイルは除外される"


def test_set_favorite_level_updates_db_level(tmp_path, tmp_db):
    """set_favorite_level_with_rename 後、DB の current_favorite_level が更新される

    未判定ランダムタブで判定ボタンを押した後にバッジが「未判定」のまま残るバグの
    回帰テスト。UI 層はセッション内 Video オブジェクトの current_favorite_level を
    直接書き換えてバッジを更新するため、DB の値が正しく保存されていることを確認する。
    """
    video_file = tmp_path / "target.mp4"
    video_file.touch()

    with database.get_db_connection() as conn:
        conn.execute(
            """INSERT INTO videos (essential_filename, current_full_path,
               current_favorite_level, storage_location, is_available, is_deleted)
               VALUES (?, ?, -1, 'C_DRIVE', 1, 0)""",
            ("target.mp4", str(video_file)),
        )
        video_id = conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", ("target.mp4",)
        ).fetchone()[0]

    manager = VideoManager()

    # 判定前: level=-1
    with database.get_db_connection() as conn:
        row = conn.execute(
            "SELECT current_favorite_level FROM videos WHERE id = ?", (video_id,)
        ).fetchone()
    assert row["current_favorite_level"] == -1

    # 判定実行（level=3）
    result = manager.set_favorite_level_with_rename(video_id, 3)
    assert result["status"] == "success"

    # 判定後: DB の level が 3 に更新されている
    with database.get_db_connection() as conn:
        row = conn.execute(
            "SELECT current_favorite_level FROM videos WHERE id = ?", (video_id,)
        ).fetchone()
    assert row["current_favorite_level"] == 3, "判定後は DB の current_favorite_level が新しい値に更新される"
