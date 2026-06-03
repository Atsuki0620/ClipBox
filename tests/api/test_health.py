"""
ClipBox API - /api/health のテスト。

tmp_db フィクスチャ（tests/conftest.py）で一時 DB を用意し、TestClient で疎通を確認する。
"""

from fastapi.testclient import TestClient

from api_app import app


def test_health_returns_ok(tmp_db):
    """ヘルスチェックが 200 と status=ok を返し、db_exists が bool である。"""
    client = TestClient(app)
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert isinstance(body["db_exists"], bool)
    # tmp_db は init_database 済みなので存在する
    assert body["db_exists"] is True
