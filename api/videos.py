"""
ClipBox API - 動画一覧ルーター（Phase 3-A）。

役割:
    `GET /api/videos` を提供する。フィルタ条件で動画を取得し、サーバー側でソート・
    ページングして返す。

【設計制約】
- `core.app_service` のファサード経由でのみ DB にアクセスする
  （`app_service.create_video_manager().get_videos(...)`）。read-only。
- Phase 3-A のソートは Video オブジェクト上のフィールドのみ（level/modified/created/title）。
  view_count / last_viewed ソートは view-counts マップが必要なため Phase 3-B 送り。

【依存関係】
api.videos → core.app_service → core.video_manager.VideoManager.get_videos
api.videos → api.schemas.VideoOut / VideosResponse
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Query

from core import app_service
from core.models import Video
from api.schemas import VideoOut, VideosResponse

router = APIRouter()


def _sort_videos(videos: List[Video], sort: Optional[str]) -> List[Video]:
    """Video リストをソートする。未指定時は get_videos の順序を維持する。"""
    if sort == "level":
        return sorted(videos, key=lambda v: v.current_favorite_level, reverse=True)
    if sort == "modified":
        return sorted(videos, key=lambda v: v.last_file_modified or "", reverse=True)
    if sort == "created":
        return sorted(videos, key=lambda v: (v.file_created_at or v.created_at or ""), reverse=True)
    if sort == "title":
        return sorted(videos, key=lambda v: v.essential_filename.lower())
    return videos


@router.get("/videos", response_model=VideosResponse)
def list_videos(
    levels: Optional[List[int]] = Query(default=None, description="お気に入りレベル（複数可）。-1=未判定"),
    performers: Optional[List[str]] = Query(default=None, description="登場人物（複数可）"),
    storage: Optional[List[str]] = Query(default=None, description="保存場所 C_DRIVE / EXTERNAL_HDD"),
    availability: Optional[str] = Query(default=None, description="available / unavailable / 省略"),
    show_unavailable: bool = Query(default=False, description="利用不可も含める（availability 省略時のみ有効）"),
    show_deleted: bool = Query(default=False, description="論理削除済みも含める"),
    needs_selection_filter: Optional[bool] = Query(default=None, description="True=未選別のみ / False=通常のみ / 省略=全て"),
    exclude_selection: bool = Query(default=False, description="セレクション対象・完了を除外"),
    sort: Optional[str] = Query(default=None, description="level / modified / created / title"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> VideosResponse:
    """フィルタ条件に合致する動画一覧を、サーバー側ソート + ページングで返す。"""
    video_manager = app_service.create_video_manager()
    videos = video_manager.get_videos(
        favorite_levels=levels,
        performers=performers,
        storage_locations=storage,
        availability=availability,
        show_unavailable=show_unavailable,
        show_deleted=show_deleted,
        needs_selection_filter=needs_selection_filter,
        exclude_selection=exclude_selection,
    )

    videos = _sort_videos(videos, sort)

    total = len(videos)
    offset = (page - 1) * page_size
    page_items = videos[offset:offset + page_size]

    return VideosResponse(
        items=[VideoOut.from_video(v) for v in page_items],
        total=total,
        page=page,
        page_size=page_size,
    )
