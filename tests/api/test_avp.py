"""
ClipBox API - AVP 並列再生エンドポイントのテスト。

AVP 本体は起動せず subprocess.Popen を monkeypatch する。
AVP 起動では viewing_history を記録しないことも検証する。
"""

from core import app_service
from core.database import get_db_connection


def _insert(essential, path, level=-1, *, available=1):
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (essential_filename, current_full_path, current_favorite_level,
                                storage_location, is_available, is_deleted)
            VALUES (?, ?, ?, 'C_DRIVE', ?, 0)
            """,
            (essential, path, level, available),
        )
        return conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", (essential,)
        ).fetchone()[0]


def _configure_avp(tmp_path, path=None):
    avp_path = path if path is not None else tmp_path / "AVPlayer.exe"
    if path is None:
        avp_path.write_text("fake avp", encoding="utf-8")
    app_service.save_user_config({"avp_exe_path": str(avp_path)})
    return avp_path


def test_avp_play_success_launches_without_view_history(client, tmp_path, monkeypatch):
    """1〜4件の実在ファイルは AVP に渡され、視聴履歴は増えない。"""
    avp_path = _configure_avp(tmp_path)
    files = []
    ids = []
    for index in range(3):
        file_path = tmp_path / f"movie{index}.mp4"
        file_path.write_text("x", encoding="utf-8")
        files.append(str(file_path))
        ids.append(_insert(file_path.name, str(file_path), 3))

    calls = []
    monkeypatch.setattr("api.avp.subprocess.Popen", lambda args: calls.append(args))

    response = client.post("/api/avp/play", json={"video_ids": ids})

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert calls == [[str(avp_path), *files]]
    with get_db_connection() as conn:
        count = conn.execute("SELECT COUNT(*) FROM viewing_history").fetchone()[0]
    assert count == 0


def test_avp_play_rejects_empty_and_too_many_ids(client):
    """0件・5件以上は 400。"""
    assert client.post("/api/avp/play", json={"video_ids": []}).status_code == 400
    response = client.post("/api/avp/play", json={"video_ids": [1, 2, 3, 4, 5]})
    assert response.status_code == 400
    assert "最大4本" in response.json()["detail"]


def test_avp_play_rejects_invalid_and_duplicate_ids(client):
    """正でないID・重複IDは 400。"""
    assert client.post("/api/avp/play", json={"video_ids": [0]}).status_code == 400
    response = client.post("/api/avp/play", json={"video_ids": [1, 1]})
    assert response.status_code == 400
    assert "重複" in response.json()["detail"]


def test_avp_play_missing_avp_exe_returns_500(client, tmp_path):
    """設定された AVP exe が存在しなければ 500。"""
    _configure_avp(tmp_path, tmp_path / "missing.exe")

    response = client.post("/api/avp/play", json={"video_ids": [1]})

    assert response.status_code == 500
    assert "AVP の実行ファイルが見つかりません" in response.json()["detail"]


def test_avp_play_missing_video_returns_404(client, tmp_path):
    """存在しない動画IDは 404。"""
    _configure_avp(tmp_path)

    response = client.post("/api/avp/play", json={"video_ids": [999999]})

    assert response.status_code == 404
    assert "動画が見つかりません" in response.json()["detail"]


def test_avp_play_unavailable_video_returns_409(client, tmp_path):
    """is_available=0 の動画は 409。"""
    _configure_avp(tmp_path)
    file_path = tmp_path / "unavailable.mp4"
    file_path.write_text("x", encoding="utf-8")
    vid = _insert("unavailable.mp4", str(file_path), available=0)

    response = client.post("/api/avp/play", json={"video_ids": [vid]})

    assert response.status_code == 409
    assert "利用不可" in response.json()["detail"]


def test_avp_play_missing_file_returns_404(client, tmp_path):
    """DB 上は利用可能でも実ファイルがなければ 404。"""
    _configure_avp(tmp_path)
    vid = _insert("gone.mp4", str(tmp_path / "gone.mp4"), available=1)

    response = client.post("/api/avp/play", json={"video_ids": [vid]})

    assert response.status_code == 404
    assert "動画ファイルが見つかりません" in response.json()["detail"]
