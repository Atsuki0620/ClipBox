"""
ClipBox API - 動画 mutation ルーター（再生・判定）。

役割:
    `POST /videos/{id}/play`（ローカル再生 + 視聴履歴）と `PUT /videos/{id}/level`
    （お気に入りレベル変更 + リネーム + 判定履歴）を提供する。

【設計制約】
- `core.app_service` のファサード経由でのみ DB にアクセスする。
- HTTP ステータスのマッピング（core は非改変・メッセージ文字列に依存しない堅牢方式）:
    - 事前に `get_videos_by_ids([id])` で存在確認 → 無ければ 404。
    - 実行後 `status=='error'` のとき、対象を再 query して `is_available==0` なら 409
      （ファイル不在）、それ以外（再生失敗・リネーム時 race 等）は 500。
    - 成功は 200。
- `streamlit` を import しない。

【依存関係】
api.actions → core.app_service → core.video_manager.VideoManager.play_video / set_favorite_level_with_rename
api.actions → api.schemas（PlayRequest / LevelRequest / StatusMessageResponse）
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException

from core import app_service
from api.schemas import LevelRequest, PlayRequest, StatusMessageResponse, WatchLaterResponse

router = APIRouter()


def _ensure_exists(video_id: int) -> None:
    """動画が存在しなければ 404 を投げる。"""
    if not app_service.get_videos_by_ids([video_id]):
        raise HTTPException(status_code=404, detail="動画が見つかりません")


def _map_mutation_result(video_id: int, result: dict) -> StatusMessageResponse:
    """core の {status, message} を HTTP ステータスへマップする。"""
    if result.get("status") == "success":
        return StatusMessageResponse(status="success", message=result.get("message", ""))

    # エラー: ファイル不在（is_available が 0 に落ちた）なら 409、それ以外は 500
    videos = app_service.get_videos_by_ids([video_id])
    message = result.get("message", "操作に失敗しました")
    if videos and not videos[0].is_available:
        raise HTTPException(status_code=409, detail=message)
    raise HTTPException(status_code=500, detail=message)


@router.post("/videos/{video_id}/play", response_model=StatusMessageResponse)
def play(video_id: int, body: Optional[PlayRequest] = None) -> StatusMessageResponse:
    """動画をローカルプレイヤーで再生し視聴履歴を記録する。"""
    _ensure_exists(video_id)
    kwargs = body.model_dump(exclude_none=True) if body else {}
    result = app_service.play_video(video_id, **kwargs)
    return _map_mutation_result(video_id, result)


@router.put("/videos/{video_id}/level", response_model=StatusMessageResponse)
def set_level(video_id: int, body: LevelRequest) -> StatusMessageResponse:
    """お気に入りレベルを変更し、ファイル名をプレフィックス付きでリネームする。"""
    _ensure_exists(video_id)
    result = app_service.set_favorite_level_with_rename(video_id, body.level)
    return _map_mutation_result(video_id, result)


@router.put("/videos/{video_id}/unselect", response_model=StatusMessageResponse)
def unselect(video_id: int) -> StatusMessageResponse:
    """Tier2: レベルを維持して未選別状態に戻す。"""
    _ensure_exists(video_id)
    result = app_service.unselect_video(video_id)
    return _map_mutation_result(video_id, result)


@router.post("/videos/{video_id}/watch-later/toggle", response_model=WatchLaterResponse)
def toggle_watch_later(video_id: int) -> WatchLaterResponse:
    """あとで見るフラグを反転する。"""
    _ensure_exists(video_id)
    try:
        new_val = app_service.toggle_watch_later(video_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    label = "登録" if new_val else "解除"
    return WatchLaterResponse(
        status="success",
        message=f"あとで見るを{label}しました",
        watch_later=new_val,
    )
