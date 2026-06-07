from __future__ import annotations

from types import SimpleNamespace

from fastapi.testclient import TestClient

from api_app import create_app


def _client(enable: bool) -> TestClient:
    return TestClient(create_app(enable_runtime_control=enable))


def test_runtime_disabled_returns_404(tmp_db):
    """runtime control 無効時は /api/runtime を生やさない（404）。"""
    client = _client(False)
    assert client.get("/api/runtime").status_code == 404
    assert client.post("/api/runtime/streamlit/stop").status_code == 404


def test_runtime_status_endpoint_returns_services(monkeypatch, tmp_db):
    from core import runtime_control

    monkeypatch.setattr(
        runtime_control,
        "get_runtime_states",
        lambda: [
            SimpleNamespace(name="streamlit", label="Streamlit", port=8501, status="running", pid=1001),
            SimpleNamespace(name="fastapi", label="FastAPI", port=8000, status="stopped", pid=None),
            SimpleNamespace(name="nextjs", label="Next.js", port=3000, status="unknown", pid=None),
        ],
    )

    response = _client(True).get("/api/runtime")

    assert response.status_code == 200
    body = response.json()
    assert [item["name"] for item in body["services"]] == ["streamlit", "fastapi", "nextjs"]
    assert body["services"][0]["status"] == "running"
    assert body["services"][2]["status"] == "unknown"


def test_stop_runtime_service_returns_404_for_unknown_service(tmp_db):
    response = _client(True).post("/api/runtime/unknown/stop")
    assert response.status_code == 404


def test_stop_runtime_service_returns_success(monkeypatch, tmp_db):
    from core import runtime_control

    monkeypatch.setattr(
        runtime_control,
        "stop_service",
        lambda service_name: {"status": "success", "message": f"{service_name} は既に停止しています。"},
    )

    response = _client(True).post("/api/runtime/streamlit/stop")
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_stop_runtime_service_blocked_returns_409(monkeypatch, tmp_db):
    """ClipBox と確認できないポート占有は blocked → 409（UI に停止不可が見える）。"""
    from core import runtime_control

    monkeypatch.setattr(
        runtime_control,
        "stop_service",
        lambda service_name: {"status": "blocked", "message": "ClipBox として確認できないため停止しません。"},
    )

    response = _client(True).post("/api/runtime/fastapi/stop")
    assert response.status_code == 409
    assert "確認できない" in response.json()["detail"]


def test_stop_web_stack_returns_success(monkeypatch, tmp_db):
    from core import runtime_control

    monkeypatch.setattr(
        runtime_control,
        "stop_web_stack",
        lambda: {"status": "success", "message": "nextjs: ok / fastapi: ok"},
    )

    response = _client(True).post("/api/runtime/web-stack/stop")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
