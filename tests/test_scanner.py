import pytest

from core.scanner import extract_essential_filename


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
