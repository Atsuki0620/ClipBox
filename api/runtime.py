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


@router.post("/runtime/{service_name}/stop", response_model=StatusMessageResponse)
def stop_runtime_service(service_name: str) -> StatusMessageResponse:
    try:
        result = runtime_control.stop_service(service_name)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"unknown runtime service: {service_name}")

    if result.get("status") != "success":
        raise HTTPException(status_code=500, detail=result.get("message", "停止に失敗しました"))

    return StatusMessageResponse(**result)
