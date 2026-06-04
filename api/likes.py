"""
ClipBox API - いいねルーター。

役割:
    `POST /videos/{id}/like`（いいね追加）と `GET /likes`（複数動画のいいね数一括取得）。

【設計制約】
- `core.app_service` のファサード経由でのみ DB にアクセスする。
- like 追加前に存在確認する（likes.video_id は FK のため、存在しない id は 404 に寄せる）。
- `streamlit` を import しない。

【依存関係】
api.likes → core.app_service → core.like_service.add_like / get_like_counts
api.likes → api.schemas（LikeResponse）, api._params（配列クエリ）
"""

from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from core import app_service
from api.schemas import LikeResponse
from api._params import csv_int_list

router = APIRouter()


@router.post("/videos/{video_id}/like", response_model=LikeResponse)
def add_like(video_id: int) -> LikeResponse:
    """動画にいいねを1件追加し、更新後のいいね数を返す。"""
    if not app_service.get_videos_by_ids([video_id]):
        raise HTTPException(status_code=404, detail="動画が見つかりません")
    count = app_service.add_like(video_id)
    return LikeResponse(video_id=video_id, like_count=count)


@router.get("/likes", response_model=Dict[int, int])
def get_likes(
    video_ids: Optional[List[str]] = Query(default=None, description="動画ID（複数可 / カンマ区切り可）"),
) -> Dict[int, int]:
    """複数動画のいいね数を一括取得する（いいねなしは 0）。"""
    ids = csv_int_list(video_ids) or []
    return app_service.get_like_counts(ids)
