"""
ClipBox - VideoManagerのテスト
"""

from pathlib import Path
from datetime import datetime, timedelta

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


def test_recently_unwatched_weight_bounds():
    """最近見てない優先の重みは 1..3 に丸める。"""
    now = datetime(2026, 6, 12, 12, 0, 0)
    manager = VideoManager()

    assert manager._recently_unwatched_weight(now.isoformat(), now) == 1
    assert manager._recently_unwatched_weight((now - timedelta(days=90)).isoformat(), now) == 2
    assert manager._recently_unwatched_weight((now - timedelta(days=999)).isoformat(), now) == 3
    assert manager._recently_unwatched_weight(None, now) == 3
    assert manager._recently_unwatched_weight("not-a-date", now) == 3
    assert manager._recently_unwatched_weight((now + timedelta(days=1)).isoformat(), now) == 1


def test_get_unrated_fate_recently_unwatched_priority_uses_light_weights(tmp_path, tmp_db, monkeypatch):
    """Tier1 運命の1本 ON は最終視聴日から 1 + days/90 の軽い重みを使う。"""
    files = {
        "recent.mp4": tmp_path / "recent.mp4",
        "old.mp4": tmp_path / "old.mp4",
        "unseen.mp4": tmp_path / "unseen.mp4",
    }
    for path in files.values():
        path.write_text("x")

    with database.get_db_connection() as conn:
        for name, path in files.items():
            conn.execute(
                """INSERT INTO videos (essential_filename, current_full_path,
                   current_favorite_level, storage_location, is_available, is_deleted)
                   VALUES (?, ?, -1, 'C_DRIVE', 1, 0)""",
                (name, str(path)),
            )
        rows = conn.execute(
            "SELECT id, essential_filename FROM videos"
        ).fetchall()
        ids = {row["essential_filename"]: row["id"] for row in rows}
        now = datetime.now()
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method) VALUES (?, ?, 'APP_PLAYBACK')",
            (ids["recent.mp4"], now.isoformat()),
        )
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method) VALUES (?, ?, 'APP_PLAYBACK')",
            (ids["old.mp4"], (now - timedelta(days=180)).isoformat()),
        )

    captured = {}

    def fake_choices(population, weights, k):
        captured["weights"] = {
            video.essential_filename: weight for video, weight in zip(population, weights)
        }
        return [population[0]]

    monkeypatch.setattr("core.video_manager.random.choices", fake_choices)

    assert VideoManager().get_unrated_fate_video(recently_unwatched_priority=True) is not None
    assert captured["weights"]["recent.mp4"] == 1
    assert captured["weights"]["old.mp4"] == 3
    assert captured["weights"]["unseen.mp4"] == 3


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


def test_toggle_watch_later_toggles_and_raises_for_missing(tmp_db):
    """toggle_watch_later が値を反転し、不在IDで KeyError（論点2: アトミック UPDATE）"""
    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted, watch_later
            ) VALUES (?, ?, 1, 'C_DRIVE', 1, 0, 0)
            """,
            ("wl_toggle.mp4", "C:/videos/wl_toggle.mp4"),
        )
        video_id = conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", ("wl_toggle.mp4",)
        ).fetchone()[0]

    manager = VideoManager()
    assert manager.toggle_watch_later(video_id) is True
    assert manager.toggle_watch_later(video_id) is False

    import pytest
    with pytest.raises(KeyError):
        manager.toggle_watch_later(99999)


def test_get_videos_by_ids_excludes_deleted(tmp_db):
    """get_videos_by_ids が is_deleted=1 の動画を返さない（論点4）"""
    with database.get_db_connection() as conn:
        conn.executemany(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted
            ) VALUES (?, ?, 1, 'C_DRIVE', 1, ?)
            """,
            [
                ("alive.mp4", "C:/alive.mp4", 0),
                ("dead.mp4",  "C:/dead.mp4",  1),
            ],
        )
        rows = conn.execute(
            "SELECT id, essential_filename FROM videos WHERE essential_filename IN (?, ?)",
            ("alive.mp4", "dead.mp4"),
        ).fetchall()
        id_map = {row["essential_filename"]: row["id"] for row in rows}

    result = VideoManager().get_videos_by_ids([id_map["alive.mp4"], id_map["dead.mp4"]])
    result_filenames = {v.essential_filename for v in result}
    assert result_filenames == {"alive.mp4"}


def test_was_selection_judgment_for_completed_video(tmp_path, tmp_db):
    """+ プレフィックス動画（is_selection_completed=True）の判定で was_selection_judgment=1（論点5）"""
    completed_file = tmp_path / "+movie.mp4"
    completed_file.write_text("dummy")

    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted, needs_selection, is_selection_completed
            ) VALUES (?, ?, -1, 'C_DRIVE', 1, 0, 0, 1)
            """,
            ("movie.mp4", str(completed_file)),
        )
        video_id = conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", ("movie.mp4",)
        ).fetchone()[0]

    result = VideoManager().set_favorite_level_with_rename(video_id, 2)
    assert result["status"] == "success"

    with database.get_db_connection() as conn:
        row = conn.execute(
            "SELECT was_selection_judgment FROM judgment_history WHERE video_id = ?",
            (video_id,),
        ).fetchone()
    assert row["was_selection_judgment"] == 1
