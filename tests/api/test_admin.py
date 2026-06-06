"""
ClipBox API - スキャン・設定・バックアップエンドポイントのテスト。

api_isolation により config / backup / scan の書き込みは tmp 配下に隔離される。
"""


def test_get_config_returns_defaults(client, tmp_path):
    """GET /config は隔離された tmp の設定を返す。"""
    cfg = client.get("/api/config").json()
    assert isinstance(cfg["library_roots"], list)
    assert cfg["default_player"] == "vlc"


def test_put_then_get_config_roundtrips(client):
    """PUT /config の値が GET /config に反映される（selection_folder 含む）。"""
    payload = {
        "library_roots": ["C:/videos"],
        "default_player": "mpv",
        "avp_exe_path": "C:/avp.exe",
        "db_path": "C:/db.sqlite",
        "selection_folder": "C:/selection",
    }
    assert client.put("/api/config", json=payload).status_code == 200

    cfg = client.get("/api/config").json()
    assert cfg["default_player"] == "mpv"
    assert cfg["selection_folder"] == "C:/selection"
    assert cfg["library_roots"] == ["C:/videos"]


def test_put_config_preserves_unmodeled_keys(client, tmp_path):
    """PUT /config は ConfigModel 未定義のキー（show_unavailable 等）を消さない（マージ保存）。"""
    import json

    cfg_path = tmp_path / "user_config.json"
    cfg_path.write_text(
        json.dumps(
            {
                "library_roots": ["C:/old"],
                "default_player": "vlc",
                "show_unavailable": True,
                "show_deleted": False,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    payload = {
        "library_roots": ["C:/new"],
        "default_player": "mpv",
        "selection_folder": "C:/sel",
    }
    assert client.put("/api/config", json=payload).status_code == 200

    saved = json.loads(cfg_path.read_text(encoding="utf-8"))
    # モデル化キーは送信値で置換される
    assert saved["default_player"] == "mpv"
    assert saved["library_roots"] == ["C:/new"]
    # モデル外キーは保全される
    assert saved["show_unavailable"] is True
    assert saved["show_deleted"] is False


def test_backup_creates_file(client, tmp_path):
    """POST /backup は tmp の BACKUP_DIR に .db を作る。"""
    body = client.post("/api/backup").json()
    assert body["status"] == "success"
    assert body["filename"].endswith(".db")
    assert body["size_bytes"] > 0
    assert (tmp_path / "backups" / body["filename"]).exists()


def test_scan_selection_400_when_unset(client):
    """folder 未指定かつ config 未設定なら 400。"""
    assert client.post("/api/scan/selection", json={}).status_code == 400


def test_scan_selection_scans_folder(client, tmp_path):
    """folder 指定で配下の動画を検出する。"""
    sel = tmp_path / "sel"
    sel.mkdir()
    (sel / "!clip.mp4").write_text("x")

    body = client.post("/api/scan/selection", json={"folder": str(sel)}).json()
    assert body["status"] == "success"
    assert body["found_count"] == 1


def test_scan_library_succeeds(client, tmp_path):
    """config の library_roots（tmp）でライブラリスキャンが成功する。"""
    (tmp_path / "library" / "vid.mp4").write_text("x")
    body = client.post("/api/scan/library").json()
    assert body["status"] == "success"


def test_scan_selection_404_when_folder_missing(client, tmp_path):
    """存在しない folder 指定は 404。"""
    r = client.post("/api/scan/selection", json={"folder": str(tmp_path / "nope")})
    assert r.status_code == 404


def test_scan_library_error_maps_500(client, monkeypatch):
    """scan_library が status:error を返したら 500 に寄せる。"""
    from core import app_service
    monkeypatch.setattr(app_service, "scan_library", lambda: {"status": "error", "message": "boom"})
    r = client.post("/api/scan/library")
    assert r.status_code == 500
