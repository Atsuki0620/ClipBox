"""core.models のユーティリティのテスト。"""

import pytest

from core.models import is_path_within


@pytest.mark.parametrize(
    "path,folder,expected",
    [
        ("C:/sel/a.mp4", "C:/sel", True),
        ("C:/sel", "C:/sel", True),               # フォルダ自身
        ("C:/sel/sub/c.mp4", "C:/sel", True),      # ネスト
        ("C:/selection2/b.mp4", "C:/sel", False),  # 境界バグの回帰: sel ≠ selection2
        ("C:/other/x.mp4", "C:/sel", False),
        ("", "C:/sel", False),
        ("C:/sel/a.mp4", "", False),
    ],
)
def test_is_path_within(path, folder, expected):
    assert is_path_within(path, folder) is expected
