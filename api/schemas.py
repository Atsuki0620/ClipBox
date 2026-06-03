"""
ClipBox API - Pydantic レスポンス/リクエストモデル。

役割:
    HTTP レスポンスの JSON 形を snake_case で固定する。`core.models.Video`（dataclass）を
    API 向けの `VideoOut` に変換し、派生値（is_selection_completed / is_judged）も含める。

【設計制約】
- snake_case 固定（日本語カラム名は使わない）。
- 日時フィールドは SQLite から文字列で来るため `Optional[str]` で素通しする
  （ISO8601 文字列。pydantic で再パースしない）。
- `core` を import するのは型変換のためのみ（`core.models.Video`）。ロジックは持たない。

【依存関係】
core.models.Video → api.schemas.VideoOut（変換は VideoOut.from_video）
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel

from core.models import Video


class HealthResponse(BaseModel):
    """ヘルスチェックのレスポンス。"""

    status: str
    db_exists: bool


class VideoOut(BaseModel):
    """動画1件の API レスポンス。`Video` dataclass の全フィールド + 派生値。"""

    id: Optional[int]
    essential_filename: str
    current_full_path: str
    current_favorite_level: int
    file_size: Optional[int]
    performer: Optional[str]
    storage_location: str
    last_file_modified: Optional[str]
    created_at: Optional[str]
    last_scanned_at: Optional[str]
    notes: Optional[str]
    file_created_at: Optional[str]
    is_available: bool
    is_deleted: bool
    is_judging: bool
    needs_selection: bool
    # 派生値（dataclass の property / メソッド）
    is_selection_completed: bool
    is_judged: bool

    @classmethod
    def from_video(cls, v: Video) -> "VideoOut":
        """`core.models.Video` を VideoOut に変換する（派生値をここで評価）。"""
        return cls(
            id=v.id,
            essential_filename=v.essential_filename,
            current_full_path=v.current_full_path,
            current_favorite_level=v.current_favorite_level,
            file_size=v.file_size,
            performer=v.performer,
            storage_location=v.storage_location,
            last_file_modified=_as_str(v.last_file_modified),
            created_at=_as_str(v.created_at),
            last_scanned_at=_as_str(v.last_scanned_at),
            notes=v.notes,
            file_created_at=_as_str(v.file_created_at),
            is_available=bool(v.is_available),
            is_deleted=bool(v.is_deleted),
            is_judging=bool(v.is_judging),
            needs_selection=bool(v.needs_selection),
            is_selection_completed=v.is_selection_completed,
            is_judged=v.is_judged(),
        )


class VideosResponse(BaseModel):
    """動画一覧のページング付きレスポンス。"""

    items: List[VideoOut]
    total: int
    page: int
    page_size: int


def _as_str(value) -> Optional[str]:
    """日時等を文字列に正規化する（SQLite からは通常 str で来るが datetime も許容）。"""
    if value is None:
        return None
    return value if isinstance(value, str) else str(value)
