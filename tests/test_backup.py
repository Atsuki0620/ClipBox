"""
ClipBox - バックアップ機能のテスト
"""

import config
import core.database as database


def test_create_backup_creates_file_in_backup_dir(tmp_path, tmp_db, monkeypatch):
    """バックアップファイルが生成されてサイズが0より大きい"""
    backup_dir = tmp_path / "backups"
    monkeypatch.setattr(config, "BACKUP_DIR", backup_dir)

    result = database.create_backup()

    assert result["status"] == "success"
    assert result["size_bytes"] > 0
    assert result["filename"] != ""

    backup_files = list(backup_dir.glob("*.db"))
    assert len(backup_files) == 1
    assert backup_files[0].stat().st_size > 0


def test_create_backup_filename_contains_timestamp(tmp_path, tmp_db, monkeypatch):
    """バックアップファイル名にタイムスタンプが含まれる"""
    backup_dir = tmp_path / "backups"
    monkeypatch.setattr(config, "BACKUP_DIR", backup_dir)

    result = database.create_backup()

    assert result["status"] == "success"
    assert result["filename"].startswith("videos_")
    assert result["filename"].endswith(".db")
