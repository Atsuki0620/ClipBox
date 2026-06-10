import sqlite3
from pathlib import Path

import core.database as database
from core.migration import Migration


def _prepare_db(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            essential_filename TEXT NOT NULL,
            current_full_path TEXT NOT NULL,
            current_favorite_level INTEGER DEFAULT 0
        )
        """
    )
    conn.executemany(
        "INSERT INTO videos (essential_filename, current_full_path, current_favorite_level) VALUES (?, ?, 0)",
        [
            ("movie_plain.mp4", "C:/videos/movie_plain.mp4"),
            ("_movie_zero.mp4", "C:/videos/_movie_zero.mp4"),
            ("#_movie_one.mp4", "C:/videos/#_movie_one.mp4"),
        ],
    )
    conn.commit()
    return conn


def test_migrate_level_0_to_minus_1(tmp_path):
    db_path = tmp_path / "test.db"
    conn = _prepare_db(db_path)
    migration = Migration(db_path)

    result = migration.migrate_level_0_to_minus_1(conn)

    updated_plain = conn.execute(
        "SELECT current_favorite_level FROM videos WHERE essential_filename = ?",
        ("movie_plain.mp4",),
    ).fetchone()[0]
    kept_zero = conn.execute(
        "SELECT current_favorite_level FROM videos WHERE essential_filename = ?",
        ("_movie_zero.mp4",),
    ).fetchone()[0]
    kept_one = conn.execute(
        "SELECT current_favorite_level FROM videos WHERE essential_filename = ?",
        ("#_movie_one.mp4",),
    ).fetchone()[0]

    assert result["status"] == "completed"
    assert result["updated_count"] == 1
    assert updated_plain == -1
    assert kept_zero == 0
    assert kept_one == 0

    # 2回目はスキップされる
    result_skip = migration.migrate_level_0_to_minus_1(conn)
    assert result_skip["status"] == "skipped"
    conn.close()


def _prepare_selection_db(db_path: Path) -> sqlite3.Connection:
    """is_selection_completed 列が陳腐化した状態のDBを構築する。"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            essential_filename TEXT NOT NULL,
            current_full_path TEXT NOT NULL,
            current_favorite_level INTEGER DEFAULT 0,
            is_selection_completed BOOLEAN DEFAULT 0
        )
        """
    )
    conn.executemany(
        "INSERT INTO videos (essential_filename, current_full_path, is_selection_completed)"
        " VALUES (?, ?, ?)",
        [
            ("a.mp4", "C:/videos/+###_a.mp4", 0),  # +動画だが列が陳腐化(0)
            ("b.mp4", "C:/videos/#_b.mp4", 1),     # 非+動画だが列が誤って1
            ("c.mp4", "C:/videos/+_c.mp4", 1),     # 既に整合(+ / 1)
            ("d.mp4", "C:/videos/d.mp4", 0),       # 既に整合(非+ / 0)
        ],
    )
    conn.commit()
    return conn


def test_resync_selection_completed(tmp_path):
    db_path = tmp_path / "test.db"
    conn = _prepare_selection_db(db_path)
    migration = Migration(db_path)

    result = migration.resync_selection_completed(conn)

    assert result["status"] == "completed"
    assert result["updated_count"] == 2  # a.mp4(0→1) と b.mp4(1→0) のみ

    def _flag(name: str) -> int:
        return conn.execute(
            "SELECT is_selection_completed FROM videos WHERE essential_filename = ?",
            (name,),
        ).fetchone()[0]

    assert _flag("a.mp4") == 1
    assert _flag("b.mp4") == 0
    assert _flag("c.mp4") == 1
    assert _flag("d.mp4") == 0

    # 2回目はログでスキップ（冪等）
    result_skip = migration.resync_selection_completed(conn)
    assert result_skip["status"] == "skipped"
    assert result_skip["updated_count"] == 0
    conn.close()


def test_init_database_idempotent_watch_later(tmp_db):
    """init_database を再実行しても watch_later 列は1つ・行数不変・no-op（移行冪等性）。"""
    with database.get_db_connection() as conn:
        conn.execute(
            "INSERT INTO videos (essential_filename, current_full_path) VALUES (?, ?)",
            ("x.mp4", "C:/x.mp4"),
        )
        before = conn.execute("SELECT COUNT(*) FROM videos").fetchone()[0]

    database.init_database()  # tmp_db が既に1回実行済み。2回目を実行。

    with database.get_db_connection() as conn:
        cols = [r[1] for r in conn.execute("PRAGMA table_info(videos)").fetchall()]
        after = conn.execute("SELECT COUNT(*) FROM videos").fetchone()[0]

    assert cols.count("watch_later") == 1
    assert after == before
