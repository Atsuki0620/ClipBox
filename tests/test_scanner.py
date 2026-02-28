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


def test_scan_only_updates_is_available_for_scanned_dirs(tmp_path, tmp_db):
    """スキャン済みディレクトリ内のレコードのみ is_available が更新される"""
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

    # c_drive のみスキャン → hdd レコードの is_available は変わらないはず
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

    assert c_row["is_available"] == 1  # スキャン対象 → ファイル存在 → 1 のまま
    assert h_row["is_available"] == 1  # スキャン対象外 → 変更されない


def test_scan_does_not_falsely_mark_sibling_dir_unavailable(tmp_path, tmp_db):
    """data_selection など、スキャン対象ディレクトリ名が前方一致する兄弟ディレクトリの
    ファイルを is_available=0 にしない（startswith 文字列比較バグの回帰テスト）"""
    data_dir = tmp_path / "data"
    data_selection_dir = tmp_path / "data_selection"
    data_dir.mkdir()
    data_selection_dir.mkdir()

    sel_file = data_selection_dir / "!selection.mp4"
    sel_file.write_bytes(b"dummy")

    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                storage_location, is_available, is_deleted
            ) VALUES (?, ?, -1, 'C_DRIVE', 1, 0)
            """,
            ("selection.mp4", str(sel_file)),
        )

    # data ディレクトリのみスキャン（data_selection はスキャンしない）
    scanner = FileScanner([data_dir])
    with database.get_db_connection() as conn:
        scanner.scan_and_update(conn)

    with database.get_db_connection() as conn:
        row = conn.execute(
            "SELECT is_available FROM videos WHERE essential_filename = ?", ("selection.mp4",)
        ).fetchone()

    assert row["is_available"] == 1, "data_selection のファイルは is_available=1 のままであること"


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
