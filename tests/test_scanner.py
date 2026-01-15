import pytest

from core.scanner import extract_essential_filename


@pytest.mark.parametrize(
    "filename, expected",
    [
        ("####_movie.mp4", (4, "movie.mp4")),
        ("###_movie.mp4", (3, "movie.mp4")),
        ("##_movie.mp4", (2, "movie.mp4")),
        ("#_movie.mp4", (1, "movie.mp4")),
        ("_movie.mp4", (0, "movie.mp4")),
    ],
)
def test_extract_essential_filename_levels(filename, expected):
    assert extract_essential_filename(filename) == expected


def test_extract_essential_filename_minus_one_prefix():
    assert extract_essential_filename("?_movie.mp4") == (-1, "movie.mp4")


def test_extract_essential_filename_minus_one_no_prefix():
    assert extract_essential_filename("movie.mp4") == (-1, "movie.mp4")
