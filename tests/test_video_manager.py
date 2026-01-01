"""
ClipBox - VideoManagerのテスト
"""

import pytest
from core.video_manager import VideoManager


# TODO: データベース操作を含むテストの実装
# テストデータベースのセットアップとクリーンアップを含める

def test_video_manager_initialization():
    """VideoManagerの初期化テスト"""
    manager = VideoManager()
    assert manager is not None


# 以下、実装予定のテスト項目:
# - test_get_videos_with_filters()
# - test_get_random_video()
# - test_mark_as_viewed()
# - test_get_viewing_stats()
