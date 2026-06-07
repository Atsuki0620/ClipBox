"""
ClipBox API - Awesome Video Player 連携ルーター。

役割:
    `POST /avp/play` で指定動画を Awesome Video Player に渡して並列再生する。

【設計制約】
- `core.app_service` のファサード経由でのみ DB / 設定へアクセスする。
- AVP 起動は Streamlit 現行挙動に合わせ、viewing_history / play_history を記録しない。
- `subprocess.Popen([avp_exe_path, ...paths])` で FastAPI 実行マシン上の AVP を起動する。
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from fastapi import APIRouter, HTTPException

from core import app_service
from api.schemas import AvpPlayRequest, StatusMessageResponse

router = APIRouter()

_MAX_AVP_VIDEOS = 4


@router.post("/avp/play", response_model=StatusMessageResponse)
def play_avp(body: AvpPlayRequest) -> StatusMessageResponse:
    """最大4本の動画を Awesome Video Player で再生する。"""
    video_ids = body.video_ids
    _validate_video_ids(video_ids)

    config = app_service.load_user_config()
    avp_exe_path = str(config.get("avp_exe_path") or "").strip()
    if not avp_exe_path:
        raise HTTPException(status_code=500, detail="AVP の実行ファイルパスが設定されていません")
    if not Path(avp_exe_path).exists():
        raise HTTPException(status_code=500, detail=f"AVP の実行ファイルが見つかりません: {avp_exe_path}")

    videos = app_service.get_videos_by_ids(video_ids)
    found_ids = {v.id for v in videos}
    missing_ids = [vid for vid in video_ids if vid not in found_ids]
    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail=f"動画が見つかりません: {', '.join(map(str, missing_ids))}",
        )

    unavailable = [v.id for v in videos if not v.is_available]
    if unavailable:
        raise HTTPException(
            status_code=409,
            detail=f"利用不可の動画は AVP で再生できません: {', '.join(map(str, unavailable))}",
        )

    missing_files = [
        (v.id, v.current_full_path)
        for v in videos
        if not Path(v.current_full_path).exists()
    ]
    if missing_files:
        details = ", ".join(f"{vid}: {path}" for vid, path in missing_files)
        raise HTTPException(status_code=404, detail=f"動画ファイルが見つかりません: {details}")

    paths = [str(v.current_full_path) for v in videos]
    try:
        subprocess.Popen([avp_exe_path, *paths])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AVP の起動に失敗しました: {exc}") from exc

    return StatusMessageResponse(
        status="success",
        message=f"{len(paths)}本の動画を AVP で再生しました",
    )


def _validate_video_ids(video_ids: list[int]) -> None:
    """HTTP 400 に寄せるリクエスト意味検証。型検証は Pydantic に任せる。"""
    if not video_ids:
        raise HTTPException(status_code=400, detail="video_ids は1件以上指定してください")
    if len(video_ids) > _MAX_AVP_VIDEOS:
        raise HTTPException(status_code=400, detail="AVP で同時再生できる動画は最大4本です")
    if any(vid <= 0 for vid in video_ids):
        raise HTTPException(status_code=400, detail="video_ids は正の整数で指定してください")
    if len(set(video_ids)) != len(video_ids):
        raise HTTPException(status_code=400, detail="video_ids に重複があります")
