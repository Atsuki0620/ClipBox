import sqlite3
from pathlib import Path

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
