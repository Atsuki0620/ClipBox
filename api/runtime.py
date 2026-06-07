"""
ClipBox API - Runtime control ルーター（dev/ops 用）。

役割:
    `GET /runtime` で lamp 状態、`POST /runtime/{service}/stop` で個別停止、
    `POST /runtime/web-stack/stop` で Web スタック（Next.js → FastAPI）の一括停止を提供する。

【設計制約】
- 停止可否は `core.runtime_control` が ClipBox プロセス（cwd+cmdline）に限定して判定する。
- 戻り status を HTTP にマップ: success→200 / blocked→409 / error→500 / unknown service→404。
- `streamlit` を import しない。

【依存関係】
api.runtime → core.runtime_control
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.schemas import RuntimeServiceResponse, RuntimeStatusResponse, StatusMessageResponse
from core import runtime_control

router = APIRouter()


@router.get("/runtime", response_model=RuntimeStatusResponse)
def get_runtime_status() -> RuntimeStatusResponse:
    return RuntimeStatusResponse(
        services=[
            RuntimeServiceResponse(
                name=state.name,
                label=state.label,
                port=state.port,
                status=state.status,
                pid=state.pid,
            )
            for state in runtime_control.get_runtime_states()
        ]
    )


# 固定パス（/runtime/{service_name}/stop より前に定義）
@router.post("/runtime/web-stack/stop", response_model=StatusMessageResponse)
def stop_web_stack() -> StatusMessageResponse:
    """Web スタック（Next.js → FastAPI）を一括停止する。FastAPI 自身の終了になり得る。"""
    return _to_response(runtime_control.stop_web_stack())


@router.post("/runtime/{service_name}/stop", response_model=StatusMessageResponse)
def stop_runtime_service(service_name: str) -> StatusMessageResponse:
    try:
        result = runtime_control.stop_service(service_name)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"unknown runtime service: {service_name}")
    return _to_response(result)


def _to_response(result: dict) -> StatusMessageResponse:
    """runtime_control の戻り status を HTTP マッピングする（blocked→409 / error→500）。"""
    status = result.get("status")
    if status == "blocked":
        raise HTTPException(status_code=409, detail=result.get("message", "停止できませんでした"))
    if status != "success":
        raise HTTPException(status_code=500, detail=result.get("message", "停止に失敗しました"))
    return StatusMessageResponse(**result)
