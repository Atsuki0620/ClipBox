"""
ClipBox - データモデル定義
動画情報のデータ構造を定義
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Video:
    """動画データモデル"""
    id: Optional[int]
    essential_filename: str
    current_full_path: str
    current_favorite_level: int
    file_size: Optional[int]
    performer: Optional[str]
    storage_location: str  # 'C_DRIVE' or 'EXTERNAL_HDD'
    last_file_modified: Optional[datetime]
    created_at: Optional[datetime]
    last_scanned_at: Optional[datetime]
    notes: Optional[str] = None

    @property
    def display_name(self) -> str:
        """表示用のファイル名（プレフィックス付き）"""
        if self.current_favorite_level > 0:
            prefix = '#' * self.current_favorite_level + '_'
        else:
            prefix = '_'
        return f"{prefix}{self.essential_filename}"


@dataclass
class ViewingHistory:
    """視聴履歴データモデル"""
    id: Optional[int]
    video_id: int
    viewed_at: datetime
    viewing_method: str  # 'APP_PLAYBACK', 'MANUAL_ENTRY', 'FILE_ACCESS_DETECTED'
