"""
ClipBox API - スキャン・設定・バックアップの管理ルーター。

役割:
    `POST /scan/library`・`POST /scan/selection`・`GET/PUT /config`・`POST /backup` を提供する。

【設計制約】
- `core.app_service` のファサード経由でのみ DB / 設定 / バックアップにアクセスする。
- scan/library は config の library_roots からサーバ側で scanner を構築する（app_service.scan_library）。
- scan/selection は folder 省略時 config の selection_folder。両方未設定なら 400。
- これらは書き込み系。Streamlit 稼働中の同時実行は避ける（テストは tmp に隔離）。
- `streamlit` を import しない。

【依存関係】
api.admin → core.app_service → core.selection_service / core.config_utils / core.database
api.admin → api.schemas（ScanLibraryResponse / ScanSelectionRequest / ScanSelectionResponse /
            ConfigModel / BackupResponse / StatusMessageResponse）
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException

from core import app_service
from api.schemas import (
    BackupResponse,
    ConfigModel,
    ScanLibraryResponse,
    ScanSelectionRequest,
    ScanSelectionResponse,
    StatusMessageResponse,
)

router = APIRouter()


@router.post("/scan/library", response_model=ScanLibraryResponse)
def scan_library() -> ScanLibraryResponse:
    """保存済み config の library_roots でライブラリ全体をスキャンし DB を更新する。

    破壊的（不在動画を is_available=0 にする）ため、**直近24時間以内の DB バックアップが無ければ 409**。
    UI ガードを迂回した API 直叩きでも事故を防ぐ（startup_backup が起動時に当日分を作る前提）。
    """
    if not app_service.has_recent_backup(hours=24):
        raise HTTPException(
            status_code=409,
            detail="ライブラリスキャン前にバックアップを作成してください（直近24時間以内のバックアップがありません）",
        )
    result = app_service.scan_library()
    if result.get("status") != "success":
        raise HTTPException(status_code=500, detail=result.get("message", "スキャンに失敗しました"))
    return ScanLibraryResponse(**result)


@router.post("/scan/selection", response_model=ScanSelectionResponse)
def scan_selection(body: Optional[ScanSelectionRequest] = None) -> ScanSelectionResponse:
    """単一のセレクションフォルダをスキャンする（横断的な is_available 更新はしない）。"""
    folder = (body.folder if body else None) or app_service.load_user_config().get("selection_folder") or None
    if not folder:
        raise HTTPException(
            status_code=400,
            detail="セレクションフォルダが指定されていません（config の selection_folder 未設定）",
        )
    path = Path(folder)
    if not path.exists() or not path.is_dir():
        raise HTTPException(status_code=404, detail=f"フォルダが見つかりません: {folder}")
    result = app_service.scan_selection_folder(path)
    if result.get("status") != "success":
        raise HTTPException(status_code=500, detail=result.get("message", "スキャンに失敗しました"))
    return ScanSelectionResponse(**result)


@router.get("/config", response_model=ConfigModel)
def get_config() -> ConfigModel:
    """ユーザー設定を返す。"""
    return ConfigModel(**app_service.load_user_config())


@router.put("/config", response_model=StatusMessageResponse)
def put_config(body: ConfigModel) -> StatusMessageResponse:
    """ユーザー設定を保存する。

    全上書きではなく既存設定へマージする。`ConfigModel` に定義のないキー
    （`show_unavailable` / `show_deleted` 等の正本ファイル側キー）を PUT で消さないため。
    モデル化されたキーは送信値で置換される（全置換セマンティクスは維持）。
    """
    config = app_service.load_user_config()
    config.update(body.model_dump(exclude_none=True))
    app_service.save_user_config(config)
    return StatusMessageResponse(status="success", message="設定を保存しました")


@router.post("/backup", response_model=BackupResponse)
def backup() -> BackupResponse:
    """SQLite DB のバックアップを作成する。"""
    result = app_service.create_backup()
    if result.get("status") != "success":
        raise HTTPException(status_code=500, detail=result.get("message", "バックアップに失敗しました"))
    return BackupResponse(**result)
