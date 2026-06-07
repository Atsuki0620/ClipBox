import pytest

import core.database as database
from core.scanner import extract_essential_filename, FileScanner


@pytest.mark.parametrize(
    "filename, expected",
    [
        ("####_movie.mp4", (4, "movie.mp4", False, False)),
        ("###_movie.mp4", (3, "movie.mp4", False, False)),
        ("##_movie.mp4", (2, "movie.mp4", False, False)),
        ("#_movie.mp4", (1, "movie.mp4", False, False)),
        ("_movie.mp4", (0, "movie.mp4", False, False)),
    ],
)
def test_extract_essential_filename_levels(filename, expected):
    assert extract_essential_filename(filename) == expected


def test_extract_essential_filename_no_prefix():
    assert extract_essential_filename("movie.mp4") == (-1, "movie.mp4", False, False)


def test_extract_essential_filename_selection_with_level():
    assert extract_essential_filename("!###_movie.mp4") == (3, "movie.mp4", True, False)


def test_extract_essential_filename_selection_level_zero():
    # !_file.mp4 → level=0
    assert extract_essential_filename("!_movie.mp4") == (0, "movie.mp4", True, False)


def test_extract_essential_filename_selection_no_level():
    # !movie.mp4 (no underscore) → level=-1
    assert extract_essential_filename("!movie.mp4") == (-1, "movie.mp4", True, False)


def test_extract_essential_filename_selection_completed_with_level():
    assert extract_essential_filename("+###_movie.mp4") == (3, "movie.mp4", False, True)


def test_extract_essential_filename_selection_completed_level_zero():
    assert extract_essential_filename("+_movie.mp4") == (0, "movie.mp4", False, True)


def test_extract_essential_filename_selection_completed_no_level():
    assert extract_essential_filename("+movie.mp4") == (-1, "movie.mp4", False, True)


def test_scan_updates_all_not_found_videos_is_available(tmp_path, tmp_db):
    """Cドライブのみスキャンすると、HDD内の見つからなかった動画も is_available=0 になる"""
    c_drive = tmp_path / "c_drive"
    hdd = tmp_path / "hdd"
    c_drive.mkdir()
    hdd.mkdir()

    c_file = c_drive / "movie_c.mp4"
    hdd_file = hdd / "movie_h.mp4"
    c_file.write_bytes(b"dummy")
    hdd_file.write_bytes(b"dummy")

    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted
            ) VALUES (?, ?, -1, 'C_DRIVE', 1, 0)
            """,
            ("movie_c.mp4", str(c_file)),
        )
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted
            ) VALUES (?, ?, -1, 'EXTERNAL_HDD', 1, 0)
            """,
            ("movie_h.mp4", str(hdd_file)),
        )

    # c_drive のみスキャン（hdd_file は物理ファイルが存在するが c_drive に含まれない）
    scanner = FileScanner([c_drive])
    with database.get_db_connection() as conn:
        scanner.scan_and_update(conn)

    with database.get_db_connection() as conn:
        c_row = conn.execute(
            "SELECT is_available FROM videos WHERE essential_filename = ?", ("movie_c.mp4",)
        ).fetchone()
        h_row = conn.execute(
            "SELECT is_available FROM videos WHERE essential_filename = ?", ("movie_h.mp4",)
        ).fetchone()

    assert c_row["is_available"] == 1  # スキャン済み・存在 → is_available=1
    assert h_row["is_available"] == 0  # スキャン対象外 → is_available=0


def test_scan_keeps_protected_root_records_available(tmp_path, tmp_db):
    library = tmp_path / "library"
    selection = tmp_path / "selection"
    library.mkdir()
    selection.mkdir()

    library_file = library / "library.mp4"
    selection_file = selection / "!selection.mp4"
    outside_file = tmp_path / "outside.mp4"
    library_file.write_bytes(b"dummy")
    selection_file.write_bytes(b"dummy")
    outside_file.write_bytes(b"dummy")

    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted
            ) VALUES (?, ?, -1, 'C_DRIVE', 1, 0)
            """,
            ("selection.mp4", str(selection_file)),
        )
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted
            ) VALUES (?, ?, -1, 'C_DRIVE', 1, 0)
            """,
            ("outside.mp4", str(outside_file)),
        )

    scanner = FileScanner([library], protected_roots=[selection])
    with database.get_db_connection() as conn:
        scanner.scan_and_update(conn)

    with database.get_db_connection() as conn:
        selection_row = conn.execute(
            "SELECT is_available FROM videos WHERE essential_filename = ?",
            ("selection.mp4",),
        ).fetchone()
        outside_row = conn.execute(
            "SELECT is_available FROM videos WHERE essential_filename = ?",
            ("outside.mp4",),
        ).fetchone()

    assert selection_row["is_available"] == 1
    assert outside_row["is_available"] == 0


def test_scan_single_directory_marks_missing_files_in_that_directory_unavailable(tmp_path, tmp_db):
    selection = tmp_path / "selection"
    sibling = tmp_path / "selection2"
    selection.mkdir()
    sibling.mkdir()

    existing_file = selection / "!existing.mp4"
    missing_file = selection / "!missing.mp4"
    sibling_file = sibling / "!sibling.mp4"
    existing_file.write_bytes(b"dummy")
    sibling_file.write_bytes(b"dummy")

    with database.get_db_connection() as conn:
        for essential, path in (
            ("existing.mp4", existing_file),
            ("missing.mp4", missing_file),
            ("sibling.mp4", sibling_file),
        ):
            conn.execute(
                """
                INSERT INTO videos (
                    essential_filename, current_full_path, current_favorite_level,
                    storage_location, is_available, is_deleted, needs_selection
                ) VALUES (?, ?, -1, 'C_DRIVE', 1, 0, 1)
                """,
                (essential, str(path)),
            )

    scanner = FileScanner([selection])
    with database.get_db_connection() as conn:
        assert scanner.scan_single_directory(selection, conn) == 1

    with database.get_db_connection() as conn:
        rows = {
            row["essential_filename"]: row["is_available"]
            for row in conn.execute(
                "SELECT essential_filename, is_available FROM videos"
            ).fetchall()
        }

    assert rows["existing.mp4"] == 1
    assert rows["missing.mp4"] == 0
    assert rows["sibling.mp4"] == 1


def test_scan_does_not_change_is_available_when_no_files_found(tmp_path, tmp_db):
    """スキャン対象に存在しないパスを指定しても既存レコードの is_available は変わらない"""
    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted
            ) VALUES (?, ?, -1, 'C_DRIVE', 1, 0)
            """,
            ("existing.mp4", str(tmp_path / "existing.mp4")),
        )

    nonexistent = tmp_path / "nonexistent_dir"
    scanner = FileScanner([nonexistent])
    with database.get_db_connection() as conn:
        scanner.scan_and_update(conn)

    with database.get_db_connection() as conn:
        row = conn.execute(
            "SELECT is_available FROM videos WHERE essential_filename = ?", ("existing.mp4",)
        ).fetchone()

    assert row["is_available"] == 1  # スキャン対象ディレクトリが存在しない → 更新なし
