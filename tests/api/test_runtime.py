from __future__ import annotations

from types import SimpleNamespace

from api_app import app
from fastapi.testclient import TestClient


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

    client = TestClient(app)
    response = client.get("/api/runtime")

    assert response.status_code == 200
    body = response.json()
    assert [item["name"] for item in body["services"]] == ["streamlit", "fastapi", "nextjs"]
    assert body["services"][0]["status"] == "running"
    assert body["services"][2]["status"] == "unknown"


def test_stop_runtime_service_returns_404_for_unknown_service(tmp_path, tmp_db):
    client = TestClient(app)

    response = client.post("/api/runtime/unknown/stop")

    assert response.status_code == 404


def test_stop_runtime_service_returns_success(monkeypatch, tmp_db):
    from core import runtime_control

    monkeypatch.setattr(
        runtime_control,
        "stop_service",
        lambda service_name: {"status": "success", "message": f"{service_name} は既に停止しています。"},
    )

    client = TestClient(app)
    response = client.post("/api/runtime/streamlit/stop")

    assert response.status_code == 200
    assert response.json()["status"] == "success"
