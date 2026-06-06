"""
ClipBox API テスト共通フィクスチャ。

- client: tmp_db 前提の FastAPI TestClient。
- api_isolation: config_utils が import 時に束縛する SCAN_DIRECTORIES / DATABASE_PATH と
  CONFIG_PATH、および config.BACKUP_DIR を tmp に寄せ、PUT /config・POST /backup・scan の
  書き込みを本番 data/ から完全隔離する（tmp_db は DB パスのみ patch するため不足）。
"""

import pytest


@pytest.fixture
def api_isolation(tmp_db, tmp_path, monkeypatch):
    """config / backup / scan の書き込み先を tmp に隔離する（tmp_db に追加）。"""
    import config
    import core.config_utils as config_utils

    library_dir = tmp_path / "library"
    library_dir.mkdir(exist_ok=True)

    monkeypatch.setattr(config_utils, "CONFIG_PATH", tmp_path / "user_config.json")
    monkeypatch.setattr(config_utils, "SCAN_DIRECTORIES", [library_dir])
    monkeypatch.setattr(config_utils, "DATABASE_PATH", tmp_db)
    monkeypatch.setattr(config, "BACKUP_DIR", tmp_path / "backups")
    return tmp_path


@pytest.fixture
def client(api_isolation):
    """tmp_db + 隔離済みの FastAPI TestClient。"""
    from fastapi.testclient import TestClient
    from api_app import app

    return TestClient(app)
