"""
ClipBox - VideoManagerのテスト
"""

from pathlib import Path

import core.database as database
from core.video_manager import VideoManager, video_from_row


def test_video_manager_initialization():
    """VideoManagerの初期化テスト"""
    manager = VideoManager()
    assert manager is not None


def test_set_favorite_level_with_rename_logs_history(tmp_path, tmp_db, monkeypatch):
    """set_favorite_level_with_renameが履歴を記録し未判定へリネームする"""
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


def test_selection_judgment_syncs_column_and_clears_watch_later(tmp_path, tmp_db):
    """セレクション動画(!)の判定で + 付与・is_selection_completed=1・needs_selection=0・watch_later 解除（R5）"""
    selection_file = tmp_path / "!movie.mp4"
    selection_file.write_text("dummy")

    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted, needs_selection, watch_later
            ) VALUES (?, ?, -1, 'C_DRIVE', 1, 0, 1, 1)
            """,
            ("movie.mp4", str(selection_file)),
        )
        video_id = conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", ("movie.mp4",)
        ).fetchone()[0]

    result = VideoManager().set_favorite_level_with_rename(video_id, 3)
    assert result["status"] == "success"

    new_path = tmp_path / "+###_movie.mp4"
    assert new_path.exists()

    with database.get_db_connection() as conn:
        row = conn.execute(
            "SELECT current_full_path, needs_selection, is_selection_completed, watch_later"
            " FROM videos WHERE id = ?",
            (video_id,),
        ).fetchone()
    assert Path(row["current_full_path"]).name == "+###_movie.mp4"
    assert row["needs_selection"] == 0
    assert row["is_selection_completed"] == 1, "+ 付与に合わせ列が同期される"
    assert row["watch_later"] == 0, "選別完了で あとで見る が自動解除される"


def test_non_selection_judgment_clears_watch_later_without_plus(tmp_path, tmp_db):
    """通常動画の判定で watch_later 解除・is_selection_completed=0・+ なし"""
    video_file = tmp_path / "clip.mp4"
    video_file.write_text("dummy")

    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted, needs_selection, watch_later
            ) VALUES (?, ?, -1, 'C_DRIVE', 1, 0, 0, 1)
            """,
            ("clip.mp4", str(video_file)),
        )
        video_id = conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", ("clip.mp4",)
        ).fetchone()[0]

    result = VideoManager().set_favorite_level_with_rename(video_id, 2)
    assert result["status"] == "success"

    with database.get_db_connection() as conn:
        row = conn.execute(
            "SELECT current_full_path, is_selection_completed, watch_later"
            " FROM videos WHERE id = ?",
            (video_id,),
        ).fetchone()
    assert Path(row["current_full_path"]).name == "##_clip.mp4"
    assert row["is_selection_completed"] == 0
    assert row["watch_later"] == 0, "判定済み(level>=0)で あとで見る が自動解除される"


def test_video_from_row_carries_watch_later(tmp_db):
    """row→Video マッパーが watch_later を保持する（R8）"""
    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted, watch_later
            ) VALUES (?, ?, 1, 'C_DRIVE', 1, 0, 1)
            """,
            ("wl.mp4", "C:/videos/#_wl.mp4"),
        )
        row = conn.execute(
            "SELECT * FROM videos WHERE essential_filename = ?", ("wl.mp4",)
        ).fetchone()

    video = video_from_row(row)
    assert video.watch_later is True


def test_get_videos_watch_later_filter(tmp_db):
    """get_videos の watch_later_filter で あとで見る動画のみ/以外を絞り込める（R8）"""
    with database.get_db_connection() as conn:
        conn.executemany(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted, watch_later
            ) VALUES (?, ?, 1, 'C_DRIVE', 1, 0, ?)
            """,
            [
                ("later.mp4", "C:/videos/#_later.mp4", 1),
                ("normal.mp4", "C:/videos/#_normal.mp4", 0),
            ],
        )

    manager = VideoManager()
    later_only = {v.essential_filename for v in manager.get_videos(watch_later_filter=True)}
    rest_only = {v.essential_filename for v in manager.get_videos(watch_later_filter=False)}

    assert later_only == {"later.mp4"}
    assert "normal.mp4" in rest_only
    assert "later.mp4" not in rest_only


def test_get_latest_judged_at_map_tier_separation_and_latest(tmp_db):
    """get_latest_judged_at_map が Tier 別に最新 judged_at を返す（PR1 判定日時ソート）"""
    with database.get_db_connection() as conn:
        conn.executemany(
            """INSERT INTO videos (id, essential_filename, current_full_path,
               current_favorite_level, storage_location, is_available, is_deleted)
               VALUES (?, ?, ?, 1, 'C_DRIVE', 1, 0)""",
            [
                (1, "a.mp4", "C:/a.mp4"),
                (2, "b.mp4", "C:/b.mp4"),
            ],
        )
        conn.executemany(
            """INSERT INTO judgment_history (video_id, new_level, judged_at, was_selection_judgment)
               VALUES (?, ?, ?, ?)""",
            [
                (1, 1, "2026-06-01 10:00:00", 0),  # Tier1 旧
                (1, 2, "2026-06-05 10:00:00", 0),  # Tier1 最新（こちらを採用）
                (2, 1, "2026-06-03 10:00:00", 1),  # Tier2
            ],
        )

    with database.get_db_connection() as conn:
        tier1 = database.get_latest_judged_at_map(conn, selection=False)
        tier2 = database.get_latest_judged_at_map(conn, selection=True)

    assert tier1 == {1: "2026-06-05 10:00:00"}
    assert tier2 == {2: "2026-06-03 10:00:00"}
